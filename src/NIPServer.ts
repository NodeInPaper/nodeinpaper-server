import { APIManager } from "./api/APIManager";
import { WebSocketManager } from "./WebSocketManager";

export interface NIPServerConfig {
  host: string;
  port: number;
}

export class NIPServer {
  webSocketManager: WebSocketManager;
  apiManager: APIManager;
  registrars: Set<any>;
  constructor(public config: NIPServerConfig) {
    this.registrars = new Set();
    
    this.webSocketManager = new WebSocketManager(this);
    this.apiManager = new APIManager(this);
  }

  async init() {
    await this.webSocketManager.init();
  }

  async register(cb: (api: any) => void) {
    this.registrars.add(cb);
  }

  async destroy() { }
}
