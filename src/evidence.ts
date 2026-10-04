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
  type Token,
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

type NamedEvidence<T extends Scalar, Name extends string> = T & {
  readonly [Key in `~selaws.evidence:${Name}`]: true;
};

type FactEvidence<
  T extends Scalar,
  TokenValue extends Token,
> = TokenValue extends string
  ? NamedEvidence<T, TokenValue>
  : TokenValue extends symbol
    ? Evidence<T, TokenValue>
    : never;

type Predicate<T> = (value: T) => boolean;

interface Fact<T extends Scalar, TokenValue extends Token> {
  <Value extends T>(value: Value): FactEvidence<Value, TokenValue> | undefined;
  (value: unknown): FactEvidence<T, TokenValue> | undefined;
}

interface FactFactory<T extends Scalar> {
  <const Name extends string>(
    name: Name & SingleName<Name>,
    predicate: Predicate<T>,
  ): Fact<T, Name>;

  <const Key extends symbol>(
    key: Key & SingleSymbol<Key>,
    predicate: Predicate<T>,
  ): Fact<T, Key>;
}

const factFactory = <T extends Scalar>(
  isCarrier: (value: unknown) => value is T,
): FactFactory<T> =>
  ((_token: Token, predicate: Predicate<T>) => (value: unknown) =>
    isCarrier(value) && predicate(value)
      ? value
      : undefined) as unknown as FactFactory<T>;

type EvidenceFacade = Readonly<{
  bigint: FactFactory<bigint>;
  boolean: FactFactory<boolean>;
  define: typeof defineFact;
  number: FactFactory<number>;
  string: FactFactory<string>;
  symbol: FactFactory<symbol>;
}>;

/** Stable scalar facts with named or declaration-owned evidence. */
export const evidence: EvidenceFacade = {
  bigint: factFactory(isBigint),
  boolean: factFactory(isBoolean),
  define: defineFact,
  number: factFactory(isNumber),
  string: factFactory(isString),
  symbol: factFactory(isSymbol),
};

export namespace evidence {
  /** Applies an evidence declaration's fact type to an existing scalar value. */
  export type Proven<F, Value extends Scalar> =
    F extends Fact<infer T, infer TokenValue>
      ? Value extends T
        ? FactEvidence<Value, TokenValue>
        : never
      : never;
}
