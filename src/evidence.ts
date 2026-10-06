import {
  isBigint,
  isBoolean,
  isNumber,
  isString,
  isSymbol,
  type NarrowSymbolSet,
  type Scalar,
  type SingleName,
  type SingleSymbol,
} from "./internal/scalar.js";

export type { Scalar } from "./internal/scalar.js";

type EvidenceMarker = {
  readonly "~selaws.evidence": true;
};

/**
 * A stable fact established about a scalar value.
 *
 * Independent fact tokens occupy independent phantom properties, so evidence
 * composes while preserving existing identity and evidence on the same scalar.
 */
export type Evidence<T extends Scalar, Fact extends symbol> = [Fact] extends [never]
  ? never
  : [Fact] extends [NarrowSymbolSet<Fact>]
    ? T & {
        readonly [Key in Fact]: EvidenceMarker;
      }
    : never;

type Establish<T extends Scalar, Fact extends symbol> = <Value extends T>(
  value: Value,
) => Evidence<Value, Fact>;

/** Defines an owner-scoped formation boundary for one stable fact. */
export function defineFact<T extends Scalar>() {
  return function define<const Fact extends symbol, Api>(
    token: Fact & SingleSymbol<Fact>,
    build: (establish: Establish<T, Fact>) => Api,
  ): Api {
    void token;

    const establish = <Value extends T>(value: Value): Evidence<Value, Fact> =>
      value as Evidence<Value, Fact>;

    return build(establish);
  };
}

type SharedEvidence<T extends Scalar, Name extends string> = T & {
  readonly [Key in `~selaws.evidence:${Name}`]: true;
};

type Predicate<T> = (value: T) => boolean;

declare const evidenceDeclaration: unique symbol;

type LocalEvidenceDeclaration<T extends Scalar, Key extends symbol> = Readonly<{
  kind: "local";
  carrier: T;
  key: Key;
}>;

type SharedEvidenceDeclaration<T extends Scalar, Name extends string> = Readonly<{
  kind: "shared";
  carrier: T;
  name: Name;
}>;

interface LocalFact<T extends Scalar, Key extends symbol> {
  readonly [evidenceDeclaration]: LocalEvidenceDeclaration<T, Key>;
  <Value extends T>(value: Value): Evidence<Value, Key> | undefined;
  (value: unknown): Evidence<T, Key> | undefined;
}

interface SharedFact<T extends Scalar, Name extends string> {
  readonly [evidenceDeclaration]: SharedEvidenceDeclaration<T, Name>;
  <Value extends T>(value: Value): SharedEvidence<Value, Name> | undefined;
  (value: unknown): SharedEvidence<T, Name> | undefined;
}

type LocalFactFactory<T extends Scalar> = <const Key extends symbol>(
  key: Key & SingleSymbol<Key>,
  predicate: Predicate<T>,
) => LocalFact<T, Key>;

type SharedFactFactory<T extends Scalar> = <const Name extends string>(
  contract: Name & SingleName<Name>,
  predicate: Predicate<T>,
) => SharedFact<T, Name>;

const makeFact =
  <T extends Scalar>(
    isCarrier: (value: unknown) => value is T,
    expectedTokenKind: "string" | "symbol",
  ) =>
  (token: unknown, predicate: Predicate<T>) => {
    if (typeof token !== expectedTokenKind) {
      throw new TypeError(
        expectedTokenKind === "symbol"
          ? "Local evidence declarations require a symbol token."
          : "Shared evidence declarations require a string contract.",
      );
    }

    if (typeof predicate !== "function") {
      throw new TypeError("Evidence predicates must be functions.");
    }

    return (value: unknown) =>
      isCarrier(value) && predicate(value) ? value : undefined;
  };

const localFactFactory = <T extends Scalar>(
  isCarrier: (value: unknown) => value is T,
): LocalFactFactory<T> =>
  makeFact(isCarrier, "symbol") as unknown as LocalFactFactory<T>;

const sharedFactFactory = <T extends Scalar>(
  isCarrier: (value: unknown) => value is T,
): SharedFactFactory<T> =>
  makeFact(isCarrier, "string") as unknown as SharedFactFactory<T>;

type SharedEvidenceFacade = Readonly<{
  bigint: SharedFactFactory<bigint>;
  boolean: SharedFactFactory<boolean>;
  number: SharedFactFactory<number>;
  string: SharedFactFactory<string>;
  symbol: SharedFactFactory<symbol>;
}>;

type EvidenceFacade = Readonly<{
  bigint: LocalFactFactory<bigint>;
  boolean: LocalFactFactory<boolean>;
  define: typeof defineFact;
  number: LocalFactFactory<number>;
  shared: SharedEvidenceFacade;
  string: LocalFactFactory<string>;
  symbol: LocalFactFactory<symbol>;
}>;

const shared: SharedEvidenceFacade = {
  bigint: sharedFactFactory(isBigint),
  boolean: sharedFactFactory(isBoolean),
  number: sharedFactFactory(isNumber),
  string: sharedFactFactory(isString),
  symbol: sharedFactFactory(isSymbol),
};

/**
 * Stable scalar facts.
 *
 * Local factories use caller-owned symbol tokens. Shared factories require an
 * explicit string interoperability contract.
 */
export const evidence: EvidenceFacade = {
  bigint: localFactFactory(isBigint),
  boolean: localFactFactory(isBoolean),
  define: defineFact,
  number: localFactFactory(isNumber),
  shared,
  string: localFactFactory(isString),
  symbol: localFactFactory(isSymbol),
};

export namespace evidence {
  /** Applies an evidence declaration's fact type to an existing scalar value. */
  export type Proven<F, Value extends Scalar> = F extends {
    readonly [evidenceDeclaration]: infer Declaration;
  }
    ? Declaration extends LocalEvidenceDeclaration<infer T, infer Key>
      ? Value extends T
        ? Evidence<Value, Key>
        : never
      : Declaration extends SharedEvidenceDeclaration<infer T, infer Name>
        ? Value extends T
          ? SharedEvidence<Value, Name>
          : never
        : never
    : never;
}
