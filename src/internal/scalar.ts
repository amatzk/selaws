/** Immutable scalar carriers that can hold Selaws phantom meaning. */
export type Scalar = string | number | bigint | boolean | symbol;

export type Token = string | symbol;

export type IsUnion<T, Whole = T> = T extends Whole
  ? [Whole] extends [T]
    ? false
    : true
  : never;

// An empty record is assignable to broad, patterned, and branded key spaces,
// but not to one concrete property-key identity.
type SinglePropertyKey<Key extends PropertyKey> =
  true extends IsUnion<Key>
    ? never
    : Record<never, never> extends Record<Key, never>
      ? never
      : Key;

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
      ? SinglePropertyKey<Value & symbol>
      : [Value] extends [bigint]
        ? SingleName<`${Value & bigint}`> extends never
          ? never
          : Value
        : [Value] extends [boolean]
          ? true extends IsUnion<Value>
            ? never
            : boolean extends Value
              ? never
              : Value
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
