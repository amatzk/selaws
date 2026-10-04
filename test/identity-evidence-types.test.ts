import { defineFact, type Evidence, evidence } from "../src/evidence.js";
import {
  defineIdentity,
  type Identity,
  identity,
  type Scalar,
} from "../src/identity.js";

type Extends<Left, Right> = Left extends Right ? true : false;
type IsNever<Value> = [Value] extends [never] ? true : false;
type Expect<Value extends true> = Value;

// Low-level kernel ------------------------------------------------------------

const userIdKey: unique symbol = Symbol("UserId");
const orderIdKey: unique symbol = Symbol("OrderId");
const nonEmptyKey: unique symbol = Symbol("NonEmpty");
const asciiKey: unique symbol = Symbol("Ascii");

type UserId = Identity<string, typeof userIdKey>;
type OrderId = Identity<string, typeof orderIdKey>;
type NonEmpty<Value extends Scalar> = Evidence<Value, typeof nonEmptyKey>;
type Ascii<Value extends Scalar> = Evidence<Value, typeof asciiKey>;

const UserId = defineIdentity<string>()(userIdKey, (mint) => ({
  fromString(value: string): UserId {
    return mint(value);
  },

  fromLiteral<const Value extends string>(value: Value) {
    return mint(value);
  },
}));

const NonEmpty = defineFact<string>()(nonEmptyKey, (establish) => ({
  check<Value extends string>(value: Value) {
    return value.length > 0 ? establish(value) : undefined;
  },
}));

const Ascii = defineFact<string>()(asciiKey, (establish) => ({
  trustForTest<Value extends string>(value: Value) {
    return establish(value);
  },
}));

const userId = UserId.fromString("user-1");
const rawString: string = userId;
const sameUserId: UserId = userId;

// @ts-expect-error distinct declaration-owned identities are incompatible
const wrongIdentity: OrderId = userId;

// @ts-expect-error a raw carrier does not acquire identity accidentally
const forgedIdentity: UserId = "user-1";

const nonEmptyUserId = NonEmpty.check(userId);

if (nonEmptyUserId !== undefined) {
  const identitySurvivesEvidence: UserId = nonEmptyUserId;
  const factIsVisible: NonEmpty<UserId> = nonEmptyUserId;
  const asciiUserId = Ascii.trustForTest(nonEmptyUserId);

  const bothFacts: NonEmpty<Ascii<UserId>> = asciiUserId;
  const sameIdentity: UserId = asciiUserId;

  const transformed = asciiUserId.trim();

  // @ts-expect-error arbitrary transformations do not preserve established evidence
  const transformedStillNonEmpty: NonEmpty<string> = transformed;

  void identitySurvivesEvidence;
  void factIsVisible;
  void bothFacts;
  void sameIdentity;
  void transformedStillNonEmpty;
}

const nonEmptyRaw = NonEmpty.check("fixed");
if (nonEmptyRaw !== undefined) {
  const reminted = defineIdentity<string>()(userIdKey, (mint) => mint(nonEmptyRaw));
  const identity: UserId = reminted;
  const preservedFact: NonEmpty<string> = reminted;

  void identity;
  void preservedFact;
}

type NestedFacts = Evidence<Evidence<string, typeof nonEmptyKey>, typeof asciiKey>;
type FlatFacts = Evidence<string, typeof nonEmptyKey | typeof asciiKey>;

type _nestedToFlat = Expect<Extends<NestedFacts, FlatFacts>>;
type _flatToNested = Expect<Extends<FlatFacts, NestedFacts>>;
type _broadIdentityRejected = Expect<IsNever<Identity<string, symbol>>>;
type _unionIdentityRejected = Expect<
  IsNever<Identity<string, typeof userIdKey | typeof orderIdKey>>
>;
type _emptyIdentityRejected = Expect<IsNever<Identity<string, never>>>;
type _emptyEvidenceRejected = Expect<IsNever<Evidence<string, never>>>;
type _broadEvidenceRejected = Expect<IsNever<Evidence<string, symbol>>>;

declare const dynamicSymbolBrand: unique symbol;
type DynamicSymbol = symbol & {
  readonly [dynamicSymbolBrand]: true;
};

type _dynamicIdentityRejected = Expect<IsNever<Identity<string, DynamicSymbol>>>;
type _dynamicEvidenceRejected = Expect<IsNever<Evidence<string, DynamicSymbol>>>;
type _mixedDynamicEvidenceRejected = Expect<
  IsNever<Evidence<string, typeof nonEmptyKey | DynamicSymbol>>
>;

type ForeignIdentity<T extends Scalar, Id extends symbol> = T & {
  readonly [Key in Id]: {
    readonly "~selaws.identity": true;
  };
};

type ForeignUserId = ForeignIdentity<string, typeof userIdKey>;
declare const foreignUserId: ForeignUserId;

const duplicatePackageCompatible: UserId = foreignUserId;

