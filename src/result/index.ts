import { attempt, attemptAsync } from "./capture.js";
import {
  all,
  andThen,
  err,
  flatten,
  fromOption,
  fromValidation,
  isErr,
  isOk,
  map,
  mapError,
  match,
  ok,
  orElse,
  unwrapOr,
  unwrapOrElse,
} from "./core.js";
import { orThrow } from "./throw.js";

export { attempt, attemptAsync } from "./capture.js";
export {
  all,
  andThen,
  err,
  flatten,
  fromOption,
  fromValidation,
  isErr,
  isOk,
  map,
  mapError,
  match,
  ok,
  orElse,
  unwrapOr,
  unwrapOrElse,
} from "./core.js";
export { orThrow } from "./throw.js";

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

/** Extracts the success value type from a Result union. */
export type ResultValue<R> = R extends Ok<infer T> ? T : never;

/** Extracts the error value type from a Result union. */
export type ResultError<R> = R extends Err<infer E> ? E : never;

type ResultFacade = Readonly<{
  all: typeof all;
  andThen: typeof andThen;
  attempt: typeof attempt;
  attemptAsync: typeof attemptAsync;
  err: typeof err;
  flatten: typeof flatten;
  fromOption: typeof fromOption;
  fromValidation: typeof fromValidation;
  isErr: typeof isErr;
  isOk: typeof isOk;
  map: typeof map;
  mapError: typeof mapError;
  match: typeof match;
  ok: typeof ok;
  orElse: typeof orElse;
  orThrow: typeof orThrow;
  unwrapOr: typeof unwrapOr;
  unwrapOrElse: typeof unwrapOrElse;
}>;

/** Complete owner-qualified Result facade, including explicit control boundaries. */
export const Result: ResultFacade = {
  all,
  andThen,
  attempt,
  attemptAsync,
  err,
  flatten,
  fromOption,
  fromValidation,
  isErr,
  isOk,
  map,
  mapError,
  match,
  ok,
  orElse,
  orThrow,
  unwrapOr,
  unwrapOrElse,
};
