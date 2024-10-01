import { NIPServer } from "@src/NIPServer";
import { SocketConnection } from "@src/SocketConnection";
import { ContinueToInfinitePath, createInfinitePathProxy, CurrentInfinitePath, InfiniteProxyPathKey } from "./infiniteProxy";

import util from "util";

export interface ExecuteResponse {
  ok: boolean;
  data: any;
}

export type RefType = { $type: "Reference", id: string, value: any };

export function singularExecute(connection: SocketConnection, path: InfiniteProxyPathKey[], isSync: boolean, responseMap: { key: string, path: InfiniteProxyPathKey[] }[] = []) {
  return new Promise(async (resolve) => {
    const res = (await connection.sendAndWaitResponse("SingularExecute", {
      path,
      sync: isSync,
      response: responseMap
    })) as ExecuteResponse;
    if (!res) return resolve([true, "Not connected to server"]);

    console.log(
      "singularExecute post",
      util.inspect({
        path,
        sync: isSync,
        responseMap: responseMap,
        res
      }, { depth: 10, colors: true })
    )
    if (!res.ok) return resolve([res.ok, res.data]);
    if (!res.data) return resolve([res.ok, null]);
    resolve([
      res.ok,
      responseMap.length ? Object.fromEntries(res.data.map((i: any) => [i.key, i.value])) : res.data
    ]);
  });
}

export function buildResponseMap(toMap: ([string, (value: any) => any])[]): { key: string, path: InfiniteProxyPathKey[] }[] {
  return toMap.map(([key, pathCb]) => {
    return {
      key,
      path: pathCb(createInfinitePathProxy(() => ContinueToInfinitePath, []))[CurrentInfinitePath]
    }
  })
}

export function buildSingularAPI(connection: SocketConnection, startPath: InfiniteProxyPathKey[] = []) {
  return createInfinitePathProxy((path, ...args) => {
    const lastKey = path.at(-1);

    if (lastKey?.type !== "Apply") return ContinueToInfinitePath;

    switch (lastKey.key) {
      case "$execute":
      case "$exec": {
        if (typeof lastKey.args![0] === "object") {
          const { sync = false, response = [] } = lastKey.args![0];

          return singularExecute(connection, path.slice(0, -1), sync, buildResponseMap(response));
        }
        return singularExecute(connection, path.slice(0, -1), false);
      }
      case "$get": {
        return singularExecute(connection, path.slice(0, -1), true, buildResponseMap(Array.isArray(lastKey.args![0]) ? lastKey.args![0] : []));
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