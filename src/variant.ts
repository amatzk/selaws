import type { CallbackResult } from "./internal/callback.js";
import { ownMatchHandler } from "./internal/match.js";
import type { SingleName, SingleSymbol, Token } from "./internal/scalar.js";

type UnitSpec = symbol & {
  readonly "~selaws.variant.case": "unit";
};

type PayloadSpec<T> = symbol & {
  readonly "~selaws.variant.case": "payload";
  readonly "~selaws.variant.payload": T;
};

type CaseSpec = UnitSpec | PayloadSpec<unknown>;
type CaseSpecs = Readonly<Record<string, CaseSpec>>;
type CaseEntry = readonly [name: string, spec: CaseSpec];

type IsUnion<T, Whole = T> = T extends Whole
  ? [Whole] extends [T]
    ? false
    : true
  : never;

type EntryName<Entry> = Entry extends readonly [infer Name extends string, CaseSpec]
  ? Name
  : never;

type EntrySpec<Entry> = Entry extends readonly [string, infer Spec extends CaseSpec]
  ? Spec
  : never;

type InvalidCaseEntry<Entries extends readonly CaseEntry[]> = {
  [Index in keyof Entries]: Entries[Index] extends readonly [
    infer Name extends string,
    infer Spec extends CaseSpec,
  ]
    ? Name extends SingleName<Name>
      ? [Spec] extends [UnitSpec]
        ? never
        : [Spec] extends [PayloadSpec<unknown>]
          ? never
          : Index
      : Index
    : Index;
}[number];

type DuplicateCaseName<
  Entries extends readonly CaseEntry[],
  Seen extends string = never,
> = Entries extends readonly [
  infer Head extends CaseEntry,
  ...infer Tail extends readonly CaseEntry[],
]
  ? EntryName<Head> extends Seen
    ? EntryName<Head>
    : DuplicateCaseName<Tail, Seen | EntryName<Head>>
  : never;

type IsMutableArray<Value> = Value extends unknown[] ? true : false;

type ClosedCaseEntries<Entries extends readonly CaseEntry[]> =
  true extends IsUnion<Entries>
    ? never
    : true extends IsMutableArray<Entries>
      ? never
      : true extends IsMutableArray<Entries[number]>
        ? never
        : number extends Entries["length"]
          ? never
          : [InvalidCaseEntry<Entries>] extends [never]
            ? [DuplicateCaseName<Entries>] extends [never]
              ? unknown
              : never
            : never;

type EntrySpecForName<
  Entries extends readonly CaseEntry[],
  Name extends string,
> = EntrySpec<Extract<Entries[number], readonly [Name, CaseSpec]>>;

type CaseSpecsFromEntries<Entries extends readonly CaseEntry[]> = Readonly<{
  [Name in EntryName<Entries[number]>]: EntrySpecForName<Entries, Name>;
}>;

type CaseName<Specs extends CaseSpecs> = Extract<keyof Specs, string>;

type PayloadOf<Spec> = Spec extends PayloadSpec<infer T> ? T : never;

type CaseSignature<Spec extends CaseSpec> = Spec extends UnitSpec
  ? Readonly<{ kind: "unit" }>
  : Spec extends PayloadSpec<infer T>
    ? Readonly<{ kind: "payload"; payload: T }>
    : never;

type FamilySignature<Specs extends CaseSpecs> = {
  readonly [K in keyof Specs]: CaseSignature<Specs[K]>;
};

type VariantMarker<Specs extends CaseSpecs> = Readonly<{
  "~selaws.variant": true;
  cases: FamilySignature<Specs>;
  names: (name: keyof Specs) => keyof Specs;
}>;

type FamilyBrand<
  TokenValue extends Token,
  Specs extends CaseSpecs,
> = TokenValue extends string
  ? {
      readonly [K in `~selaws.variant:${TokenValue}`]: VariantMarker<Specs>;
    }
  : TokenValue extends symbol
    ? {
        readonly [K in TokenValue]: VariantMarker<Specs>;
      }
    : never;

type UnitCase<
  TokenValue extends Token,
  Specs extends CaseSpecs,
  Name extends CaseName<Specs>,
> = Readonly<{
  tag: Name;
}> &
  FamilyBrand<TokenValue, Specs>;

