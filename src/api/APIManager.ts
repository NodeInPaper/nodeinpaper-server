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
  return new Promise(async (resolve, reject) => {
    const res = (await connection.sendAndWaitResponse("SingularExecute", {
      path,
      sync: isSync,
      response: responseMap,
      base,
      noRef
    })) as ExecuteResponse;

    if (!res) return reject("No response from server");

    if (!res.ok) return reject(res.data);
    if (typeof res.data === "undefined") return resolve([null]);

    if (res.data?.__type__ === "Reference" && res.data.id) {
      // console.log("Building ref", res.data.id, "for", path, base);
      return resolve(
        [
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

    return resolve([
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
          noRef: false
        });
      }
      case "$getSync": {
        return singularExecute({
          connection,
          path: path.slice(0, -1),
          isSync: true,
          responseMap: buildResponseMap(lastKey.args![0] || {}),
          base,
          noRef: false
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

export interface ICondition {
  a: string | number | boolean | {
    base?: "Context" | "Plugin";
    path: (v: any) => any;
  };
  op: "=="
  | "!="
  | ">"
  | "<"
  | ">="
  | "<="
  | "Contains"
  | "NotContains"
  | "MatchesRegex"
  | "NotMatchesRegex";
  b: string | number | boolean | {
    base?: "Context" | "Plugin";
    path: (v: any) => any;
  };
}

export interface IConditionGroup {
  and?: ICondition[];
  or?: ICondition[];
}

export function buildConditions(conditions: ICondition[]) {
  return conditions.map(({ a, op, b }) => {
    return {
      a: typeof a === "object" ? {
        type: "Path",
        base: a.base || "Context",
        path: a.path(createInfinitePathProxy(() => ContinueToInfinitePath, []))[CurrentInfinitePath]
      } : {
        type: "Value",
        value: `${a}`
      },
      op,
      b: typeof b === "object" ? {
        type: "Path",
        base: b.base || "Context",
        path: b.path(createInfinitePathProxy(() => ContinueToInfinitePath, []))[CurrentInfinitePath]
      } : {
        type: "Value",
        value: `${b}`
      }
    }
  });
}

export function buildConditionGroup(group: IConditionGroup) {
  return {
    and: group.and ? buildConditions(group.and) : undefined,
    or: group.or ? buildConditions(group.or) : undefined
  }
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