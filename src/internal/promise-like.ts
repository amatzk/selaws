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
