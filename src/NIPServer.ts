import { APIManager } from "./api/APIManager";
import { WebSocketManager } from "./WebSocketManager";

export interface NIPServerConfig {
  host: string;
  port: number;
  key: string;
}

export class NIPServer {
  webSocketManager: WebSocketManager;
  apiManager: APIManager;
  constructor(public config: NIPServerConfig) {
    this.webSocketManager = new WebSocketManager(this);
    this.apiManager = new APIManager(this);
  }

  async init() {
    await this.webSocketManager.init();
  }

  async destroy() { }
}
