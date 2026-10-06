import type { CallbackResult } from "../internal/callback.js";
import { ownMatchHandler } from "../internal/match.js";
import { assertNotPromiseLike, type NotPromiseLike } from "../internal/promise-like.js";
import type { Option } from "../option.js";
import type { Validation, ValidationIssues } from "../validation.js";

/** A successful Result value. */
export type Ok<T> = Readonly<{
  ok: true;
  value: T;
}>;

/** A recoverable Result error value. */
export type Err<E> = Readonly<{
  ok: false;
  error: E;
}>;

/** Recoverable success or error with fail-fast composition. */
export type Result<T, E> = Ok<T> | Err<E>;

/** Native Promise composition around a Result value. */
export type AsyncResult<T, E> = Promise<Result<T, E>>;

/** Extracts the success value type from a Result union. */
export type ResultValue<R> = R extends Ok<infer T> ? T : never;

/** Extracts the error value type from a Result union. */
export type ResultError<R> = R extends Err<infer E> ? E : never;

type ResultValues<R extends readonly Result<unknown, unknown>[]> = {
  [K in keyof R]: ResultValue<R[K]>;
};

type ValidationResultError<E> = [E] extends [never] ? never : ValidationIssues<E>;

type SynchronousReturn<T> = [T] extends [NotPromiseLike<T>] ? unknown : never;

type IsMutableArray<Value> = Value extends unknown[] ? true : false;

type StableArrayInput<Value extends readonly unknown[]> =
  true extends IsMutableArray<Value> ? never : unknown;

/** Constructs a successful Result and preserves the error axis as never. */
export const ok = <T>(value: T): Result<T, never> => ({
  ok: true,
  value,
});

/** Constructs an error Result and preserves the value axis as never. */
export const err = <E>(error: E): Result<never, E> => ({
  error,
  ok: false,
});

/** Narrows a Result to Ok. */
export const isOk = <T, E>(result: Result<T, E>): result is Ok<T> => result.ok;

/** Narrows a Result to Err. */
export const isErr = <T, E>(result: Result<T, E>): result is Err<E> => !result.ok;

/** Eliminates a Result under the shared Match law. */
export const match = <
  T,
  E,
  OkHandler extends (this: void, value: NoInfer<T>) => unknown,
  ErrHandler extends (this: void, error: NoInfer<E>) => unknown,
>(
  result: Result<T, E>,
  arms: Readonly<{
    ok: OkHandler;
    err: ErrHandler;
  }>,
): CallbackResult<OkHandler> | CallbackResult<ErrHandler> => {
  if (result.ok) {
    const selected = ownMatchHandler<OkHandler>(arms, "ok");
    return selected(result.value) as CallbackResult<OkHandler>;
  }

  const selected = ownMatchHandler<ErrHandler>(arms, "err");
  return selected(result.error) as CallbackResult<ErrHandler>;
};

/** Transforms Ok and preserves Err. */
export const map = <T, E, U>(
  result: Result<T, E>,
  transform: (value: T) => U,
): Result<U, E> => (result.ok ? ok(transform(result.value)) : result);

/** Transforms Err and preserves Ok. */
export const mapError = <T, E, F>(
  result: Result<T, E>,
  transform: (error: E) => F,
): Result<T, F> => (result.ok ? result : err(transform(result.error)));

/** Sequences a dependent Result-producing success step. */
export const andThen = <T, E, U, F>(
  result: Result<T, E>,
  next: (value: T) => Result<U, F>,
): Result<U, E | F> => (result.ok ? next(result.value) : result);

/** Recovers from Err with another Result. */
export const orElse = <T, E, U, F>(
  result: Result<T, E>,
  recover: (error: E) => Result<U, F>,
): Result<T | U, F> => (result.ok ? result : recover(result.error));

/** Removes one explicit nested Result layer. */
export const flatten = <T, E, F>(result: Result<Result<T, F>, E>): Result<T, E | F> =>
  result.ok ? result.value : result;

/** Synchronously observes Ok and returns the original Result. */
export const inspect = <T, E, R>(
  result: Result<T, E>,
  observe: ((value: T) => R) & SynchronousReturn<R>,
): Result<T, E> => {
  if (result.ok) {
    const completion = observe(result.value);
    assertNotPromiseLike(
      completion,
      "Result.inspect() expects a synchronous observer.",
    );
  }
  return result;
};

/** Synchronously observes Err and returns the original Result. */
export const inspectError = <T, E, R>(
  result: Result<T, E>,
  observe: ((error: E) => R) & SynchronousReturn<R>,
): Result<T, E> => {
  if (!result.ok) {
    const completion = observe(result.error);
    assertNotPromiseLike(
      completion,
      "Result.inspectError() expects a synchronous observer.",
    );
  }
  return result;
};

/** Returns the Ok value or an eager fallback. */
export const unwrapOr = <T, E, U>(result: Result<T, E>, fallback: U): T | U =>
  result.ok ? result.value : fallback;

/** Returns the Ok value or evaluates a lazy fallback from Err. */
export const unwrapOrElse = <T, E, U>(
  result: Result<T, E>,
  fallback: (error: E) => U,
): T | U => (result.ok ? result.value : fallback(result.error));

/**
 * Combines already-materialized Results in input order.
 *
 * The first Err is returned; complete success preserves tuple positions.
 */
export const all = <const R extends readonly Result<unknown, unknown>[]>(
  results: R & StableArrayInput<R>,
): Result<ResultValues<R>, ResultError<R[number]>> => {
  const values: unknown[] = [];
  const length = results.length;

  for (let index = 0; index < length; index += 1) {
    const result = results[index] as Result<unknown, unknown>;
    if (!result.ok) {
      return result as Err<ResultError<R[number]>>;
    }
    values.push(result.value);
  }

  return ok(values as ResultValues<R>);
};

/** Converts presence into Result, lazily creating an error for None. */
export const fromOption = <T, E>(option: Option<T>, onNone: () => E): Result<T, E> =>
  option.some ? ok(option.value) : err(onNone());

/**
 * Converts Validation into Result.
 *
 * Invalid contributes its complete non-empty issue collection as one Result
 * error value.
 */
export const fromValidation = <T, E>(
  validation: Validation<T, E>,
): Result<T, ValidationResultError<E>> =>
  validation.valid
    ? ok(validation.value)
    : (err(validation.errors) as Result<T, ValidationResultError<E>>);

type ResultFacade = Readonly<{
  all: typeof all;
  andThen: typeof andThen;
  err: typeof err;
  flatten: typeof flatten;
  fromOption: typeof fromOption;
  fromValidation: typeof fromValidation;
  inspect: typeof inspect;
  inspectError: typeof inspectError;
  isErr: typeof isErr;
  isOk: typeof isOk;
  map: typeof map;
  mapError: typeof mapError;
  match: typeof match;
  ok: typeof ok;
  orElse: typeof orElse;
  unwrapOr: typeof unwrapOr;
  unwrapOrElse: typeof unwrapOrElse;
}>;

/** Facade for Result construction, transformation, elimination, and collection. */
export const Result: ResultFacade = {
  all,
  andThen,
  err,
  flatten,
  fromOption,
  fromValidation,
  inspect,
  inspectError,
  isErr,
  isOk,
  map,
  mapError,
  match,
  ok,
  orElse,
  unwrapOr,
  unwrapOrElse,
};
