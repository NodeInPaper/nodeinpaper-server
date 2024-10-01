import { IncomingMessage } from "http";
import { WebSocket } from "ws";
import { WebSocketManager } from "./WebSocketManager";

export class SocketConnection {
  private pendingResponses: Map<string, (data: any) => void> = new Map();
  private onDestroys: (() => void)[] = [];
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
    this.socket.on("message", this.handleMessage.bind(this));
    this.socket.on("close", this.destroy.bind(this));

    await new Promise(r => setTimeout(r, 10));

    this.webSocketManager.nip.registrars.forEach(async (registrar) => {
      registrar({
        api: await this.webSocketManager.nip.apiManager.buildAPI(this),
        connection: this,
        onDestroy(cb: () => void) {
          this.onDestroys.push(cb);
        }
      });
    });
  }

  async destroy() {
    this.socket.off("message", this.handleMessage);
    this.socket.off("close", this.destroy);
    this.socket.close();
    this.webSocketManager.connections.delete(this.id);
    this.onDestroys.forEach((cb) => cb());
    this.onDestroys.length = 0;
  }

  async handleMessage(data: string) {
    const json = JSON.parse(data);

    switch (json.event) {
      case "Response": {
        const responseId = json.responseId;
        const resolve = this.pendingResponses.get(responseId);
        if (!resolve) break;
        resolve(json.data);
        this.pendingResponses.delete(responseId);
        break;
      }
    }
  }

  async sendAndWaitResponse(event: string, data: any) {
    if (this.socket.readyState !== WebSocket.OPEN) return;
    return new Promise((resolve) => {
      const responseId = crypto.randomUUID();
      this.pendingResponses.set(responseId, resolve);
      this.socket.send(JSON.stringify({ event, data, responseId }));
    });
  }

  async send(event: string, data: any) {
    this.socket.send(JSON.stringify({ event, data }));
  }
}
