import { NIPServer, NIPServerConfig } from "./NIPServer";
import { recursiveImport } from "./utils";

export function createNIPServer(config: NIPServerConfig) {
    return new NIPServer(config);
}

export const Utils = {
    recursiveImport
};