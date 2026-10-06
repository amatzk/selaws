import {
  isBigint,
  isBoolean,
  isNumber,
  isScalar,
  isString,
  isSymbol,
  type Scalar,
  type SingleName,
  type SingleSymbol,
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
 * Selaws installations when the caller shares that same symbol.
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
    if (typeof token !== "symbol") {
      throw new TypeError("Local identity declarations require a symbol token.");
    }

    if (typeof build !== "function") {
      throw new TypeError("Identity declaration builders must be functions.");
    }

    const mint = <Value extends T>(value: Value): Identity<Value, Id> => {
      if (!isScalar(value)) {
        throw new TypeError("Identity formation values must be scalars.");
      }

      return value as Identity<Value, Id>;
    };

    return build(mint);
  };
}

type SharedIdentity<T extends Scalar, Name extends string> = T & {
  readonly [Key in `~selaws.identity:${Name}`]: true;
};

type Predicate<T> = (value: T) => boolean;

type IdentityDeclarationProperty = "~selaws.identity.declaration";

type LocalIdentityDeclaration<T extends Scalar, Key extends symbol> = Readonly<{
  kind: "local";
  carrier: T;
  key: Key;
}>;

type SharedIdentityDeclaration<T extends Scalar, Name extends string> = Readonly<{
  kind: "shared";
  carrier: T;
  name: Name;
}>;

type IdentityDeclarationOf<Domain> = IdentityDeclarationProperty extends keyof Domain
  ? Domain extends {
      readonly "~selaws.identity.declaration"?: infer Declaration;
    }
    ? Exclude<Declaration, undefined>
    : never
  : never;

interface LocalOpenIdentity<T extends Scalar, Key extends symbol> {
  readonly "~selaws.identity.declaration"?: LocalIdentityDeclaration<T, Key>;
  <Value extends T>(value: Value): Identity<Value, Key>;
  (value: unknown): Identity<T, Key> | undefined;
}

interface LocalCheckedIdentity<T extends Scalar, Key extends symbol> {
  readonly "~selaws.identity.declaration"?: LocalIdentityDeclaration<T, Key>;
  <Value extends T>(value: Value): Identity<Value, Key> | undefined;
  (value: unknown): Identity<T, Key> | undefined;
}

interface SharedOpenIdentity<T extends Scalar, Name extends string> {
  readonly "~selaws.identity.declaration"?: SharedIdentityDeclaration<T, Name>;
  <Value extends T>(value: Value): SharedIdentity<Value, Name>;
  (value: unknown): SharedIdentity<T, Name> | undefined;
}

interface SharedCheckedIdentity<T extends Scalar, Name extends string> {
  readonly "~selaws.identity.declaration"?: SharedIdentityDeclaration<T, Name>;
  <Value extends T>(value: Value): SharedIdentity<Value, Name> | undefined;
  (value: unknown): SharedIdentity<T, Name> | undefined;
}

interface LocalIdentityFactory<T extends Scalar> {
  <const Key extends symbol>(key: Key & SingleSymbol<Key>): LocalOpenIdentity<T, Key>;

  <const Key extends symbol>(
    key: Key & SingleSymbol<Key>,
    predicate: Predicate<T>,
  ): LocalCheckedIdentity<T, Key>;
}

interface SharedIdentityFactory<T extends Scalar> {
  <const Name extends string>(
    contract: Name & SingleName<Name>,
  ): SharedOpenIdentity<T, Name>;

  <const Name extends string>(
    contract: Name & SingleName<Name>,
    predicate: Predicate<T>,
  ): SharedCheckedIdentity<T, Name>;
}

const makeIdentity =
  <T extends Scalar>(
    isCarrier: (value: unknown) => value is T,
    expectedTokenKind: "string" | "symbol",
  ) =>
  (token: unknown, predicate?: Predicate<T>) => {
    if (typeof token !== expectedTokenKind) {
      throw new TypeError(
        expectedTokenKind === "symbol"
          ? "Local identity declarations require a symbol token."
          : "Shared identity declarations require a string contract.",
      );
    }

    if (predicate !== undefined && typeof predicate !== "function") {
      throw new TypeError("Identity predicates must be functions.");
    }

    return (value: unknown) =>
      isCarrier(value) && (predicate === undefined || predicate(value))
        ? value
        : undefined;
  };

const localIdentityFactory = <T extends Scalar>(
  isCarrier: (value: unknown) => value is T,
): LocalIdentityFactory<T> =>
  makeIdentity(isCarrier, "symbol") as unknown as LocalIdentityFactory<T>;

const sharedIdentityFactory = <T extends Scalar>(
  isCarrier: (value: unknown) => value is T,
): SharedIdentityFactory<T> =>
  makeIdentity(isCarrier, "string") as unknown as SharedIdentityFactory<T>;

type SharedIdentityFacade = Readonly<{
  bigint: SharedIdentityFactory<bigint>;
  boolean: SharedIdentityFactory<boolean>;
  number: SharedIdentityFactory<number>;
  string: SharedIdentityFactory<string>;
  symbol: SharedIdentityFactory<symbol>;
}>;

type IdentityFacade = Readonly<{
  bigint: LocalIdentityFactory<bigint>;
  boolean: LocalIdentityFactory<boolean>;
  define: typeof defineIdentity;
  number: LocalIdentityFactory<number>;
  shared: SharedIdentityFacade;
  string: LocalIdentityFactory<string>;
  symbol: LocalIdentityFactory<symbol>;
}>;

const shared: SharedIdentityFacade = {
  bigint: sharedIdentityFactory(isBigint),
  boolean: sharedIdentityFactory(isBoolean),
  number: sharedIdentityFactory(isNumber),
  string: sharedIdentityFactory(isString),
  symbol: sharedIdentityFactory(isSymbol),
};

/**
 * Scalar identity formation.
 *
 * Local factories use caller-owned symbol tokens. Shared factories require an
 * explicit string interoperability contract.
 */
export const identity: IdentityFacade = {
  bigint: localIdentityFactory(isBigint),
  boolean: localIdentityFactory(isBoolean),
  define: defineIdentity,
  number: localIdentityFactory(isNumber),
  shared,
  string: localIdentityFactory(isString),
  symbol: localIdentityFactory(isSymbol),
};

export namespace identity {
  /** Extracts the scalar identity value type produced by an identity declaration. */
  export type Value<Domain> =
    IdentityDeclarationOf<Domain> extends infer Declaration
      ? Declaration extends LocalIdentityDeclaration<infer T, infer Key>
        ? Identity<T, Key>
        : Declaration extends SharedIdentityDeclaration<infer T, infer Name>
          ? SharedIdentity<T, Name>
          : never
      : never;
}
