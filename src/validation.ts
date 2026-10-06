import type { CallbackResult } from "./internal/callback.js";
import { ownMatchHandler } from "./internal/match.js";
import type { SingleName, SingleSymbol } from "./internal/scalar.js";
import type { Option } from "./option.js";
import type { Result } from "./result/core.js";

/** Non-empty ordered Validation issues. */
export type ValidationIssues<E> = readonly [E, ...E[]];

/** A successful Validation value. */
export type Valid<T> = Readonly<{
  valid: true;
  value: T;
}>;

/** One-or-more accumulated Validation issues. */
export type Invalid<E> = Readonly<{
  valid: false;
  issues: ValidationIssues<E>;
}>;

/** Valid data or a non-empty ordered issue collection. */
export type Validation<T, E> = Valid<T> | Invalid<E>;

/** Extracts the successful value type from a Validation union. */
export type ValidationValue<V> = V extends Valid<infer T> ? T : never;

/** Extracts one issue type from a Validation union. */
export type ValidationIssue<V> = V extends Invalid<infer E> ? E : never;

type ValidationValues<V extends readonly Validation<unknown, unknown>[]> = {
  [K in keyof V]: ValidationValue<V[K]>;
};

type ValidationStructKey = string | symbol;
type ValidationStructEntry = readonly [
  key: ValidationStructKey,
  validation: Validation<unknown, unknown>,
];

type IsUnion<T, Whole = T> = T extends Whole
  ? [Whole] extends [T]
    ? false
    : true
  : never;

type StructKey<Entry> = Entry extends readonly [
  infer Key extends ValidationStructKey,
  Validation<unknown, unknown>,
]
  ? Key
  : never;

type StructValidation<Entry> = Entry extends readonly [
  ValidationStructKey,
  infer V extends Validation<unknown, unknown>,
]
  ? V
  : never;

type InvalidStructEntry<Entries extends readonly ValidationStructEntry[]> = {
  [Index in keyof Entries]: Entries[Index] extends readonly [
    infer Key extends ValidationStructKey,
    Validation<unknown, unknown>,
  ]
    ? Key extends string
      ? Key extends SingleName<Key>
        ? never
        : Index
      : Key extends symbol
        ? Key extends SingleSymbol<Key>
          ? never
          : Index
        : Index
    : Index;
}[number];

type DuplicateStructKey<
  Entries extends readonly ValidationStructEntry[],
  Seen extends ValidationStructKey = never,
> = Entries extends readonly [
  infer Head extends ValidationStructEntry,
  ...infer Tail extends readonly ValidationStructEntry[],
]
  ? StructKey<Head> extends Seen
    ? StructKey<Head>
    : DuplicateStructKey<Tail, Seen | StructKey<Head>>
  : never;

type IsMutableArray<Value> = Value extends unknown[] ? true : false;

type ClosedStructEntries<Entries extends readonly ValidationStructEntry[]> =
  true extends IsUnion<Entries>
    ? never
    : true extends IsMutableArray<Entries>
      ? never
      : true extends IsMutableArray<Entries[number]>
        ? never
        : number extends Entries["length"]
          ? never
          : [InvalidStructEntry<Entries>] extends [never]
            ? [DuplicateStructKey<Entries>] extends [never]
              ? unknown
              : never
            : never;

type ValidationForKey<
  Entries extends readonly ValidationStructEntry[],
  Key extends ValidationStructKey,
> = StructValidation<
  Extract<Entries[number], readonly [Key, Validation<unknown, unknown>]>
>;

type ValidationStructValues<Entries extends readonly ValidationStructEntry[]> =
  Readonly<{
    [Key in StructKey<Entries[number]>]: ValidationValue<
      ValidationForKey<Entries, Key>
    >;
  }>;

type ValidationStructIssue<Entries extends readonly ValidationStructEntry[]> =
  ValidationIssue<StructValidation<Entries[number]>>;

type StableArrayInput<Value extends readonly unknown[]> =
  true extends IsMutableArray<Value> ? never : unknown;

const isObjectLike = (value: unknown): value is object =>
  (typeof value === "object" || typeof value === "function") && value !== null;

type ValidationSnapshot =
  | Readonly<{ valid: true; value: unknown }>
  | Readonly<{ valid: false; issues: readonly unknown[] }>;

