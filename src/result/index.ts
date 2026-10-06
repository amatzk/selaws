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
export type { Err, Ok, ResultError, ResultValue } from "./core.js";
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

/** Recoverable success or error with fail-fast composition. */
export type Result<T, E> = import("./core.js").Result<T, E>;

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
