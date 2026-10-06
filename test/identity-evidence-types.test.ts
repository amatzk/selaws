import { defineFact, type Evidence, evidence } from "../src/evidence.js";
import {
  defineIdentity,
  type Identity,
  identity,
  type Scalar,
} from "../src/identity.js";

type Extends<Left, Right> = Left extends Right ? true : false;
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? (<T>() => T extends B ? 1 : 2) extends <T>() => T extends A ? 1 : 2
      ? true
      : false
    : false;
type IsNever<Value> = [Value] extends [never] ? true : false;
type Expect<Value extends true> = Value;

// Low-level declaration-owned kernel ------------------------------------------

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

// @ts-expect-error aggregate objects are outside the stable scalar phantom kernel
type _invalidObjectIdentity = Identity<{ id: string }, typeof userIdKey>;

// @ts-expect-error aggregate objects cannot define scalar identity formation
defineIdentity<{ id: string }>();

// @ts-expect-error aggregate objects cannot define stable scalar evidence
defineFact<{ id: string }>();

// Local facade ----------------------------------------------------------------

const localUserIdKey: unique symbol = Symbol("UserId");
const localOrderIdKey: unique symbol = Symbol("OrderId");
const localNonEmptyKey: unique symbol = Symbol("NonEmpty");
const localAsciiKey: unique symbol = Symbol("Ascii");

const LocalUserId = identity.string(localUserIdKey);
type LocalUserId = identity.Value<typeof LocalUserId>;

const LocalOrderId = identity.string(localOrderIdKey);
type LocalOrderId = identity.Value<typeof LocalOrderId>;

const localUserId = LocalUserId("user-1");
const localOrderId = LocalOrderId("order-1");

const localUserIdAsString: string = localUserId;
const localUserIdAgain: LocalUserId = localUserId;

// @ts-expect-error different local declarations remain incompatible
const localWrongIdentity: LocalUserId = localOrderId;

// @ts-expect-error raw carrier does not acquire local identity accidentally
const localForgedIdentity: LocalUserId = "user-1";

declare const unknownInput: unknown;
const localFromUnknown = LocalUserId(unknownInput);
const localMaybe: LocalUserId | undefined = localFromUnknown;

const checkedUserIdKey: unique symbol = Symbol("CheckedUserId");
const CheckedUserId = identity.string(checkedUserIdKey, (value) =>
  value.startsWith("user_"),
);
type CheckedUserId = identity.Value<typeof CheckedUserId>;

const checkedGood = CheckedUserId("user_1");
const checkedBad = CheckedUserId("bad");
const checkedUnknown = CheckedUserId(unknownInput);

const checkedGoodMaybe: CheckedUserId | undefined = checkedGood;
const checkedBadMaybe: CheckedUserId | undefined = checkedBad;
const checkedUnknownMaybe: CheckedUserId | undefined = checkedUnknown;

const LocalNonEmpty = evidence.string(localNonEmptyKey, (value) => value.length > 0);
const LocalAscii = evidence.string(localAsciiKey, (value) =>
  [...value].every((character) => character.charCodeAt(0) <= 0x7f),
);

type _factCarrierMismatchRejected = Expect<
  IsNever<evidence.Proven<typeof LocalNonEmpty, number>>
>;
type _arbitraryCallableIsNotIdentityDeclaration = Expect<
  IsNever<identity.Value<(value: unknown) => string>>
>;
type _arbitraryCallableIsNotEvidenceDeclaration = Expect<
  IsNever<evidence.Proven<(value: unknown) => string, string>>
>;

const localNonEmptyUserId = LocalNonEmpty(localUserId);

if (localNonEmptyUserId !== undefined) {
  const identitySurvivesFact: LocalUserId = localNonEmptyUserId;
  const factType: evidence.Proven<typeof LocalNonEmpty, LocalUserId> =
    localNonEmptyUserId;

  const localAsciiUserId = LocalAscii(localNonEmptyUserId);

  if (localAsciiUserId !== undefined) {
    const bothFacts: evidence.Proven<
      typeof LocalAscii,
      evidence.Proven<typeof LocalNonEmpty, LocalUserId>
    > = localAsciiUserId;
    const sameIdentity: LocalUserId = localAsciiUserId;

    const transformed = localAsciiUserId.trim();

    // @ts-expect-error transformations do not preserve established evidence
    const transformedStillProven: evidence.Proven<typeof LocalNonEmpty, string> =
      transformed;

    void bothFacts;
    void sameIdentity;
    void transformedStillProven;
  }

  void identitySurvivesFact;
  void factType;
}

const sameDescriptionAKey: unique symbol = Symbol("SameDescription");
const sameDescriptionBKey: unique symbol = Symbol("SameDescription");
const SameDescriptionA = identity.string(sameDescriptionAKey);
const SameDescriptionB = identity.string(sameDescriptionBKey);
type SameDescriptionA = identity.Value<typeof SameDescriptionA>;
type SameDescriptionB = identity.Value<typeof SameDescriptionB>;
declare const sameDescriptionA: SameDescriptionA;

// @ts-expect-error symbol description spelling does not create semantic identity
const sameDescriptionB: SameDescriptionB = sameDescriptionA;
void sameDescriptionB;

