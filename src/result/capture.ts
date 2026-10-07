import type { NotPromiseLike } from "../internal/promise-like.js";
import { err, ok, type Result } from "./core.js";

type SyncPrimitive = string | number | boolean | bigint | symbol | null | undefined;

type NonThenableObject = object & {
  readonly then?: never;
};

const assertSynchronousCompletion = (value: unknown): void => {
  if ((typeof value !== "object" && typeof value !== "function") || value === null) {
    return;
  }

  let then: unknown;

  try {
    then = Reflect.get(value, "then");
  } catch (cause) {
    throw new TypeError(
      "attempt() could not establish synchronous completion because reading the returned value's then property threw.",
      { cause },
    );
  }

  if (typeof then === "function") {
    throw new TypeError("attempt() expects a synchronous thunk.");
  }
};

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

  assertSynchronousCompletion(value);
  return ok(value);
};

/**
 * Captures one synchronous invocation boundary as Result.
 *
 * Thrown values are mapped from unknown into the caller's recoverable error
 * type. A callable returned `then`, or failure while observing `then`, is a
 * sync-boundary contract error outside that mapper. A thrown mapper remains an
 * abrupt JavaScript completion.
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
 * Captures one asynchronous invocation boundary as Result.
 *
 * Invocation throws and returned Promise-like rejection are mapped through the
 * same caller-owned recoverable error vocabulary. A thrown mapper remains an
 * abrupt JavaScript completion.
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
