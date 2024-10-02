import { NIPServer } from "@src/NIPServer";
import { SocketConnection } from "@src/SocketConnection";
import { ContinueToInfinitePath, createInfinitePathProxy, CurrentInfinitePath, InfiniteProxyPathKey } from "./infiniteProxy";

export interface ExecuteResponse {
  ok: boolean;
  data: any;
}

export interface SingularExecuteBase {
  type: "Plugin" | "Reference" | "Class" | "ClassFromPath";
  id?: string;
  file?: string;
  name?: string;
}

export function singularExecute({
  connection,
  path,
  isSync,
  responseMap = [],
  base = { type: "Plugin" },
  noRef = false
}: {
  connection: SocketConnection,
  path: InfiniteProxyPathKey[],
  isSync: boolean,
  responseMap?: { key: string, path: InfiniteProxyPathKey[] }[],
  base?: SingularExecuteBase,
  noRef?: boolean
}) {
  return new Promise(async (resolve) => {
    const res = (await connection.sendAndWaitResponse("SingularExecute", {
      path,
      sync: isSync,
      response: responseMap,
      base,
      noRef
    })) as ExecuteResponse;

    if (!res) return resolve(["Not connected to server", null]);

    if (!res.ok) return resolve([res.data, null]);
    if (!res.data) return resolve([null, null]);

    if (res.data?.__type__ === "Reference" && res.data.id) {
      return resolve(
        [
          null,
          buildSingularAPI({
            connection,
            base: {
              type: "Reference",
              id: res.data.id
            },
            hardCodedValues: {
              $refId: res.data.id,
              $unRef: () => {
                connection.send("RemoveReference", res.data.id);
              }
            }
          })
        ]
      )
    }

    if (res.data?.__type__ === "List" && res.data.list) {
      return resolve(
        [
          null,
          res.data.list.map((item: any) => {
            if (item?.__type__ === "Reference" && item.id) {
              return buildSingularAPI({
                connection,
                base: {
                  type: "Reference",
                  id: item.id
                },
                hardCodedValues: {
                  $refId: item.id,
                  $unRef: () => {
                    connection.send("RemoveReference", item.id);
                  }
                }
              });
            }
            return responseMap.length ? Object.fromEntries(item.map((i: any) => [i.key, i.value])) : item;
          })
        ]
      )
    }

    resolve([
      null,
      responseMap.length ? Object.fromEntries(res.data.map((i: any) => [i.key, i.value])) : res.data
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
  base,
  hardCodedValues = {}
}: {
  connection: SocketConnection,
  startPath?: InfiniteProxyPathKey[],
  base?: SingularExecuteBase,
  hardCodedValues?: Record<string, any>
}) {
  return createInfinitePathProxy((path, ...args) => {
    const lastKey = path.at(-1);

    if (lastKey?.type !== "Apply") return ContinueToInfinitePath;

    switch (lastKey.key) {
      case "$execute":
      case "$exec": {
        if (typeof lastKey.args![0] === "object") {
          const { sync = false, response = [], noRef = false } = lastKey.args![0];

          return singularExecute({
            connection,
            path: path.slice(0, -1),
            isSync: sync,
            responseMap: buildResponseMap(response),
            base,
            noRef
          });
        }
        return singularExecute({
          connection,
          path: path.slice(0, -1),
          isSync: false,
          base,
          noRef: false
        });
      }
      case "$executeSync":
      case "$execSync": {
        if (typeof lastKey.args![0] === "object") {
          const { response = [], noRef = false } = lastKey.args![0];
          return singularExecute({
            connection,
            path: path.slice(0, -1),
            isSync: true,
            responseMap: buildResponseMap(response),
            base,
            noRef
          })
        }
        return singularExecute({
          connection,
          path: path.slice(0, -1),
          isSync: true,
          base,
          noRef: false
        });
      }
      case "$get": {
        return singularExecute({
          connection,
          path: path.slice(0, -1),
          isSync: false,
          responseMap: buildResponseMap(lastKey.args![0] || {}),
          base,
          noRef: true
        });
      }
      case "$getSync": {
        return singularExecute({
          connection,
          path: path.slice(0, -1),
          isSync: false,
          responseMap: buildResponseMap(lastKey.args![0] || {}),
          base,
          noRef: true
        });
      }
      case "$run": {
        return singularExecute({
          connection,
          path: path.slice(0, -1),
          isSync: false,
          base,
          noRef: true
        });
      }
      case "$runSync": {
        return singularExecute({
          connection,
          path: path.slice(0, -1),
          isSync: true,
          base,
          noRef: true
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
      $plugin: buildSingularAPI({
        connection,
        base: {
          type: "Plugin"
        }
      }),
      $ref(id: string) {
        return buildSingularAPI({
          connection,
          base: {
            type: "Reference",
            id
          }
        });
      },
      $class(name: string) {
        return buildSingularAPI({
          connection,
          base: {
            type: "Class",
            name
          }
        });
      },
      $classFromPath(filePath: string, name: string) {
        return buildSingularAPI({
          connection,
          base: {
            type: "ClassFromPath",
            file: filePath,
            name
          }
        });
      },
      async $unRef(id: string) {
        const res = await connection.sendAndWaitResponse("RemoveReference", id) as any;
        return res.ok ? [null, true] : [res.data, null];
      },
      async $keepAliveRef(id: string) {
        const res = await connection.sendAndWaitResponse("KeepAliveReference", id) as any;
        return res.ok ? [null, true] : [res.data, null];
      }
    }
  }
}