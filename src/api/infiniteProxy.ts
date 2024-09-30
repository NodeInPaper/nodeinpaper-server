export const ContinueToInfinitePath = Symbol("ContinueToInfinitePath");

export type InfiniteProxyPathKey = { key: string, type: "Get" | "Apply", args?: any[] };

export function createInfinitePathProxy(onApplyPath: (path: InfiniteProxyPathKey[], ...args: any[]) => any, path: InfiniteProxyPathKey[] = []): any {
  return new Proxy(() => { }, {
    get(target, key) {
      return createInfinitePathProxy(onApplyPath, [...path, {
        key: key.toString(),
        type: "Get"
      }]);
    },
    apply(target, thisArg, args) {
      path = path.slice(0, -1).concat({
        key: path.at(-1)!.key,
        type: "Apply",
        args
      });
      const res = onApplyPath(path, ...args);
      if (res === ContinueToInfinitePath) return createInfinitePathProxy(onApplyPath, path);
      return res;
    }
  });
}