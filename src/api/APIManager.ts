import { NIPServer } from "@src/NIPServer";
import { SocketConnection } from "@src/SocketConnection";
import { ContinueToInfinitePath, createInfinitePathProxy, InfiniteProxyPathKey } from "./infiniteProxy";

export interface ExecuteResponse {
  ok: boolean;
  data: any;
}

export type RefType = { $type: "Reference", id: string, value: any };

export function singularExecute(connection: SocketConnection, path: InfiniteProxyPathKey[], isSync: boolean) {
  return new Promise(async (resolve, reject) => {
    const res = (await connection.sendAndWaitResponse("SingularExecute", {
      path,
      sync: isSync
    })) as ExecuteResponse;
    resolve([res.ok, res.data]);
  });
}

function buildResponseMap(response: ((value: any) => any)[]) {

}

export function buildSingularAPI(connection: SocketConnection, startPath: InfiniteProxyPathKey[] = []) {
  return createInfinitePathProxy((path, ...args) => {
    const lastKey = path.at(-1);

    if (lastKey?.type !== "Apply") return ContinueToInfinitePath;

    switch (lastKey.key) {
      case "$execute":
      case "$exec": {
        if (typeof lastKey.args![0] === "object") {
          const { sync = false, response } = lastKey.args![0];

          return singularExecute(connection, path.slice(0, -1), sync,);
        }
        return singularExecute(connection, path.slice(0, -1), false);
      }
    }

    return ContinueToInfinitePath;
  }, startPath)
}

export class APIManager {
  constructor(public nip: NIPServer) { }

  async buildAPI(connection: SocketConnection) {
    return {
      singular: buildSingularAPI(connection)
    }
  }
}