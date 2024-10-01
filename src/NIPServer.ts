import { APIManager } from "./api/APIManager";
import { SocketConnection } from "./SocketConnection";
import { WebSocketManager } from "./WebSocketManager";

export interface NIPServerConfig {
  host: string;
  port: number;
}

export interface RegistrarAPI {
  api: Awaited<ReturnType<APIManager["buildAPI"]>>;
  connection: SocketConnection;
  onDestroy(cb: () => void): void;
}

export class NIPServer {
  webSocketManager: WebSocketManager;
  apiManager: APIManager;
  registrars: Set<any> = new Set();
  constructor(public config: NIPServerConfig) {
    this.webSocketManager = new WebSocketManager(this);
    this.apiManager = new APIManager(this);
  }

  async init() {
    await this.webSocketManager.init();
  }

  async register(cb: (api: RegistrarAPI) => void) {
    this.registrars.add(cb);
  }

  async destroy() { }
}