type PayloadCase<
  TokenValue extends Token,
  Specs extends CaseSpecs,
  Name extends CaseName<Specs>,
  Payload,
> = Readonly<{
  tag: Name;
  value: Payload;
}> &
  FamilyBrand<TokenValue, Specs>;

type VariantValue<
  TokenValue extends Token,
  Specs extends CaseSpecs,
  Name extends CaseName<Specs> = CaseName<Specs>,
> =
  Name extends CaseName<Specs>
    ? Specs[Name] extends UnitSpec
      ? UnitCase<TokenValue, Specs, Name>
      : PayloadCase<TokenValue, Specs, Name, PayloadOf<Specs[Name]>>
    : never;

type Constructors<TokenValue extends Token, Specs extends CaseSpecs> = Readonly<{
  [Name in CaseName<Specs>]: Specs[Name] extends UnitSpec
    ? () => UnitCase<TokenValue, Specs, Name>
    : <Value extends PayloadOf<Specs[Name]>>(
        value: Value,
      ) => PayloadCase<TokenValue, Specs, Name, Value>;
}>;

type Matchers<Specs extends CaseSpecs> = Readonly<{
  [Name in CaseName<Specs>]: Specs[Name] extends UnitSpec
    ? (this: void) => unknown
    : (this: void, value: PayloadOf<Specs[Name]>) => unknown;
}>;

type MatchResult<
  Specs extends CaseSpecs,
  Handlers extends Matchers<Specs>,
> = CallbackResult<Handlers[CaseName<Specs>]>;

type NoExtraHandlerKeys<Handlers, Name extends PropertyKey> =
  Exclude<keyof Handlers, Name> extends never ? unknown : never;

type VariantFamily<TokenValue extends Token, Specs extends CaseSpecs> = Readonly<{
  make: Constructors<TokenValue, Specs>;
  /** Eliminates this family under the shared Match law. */
  match<const Handlers extends Matchers<Specs>>(
    value: VariantValue<TokenValue, Specs>,
    handlers: Handlers & NoExtraHandlerKeys<Handlers, CaseName<Specs>>,
  ): MatchResult<Specs, Handlers>;
}>;

type ConstructorValue<Constructor> = Constructor extends (
  ...args: never[]
) => infer Value
  ? Value
  : never;

/** Extracts the closed value union produced by one Variant family. */
export type Variant<Family> = Family extends {
  readonly make: infer Make extends object;
}
  ? ConstructorValue<Make[keyof Make]>
  : never;

const unitSpec = Symbol.for("selaws.variant.unit") as UnitSpec;
const payloadSpec = Symbol.for("selaws.variant.payload") as PayloadSpec<unknown>;

/** Declares one nullary Variant case. */
export const unit: UnitSpec = unitSpec;

/** Declares one Variant case carrying a payload of T. */
export const payload = <T>(): PayloadSpec<T> => payloadSpec as PayloadSpec<T>;

type RuntimeKind = "unit" | "payload";

