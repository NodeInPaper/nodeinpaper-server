import { NIPServer } from "@src/NIPServer";
import { SocketConnection } from "@src/SocketConnection";
import { ContinueToInfinitePath, createInfinitePathProxy, InfiniteProxyPathKey } from "./infiniteProxy";

export interface ExecuteResponse {
  ok: boolean;
  data: any;
}

export type RefArgumentType = { $ref: string };

export class APIManager {
  constructor(public nip: NIPServer) { }

  async buildAPI(connection: SocketConnection) {
    function singularExecute(path: InfiniteProxyPathKey[], isSync: boolean) {
      return new Promise(async (resolve, reject) => {
        const res = (await connection.sendAndWaitResponse("SingularExecute", {
          path: path.slice(0, -1),
          sync: isSync
        })) as ExecuteResponse;
        if (!res.ok) return reject(res.data);
        resolve(res.data);
      });
    }
    return {
      singular: createInfinitePathProxy((path, ...args) => {
        const lastKey = path.at(-1);

        switch (lastKey?.key) {
          case "$execute":
          case "$exec": {
            if (typeof lastKey.args![0]?.sync === "boolean") {
              return singularExecute(path, !!lastKey.args![0]?.sync);
            }
            return singularExecute(path, false);
          }
          case "$executeSync":
          case "$execSync": {
            return singularExecute(path, true);
          }
        }

        return ContinueToInfinitePath;
      })
    }
  }
}