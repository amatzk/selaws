/** Immutable scalar carriers that can hold Selaws phantom meaning. */
export type Scalar = string | number | bigint | boolean | symbol;

export type Token = string | symbol;

export type IsUnion<T, Whole = T> = T extends Whole
  ? [Whole] extends [T]
    ? false
    : true
  : never;

// A raw literal must not carry a distinct nominal enum type. In particular,
// separate enum members with equal runtime values can be disjoint in TypeScript.
type Same<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? (<T>() => T extends B ? 1 : 2) extends <T>() => T extends A ? 1 : 2
      ? true
      : false
    : false;

type RawPropertyKey<Key extends PropertyKey> = Key extends string
  ? `${Key}`
  : Key extends number
    ? `${Key}` extends `${infer NumberValue extends number}`
      ? NumberValue
      : never
    : Key;

// An empty record is assignable to broad, patterned, and branded key spaces,
// but not to one concrete property-key identity.
export type SinglePropertyKey<Key extends PropertyKey> =
  true extends IsUnion<Key>
    ? never
    : Record<never, never> extends Record<Key, never>
      ? never
      : Same<Key, RawPropertyKey<Key>> extends true
        ? Key
        : never;

type SingleToken<Key extends Token> = SinglePropertyKey<Key>;

type SingletonSymbolMembers<Key extends symbol> = Key extends unknown
  ? SingleToken<Key>
  : never;

export type NarrowSymbolSet<Key extends symbol> = [Key] extends [
  SingletonSymbolMembers<Key>,
]
  ? Key
  : never;

export type SingleSymbol<Key extends symbol> = SingleToken<Key>;
export type SingleName<Name extends string> = SingleToken<Name>;

/** One concrete scalar identity rather than a broad or alternative scalar space. */
export type SingleScalar<Value extends Scalar> = [Value] extends [string]
  ? SinglePropertyKey<Value & string>
  : [Value] extends [number]
    ? SinglePropertyKey<Value & number>
    : [Value] extends [symbol]
      ? never
      : [Value] extends [bigint]
        ? SingleName<`${Value & bigint}`> extends never
          ? never
          : Value
        : [Value] extends [boolean]
          ? [Value] extends [true]
            ? true extends Value
              ? Value
              : never
            : [Value] extends [false]
              ? false extends Value
                ? Value
                : never
              : never
          : never;

export const isString = (value: unknown): value is string => typeof value === "string";

export const isNumber = (value: unknown): value is number => typeof value === "number";

export const isBigint = (value: unknown): value is bigint => typeof value === "bigint";

export const isBoolean = (value: unknown): value is boolean =>
  typeof value === "boolean";

export const isSymbol = (value: unknown): value is symbol => typeof value === "symbol";

export const isScalar = (value: unknown): value is Scalar =>
  isString(value) ||
  isNumber(value) ||
  isBigint(value) ||
  isBoolean(value) ||
  isSymbol(value);
