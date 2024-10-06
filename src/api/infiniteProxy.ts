export const ContinueToInfinitePath = Symbol("ContinueToInfinitePath");
export const CurrentInfinitePath = Symbol("CurrentInfinitePath");

export type InfiniteProxyPathKey = { key: string, type: "Get" | "Apply", args?: { __type__: string, value: any, [key: string]: any }[] };

export function createInfinitePathProxy(onApplyPath: (path: InfiniteProxyPathKey[], ...args: any[]) => any, path: InfiniteProxyPathKey[] = [], hardcodedValues?: Record<string, any>): any {
  return new Proxy(() => { }, {
    get(target, key) {
      if (key === CurrentInfinitePath) return path;
      if (hardcodedValues && key in hardcodedValues) return hardcodedValues[key as string];
      return createInfinitePathProxy(onApplyPath, [...path, {
        key: key.toString(),
        type: "Get"
      }]);
    },
    apply(target, thisArg, args) {
      args = args.map((arg) => {
        if (arg?.__type__) return arg;
        return {
          __type__: "Value",
          value: arg
        }
      });
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