const sharedStrictKey: unique symbol = Symbol("SharedStrict");
type SharedStrictIdentity = Identity<string, typeof sharedStrictKey>;
type SharedStrictEvidence = Evidence<SharedStrictIdentity, typeof sharedStrictKey>;
declare const sharedStrictIdentity: SharedStrictIdentity;

// @ts-expect-error identity alone does not establish evidence, even with the same token
const sharedStrictEvidenceForgery: SharedStrictEvidence = sharedStrictIdentity;

declare const sharedStrictEvidence: SharedStrictEvidence;
const sharedStrictIdentitySurvives: SharedStrictIdentity = sharedStrictEvidence;

declare const packageMarkerA: unique symbol;
declare const packageMarkerB: unique symbol;

type PackageOwnedA<T, Id extends symbol> = T & {
  readonly [packageMarkerA]: Id;
};
type PackageOwnedB<T, Id extends symbol> = T & {
  readonly [packageMarkerB]: Id;
};

declare const packageOwnedA: PackageOwnedA<string, typeof userIdKey>;

// @ts-expect-error package-owned markers split otherwise identical domain identity
const packageOwnedSplit: PackageOwnedB<string, typeof userIdKey> = packageOwnedA;

declare const broadSymbol: symbol;

// @ts-expect-error broad symbol values do not identify one declaration-owned identity
defineIdentity<string>()(broadSymbol, (mint) => ({ mint }));

declare const unionSymbol: typeof userIdKey | typeof orderIdKey;

// @ts-expect-error a union of symbols is not one identity token
defineIdentity<string>()(unionSymbol, (mint) => ({ mint }));

declare const dynamicSymbol: DynamicSymbol;

// @ts-expect-error a symbol subtype can still denote multiple runtime symbols
defineIdentity<string>()(dynamicSymbol, (mint) => ({ mint }));

// @ts-expect-error stable evidence requires one declaration-owned symbol
defineFact<string>()(dynamicSymbol, (establish) => ({ establish }));

// @ts-expect-error aggregate objects are outside Selaws's stable phantom-value kernel
type _invalidObjectIdentity = Identity<{ id: string }, typeof userIdKey>;

// @ts-expect-error aggregate objects cannot define scalar identity formation
defineIdentity<{ id: string }>();

// @ts-expect-error aggregate objects cannot define stable scalar evidence
defineFact<{ id: string }>();

// Ergonomic facade ------------------------------------------------------------

const NamedUserId = identity.string("NamedUserId");
type NamedUserId = identity.Value<typeof NamedUserId>;

const NamedOrderId = identity.string("NamedOrderId");
type NamedOrderId = identity.Value<typeof NamedOrderId>;

const namedUserId = NamedUserId("user-1");
const namedOrderId = NamedOrderId("order-1");

const namedUserIdAsString: string = namedUserId;
const namedUserIdAgain: NamedUserId = namedUserId;

// @ts-expect-error different named identities are incompatible
const namedWrongIdentity: NamedUserId = namedOrderId;

// @ts-expect-error raw carrier does not acquire a named identity accidentally
const namedForgedIdentity: NamedUserId = "user-1";

declare const unknownInput: unknown;
const namedFromUnknown = NamedUserId(unknownInput);
const namedMaybe: NamedUserId | undefined = namedFromUnknown;

const CheckedUserId = identity.string("CheckedUserId", (value) =>
  value.startsWith("user_"),
);
type CheckedUserId = identity.Value<typeof CheckedUserId>;

const checkedGood = CheckedUserId("user_1");
const checkedBad = CheckedUserId("bad");
const checkedUnknown = CheckedUserId(unknownInput);

const checkedGoodMaybe: CheckedUserId | undefined = checkedGood;
const checkedBadMaybe: CheckedUserId | undefined = checkedBad;
const checkedUnknownMaybe: CheckedUserId | undefined = checkedUnknown;

const NamedNonEmpty = evidence.string("NamedNonEmpty", (value) => value.length > 0);
const NamedAscii = evidence.string("NamedAscii", (value) =>
  [...value].every((character) => character.charCodeAt(0) <= 0x7f),
);

type _factCarrierMismatchRejected = Expect<
  IsNever<evidence.Proven<typeof NamedNonEmpty, number>>
>;

const namedNonEmptyUserId = NamedNonEmpty(namedUserId);

if (namedNonEmptyUserId !== undefined) {
  const namedIdentitySurvivesFact: NamedUserId = namedNonEmptyUserId;
  const namedFactType: evidence.Proven<typeof NamedNonEmpty, NamedUserId> =
    namedNonEmptyUserId;

  const namedAsciiUserId = NamedAscii(namedNonEmptyUserId);

  if (namedAsciiUserId !== undefined) {
    const namedBothFacts: evidence.Proven<
      typeof NamedAscii,
      evidence.Proven<typeof NamedNonEmpty, NamedUserId>
    > = namedAsciiUserId;
    const namedSameIdentity: NamedUserId = namedAsciiUserId;

    const namedTransformed = namedAsciiUserId.trim();

    // @ts-expect-error transformations do not preserve named evidence
    const namedTransformedStillProven: evidence.Proven<typeof NamedNonEmpty, string> =
      namedTransformed;

    void namedBothFacts;
    void namedSameIdentity;
    void namedTransformedStillProven;
  }

  void namedIdentitySurvivesFact;
  void namedFactType;
}

