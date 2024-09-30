import { NIPServer } from "@src/NIPServer";
import { IncomingMessage } from "http";
import { WebSocket, WebSocketServer } from "ws";
import { SocketConnection } from "./SocketConnection";
import crypto from "crypto";

export class WebSocketManager {
  wss!: WebSocketServer;
  connections: Map<string, SocketConnection> = new Map();
  constructor(public nip: NIPServer) {}

  async init() {
    this.wss = new WebSocketServer({
      port: this.nip.config.port,
      host: this.nip.config.host,
    });
    this.wss.on("connection", this.handleConnection);
  }

  async destroy() {
    this.wss.off("connection", this.handleConnection);
    this.wss.close();
  }

  async handleConnection(socket: WebSocket, req: IncomingMessage) {
    const id = crypto.randomUUID();
    const connection = new SocketConnection(this, socket, req, id);
    await connection.init();
    this.connections.set(id, connection);
  }
}
