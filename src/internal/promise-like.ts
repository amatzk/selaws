type IsAny<T> = 0 extends 1 & T ? true : false;

type BroadFunction = FunctionConstructor["prototype"];

type HasCallableThen<T> = T extends object
  ? "then" extends keyof T
    ? Extract<T["then"], BroadFunction> extends never
      ? false
      : true
    : false
  : false;

export type NotPromiseLike<T> =
  IsAny<T> extends true
    ? T
    : true extends (T extends unknown ? HasCallableThen<T> : never)
      ? never
      : T;

export const isPromiseLike = (value: unknown): value is PromiseLike<unknown> => {
  if ((typeof value !== "object" && typeof value !== "function") || value === null) {
    return false;
  }

  return typeof (value as { readonly then?: unknown }).then === "function";
};

export const assertNotPromiseLike = (value: unknown, message: string): void => {
  if (isPromiseLike(value)) {
    throw new TypeError(message);
  }
};
