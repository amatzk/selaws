import type { Result } from "./core.js";

/** Converts Err into an explicitly mapped thrown value and returns Ok unchanged. */
export const orThrow = <T, E>(
  result: Result<T, E>,
  mapErrorToThrowable: (error: E) => unknown,
): T => {
  if (result.ok) {
    return result.value;
  }

  throw mapErrorToThrowable(result.error);
};
