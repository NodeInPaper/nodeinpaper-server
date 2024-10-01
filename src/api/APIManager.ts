import { NIPServer } from "@src/NIPServer";
import { SocketConnection } from "@src/SocketConnection";
import { ContinueToInfinitePath, createInfinitePathProxy, CurrentInfinitePath, InfiniteProxyPathKey } from "./infiniteProxy";

export interface ExecuteResponse {
  ok: boolean;
  data: any;
}

export type RefType = { __type__: "Reference", id: string };

export function singularExecute({
  connection,
  path,
  isSync,
  responseMap = [],
  base = "Plugin"
}: {
  connection: SocketConnection,
  path: InfiniteProxyPathKey[],
  isSync: boolean,
  responseMap?: { key: string, path: InfiniteProxyPathKey[] }[],
  base?: String
}) {
  return new Promise(async (resolve) => {
    const res = (await connection.sendAndWaitResponse("SingularExecute", {
      path,
      sync: isSync,
      response: responseMap,
      base
    })) as ExecuteResponse;
    if (!res) return resolve([true, "Not connected to server"]);

    if (!res.ok) return resolve([res.ok, res.data]);
    if (!res.data) return resolve([res.ok, null]);

    let value = responseMap.length ? Object.fromEntries(res.data.map((i: any) => [i.key, i.value])) : res.data;

    if (value?.__type__ === "Reference" && value.id) {
      value = buildSingularAPI({
        connection,
        base: value.id,
        hardCodedValues: {
          $refId: value.id
        }
      });
    }

    resolve([
      res.ok,
      value
    ]);
  });
}

export function buildResponseMap(toMap: Record<string, (value: any) => any>): { key: string, path: InfiniteProxyPathKey[] }[] {
  return Object.entries(toMap).map(([key, pathCb]) => {
    return {
      key,
      path: pathCb(createInfinitePathProxy(() => ContinueToInfinitePath, []))[CurrentInfinitePath]
    }
  })
}

export function buildSingularAPI({
  connection,
  startPath = [],
  base = "Plugin",
  hardCodedValues = {}
}: {
  connection: SocketConnection,
  startPath?: InfiniteProxyPathKey[],
  base?: string,
  hardCodedValues?: Record<string, any>
}) {
  return createInfinitePathProxy((path, ...args) => {
    const lastKey = path.at(-1);

    if (lastKey?.type !== "Apply") return ContinueToInfinitePath;

    switch (lastKey.key) {
      case "$execute":
      case "$exec": {
        if (typeof lastKey.args![0] === "object") {
          const { sync = false, response = [] } = lastKey.args![0];

          return singularExecute({
            connection,
            path: path.slice(0, -1),
            isSync: sync,
            responseMap: buildResponseMap(response),
            base
          });
        }
        return singularExecute({
          connection,
          path: path.slice(0, -1),
          isSync: false,
          base
        });
      }
      case "$executeSync":
      case "$execSync": {
        if (typeof lastKey.args![0] === "object") {
          const { response = [] } = lastKey.args![0];
          return singularExecute({
            connection,
            path: path.slice(0, -1),
            isSync: true,
            responseMap: buildResponseMap(response),
            base
          })
        }
        return singularExecute({
          connection,
          path: path.slice(0, -1),
          isSync: true,
          base
        });
      }
      case "$get": {
        return singularExecute({
          connection,
          path: path.slice(0, -1),
          isSync: true,
          responseMap: buildResponseMap(lastKey.args![0] || {}),
          base
        });
      }
    }

    return ContinueToInfinitePath;
  }, startPath, hardCodedValues)
}

export class APIManager {
  constructor(public nip: NIPServer) { }

  async buildAPI(connection: SocketConnection) {
    return {
      plugin: buildSingularAPI({
        connection,
      }),
      async ref(ref: RefType) {
        return buildSingularAPI({
          connection,
          base: ref.id
        });
      },
      async removeRef(ref: RefType) {
        return await connection.sendAndWaitResponse("RemoveReference", ref.id);
      },
      async accessRef(ref: RefType, pathCb: (v: any) => any = (v) => v) {
        return await connection.sendAndWaitResponse("AccessReference", {
          id: ref.id,
          path: pathCb(createInfinitePathProxy(() => ContinueToInfinitePath, []))[CurrentInfinitePath]
        });
      }
    }
  }
}