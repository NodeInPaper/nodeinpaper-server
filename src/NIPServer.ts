import { WebSocketManager } from "./WebSocketManager";

export interface NIPServerConfig {
  host: string;
  port: number;
  key: string;
}

export class NIPServer {
  webSocketManager: WebSocketManager;
  constructor(public config: NIPServerConfig) {
    this.webSocketManager = new WebSocketManager(this);
  }

  async init() {
    await this.webSocketManager.init();
  }

  async destroy() {}
}
