import { assertNotPromiseLike, type NotPromiseLike } from "../internal/promise-like.js";
import { err, ok, type Result } from "./core.js";

type SyncPrimitive = string | number | boolean | bigint | symbol | null | undefined;

type NonThenableObject = object & {
  readonly then?: never;
};

type OverloadUnion<Callable, Partial = unknown> = Callable extends (
  this: infer This,
  ...args: infer Args
) => infer Return
  ? Partial extends Callable
    ? never
    :
        | OverloadUnion<
            Partial & Callable,
            Partial & ((this: This, ...args: Args) => Return)
          >
        | ((this: This, ...args: Args) => Return)
  : never;

type IsUnion<T, Whole = T> = T extends unknown
  ? [Whole] extends [T]
    ? false
    : true
  : never;

type UnionToIntersection<T> = (T extends unknown ? (value: T) => void : never) extends (
  value: infer Intersection,
) => void
  ? Intersection
  : never;

type HasAsyncOverload<Callable> = true extends (
  OverloadUnion<Callable> extends infer One
    ? One extends (...args: never[]) => infer Return
      ? [Return] extends [NotPromiseLike<Return>]
        ? false
        : true
      : never
    : never
)
  ? true
  : false;

type HasNonPromiseOverload<Callable> = true extends (
  OverloadUnion<Callable> extends infer One
    ? One extends (...args: never[]) => infer Return
      ? [Return] extends [PromiseLike<unknown>]
        ? false
        : true
      : never
    : never
)
  ? true
  : false;

type SyncWrappedOne<Callable, E> = Callable extends (
  this: infer This,
  ...args: infer Args
) => infer Return
  ? (this: This, ...args: Args) => Result<Return, E>
  : never;

type SyncWrappedOverloads<Callable, E> = UnionToIntersection<
  OverloadUnion<Callable> extends infer One
    ? One extends unknown
      ? SyncWrappedOne<One, E>
      : never
    : never
>;

type AsyncWrappedOne<Callable, E> = Callable extends (
  this: infer This,
  ...args: infer Args
) => infer Return
  ? (this: This, ...args: Args) => Promise<Result<Awaited<Return>, E>>
  : never;

type AsyncWrappedOverloads<Callable, E> = UnionToIntersection<
  OverloadUnion<Callable> extends infer One
    ? One extends unknown
      ? AsyncWrappedOne<One, E>
      : never
    : never
>;

const attemptRuntime = <T, E>(
  read: () => T,
  mapThrown: (caught: unknown) => E,
): Result<T, E> => {
  let value: T;

  try {
    value = read();
  } catch (caught) {
    return err(mapThrown(caught));
  }

  assertNotPromiseLike(value, "attempt() expects a synchronous thunk.");
  return ok(value);
};

/**
 * Captures one synchronous invocation boundary as Result.
 *
 * Thrown values are mapped from unknown into the caller's recoverable error
 * type. Promise-like returns are rejected as a sync-boundary contract error.
 * A thrown mapper remains an abrupt JavaScript completion.
 */
export function attempt<T extends SyncPrimitive, E>(
  read: () => T,
  mapThrown: (caught: unknown) => E,
): Result<T, E>;

export function attempt<T extends NonThenableObject, E>(
  read: () => T,
  mapThrown: (caught: unknown) => E,
): Result<T, E>;

export function attempt<T, E>(
  read: () => NotPromiseLike<T>,
  mapThrown: (caught: unknown) => E,
): Result<T, E>;

export function attempt<T, E>(
  read: () => T,
  mapThrown: (caught: unknown) => E,
): Result<T, E> {
  return attemptRuntime(read, mapThrown);
}

/**
 * Captures synchronous invocation plus Promise rejection as Result.
 *
 * The returned Promise resolves to Result; the mapper defines the recoverable
 * error vocabulary for both abrupt paths.
 */
export const attemptAsync = async <T, E>(
  read: () => PromiseLike<T>,
  mapThrown: (caught: unknown) => E,
): Promise<Result<Awaited<T>, E>> => {
  try {
    return ok(await read());
  } catch (caught) {
    return err(mapThrown(caught));
  }
};

/** Wraps a synchronous function with the attempt boundary while preserving this and arguments. */
export function wrap<Callable extends (...args: never[]) => unknown, E>(
  read: Callable &
    (true extends IsUnion<Callable> ? never : unknown) &
    (true extends IsUnion<OverloadUnion<Callable>> ? unknown : never) &
    (HasAsyncOverload<Callable> extends false ? unknown : never),
  mapThrown: (caught: unknown) => E,
): SyncWrappedOverloads<Callable, E>;

export function wrap<This, Args extends unknown[], T extends SyncPrimitive, E>(
  read: (this: This, ...args: Args) => T,
  mapThrown: (caught: unknown) => E,
): (this: This, ...args: Args) => Result<T, E>;

export function wrap<This, Args extends unknown[], T extends NonThenableObject, E>(
  read: (this: This, ...args: Args) => T,
  mapThrown: (caught: unknown) => E,
): (this: This, ...args: Args) => Result<T, E>;

export function wrap<This, Args extends unknown[], T, E>(
  read: (this: This, ...args: Args) => NotPromiseLike<T>,
  mapThrown: (caught: unknown) => E,
): (this: This, ...args: Args) => Result<T, E>;

export function wrap<This, Args extends unknown[], T, E>(
  read: (this: This, ...args: Args) => T,
  mapThrown: (caught: unknown) => E,
): (this: This, ...args: Args) => Result<T, E> {
  return function wrapped(this: This, ...args: Args): Result<T, E> {
    return attemptRuntime(() => Reflect.apply(read, this, args), mapThrown);
  };
}

/** Wraps an async function with the attemptAsync boundary while preserving this and arguments. */
export function wrapAsync<Callable extends (...args: never[]) => unknown, E>(
  read: Callable &
    (true extends IsUnion<Callable> ? never : unknown) &
    (true extends IsUnion<OverloadUnion<Callable>> ? unknown : never) &
    (HasNonPromiseOverload<Callable> extends false ? unknown : never),
  mapThrown: (caught: unknown) => E,
): AsyncWrappedOverloads<Callable, E>;

export function wrapAsync<This, Args extends unknown[], T, E>(
  read: (this: This, ...args: Args) => PromiseLike<T>,
  mapThrown: (caught: unknown) => E,
): (this: This, ...args: Args) => Promise<Result<Awaited<T>, E>>;

export function wrapAsync<This, Args extends unknown[], T, E>(
  read: (this: This, ...args: Args) => PromiseLike<T>,
  mapThrown: (caught: unknown) => E,
): (this: This, ...args: Args) => Promise<Result<Awaited<T>, E>> {
  return function wrappedAsync(
    this: This,
    ...args: Args
  ): Promise<Result<Awaited<T>, E>> {
    return attemptAsync(() => Reflect.apply(read, this, args), mapThrown);
  };
}