// Named identity deliberately uses the literal name as its owner.
const SharedNameA = identity.string("SharedName");
const SharedNameB = identity.string("SharedName");
type SharedNameA = identity.Value<typeof SharedNameA>;
type SharedNameB = identity.Value<typeof SharedNameB>;

declare const sharedNameA: SharedNameA;
const sharedNameCompatible: SharedNameB = sharedNameA;

// Re-forming an already identified scalar accumulates explicit identities
// instead of collapsing through a shared payload property.
const reidentified = NamedOrderId(namedUserId);
const reidentifiedAsUser: NamedUserId = reidentified;
const reidentifiedAsOrder: NamedOrderId = reidentified;
type _reidentifiedNotNever = Expect<
  IsNever<typeof reidentified> extends false ? true : false
>;

// Strict facade mode recovers declaration-owned identity.
const strictAKey = Symbol("Strict");
const strictBKey = Symbol("Strict");

const StrictA = identity.string(strictAKey);
const StrictB = identity.string(strictBKey);
type StrictA = identity.Value<typeof StrictA>;
type StrictB = identity.Value<typeof StrictB>;

declare const strictA: StrictA;

// @ts-expect-error separate strict declarations remain distinct
const strictWrong: StrictB = strictA;

const strictFactKey = Symbol("StrictFact");
const StrictFact = evidence.string(strictFactKey, (value) => value.length > 0);

const SharedStrictDomain = identity.string(sharedStrictKey);
const SharedStrictFact = evidence.string(sharedStrictKey, (value) => value.length > 0);
type SharedStrictDomain = identity.Value<typeof SharedStrictDomain>;
type SharedStrictProven = evidence.Proven<typeof SharedStrictFact, SharedStrictDomain>;
declare const sharedStrictDomainOnly: SharedStrictDomain;

// @ts-expect-error strict identity does not imply a same-token fact
const sharedStrictFacadeForgery: SharedStrictProven = sharedStrictDomainOnly;

const strictProven = StrictFact(strictA);
if (strictProven !== undefined) {
  const strictIdentitySurvives: StrictA = strictProven;
  const strictFactType: evidence.Proven<typeof StrictFact, StrictA> = strictProven;

  void strictIdentitySurvives;
  void strictFactType;
}

// Named facade identity is structural and therefore stable across helper copies.
type ForeignNamedUserId = string & {
  readonly "~selaws.identity:NamedUserId": true;
};
declare const foreignNamedUserId: ForeignNamedUserId;
const namedDuplicatePackageCompatible: NamedUserId = foreignNamedUserId;

declare const broadName: string;

// @ts-expect-error broad string names are not one stable named identity
identity.string(broadName);

declare const unionName: "A" | "B";

// @ts-expect-error a union name is not one stable named identity
identity.string(unionName);

declare const templateName: `Domain:${string}`;

// @ts-expect-error a template pattern can denote multiple runtime names
identity.string(templateName);

declare const dynamicNameBrand: unique symbol;
type DynamicName = string & {
  readonly [dynamicNameBrand]: true;
};
declare const dynamicName: DynamicName;

// @ts-expect-error a branded string can still denote multiple runtime names
identity.string(dynamicName);

// @ts-expect-error fact names also require one concrete literal
evidence.string(templateName, (value) => value.length > 0);

// @ts-expect-error strict facade keys require a unique symbol literal
identity.string(dynamicSymbol);

// @ts-expect-error strict fact keys require a unique symbol literal
evidence.string(dynamicSymbol, (value) => value.length > 0);

// @ts-expect-error inline Symbol() widens through the factory and is not strict identity
identity.string(Symbol("Inline"));

// @ts-expect-error strict factory rejects broad symbol values
identity.string(broadSymbol);

// @ts-expect-error fact names must also be one literal
evidence.string(broadName, (value) => value.length > 0);

void rawString;
void sameUserId;
void wrongIdentity;
void forgedIdentity;
void duplicatePackageCompatible;
void sharedStrictEvidenceForgery;
void sharedStrictIdentitySurvives;
void packageOwnedSplit;
void namedUserIdAsString;
void namedUserIdAgain;
void namedWrongIdentity;
void namedForgedIdentity;
void namedMaybe;
void checkedGoodMaybe;
void checkedBadMaybe;
void checkedUnknownMaybe;
void sharedNameCompatible;
void reidentifiedAsUser;
void reidentifiedAsOrder;
void strictWrong;
void sharedStrictFacadeForgery;
void namedDuplicatePackageCompatible;
