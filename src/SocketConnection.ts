import { IncomingMessage } from "http";
import { WebSocket } from "ws";
import { WebSocketManager } from "./WebSocketManager";

import util from "util";
import { buildSingularAPI } from "./api/APIManager";

export class SocketConnection {
  private pendingResponses: Map<string, (data: any) => void> = new Map();
  private onDisconnects: (() => void)[] = [];
  private commandCbs: Map<string, (sender: any, label: string, ...args: string[]) => void> = new Map();
  private eventCbs: Map<string, (event: any) => void> = new Map();
  constructor(
    public webSocketManager: WebSocketManager,
    public socket: WebSocket,
    public req: IncomingMessage,
    public id: string
  ) { }

  get ip() {
    return this.req.socket.remoteAddress;
  }

  async init() {
    const self = this;

    this.socket.on("message", this.handleMessage.bind(this));
    this.socket.on("close", this.destroy.bind(this));

    this.webSocketManager.nip.registrars.forEach(async (registrar) => {
      registrar({
        api: await this.webSocketManager.nip.apiManager.buildAPI(this),
        connection: this,
        onDisconnect(cb: () => void) {
          self.onDisconnects.push(cb);
          return true;
        },
        async registerCommand({
          name,
          namespace = "nip",
          aliases = [],
          description = "",
          usage = "",
          onExecute
        }: {
          name: string;
          namespace?: string;
          aliases?: string[];
          description?: string;
          usage?: string;
          onExecute(sender: any, label: string, ...args: string[]): void;
        }) {
          self.commandCbs.set(`${namespace}:${name}`, onExecute);
          const res = await self.sendAndWaitResponse(
            "RegisterCommand",
            {
              name,
              namespace,
              aliases,
              description,
              usage
            }
          ) as any;

          if (!res.ok) throw res.data;
          return res.data;
        },
        async registerEvent({
          name,
          priority = "NORMAL",
          onExecute
        }: {
          name: string;
          priority?: "LOWEST" | "LOW" | "NORMAL" | "HIGH" | "HIGHEST";
          onExecute(event: any): void;
        }) {
          self.eventCbs.set(name, onExecute);
          const res = await self.sendAndWaitResponse(
            "RegisterEvent",
            {
              name,
              priority
            }
          ) as any;
          if (!res.ok) throw res.data;
          return res.data;
        },
      });
    });
  }

  async destroy() {
    this.socket.off("message", this.handleMessage);
    this.socket.off("close", this.destroy);
    this.socket.close();
    this.webSocketManager.connections.delete(this.id);
    this.onDisconnects.forEach((cb) => cb());
    this.onDisconnects.length = 0;
    this.commandCbs.clear();
    this.eventCbs.clear();
  }

  async handleMessage(data: string) {
    const json = JSON.parse(data) as { event: string, data: any, responseId?: string };

    switch (json.event) {
      case "Response": {
        const responseId = json.responseId!;
        const resolve = this.pendingResponses.get(responseId);
        if (!resolve) break;
        resolve(json.data);
        this.pendingResponses.delete(responseId);
        break;
      }
      case "ExecuteCommand": {
        const { name, namespace, sender, label, args } = json.data;
        this.commandCbs.get(`${namespace}:${name}`)?.(
          buildSingularAPI({
            connection: this,
            base: {
              type: "Reference",
              id: sender.id
            }
          }),
          label,
          ...args
        );
        break;
      }
      case "ExecuteEvent": {
        const { name, event } = json.data;
        this.eventCbs.get(name)?.(
          buildSingularAPI({
            connection: this,
            base: {
              type: "Reference",
              id: event.id
            }
          })
        );
        break;
      }
    }
  }

  async sendAndWaitResponse(event: string, data: any) {
    if (this.socket.readyState !== WebSocket.OPEN) return;
    // console.log("Sending", event, util.inspect(data, { depth: 10, colors: true }));
    return new Promise((resolve) => {
      const responseId = crypto.randomUUID();
      this.pendingResponses.set(responseId, resolve);
      this.send(event, data, responseId);
    });
  }

  async send(event: string, data: any, responseId?: string) {
    if (this.socket.readyState !== WebSocket.OPEN) return;
    this.socket.send(JSON.stringify({ event, data, responseId }));
  }
}
