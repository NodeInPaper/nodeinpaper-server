import { NIPServer, NIPServerConfig } from "./NIPServer";

export function createNIPServer(config: NIPServerConfig) {
    return new NIPServer(config);
}