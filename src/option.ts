import type { CallbackResult } from "./internal/callback.js";
import { ownMatchHandler } from "./internal/match.js";
import { assertNotPromiseLike, type NotPromiseLike } from "./internal/promise-like.js";

/** A present Option value. */
export type Some<T> = Readonly<{
  some: true;
  value: T;
}>;

/** Reasonless absence. */
export type None = Readonly<{
  some: false;
}>;

/** Explicit presence or absence. */
export type Option<T> = Some<T> | None;

/** Extracts the present value type from an Option union. */
export type OptionValue<O> = O extends Some<infer T> ? T : never;

type OptionValues<O extends readonly Option<unknown>[]> = {
  [K in keyof O]: OptionValue<O[K]>;
};

type SynchronousReturn<T> = [T] extends [NotPromiseLike<T>] ? unknown : never;

type IsMutableArray<Value> = Value extends unknown[] ? true : false;

type StableArrayInput<Value extends readonly unknown[]> =
  true extends IsMutableArray<Value> ? never : unknown;

/** Constructs a present Option value. */
export const some = <T>(value: T): Option<T> => ({
  some: true,
  value,
});

/** Constructs reasonless absence. */
export const none = (): Option<never> => ({
  some: false,
});

/** Narrows an Option to Some. */
export const isSome = <T>(option: Option<T>): option is Some<T> => option.some;

/** Narrows an Option to None. */
export const isNone = <T>(option: Option<T>): option is None => !option.some;

/** Eliminates an Option under the shared Match law. */
export const match = <
  T,
  Some extends (this: void, value: NoInfer<T>) => unknown,
  None extends (this: void) => unknown,
>(
  option: Option<T>,
  arms: Readonly<{
    some: Some;
    none: None;
  }>,
): CallbackResult<Some> | CallbackResult<None> => {
  if (option.some) {
    const selected = ownMatchHandler<Some>(arms, "some");
    return selected(option.value) as CallbackResult<Some>;
  }

  const selected = ownMatchHandler<None>(arms, "none");
  return selected() as CallbackResult<None>;
};

/** Transforms the Some value and preserves None. */
export const map = <T, U>(option: Option<T>, transform: (value: T) => U): Option<U> =>
  option.some ? some(transform(option.value)) : option;

/** Sequences an Option-producing computation when a value is present. */
export const andThen = <T, U>(
  option: Option<T>,
  next: (value: T) => Option<U>,
): Option<U> => (option.some ? next(option.value) : option);

/** Lazily provides another Option when the input is None. */
export const orElse = <T, U>(
  option: Option<T>,
  fallback: () => Option<U>,
): Option<T | U> => (option.some ? option : fallback());

/** Removes one explicit nested Option layer. */
export const flatten = <T>(option: Option<Option<T>>): Option<T> =>
  option.some ? option.value : option;

/** Retains Some when a type-guard predicate accepts its value. */
export function filter<T, U extends T>(
  option: Option<T>,
  predicate: (value: T) => value is U,
): Option<U>;

/** Retains Some when the predicate accepts its value. */
export function filter<T>(
  option: Option<T>,
  predicate: (value: T) => boolean,
): Option<T>;

export function filter<T>(
  option: Option<T>,
  predicate: (value: T) => boolean,
): Option<T> {
  if (!option.some) {
    return option;
  }
  return predicate(option.value) ? option : none();
}

/** Synchronously observes Some and returns the original Option. */
export const inspect = <T, R>(
  option: Option<T>,
  observe: ((value: T) => R) & SynchronousReturn<R>,
): Option<T> => {
  if (option.some) {
    const completion = observe(option.value);
    assertNotPromiseLike(
      completion,
      "Option.inspect() expects a synchronous observer.",
    );
  }
  return option;
};

/** Returns the Some value or an eager fallback. */
export const unwrapOr = <T, U>(option: Option<T>, fallback: U): T | U =>
  option.some ? option.value : fallback;

/** Returns the Some value or evaluates a lazy fallback. */
export const unwrapOrElse = <T, U>(option: Option<T>, fallback: () => U): T | U =>
  option.some ? option.value : fallback();

/**
 * Combines already-materialized Options.
 *
 * All Some values produce a position-preserving tuple; any None produces None.
 */
export const all = <const O extends readonly Option<unknown>[]>(
  options: O & StableArrayInput<O>,
): Option<OptionValues<O>> => {
  const values: unknown[] = [];
  const length = options.length;

  for (let index = 0; index < length; index += 1) {
    const option = options[index] as Option<unknown>;
    if (!option.some) {
      return none();
    }
    values.push(option.value);
  }

  return some(values as OptionValues<O>);
};

/** Maps exactly undefined to None and every other value to Some. */
export const fromUndefined = <T>(value: T): Option<Exclude<T, undefined>> =>
  value === undefined ? none() : some(value as Exclude<T, undefined>);

/** Maps null or undefined to None and every other value to Some. */
export const fromNullable = <T>(value: T): Option<NonNullable<T>> =>
  value === undefined || value === null ? none() : some(value as NonNullable<T>);

/** Maps None to undefined and returns the Some value unchanged. */
export const toUndefined = <T>(option: Option<T>): T | undefined =>
  option.some ? option.value : undefined;

/** Maps None to null and returns the Some value unchanged. */
export const toNullable = <T>(option: Option<T>): T | null =>
  option.some ? option.value : null;

type OptionFacade = Readonly<{
  all: typeof all;
  andThen: typeof andThen;
  filter: typeof filter;
  flatten: typeof flatten;
  fromNullable: typeof fromNullable;
  fromUndefined: typeof fromUndefined;
  inspect: typeof inspect;
  isNone: typeof isNone;
  isSome: typeof isSome;
  map: typeof map;
  match: typeof match;
  none: typeof none;
  orElse: typeof orElse;
  some: typeof some;
  toNullable: typeof toNullable;
  toUndefined: typeof toUndefined;
  unwrapOr: typeof unwrapOr;
  unwrapOrElse: typeof unwrapOrElse;
}>;

/** Facade for Option construction, transformation, elimination, and collection. */
export const Option: OptionFacade = {
  all,
  andThen,
  filter,
  flatten,
  fromNullable,
  fromUndefined,
  inspect,
  isNone,
  isSome,
  map,
  match,
  none,
  orElse,
  some,
  toNullable,
  toUndefined,
  unwrapOr,
  unwrapOrElse,
};