const readValidationValue = (value: unknown): ValidationSnapshot | undefined => {
  if (!isObjectLike(value) || !Object.hasOwn(value, "valid")) {
    return undefined;
  }

  const valid = (value as { readonly valid?: unknown }).valid;

  if (valid === true) {
    if (!Object.hasOwn(value, "value")) {
      return undefined;
    }

    return {
      valid: true,
      value: (value as { readonly value?: unknown }).value,
    };
  }

  if (valid === false) {
    if (!Object.hasOwn(value, "issues")) {
      return undefined;
    }

    const issues = (value as { readonly issues?: unknown }).issues;
    if (!Array.isArray(issues)) {
      return undefined;
    }

    const length = issues.length;
    if (length === 0) {
      return undefined;
    }

    const snapshot: unknown[] = [];

    for (let index = 0; index < length; index += 1) {
      if (!Object.hasOwn(issues, index)) {
        return undefined;
      }
      snapshot.push(issues[index]);
    }

    return {
      issues: snapshot,
      valid: false,
    };
  }

  return undefined;
};

const appendIssues = (target: unknown[], issues: readonly unknown[]): void => {
  const length = issues.length;

  for (let index = 0; index < length; index += 1) {
    target.push(issues[index]);
  }
};

/** Constructs a successful Validation and preserves the issue axis as never. */
export const valid = <T>(value: T): Validation<T, never> => ({
  valid: true,
  value,
});

/** Constructs an Invalid with at least one issue and preserves issue order. */
export const invalid = <const E extends readonly [unknown, ...unknown[]]>(
  ...issues: E
): Validation<never, E[number]> => {
  if (issues.length === 0) {
    throw new TypeError("Validation.invalid() expects at least one issue.");
  }

  return {
    issues,
    valid: false,
  };
};

/** Narrows a Validation to Valid. */
export const isValid = <T, E>(validation: Validation<T, E>): validation is Valid<T> =>
  validation.valid;

/** Narrows a Validation to Invalid. */
export const isInvalid = <T, E>(
  validation: Validation<T, E>,
): validation is Invalid<E> => !validation.valid;

/** Eliminates a Validation under the shared Match law. */
export const match = <
  T,
  E,
  ValidHandler extends (this: void, value: NoInfer<T>) => unknown,
  InvalidHandler extends (this: void, issues: ValidationIssues<NoInfer<E>>) => unknown,
>(
  validation: Validation<T, E>,
  arms: Readonly<{
    valid: ValidHandler;
    invalid: InvalidHandler;
  }>,
): CallbackResult<ValidHandler> | CallbackResult<InvalidHandler> => {
  if (validation.valid) {
    const selected = ownMatchHandler<ValidHandler>(arms, "valid");
    return selected(validation.value) as CallbackResult<ValidHandler>;
  }

  const selected = ownMatchHandler<InvalidHandler>(arms, "invalid");
  return selected(validation.issues) as CallbackResult<InvalidHandler>;
};

/** Transforms Valid and preserves Invalid. */
export const map = <T, E, U>(
  validation: Validation<T, E>,
  transform: (value: T) => U,
): Validation<U, E> =>
  validation.valid ? valid(transform(validation.value)) : validation;

/** Transforms every issue one-for-one while preserving issue order. */
export const mapIssue = <T, E, F>(
  validation: Validation<T, E>,
  transform: (issue: E) => F,
): Validation<T, F> => {
  if (validation.valid) {
    return validation;
  }

  const sourceIssues = validation.issues;
  const length = sourceIssues.length;
  const snapshot: E[] = [];

  for (let index = 0; index < length; index += 1) {
    snapshot.push(sourceIssues[index] as E);
  }

  const issues: F[] = [];

  for (let index = 0; index < length; index += 1) {
    issues.push(transform(snapshot[index] as E));
  }

  return {
    issues: issues as unknown as ValidationIssues<F>,
    valid: false,
  };
};

/** Returns the Valid value or an eager fallback. */
export const unwrapOr = <T, E, U>(validation: Validation<T, E>, fallback: U): T | U =>
  validation.valid ? validation.value : fallback;

/** Returns the Valid value or evaluates a lazy fallback from all issues. */
export const unwrapOrElse = <T, E, U>(
  validation: Validation<T, E>,
  fallback: (issues: ValidationIssues<E>) => U,
): T | U => (validation.valid ? validation.value : fallback(validation.issues));

/**
 * Accumulates already-materialized tuple/array Validations.
 *
 * Complete success preserves value positions. Failure concatenates every issue
 * collection in input order.
 */
