import {
  isBigint,
  isBoolean,
  isNumber,
  isString,
  isSymbol,
  type Scalar,
  type SingleName,
  type SingleSymbol,
  type Token,
} from "./internal/scalar.js";

export type { Scalar } from "./internal/scalar.js";

type IdentityMarker = {
  readonly "~selaws.identity": true;
};

/**
 * A scalar carrying one declaration-owned nominal identity.
 *
 * The domain token is the phantom property key itself, so identity belongs to
 * the declaration that owns the token and remains stable across duplicate
 * Selaws installations.
 */
export type Identity<T extends Scalar, Id extends symbol> = [Id] extends [never]
  ? never
  : [Id] extends [SingleSymbol<Id>]
    ? T & {
        readonly [Key in Id]: IdentityMarker;
      }
    : never;

type Mint<T extends Scalar, Id extends symbol> = <Value extends T>(
  value: Value,
) => Identity<Value, Id>;

/** Defines an owner-scoped formation boundary for one nominal identity. */
export function defineIdentity<T extends Scalar>() {
  return function define<const Id extends symbol, Api>(
    token: Id & SingleSymbol<Id>,
    build: (mint: Mint<T, Id>) => Api,
  ): Api {
    void token;

    const mint = <Value extends T>(value: Value): Identity<Value, Id> =>
      value as Identity<Value, Id>;

    return build(mint);
  };
}

type NamedIdentity<T extends Scalar, Name extends string> = T & {
  readonly [Key in `~selaws.identity:${Name}`]: true;
};

type DomainIdentity<
  T extends Scalar,
  TokenValue extends Token,
> = TokenValue extends string
  ? NamedIdentity<T, TokenValue>
  : TokenValue extends symbol
    ? Identity<T, TokenValue>
    : never;

type Predicate<T> = (value: T) => boolean;

interface OpenIdentity<T extends Scalar, TokenValue extends Token> {
  <Value extends T>(value: Value): DomainIdentity<Value, TokenValue>;
  (value: unknown): DomainIdentity<T, TokenValue> | undefined;
}

interface CheckedIdentity<T extends Scalar, TokenValue extends Token> {
  <Value extends T>(value: Value): DomainIdentity<Value, TokenValue> | undefined;
  (value: unknown): DomainIdentity<T, TokenValue> | undefined;
}

interface IdentityFactory<T extends Scalar> {
  <const Name extends string>(name: Name & SingleName<Name>): OpenIdentity<T, Name>;

  <const Name extends string>(
    name: Name & SingleName<Name>,
    predicate: Predicate<T>,
  ): CheckedIdentity<T, Name>;

  <const Key extends symbol>(key: Key & SingleSymbol<Key>): OpenIdentity<T, Key>;

  <const Key extends symbol>(
    key: Key & SingleSymbol<Key>,
    predicate: Predicate<T>,
  ): CheckedIdentity<T, Key>;
}

const identityFactory = <T extends Scalar>(
  isCarrier: (value: unknown) => value is T,
): IdentityFactory<T> =>
  ((_token: Token, predicate?: Predicate<T>) => (value: unknown) =>
    isCarrier(value) && (predicate === undefined || predicate(value))
      ? value
      : undefined) as unknown as IdentityFactory<T>;

type IdentityFacade = Readonly<{
  bigint: IdentityFactory<bigint>;
  boolean: IdentityFactory<boolean>;
  define: typeof defineIdentity;
  number: IdentityFactory<number>;
  string: IdentityFactory<string>;
  symbol: IdentityFactory<symbol>;
}>;

/** Scalar identity formation with named or declaration-owned identity. */
export const identity: IdentityFacade = {
  bigint: identityFactory(isBigint),
  boolean: identityFactory(isBoolean),
  define: defineIdentity,
  number: identityFactory(isNumber),
  string: identityFactory(isString),
  symbol: identityFactory(isSymbol),
};

export namespace identity {
  /** Extracts the scalar identity value type produced by an identity declaration. */
  export type Value<Domain> =
    Domain extends OpenIdentity<infer T, infer TokenValue>
      ? DomainIdentity<T, TokenValue>
      : Domain extends CheckedIdentity<infer T, infer TokenValue>
        ? DomainIdentity<T, TokenValue>
        : never;
}
