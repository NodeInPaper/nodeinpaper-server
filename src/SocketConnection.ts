import { IncomingMessage } from "http";
import { WebSocket } from "ws";
import { WebSocketManager } from "./WebSocketManager";

export class SocketConnection {
  constructor(
    public webSocketManager: WebSocketManager,
    public socket: WebSocket,
    public req: IncomingMessage,
    public id: string
  ) {}

  get ip() {
    return this.req.socket.remoteAddress;
  }

  async init() {
    this.socket.on("message", this.onMessage);
    this.socket.on("close", this.destroy);
  }

  async onMessage(data: string) {
    const json = JSON.parse(data);
  }

  async destroy() {
    this.socket.off("message", this.onMessage);
    this.socket.off("close", this.destroy);
    this.socket.close();
    this.webSocketManager.connections.delete(this.id);
  }
}