const reidentified = LocalOrderId(localUserId);
const reidentifiedAsUser: LocalUserId = reidentified;
const reidentifiedAsOrder: LocalOrderId = reidentified;
type _reidentifiedNotNever = Expect<
  IsNever<typeof reidentified> extends false ? true : false
>;

const sameLocalToken = Symbol("SameLocal");
const SameLocalA = identity.string(sameLocalToken);
const SameLocalB = identity.string(sameLocalToken);
type SameLocalA = identity.Value<typeof SameLocalA>;
type SameLocalB = identity.Value<typeof SameLocalB>;
declare const sameLocalA: SameLocalA;
const sameLocalForward: SameLocalB = sameLocalA;

const sameFactToken = Symbol("SameFact");
const SameFactA = evidence.string(sameFactToken, (value) => value.length > 0);
const SameFactB = evidence.string(sameFactToken, (value) => value.length > 0);
const sameFact = SameFactA("value");
if (sameFact !== undefined) {
  const sameFactForward: evidence.Proven<typeof SameFactB, string> = sameFact;
  void sameFactForward;
}

declare const broadLocalSymbol: symbol;

// @ts-expect-error local factories require one unique symbol identity
identity.string(broadLocalSymbol);

// @ts-expect-error local fact factories require one unique symbol identity
evidence.string(broadLocalSymbol, (value) => value.length > 0);

// @ts-expect-error local identity factories do not accept string contracts
identity.string("example.domain/UserId@1");

// @ts-expect-error local evidence factories do not accept string contracts
evidence.string("example.fact/NonEmpty@1", (value) => value.length > 0);

// Shared facade ---------------------------------------------------------------

const SharedUserId = identity.shared.string("example.domain/UserId@1");
type SharedUserId = identity.Value<typeof SharedUserId>;

const SharedUserIdAgain = identity.shared.string("example.domain/UserId@1");
type SharedUserIdAgain = identity.Value<typeof SharedUserIdAgain>;

declare const sharedUserId: SharedUserId;
const sharedCompatible: SharedUserIdAgain = sharedUserId;

const SharedOrderId = identity.shared.string("example.domain/OrderId@1");
type SharedOrderId = identity.Value<typeof SharedOrderId>;

// @ts-expect-error distinct shared contracts remain distinct identities
const sharedWrongIdentity: SharedOrderId = sharedUserId;

const SharedNonEmpty = evidence.shared.string(
  "example.fact/NonEmpty@1",
  (value) => value.length > 0,
);
const SharedNonEmptyAgain = evidence.shared.string(
  "example.fact/NonEmpty@1",
  (value) => value.length > 0,
);

const sharedProven = SharedNonEmpty(sharedUserId);
if (sharedProven !== undefined) {
  const sharedIdentitySurvives: SharedUserId = sharedProven;
  const sharedFactCompatible: evidence.Proven<
    typeof SharedNonEmptyAgain,
    SharedUserId
  > = sharedProven;

  void sharedIdentitySurvives;
  void sharedFactCompatible;
}

type ForeignSharedUserId = string & {
  readonly "~selaws.identity:example.domain/UserId@1": true;
};
declare const foreignSharedUserId: ForeignSharedUserId;
const sharedDuplicatePackageCompatible: SharedUserId = foreignSharedUserId;

type ForeignSharedNonEmpty<Value extends string> = Value & {
  readonly "~selaws.evidence:example.fact/NonEmpty@1": true;
};
declare const foreignSharedNonEmpty: ForeignSharedNonEmpty<SharedUserId>;
const sharedEvidenceCompatible: evidence.Proven<typeof SharedNonEmpty, SharedUserId> =
  foreignSharedNonEmpty;

declare const broadName: string;

// @ts-expect-error shared contracts require one concrete literal
identity.shared.string(broadName);

declare const unionName: "A" | "B";

// @ts-expect-error a union is not one shared contract identity
identity.shared.string(unionName);

declare const templateName: `Domain:${string}`;

// @ts-expect-error a template pattern can denote multiple shared contracts
identity.shared.string(templateName);

declare const dynamicNameBrand: unique symbol;
type DynamicName = string & {
  readonly [dynamicNameBrand]: true;
};
declare const dynamicName: DynamicName;

// @ts-expect-error a branded broad string is not one shared contract
identity.shared.string(dynamicName);

// @ts-expect-error fact contracts use the same single-name rule
evidence.shared.string(templateName, (value) => value.length > 0);

// @ts-expect-error shared identity factories do not accept symbol tokens
identity.shared.string(localUserIdKey);

// @ts-expect-error shared evidence factories do not accept symbol tokens
evidence.shared.string(localNonEmptyKey, (value) => value.length > 0);

type _localAndSharedAreDistinct = Expect<
  Equal<LocalUserId, SharedUserId> extends false ? true : false
>;

void rawString;
void sameUserId;
void wrongIdentity;
void forgedIdentity;
void duplicatePackageCompatible;
void sharedStrictEvidenceForgery;
void sharedStrictIdentitySurvives;
void localUserIdAsString;
void localUserIdAgain;
void localWrongIdentity;
void localForgedIdentity;
void localMaybe;
void checkedGoodMaybe;
void checkedBadMaybe;
void checkedUnknownMaybe;
void reidentifiedAsUser;
void reidentifiedAsOrder;
void sameLocalForward;
void sharedCompatible;
void sharedWrongIdentity;
void sharedDuplicatePackageCompatible;
void sharedEvidenceCompatible;