export const all = <const V extends readonly Validation<unknown, unknown>[]>(
  validations: V & StableArrayInput<V>,
): Validation<ValidationValues<V>, ValidationIssue<V[number]>> => {
  const values: unknown[] = [];
  const issues: unknown[] = [];
  let hasIssues = false;
  const length = validations.length;

  for (let index = 0; index < length; index += 1) {
    const validation = validations[index] as Validation<unknown, unknown>;
    if (validation.valid) {
      values.push(validation.value);
    } else {
      hasIssues = true;
      appendIssues(issues, validation.issues);
    }
  }

  if (hasIssues) {
    return {
      issues: issues as unknown as ValidationIssues<ValidationIssue<V[number]>>,
      valid: false,
    };
  }

  return valid(values as ValidationValues<V>);
};

/**
 * Accumulates a finite exact list of keyed, already-materialized Validations.
 *
 * Complete success preserves the declared key/value shape. Failure concatenates
 * every issue collection in entry order.
 */
export const struct = <const Entries extends readonly ValidationStructEntry[]>(
  entries: Entries,
  ..._closed: ClosedStructEntries<Entries> extends never ? [never] : []
): Validation<ValidationStructValues<Entries>, ValidationStructIssue<Entries>> => {
  if (!Array.isArray(entries)) {
    throw new TypeError("Validation.struct() expects an array of entries.");
  }

  const entryCount = entries.length;
  const keys: ValidationStructKey[] = [];
  const values: unknown[] = [];
  const issues: unknown[] = [];
  const seen = new Set<ValidationStructKey>();
  let hasIssues = false;

  for (let index = 0; index < entryCount; index += 1) {
    if (!Object.hasOwn(entries, index)) {
      throw new TypeError("Validation.struct() expects own entry positions.");
    }

    const entry = entries[index] as unknown;

    if (
      !Array.isArray(entry) ||
      entry.length !== 2 ||
      !Object.hasOwn(entry, 0) ||
      !Object.hasOwn(entry, 1)
    ) {
      throw new TypeError("Validation.struct() expects own [key, Validation] pairs.");
    }

    const key = entry[0] as unknown;
    if (typeof key !== "string" && typeof key !== "symbol") {
      throw new TypeError("Validation.struct() keys must be strings or symbols.");
    }

    if (seen.has(key)) {
      throw new TypeError("Validation.struct() keys must be unique.");
    }
    seen.add(key);
    keys.push(key);

    const validation = readValidationValue(entry[1]);
    if (validation === undefined) {
      throw new TypeError(
        "Validation.struct() expects every entry value to be a Validation.",
      );
    }

    if (validation.valid) {
      values.push(validation.value);
    } else {
      hasIssues = true;
      values.push(undefined);
      appendIssues(issues, validation.issues);
    }
  }

  if (hasIssues) {
    return {
      issues: issues as unknown as ValidationIssues<ValidationStructIssue<Entries>>,
      valid: false,
    };
  }

  const output: Record<PropertyKey, unknown> = {};

  for (let index = 0; index < entryCount; index += 1) {
    const key = keys[index] as ValidationStructKey;

    Object.defineProperty(output, key, {
      configurable: true,
      enumerable: true,
      value: values[index],
      writable: true,
    });
  }

  return valid(output as ValidationStructValues<Entries>);
};

/** Converts Ok to Valid and Err to one Invalid issue. */
export const fromResult = <T, E>(result: Result<T, E>): Validation<T, E> =>
  result.ok ? valid(result.value) : invalid(result.error);

/** Converts presence into Validation, lazily creating one issue for None. */
export const fromOption = <T, E>(
  option: Option<T>,
  onNone: () => E,
): Validation<T, E> => (option.some ? valid(option.value) : invalid(onNone()));

type ValidationFacade = Readonly<{
  all: typeof all;
  fromOption: typeof fromOption;
  fromResult: typeof fromResult;
  invalid: typeof invalid;
  isInvalid: typeof isInvalid;
  isValid: typeof isValid;
  map: typeof map;
  mapIssue: typeof mapIssue;
  match: typeof match;
  struct: typeof struct;
  unwrapOr: typeof unwrapOr;
  unwrapOrElse: typeof unwrapOrElse;
  valid: typeof valid;
}>;

/** Facade for Validation construction, transformation, and accumulation. */
export const Validation: ValidationFacade = {
  all,
  fromOption,
  fromResult,
  invalid,
  isInvalid,
  isValid,
  map,
  mapIssue,
  match,
  struct,
  unwrapOr,
  unwrapOrElse,
  valid,
};