const createFamily = <TokenValue extends Token, Entries extends readonly CaseEntry[]>(
  token: TokenValue,
  entries: Entries,
): VariantFamily<TokenValue, CaseSpecsFromEntries<Entries>> => {
  void token;

  if (!Array.isArray(entries)) {
    throw new TypeError("Variant case declarations must be arrays.");
  }

  const length = entries.length;
  const kinds = new Map<string, RuntimeKind>();
  const constructors = Object.create(null) as Record<string, unknown>;

  for (let index = 0; index < length; index += 1) {
    if (!Object.hasOwn(entries, index)) {
      throw new TypeError("Variant case declarations must contain own case entries.");
    }

    const entry = entries[index] as unknown;

    if (
      !Array.isArray(entry) ||
      entry.length !== 2 ||
      !Object.hasOwn(entry, 0) ||
      !Object.hasOwn(entry, 1)
    ) {
      throw new TypeError("Variant cases must be own [name, spec] pairs.");
    }

    const name = entry[0];
    const spec = entry[1];

    if (typeof name !== "string") {
      throw new TypeError("Variant case names must be strings.");
    }

    if (kinds.has(name)) {
      throw new TypeError("Variant case names must be unique.");
    }

    if (spec === unitSpec) {
      kinds.set(name, "unit");
      Object.defineProperty(constructors, name, {
        configurable: false,
        enumerable: true,
        value: () => ({ tag: name }),
        writable: false,
      });
      continue;
    }

    if (spec === payloadSpec) {
      kinds.set(name, "payload");
      Object.defineProperty(constructors, name, {
        configurable: false,
        enumerable: true,
        value: (value: unknown) => ({ tag: name, value }),
        writable: false,
      });
      continue;
    }

    throw new TypeError(
      "Variant cases must be declared with Variant.unit or Variant.payload().",
    );
  }

  Object.freeze(constructors);

  const family: VariantFamily<TokenValue, CaseSpecsFromEntries<Entries>> = {
    make: constructors as Constructors<TokenValue, CaseSpecsFromEntries<Entries>>,
    match<const Handlers extends Matchers<CaseSpecsFromEntries<Entries>>>(
      value: VariantValue<TokenValue, CaseSpecsFromEntries<Entries>>,
      handlers: Handlers &
        NoExtraHandlerKeys<Handlers, CaseName<CaseSpecsFromEntries<Entries>>>,
    ): MatchResult<CaseSpecsFromEntries<Entries>, Handlers> {
      if (
        value === null ||
        (typeof value !== "object" && typeof value !== "function")
      ) {
        throw new TypeError("Variant values must be tagged objects.");
      }

      const tagDescriptor = Object.getOwnPropertyDescriptor(value, "tag");
      const tag =
        tagDescriptor !== undefined && Object.hasOwn(tagDescriptor, "value")
          ? tagDescriptor.value
          : undefined;

      if (typeof tag !== "string") {
        throw new TypeError("Variant values must provide an own data tag.");
      }

      const kind = kinds.get(tag);

      if (kind === undefined) {
        throw new TypeError("Variant value has an undeclared case tag.");
      }

      const handler = ownMatchHandler<(this: void, value?: unknown) => unknown>(
        handlers,
        tag,
      );

      if (kind === "unit") {
        return handler() as MatchResult<CaseSpecsFromEntries<Entries>, Handlers>;
      }

      const valueDescriptor = Object.getOwnPropertyDescriptor(value, "value");
      if (valueDescriptor === undefined || !Object.hasOwn(valueDescriptor, "value")) {
        throw new TypeError("Variant payload cases must provide an own data value.");
      }

      return handler(valueDescriptor.value) as MatchResult<
        CaseSpecsFromEntries<Entries>,
        Handlers
      >;
    },
  };

  return Object.freeze(family);
};

/** Defines one declaration-owned closed Variant family. */
export const define = <
  const TokenValue extends symbol,
  const Entries extends readonly CaseEntry[],
>(
  token: TokenValue & SingleSymbol<TokenValue>,
  entries: Entries,
  ..._closed: ClosedCaseEntries<Entries> extends never ? [never] : []
): VariantFamily<TokenValue, CaseSpecsFromEntries<Entries>> => {
  if (typeof token !== "symbol") {
    throw new TypeError("Local Variant declarations require a symbol token.");
  }

  return createFamily<TokenValue, Entries>(token, entries);
};

/** Defines one intentionally shared structural Variant family contract. */
export const shared = <
  const Name extends string,
  const Entries extends readonly CaseEntry[],
>(
  contract: Name & SingleName<Name>,
  entries: Entries,
  ..._closed: ClosedCaseEntries<Entries> extends never ? [never] : []
): VariantFamily<Name, CaseSpecsFromEntries<Entries>> => {
  if (typeof contract !== "string") {
    throw new TypeError("Shared Variant declarations require a string contract.");
  }

  return createFamily<Name, Entries>(contract, entries);
};

type VariantFacade = Readonly<{
  define: typeof define;
  payload: typeof payload;
  shared: typeof shared;
  unit: typeof unit;
}>;

/** Closed labeled alternatives with explicit local or shared family identity. */
export const Variant: VariantFacade = {
  define,
  payload,
  shared,
  unit,
};

export namespace Variant {
  /** Extracts the closed value union produced by one Variant family. */
  export type Value<Family> = import("./variant.js").Variant<Family>;

  /** Extracts one named case from an exported Variant value union. */
  export type Case<
    Value extends Readonly<{ tag: string }>,
    Name extends Value["tag"],
  > = Extract<Value, Readonly<{ tag: Name }>>;
}
