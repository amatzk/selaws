import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tarball = join(root, ".pack", "selaws.tgz");
const consumer = mkdtempSync(join(tmpdir(), "selaws-package-"));
const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const typescriptVersion = packageJson.devDependencies?.typescript;

assert.equal(
  typeof typescriptVersion === "string" && /^7\./u.test(typescriptVersion),
  true,
  "package verification requires the pinned TypeScript 7 toolchain",
);

const run = (command, args) => {
  const result = spawnSync(command, args, {
    cwd: consumer,
    encoding: "utf8",
    stdio: "pipe",
  });

  if (result.status !== 0) {
    throw new Error(
      [`${command} ${args.join(" ")} failed`, result.stdout, result.stderr]
        .filter(Boolean)
        .join("\n"),
    );
  }
};

try {
  writeFileSync(
    join(consumer, "package.json"),
    JSON.stringify(
      {
        name: "selaws-package-consumer",
        private: true,
        type: "module",
      },
      null,
      2,
    ),
  );

  run("pnpm", ["add", "--ignore-scripts", tarball, `typescript@${typescriptVersion}`]);

  const installedRoot = join(consumer, "node_modules", "selaws");
  const copiedRoot = join(consumer, "node_modules", "selaws-copy");
  cpSync(installedRoot, copiedRoot, {
    dereference: true,
    recursive: true,
  });

  const copiedPackagePath = join(copiedRoot, "package.json");
  const copiedPackage = JSON.parse(readFileSync(copiedPackagePath, "utf8"));
  copiedPackage.name = "selaws-copy";
  writeFileSync(copiedPackagePath, `${JSON.stringify(copiedPackage, null, 2)}\n`);

  writeFileSync(
    join(consumer, "tsconfig.json"),
    JSON.stringify(
      {
        compilerOptions: {
          exactOptionalPropertyTypes: false,
          lib: ["ES2022"],
          module: "NodeNext",
          moduleResolution: "NodeNext",
          noEmit: true,
          noUncheckedIndexedAccess: true,
          skipLibCheck: false,
          strict: true,
          target: "ES2022",
        },
        include: ["index.ts"],
      },
      null,
      2,
    ),
  );

  writeFileSync(
    join(consumer, "index.ts"),
    `import {
  evidence as rootEvidence,
  identity as rootIdentity,
  Option as RootOption,
  Protocol as RootProtocol,
  Result as RootResult,
  Validation as RootValidation,
  Variant as RootVariant,
  type Option as RootOptionValue,
  type Protocol as RootProtocolValue,
  type Result as RootResultValue,
  type Validation as RootValidationValue,
  type Variant as RootVariantValue,
} from "selaws";
import {
  defineFact,
  evidence,
  type Evidence,
} from "selaws/evidence";
import {
  defineIdentity,
  identity,
  type Identity,
} from "selaws/identity";
import {
  none,
  Option,
  some,
  type Option as OptionValue,
} from "selaws/option";
import {
  define as defineProtocol,
  type Labels as ProtocolLabels,
  type Next as ProtocolNext,
  Protocol,
  type Protocol as ProtocolValue,
  type States as ProtocolStates,
} from "selaws/protocol";
import {
  define as defineVariant,
  payload as variantPayload,
  unit as variantUnit,
  Variant,
  type Variant as VariantValue,
} from "selaws/variant";
import {
  attempt,
  err,
  ok,
  Result,
  type Result as ResultValue,
} from "selaws/result";
import {
  invalid,
  valid,
  Validation,
  type Validation as ValidationValue,
} from "selaws/validation";

import {
  evidence as evidenceCopy,
  type Evidence as EvidenceCopy,
} from "selaws-copy/evidence";
import {
  identity as identityCopy,
  type Identity as IdentityCopy,
} from "selaws-copy/identity";
import type { Option as OptionCopy } from "selaws-copy/option";
import {
  Protocol as ProtocolCopyFacade,
  type Protocol as ProtocolCopy,
} from "selaws-copy/protocol";
import {
  payload as variantPayloadCopy,
  unit as variantUnitCopy,
  Variant as VariantCopyFacade,
  type Variant as VariantCopy,
} from "selaws-copy/variant";
import type { Result as ResultCopy } from "selaws-copy/result";
import type { Validation as ValidationCopy } from "selaws-copy/validation";

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends
  (<T>() => T extends B ? 1 : 2)
    ? (<T>() => T extends B ? 1 : 2) extends
      (<T>() => T extends A ? 1 : 2)
      ? true
      : false
    : false;
type Expect<T extends true> = T;
type IsNever<T> = [T] extends [never] ? true : false;

const UserId = identity.shared.string("example.domain/UserId@1");
type UserId = identity.Value<typeof UserId>;
type RootUserId = rootIdentity.Value<typeof UserId>;
type _UsefulIdentity = Expect<IsNever<UserId> extends false ? true : false>;
type _RootIdentityNamespace = Expect<Equal<RootUserId, UserId>>;
type _ArbitraryCallableIsNotIdentityDeclaration = Expect<
  IsNever<identity.Value<(value: unknown) => string>>
>;

const UserIdCopy = identityCopy.shared.string("example.domain/UserId@1");
type UserIdCopy = identityCopy.Value<typeof UserIdCopy>;
type UserIdCopyReadByPrimary = identity.Value<typeof UserIdCopy>;
type _CopySharedIdentityProjection = Expect<
  Equal<UserIdCopyReadByPrimary, UserIdCopy>
>;
declare const userId: UserId;
declare const userIdCopy: UserIdCopy;
const namedCopyForward: UserIdCopy = userId;
const namedCopyBackward: UserId = userIdCopy;

type EstablishedUserId = string & {
  readonly "~selaws.identity:example.domain/UserId@1": true;
};
declare const establishedUserId: EstablishedUserId;
const establishedToSelaws: UserId = establishedUserId;
const selawsToEstablished: EstablishedUserId = userId;

const OrderId = identity.shared.string("example.domain/OrderId@1");

// @ts-expect-error raw carriers do not acquire identity
const forgedIdentity: UserId = "user_1";

// @ts-expect-error distinct named identities remain distinct
const wrongIdentity: UserId = OrderId("order_1");

const NonEmpty = evidence.shared.string(
  "example.fact/NonEmpty@1",
  (value) => value.length > 0,
);
const NonEmptyCopy = evidenceCopy.shared.string(
  "example.fact/NonEmpty@1",
  (value) => value.length > 0,
);
const packageAsciiKey: unique symbol = Symbol("Ascii");
const Ascii = evidence.string(
  packageAsciiKey,
  (value) => [...value].every((character) => character.charCodeAt(0) <= 0x7f),
);
type NonEmptyUserId = evidence.Proven<typeof NonEmpty, UserId>;
type RootNonEmptyUserId = rootEvidence.Proven<typeof NonEmpty, UserId>;
type NonEmptyUserIdCopy = evidenceCopy.Proven<typeof NonEmptyCopy, UserIdCopy>;
type NonEmptyCopyReadByPrimary = evidence.Proven<typeof NonEmptyCopy, UserIdCopy>;
type _CopySharedEvidenceProjection = Expect<
  Equal<NonEmptyCopyReadByPrimary, NonEmptyUserIdCopy>
>;
type _RootEvidenceNamespace = Expect<Equal<RootNonEmptyUserId, NonEmptyUserId>>;
type _ArbitraryCallableIsNotEvidenceDeclaration = Expect<
  IsNever<evidence.Proven<(value: unknown) => string, string>>
>;
declare const proven: NonEmptyUserId;
declare const provenCopy: NonEmptyUserIdCopy;
const evidenceCopyForward: NonEmptyUserIdCopy = proven;
const evidenceCopyBackward: NonEmptyUserId = provenCopy;

type EstablishedNonEmpty = string & {
  readonly "~selaws.evidence:example.fact/NonEmpty@1": true;
};
declare const establishedNonEmpty: EstablishedNonEmpty;
const establishedEvidence: evidence.Proven<typeof NonEmpty, string> =
  establishedNonEmpty;

const checked = NonEmpty(userId);
if (checked !== undefined) {
  const visibleEvidence: NonEmptyUserId = checked;
  const ascii = Ascii(checked);

  if (ascii !== undefined) {
    const composedEvidence: evidence.Proven<typeof Ascii, NonEmptyUserId> = ascii;
    const transformed = ascii.trim();

    // @ts-expect-error transformations do not preserve established evidence
    const transformedEvidence: evidence.Proven<typeof NonEmpty, string> =
      transformed;

    void composedEvidence;
    void transformedEvidence;
  }

  void visibleEvidence;
}

const sharedIdentityKey: unique symbol = Symbol("SharedIdentity");
const StrictDomainCopy = identityCopy.string(sharedIdentityKey);
type StrictA = Identity<string, typeof sharedIdentityKey>;
type StrictB = IdentityCopy<string, typeof sharedIdentityKey>;
type StrictCopyReadByPrimary = identity.Value<typeof StrictDomainCopy>;
type _CopyLocalIdentityProjection = Expect<Equal<StrictCopyReadByPrimary, StrictB>>;
declare const strictA: StrictA;
declare const strictB: StrictB;
const strictForward: StrictB = strictA;
const strictBackward: StrictA = strictB;

type EstablishedStrictIdentity = string & {
  readonly [sharedIdentityKey]: {
    readonly "~selaws.identity": true;
  };
};
declare const establishedStrictIdentity: EstablishedStrictIdentity;
const establishedStrictToSelaws: StrictA = establishedStrictIdentity;
const selawsStrictToEstablished: EstablishedStrictIdentity = strictA;

type SameTokenEvidence = Evidence<StrictA, typeof sharedIdentityKey>;

// @ts-expect-error identity does not imply evidence, even with the same token
const strictIdentityIsNotEvidence: SameTokenEvidence = strictA;

const sharedFactKey: unique symbol = Symbol("SharedFact");
const StrictFactCopy = evidenceCopy.string(
  sharedFactKey,
  (value) => value.length > 0,
);
type ProvenA = Evidence<StrictA, typeof sharedFactKey>;
type ProvenB = EvidenceCopy<StrictB, typeof sharedFactKey>;
type StrictFactCopyReadByPrimary = evidence.Proven<typeof StrictFactCopy, StrictA>;
type _CopyLocalEvidenceProjection = Expect<
  Equal<StrictFactCopyReadByPrimary, ProvenA>
>;
declare const strictProvenA: ProvenA;
declare const strictProvenB: ProvenB;
const strictEvidenceForward: ProvenB = strictProvenA;
const strictEvidenceBackward: ProvenA = strictProvenB;

type EstablishedStrictEvidence = StrictA & {
  readonly [sharedFactKey]: {
    readonly "~selaws.evidence": true;
  };
};
declare const establishedStrictEvidence: EstablishedStrictEvidence;
const establishedEvidenceToSelaws: ProvenA = establishedStrictEvidence;
const selawsEvidenceToEstablished: EstablishedStrictEvidence = strictProvenA;

const Domain = defineIdentity<string>()(sharedIdentityKey, (mint) => ({ mint }));
const Fact = defineFact<string>()(sharedFactKey, (establish) => ({ establish }));
const strictValue: StrictA = Domain.mint("value");
const strictProven: ProvenA = Fact.establish(strictValue);

const protocolTransitions = [
  ["pending", "pay", "paid"],
  ["pending", "cancel", "cancelled"],
] as const;
const protocolA = defineProtocol(protocolTransitions);
const rootProtocolA: RootProtocolValue<typeof protocolTransitions> =
  RootProtocol.define(protocolTransitions);
const protocolCopyValue = ProtocolCopyFacade.define(protocolTransitions);
type ProtocolState = ProtocolStates<typeof protocolTransitions>;
type ProtocolLabel = ProtocolLabels<typeof protocolTransitions>;
type ProtocolPaid = ProtocolNext<typeof protocolTransitions, "pending", "pay">;
const protocolState: ProtocolState = "pending";
const protocolLabel: ProtocolLabel = "pay";
const protocolPaid: ProtocolPaid = "paid";
declare const protocolB: ProtocolCopy<typeof protocolTransitions>;
const protocolForward: ProtocolCopy<typeof protocolTransitions> = protocolA;
const protocolBackward: ProtocolValue<typeof protocolTransitions> = protocolB;

const packageMutableTransition: ["pending", "pay", "paid"] = [
  "pending",
  "pay",
  "paid",
];
const packageReadonlyOuterWithMutableTransition: readonly [
  typeof packageMutableTransition,
] = [packageMutableTransition];
// @ts-expect-error mutable triples can be widened and mutated through array covariance
defineProtocol(packageReadonlyOuterWithMutableTransition);

const packageReadonlyTransition = ["pending", "pay", "paid"] as const;
const packageMutableOuter: [typeof packageReadonlyTransition] = [
  packageReadonlyTransition,
];
// @ts-expect-error a mutable outer relation can replace an exact triple through covariance
defineProtocol(packageMutableOuter);

declare const packageMixedProtocolOuter:
  | [typeof packageReadonlyTransition]
  | readonly [typeof packageReadonlyTransition];
// @ts-expect-error every possible outer relation carrier must be readonly
defineProtocol(packageMixedProtocolOuter);

declare const packageBroadProtocol: readonly (
  readonly ["pending", "pay", "paid"]
)[];
// @ts-expect-error a broad-length relation is not one exact finite Protocol
defineProtocol(packageBroadProtocol);

const packageBroadSource: readonly [readonly [string, "pay", "paid"]] = [
  ["pending", "pay", "paid"],
];
// @ts-expect-error a broad source type is not one concrete scalar identity
defineProtocol(packageBroadSource);

const packageBroadLabel: readonly [readonly ["pending", string, "paid"]] = [
  ["pending", "pay", "paid"],
];
// @ts-expect-error a broad label type is not one concrete scalar identity
defineProtocol(packageBroadLabel);

const packageBroadTarget: readonly [readonly ["pending", "pay", string]] = [
  ["pending", "pay", "paid"],
];
// @ts-expect-error a broad target type is not one concrete scalar identity
defineProtocol(packageBroadTarget);

declare const packageProtocolUnion:
  | readonly [readonly ["a", "go", "b"]]
  | readonly [readonly ["c", "go", "d"]];
// @ts-expect-error a union declaration is not one concrete relation snapshot
defineProtocol(packageProtocolUnion);

const PackageMessage = Variant.shared("example.variant/PackageMessage@1", [
  ["none", variantUnit],
  ["text", variantPayload<string>()],
]);
type PackageMessage = Variant.Value<typeof PackageMessage>;
type PackageMessageAlias = VariantValue<typeof PackageMessage>;
type PackageTextCase = Variant.Case<PackageMessage, "text">;
type RootPackageMessage = RootVariant.Value<typeof PackageMessage>;
type RootPackageMessageAlias = RootVariantValue<typeof PackageMessage>;
type RootPackageTextCase = RootVariant.Case<PackageMessage, "text">;
type _PackageCasePayload = Expect<Equal<PackageTextCase["value"], string>>;
type _RootPackageCase = Expect<Equal<RootPackageTextCase, PackageTextCase>>;
// @ts-expect-error Variant.Case accepts only names in the closed family
type MissingPackageCase = Variant.Case<PackageMessage, "missing">;
type _VariantNamespace = Expect<Equal<PackageMessageAlias, PackageMessage>>;
type _RootVariantNamespace = Expect<Equal<RootPackageMessage, PackageMessage>>;
type _RootVariantAlias = Expect<Equal<RootPackageMessageAlias, PackageMessage>>;

const PackageMessageCopy = VariantCopyFacade.shared("example.variant/PackageMessage@1", [
  ["none", variantUnitCopy],
  ["text", variantPayloadCopy<string>()],
]);
type PackageMessageCopy = VariantCopyFacade.Value<typeof PackageMessageCopy>;
type PackageMessageCopyAlias = VariantCopy<typeof PackageMessageCopy>;
type _CopyVariantNamespace = Expect<
  Equal<PackageMessageCopyAlias, PackageMessageCopy>
>;
declare const packageMessage: PackageMessage;
declare const packageMessageCopy: PackageMessageCopy;
const variantCopyForward: PackageMessageCopy = packageMessage;
const variantCopyBackward: PackageMessage = packageMessageCopy;

const PackageMessageCopyReordered = VariantCopyFacade.shared("example.variant/PackageMessage@1", [
  ["text", variantPayloadCopy<string>()],
  ["none", variantUnitCopy],
]);
type PackageMessageCopyReordered =
  VariantCopyFacade.Value<typeof PackageMessageCopyReordered>;
declare const packageMessageCopyReordered: PackageMessageCopyReordered;
const exactPackageMatch = PackageMessage.match(packageMessage, {
  none: () => 0,
  text: (value) => value.length,
});
const packageStaleHandlers = {
  none: () => 0,
  text: (value: string) => value.length,
  extra: () => 1,
};
// @ts-expect-error Variant match rejects undeclared handler keys on prebuilt objects
PackageMessage.match(packageMessage, packageStaleHandlers);
// @ts-expect-error Variant match rejects undeclared handler keys inline
PackageMessage.match(packageMessage, {
  none: () => 0,
  text: (value) => value.length,
  extra: () => 1,
});
const reorderedCopyForward: PackageMessageCopyReordered = packageMessage;
const reorderedCopyBackward: PackageMessage = packageMessageCopyReordered;
void exactPackageMatch;
void reorderedCopyForward;
void reorderedCopyBackward;

const packageFullCases = [
  ["a", variantUnit],
  ["b", variantPayload<string>()],
] as const;
// @ts-expect-error tuple length prevents hidden runtime cases through width subtyping
const packageNarrowCases: readonly [typeof packageFullCases[0]] = packageFullCases;
void packageNarrowCases;

declare const packageBroadCases: readonly (
  readonly [string, typeof variantUnit]
)[];
// @ts-expect-error a broad-length spread is not one exact closed family
defineVariant(Symbol("PackageBroadCases"), packageBroadCases);

const packageMutableEntry: ["a", typeof variantUnit] = ["a", variantUnit];
// @ts-expect-error mutable case pairs can be widened and mutated through array covariance
defineVariant(Symbol("PackageMutableEntry"), [packageMutableEntry]);

const packageMutableCaseList: [readonly ["a", typeof variantUnit]] = [
  ["a", variantUnit],
];
// @ts-expect-error mutable outer case tuples can be widened and changed before definition
defineVariant(Symbol("PackageMutableCaseList"), packageMutableCaseList);

interface PackageConsPayload<T> {
  readonly head: T;
  readonly tail: Variant.Value<ReturnType<typeof PackageList<T>>>;
}

const packageListKey: unique symbol = Symbol("PackageList");
const PackageList = <T>() =>
  defineVariant(packageListKey, [
    ["nil", variantUnit],
    ["cons", variantPayload<PackageConsPayload<T>>()],
  ]);

type PackageList<T> = Variant.Value<ReturnType<typeof PackageList<T>>>;

const PackageNumberList = PackageList<number>();
const packageNil: PackageList<number> = PackageNumberList.make.nil();
const packageCons: PackageList<number> = PackageNumberList.make.cons({
  head: 1,
  tail: packageNil,
});
void packageCons;

const packageOverloadedCaseKey: unique symbol = Symbol("PackageOverloadedCase");
const PackageOverloadedCase = defineVariant(packageOverloadedCaseKey, [
  ["value", variantPayload<number>()],
]);

function packageOverloadedHandler(value: number): number;
function packageOverloadedHandler(value: string): string;
function packageOverloadedHandler(value: number | string): number | string {
  return value;
}

const packageOverloadedMatch = PackageOverloadedCase.match(
  PackageOverloadedCase.make.value(1),
  { value: packageOverloadedHandler },
);
type _PackageOverloadResult = Expect<
  Equal<typeof packageOverloadedMatch, number | string>
>;

const packageOverloadedOption = Option.match(Option.some(1 as number), {
  some: packageOverloadedHandler,
  none: () => false as const,
});
type _PackageOverloadedOption = Expect<
  Equal<typeof packageOverloadedOption, number | string | false>
>;

const packageOverloadedResult = Result.match(Result.ok(1 as number), {
  ok: packageOverloadedHandler,
  err: (_error: never) => false as const,
});
type _PackageOverloadedResult = Expect<
  Equal<typeof packageOverloadedResult, number | string | false>
>;

const packageOverloadedValidation = Validation.match(
  Validation.valid(1 as number),
  {
    valid: packageOverloadedHandler,
    invalid: (_issues: readonly [never, ...never[]]) => false as const,
  },
);
type _PackageOverloadedValidation = Expect<
  Equal<typeof packageOverloadedValidation, number | string | false>
>;

const packageGenericIdentity = <T>(value: T): T => value;
const packageGenericOption = Option.match(Option.some(1 as number), {
  some: packageGenericIdentity,
  none: () => false as const,
});
type _PackageGenericOptionWidensSafely = Expect<
  Equal<typeof packageGenericOption, unknown>
>;

declare const packageGenericOverloadedHandler: {
  (value: number): number;
  <T>(value: T): "generic";
};
const packageGenericVariant = PackageOverloadedCase.match(
  PackageOverloadedCase.make.value(1),
  { value: packageGenericOverloadedHandler },
);
type _PackageGenericVariantWidensSafely = Expect<
  Equal<typeof packageGenericVariant, unknown>
>;

function packageReceiverRequired(
  this: { readonly owner: "Match" },
  value: number,
): number {
  return value;
}

Option.match(Option.some(1), {
  // @ts-expect-error Match handlers cannot require a callback receiver
  some: packageReceiverRequired,
  none: () => 0,
});

Result.match(Result.ok(1), {
  // @ts-expect-error Match handlers cannot require a callback receiver
  ok: packageReceiverRequired,
  err: () => 0,
});

Validation.match(Validation.valid(1), {
  // @ts-expect-error Match handlers cannot require a callback receiver
  valid: packageReceiverRequired,
  invalid: () => 0,
});

PackageOverloadedCase.match(PackageOverloadedCase.make.value(1), {
  // @ts-expect-error Match handlers cannot require a callback receiver
  value: packageReceiverRequired,
});

const mixedPackageMessageKey: unique symbol = Symbol("MixedPackageMessage");
const MixedPackageMessage = Variant.define(mixedPackageMessageKey, [
  ["none", variantUnitCopy],
  ["text", variantPayloadCopy<string>()],
]);
type MixedPackageMessage = VariantValue<typeof MixedPackageMessage>;
const mixedPackageMessage: MixedPackageMessage = MixedPackageMessage.make.text("mixed");

const sharedVariantKey: unique symbol = Symbol("SharedVariant");
const StrictVariantA = Variant.define(sharedVariantKey, [
  ["none", Variant.unit],
  ["text", Variant.payload<string>()],
]);
const StrictVariantB = VariantCopyFacade.define(sharedVariantKey, [
  ["none", variantUnitCopy],
  ["text", variantPayloadCopy<string>()],
]);
type StrictVariantA = VariantValue<typeof StrictVariantA>;
type StrictVariantB = VariantCopy<typeof StrictVariantB>;
declare const strictVariantA: StrictVariantA;
declare const strictVariantB: StrictVariantB;
const strictVariantForward: StrictVariantB = strictVariantA;
const strictVariantBackward: StrictVariantA = strictVariantB;

declare const resultA: ResultValue<number, "e">;
declare const resultB: ResultCopy<number, "e">;
const resultForward: ResultCopy<number, "e"> = resultA;
const resultBackward: ResultValue<number, "e"> = resultB;

declare const optionA: OptionValue<number>;
declare const optionB: OptionCopy<number>;
const optionForward: OptionCopy<number> = optionA;
const optionBackward: OptionValue<number> = optionB;

declare const validationA: ValidationValue<number, "e">;
declare const validationB: ValidationCopy<number, "e">;
const validationForward: ValidationCopy<number, "e"> = validationA;
const validationBackward: ValidationValue<number, "e"> = validationB;

const rootResult: RootResultValue<number, never> = RootResult.ok(1);
const rootOption: RootOptionValue<number> = RootOption.some(1);
const rootValidation: RootValidationValue<number, never> = RootValidation.valid(1);

type _ResultFacade = Expect<Equal<typeof rootResult, ResultValue<number, never>>>;
type _RootAndFocusedResultFacade = Expect<Equal<typeof RootResult, typeof Result>>;
type _OptionFacade = Expect<Equal<typeof rootOption, OptionValue<number>>>;
type _ValidationFacade = Expect<
  Equal<typeof rootValidation, ValidationValue<number, never>>
>;

const rootCaptured = RootResult.attempt(() => 1 as const, String);
type _RootCaptured = Expect<Equal<typeof rootCaptured, ResultValue<1, string>>>;
const rootCapturedAsync = RootResult.attemptAsync(async () => 1, String);
type _RootCapturedAsync = Expect<
  Equal<typeof rootCapturedAsync, Promise<ResultValue<number, string>>>
>;
const rootUnwrapped = RootResult.orThrow(rootResult, () => new Error("unused"));
type _RootOrThrow = Expect<Equal<typeof rootUnwrapped, number>>;

const packageMutableOptionTuple: [OptionValue<number>] = [some(1)];
// @ts-expect-error finite positional tuples must be readonly at the all boundary
RootOption.all(packageMutableOptionTuple);

const packageMutableValidationTuple: [ValidationValue<number, never>] = [valid(1)];
// @ts-expect-error finite positional tuples must be readonly at the all boundary
RootValidation.all(packageMutableValidationTuple);

const packageMutableResultTuple: [ResultValue<number, never>] = [ok(1)];
// @ts-expect-error finite positional tuples must be readonly at the all boundary
RootResult.all(packageMutableResultTuple);

declare const packageBroadOptions: OptionValue<number>[];
// @ts-expect-error mutable arrays can be widened and changed before the all boundary
RootOption.all(packageBroadOptions);
declare const packageReadonlyBroadOptions: readonly OptionValue<number>[];
const packageBroadOptionList: RootOptionValue<readonly number[]> =
  RootOption.all(packageReadonlyBroadOptions);

declare const packageBroadValidations: ValidationValue<number, "issue">[];
// @ts-expect-error mutable arrays can be widened and changed before the all boundary
RootValidation.all(packageBroadValidations);
declare const packageReadonlyBroadValidations: readonly ValidationValue<
  number,
  "issue"
>[];
const packageBroadValidationList: RootValidationValue<readonly number[], "issue"> =
  RootValidation.all(packageReadonlyBroadValidations);

declare const packageBroadResults: ResultValue<number, "issue">[];
// @ts-expect-error mutable arrays can be widened and changed before the all boundary
RootResult.all(packageBroadResults);
declare const packageReadonlyBroadResults: readonly ResultValue<number, "issue">[];
const packageBroadResultList: RootResultValue<readonly number[], "issue"> =
  RootResult.all(packageReadonlyBroadResults);

void packageBroadOptionList;
void packageBroadValidationList;
void packageBroadResultList;

const captured = attempt(() => 1, String);
declare const nonCallableThen: { then: string };
declare const broadCallableThen: { then: FunctionConstructor["prototype"] };
const capturedNonCallableThen = attempt(() => nonCallableThen, String);
const capturedNonCallableThenExpected: ResultValue<
  { then: string },
  string
> = capturedNonCallableThen;
// @ts-expect-error synchronous capture rejects broad Function-typed then returns
attempt(() => broadCallableThen, String);

function captureGeneric<T extends string>(value: T): ResultValue<T, string> {
  return attempt(() => value, String);
}

const genericCaptured: ResultValue<"literal", string> =
  captureGeneric("literal" as const);

type PackageFunctionThenable = (() => void) & { then(): void };
declare const packageFunctionThenable: PackageFunctionThenable;
// @ts-expect-error synchronous capture rejects callable function thenables
attempt(() => packageFunctionThenable, String);

const packageStruct = Validation.struct([
  ["name", valid("alice")],
  ["age", invalid("age" as const)],
]);
type _PackageStruct = Expect<
  Equal<
    typeof packageStruct,
    ValidationValue<Readonly<{ name: string; age: never }>, "age">
  >
>;

const packageFullValidationEntries = [
  ["name", valid("alice")],
  ["hidden", invalid("hidden" as const)],
] as const;
// @ts-expect-error tuple length prevents hidden runtime fields through width subtyping
const packageNarrowValidationEntries: readonly [
  typeof packageFullValidationEntries[0],
] = packageFullValidationEntries;
void packageNarrowValidationEntries;

declare const packageBroadValidationEntries: readonly (
  readonly [string, ValidationValue<unknown, unknown>]
)[];
// @ts-expect-error a broad-length spread is not one exact keyed product
Validation.struct(packageBroadValidationEntries);

const packageMutableStructEntry: [
  "name",
  ValidationValue<string, never>,
] = ["name", valid("alice")];
// @ts-expect-error mutable key pairs can be widened and mutated through array covariance
Validation.struct([packageMutableStructEntry]);

const packageMutableStructEntries: [
  readonly ["name", ValidationValue<string, never>],
] = [["name", valid("alice")]];
// @ts-expect-error mutable outer struct tuples can be widened and changed before accumulation
Validation.struct(packageMutableStructEntries);

const absent = none();
const present = some(1);
const failure = err("e");
const issue = invalid("issue");
const success = valid(1);

// @ts-expect-error generic Result operations stay on the focused owner surface
import { map } from "selaws";
// @ts-expect-error Match is a shared law, not a root public namespace
import { Match as RootMatch } from "selaws";
// @ts-expect-error Match is a shared law, not a package subpath
import type { Match as MatchSubpath } from "selaws/match";
// @ts-expect-error generic Protocol helpers stay on the focused owner surface
import type { Next as RootProtocolNext } from "selaws";

void rootIdentity;
void rootEvidence;
void Option;
void Protocol;
void RootProtocol;
void Variant;
void RootVariant;
void Result;
void Validation;
void captured;
void genericCaptured;
void packageStruct;
void absent;
void present;
void failure;
void issue;
void success;
void namedCopyForward;
void namedCopyBackward;
void establishedToSelaws;
void selawsToEstablished;
void forgedIdentity;
void wrongIdentity;
void evidenceCopyForward;
void evidenceCopyBackward;
void establishedEvidence;
void strictForward;
void strictBackward;
void establishedStrictToSelaws;
void selawsStrictToEstablished;
void strictIdentityIsNotEvidence;
void strictEvidenceForward;
void strictEvidenceBackward;
void establishedEvidenceToSelaws;
void selawsEvidenceToEstablished;
void strictValue;
void strictProven;
void rootProtocolA;
void protocolCopyValue;
void protocolState;
void protocolLabel;
void protocolPaid;
void protocolForward;
void protocolBackward;
void variantCopyForward;
void variantCopyBackward;
void strictVariantForward;
void strictVariantBackward;
void resultForward;
void resultBackward;
void optionForward;
void optionBackward;
void validationForward;
void validationBackward;
void map;
void RootMatch;
void (null as unknown as MatchSubpath);
`,
  );

  writeFileSync(
    join(consumer, "runtime.mjs"),
    `import assert from "node:assert/strict";
import * as root from "selaws";
import { defineFact, evidence } from "selaws/evidence";
import { defineIdentity, identity } from "selaws/identity";
import { Option } from "selaws/option";
import { Protocol } from "selaws/protocol";
import { Variant } from "selaws/variant";
import { Variant as VariantCopy } from "selaws-copy/variant";
import { Result } from "selaws/result";
import { Validation } from "selaws/validation";

assert.deepEqual(
  Object.keys(root).sort(),
  ["Option", "Protocol", "Result", "Validation", "Variant", "evidence", "identity"],
);

const expectedFocusedSurfaces = new Map([
  ["selaws/identity", ["defineIdentity", "identity"]],
  ["selaws/evidence", ["defineFact", "evidence"]],
  ["selaws/protocol", ["Protocol", "define"]],
  ["selaws/variant", ["Variant", "define", "payload", "shared", "unit"]],
  [
    "selaws/option",
    [
      "Option",
      "all",
      "andThen",
      "filter",
      "flatten",
      "fromNullable",
      "fromUndefined",
      "isNone",
      "isSome",
      "map",
      "match",
      "none",
      "orElse",
      "some",
      "toNullable",
      "toUndefined",
      "unwrapOr",
      "unwrapOrElse",
    ],
  ],
  [
    "selaws/validation",
    [
      "Validation",
      "all",
      "fromOption",
      "fromResult",
      "invalid",
      "isInvalid",
      "isValid",
      "map",
      "mapIssue",
      "match",
      "struct",
      "unwrapOr",
      "unwrapOrElse",
      "valid",
    ],
  ],
  [
    "selaws/result",
    [
      "Result",
      "all",
      "andThen",
      "attempt",
      "attemptAsync",
      "err",
      "flatten",
      "fromOption",
      "fromValidation",
      "isErr",
      "isOk",
      "map",
      "mapError",
      "match",
      "ok",
      "orElse",
      "orThrow",
      "unwrapOr",
      "unwrapOrElse",
    ],
  ],
]);

for (const [specifier, expected] of expectedFocusedSurfaces) {
  const module = await import(specifier);
  assert.deepEqual(Object.keys(module).sort(), expected);
}

assert.strictEqual(root.identity, identity);
assert.strictEqual(root.evidence, evidence);
assert.strictEqual(root.Option, Option);
assert.strictEqual(root.Protocol, Protocol);
assert.strictEqual(root.Variant, Variant);
assert.equal(Object.hasOwn(Variant, "Case"), false);
assert.strictEqual(Variant.unit, VariantCopy.unit);
assert.strictEqual(Variant.payload(), VariantCopy.payload());
assert.strictEqual(root.Result, Result);
assert.deepEqual(
  Object.keys(Result).sort(),
  expectedFocusedSurfaces
    .get("selaws/result")
    .filter((name) => name !== "Result")
    .sort(),
);
assert.strictEqual(root.Validation, Validation);

assert.throws(
  () => identity.string("example.domain/Wrong@1"),
  /symbol token/,
);
assert.throws(
  () => identity.shared.string(Symbol("Wrong")),
  /string contract/,
);
assert.throws(
  () => evidence.string("example.fact/Wrong@1", () => true),
  /symbol token/,
);

let identityBuilds = 0;
assert.throws(
  () =>
    defineIdentity()("not-a-symbol", () => {
      identityBuilds += 1;
      return {};
    }),
  /symbol token/,
);
assert.equal(identityBuilds, 0);

let evidenceBuilds = 0;
assert.throws(
  () =>
    defineFact()("not-a-symbol", () => {
      evidenceBuilds += 1;
      return {};
    }),
  /symbol token/,
);
assert.equal(evidenceBuilds, 0);

assert.throws(
  () => defineIdentity()(Symbol("Identity"), null),
  /builders must be functions/,
);
assert.throws(
  () => defineFact()(Symbol("Evidence"), null),
  /builders must be functions/,
);

const LowLevelIdentity = defineIdentity()(Symbol("LowLevelIdentity"), (mint) => ({
  mint,
}));
const LowLevelEvidence = defineFact()(Symbol("LowLevelEvidence"), (establish) => ({
  establish,
}));

for (const value of ["value", 1, 1n, true, Symbol("value")]) {
  assert.strictEqual(LowLevelIdentity.mint(value), value);
  assert.strictEqual(LowLevelEvidence.establish(value), value);
}
for (const value of [{}, [], () => 1, null, undefined]) {
  assert.throws(() => LowLevelIdentity.mint(value), /must be scalars/);
  assert.throws(() => LowLevelEvidence.establish(value), /must be scalars/);
}

assert.throws(
  () => Variant.define("example.variant/Wrong@1", [["ready", Variant.unit]]),
  /symbol token/,
);

const symbolValue = Symbol("runtime");
const scalarCases = [
  [identity.string(Symbol("RuntimeString")), "value"],
  [identity.number(Symbol("RuntimeNumber")), 1],
  [identity.bigint(Symbol("RuntimeBigint")), 1n],
  [identity.boolean(Symbol("RuntimeBoolean")), true],
  [identity.symbol(Symbol("RuntimeSymbol")), symbolValue],
];

for (const [domain, value] of scalarCases) {
  assert.equal(Object.is(domain(value), value), true);
}

const UserId = identity.string(Symbol("UserId"));
const raw = "user_1";
assert.equal(Object.is(UserId(raw), raw), true);
assert.equal(Object.hasOwn(UserId, "~selaws.identity.declaration"), false);

const NonEmpty = evidence.string(Symbol("NonEmpty"), (value) => value.length > 0);
assert.equal(NonEmpty(raw), raw);
assert.equal(NonEmpty(""), undefined);
assert.equal(Object.hasOwn(NonEmpty, "~selaws.evidence.declaration"), false);

const runtimeProtocol = Protocol.define([
  ["pending", "pay", "paid"],
  ["pending", "cancel", "cancelled"],
]);
assert.equal(runtimeProtocol.allows("pending", "pay", "paid"), true);
assert.equal(runtimeProtocol.allows("pending", "pay", "cancelled"), false);

const runtimeVariant = Variant.define(Symbol("RuntimeVariant"), [
  ["empty", Variant.unit],
  ["value", Variant.payload()],
]);
assert.deepEqual(runtimeVariant.make.empty(), { tag: "empty" });
assert.deepEqual(runtimeVariant.make.value(1), { tag: "value", value: 1 });
assert.equal(
  runtimeVariant.match(runtimeVariant.make.value(1), {
    empty: () => 0,
    value: (value) => value + 1,
  }),
  2,
);

const mixedRuntimeVariant = Variant.define(Symbol("MixedRuntimeVariant"), [
  ["empty", VariantCopy.unit],
  ["value", VariantCopy.payload()],
]);
assert.deepEqual(mixedRuntimeVariant.make.empty(), { tag: "empty" });
assert.deepEqual(mixedRuntimeVariant.make.value(1), {
  tag: "value",
  value: 1,
});

assert.deepEqual(Option.some(1), { some: true, value: 1 });
assert.deepEqual(Validation.invalid("a", "b"), {
  issues: ["a", "b"],
  valid: false,
});
assert.throws(() => Validation.struct([["optional", undefined]]), TypeError);
assert.throws(
  () =>
    Validation.struct([
      ["legacy", { errors: ["legacy"], valid: false }],
    ]),
  TypeError,
);
assert.deepEqual(Result.ok(1), { ok: true, value: 1 });

for (const [name, invoke, selectedKey, otherKey] of [
  [
    "Option",
    (arms) => Option.match(Option.some("Option"), arms),
    "some",
    "none",
  ],
  [
    "Result",
    (arms) => Result.match(Result.err("Result"), arms),
    "err",
    "ok",
  ],
  [
    "Validation",
    (arms) => Validation.match(Validation.invalid("Validation"), arms),
    "invalid",
    "valid",
  ],
]) {
  let receiver = "unset";
  let unselectedReads = 0;
  const arms = {};

  Object.defineProperty(arms, selectedKey, {
    enumerable: true,
    value: function (value) {
      receiver = this;
      return Array.isArray(value) ? value[0] : value;
    },
  });
  Object.defineProperty(arms, otherKey, {
    enumerable: true,
    get() {
      unselectedReads += 1;
      throw new Error("unselected Match handler was read");
    },
  });

  assert.equal(invoke(arms), name);
  assert.equal(receiver, undefined);
  assert.equal(unselectedReads, 0);
}

const installedMatchVariant = Variant.define(Symbol("InstalledMatchVariant"), [
  ["selected", Variant.payload()],
  ["other", Variant.unit],
]);
let variantReceiver = "unset";
let variantUnselectedReads = 0;
const variantHandlers = {};

Object.defineProperty(variantHandlers, "selected", {
  enumerable: true,
  value: function (value) {
    variantReceiver = this;
    return value;
  },
});
Object.defineProperty(variantHandlers, "other", {
  enumerable: true,
  get() {
    variantUnselectedReads += 1;
    throw new Error("unselected Variant Match handler was read");
  },
});

assert.equal(
  installedMatchVariant.match(
    installedMatchVariant.make.selected("Variant"),
    variantHandlers,
  ),
  "Variant",
);
assert.equal(variantReceiver, undefined);
assert.equal(variantUnselectedReads, 0);

for (const [name, invoke, selectedKey] of [
  ["Option", (arms) => Option.match(Option.some(1), arms), "some"],
  ["Result", (arms) => Result.match(Result.ok(1), arms), "ok"],
  [
    "Validation",
    (arms) => Validation.match(Validation.valid(1), arms),
    "valid",
  ],
  [
    "Variant",
    (arms) =>
      installedMatchVariant.match(
        installedMatchVariant.make.selected(1),
        arms,
      ),
    "selected",
  ],
]) {
  const inherited = Object.create({
    [selectedKey]: () => "inherited",
  });
  assert.throws(
    () => invoke(inherited),
    /own data function/,
    "inherited selected handler",
  );

  let getterCalls = 0;
  const accessor = {};
  Object.defineProperty(accessor, selectedKey, {
    get() {
      getterCalls += 1;
      return () => "accessor";
    },
  });
  assert.throws(
    () => invoke(accessor),
    /own data function/,
    "accessor selected handler",
  );
  assert.equal(getterCalls, 0);
}

const protoMatchKey = Symbol("ProtoMatch");
const ProtoMatch = Variant.define(protoMatchKey, [
  ["__proto__", Variant.unit],
  ["ready", Variant.unit],
]);
const makeProto = Reflect.get(ProtoMatch.make, "__proto__");
const plainProtoHandlers = {
  __proto__: () => "prototype-setter",
  ready: () => "ready",
};
assert.equal(Object.hasOwn(plainProtoHandlers, "__proto__"), false);
assert.throws(
  () => ProtoMatch.match(makeProto(), plainProtoHandlers),
  /own data function/,
);
assert.equal(
  ProtoMatch.match(makeProto(), {
    ["__proto__"]: () => "computed",
    ready: () => "ready",
  }),
  "computed",
);

const installedMatchPromise = Promise.resolve("native");
assert.strictEqual(
  Option.match(Option.some(1), {
    some: () => installedMatchPromise,
    none: () => Promise.resolve("none"),
  }),
  installedMatchPromise,
);
`,
  );

  run(process.execPath, ["node_modules/typescript/bin/tsc", "-p", "tsconfig.json"]);
  run(process.execPath, ["runtime.mjs"]);

  const installedPackage = JSON.parse(
    readFileSync(join(installedRoot, "package.json"), "utf8"),
  );

  assert.deepEqual(Object.keys(installedPackage.exports).sort(), [
    ".",
    "./evidence",
    "./identity",
    "./option",
    "./protocol",
    "./result",
    "./validation",
    "./variant",
  ]);

  for (const path of [
    "LICENSE",
    "README.md",
    "docs/SEMANTICS.md",
    "docs/API.md",
    "docs/GUIDE.md",
    "docs/laws/evidence.md",
    "docs/laws/identity.md",
    "docs/laws/match.md",
    "docs/laws/option.md",
    "docs/laws/protocol.md",
    "docs/laws/result.md",
    "docs/laws/variant.md",
    "docs/laws/validation.md",
  ]) {
    assert.equal(
      existsSync(join(installedRoot, path)),
      true,
      `package is missing ${path}`,
    );
  }

  const listRelativeFiles = (directory) => {
    const files = [];

    const visit = (current) => {
      for (const name of readdirSync(current, { withFileTypes: true })) {
        const path = join(current, name.name);
        if (name.isDirectory()) {
          visit(path);
        } else {
          files.push(relative(directory, path).replaceAll("\\", "/"));
        }
      }
    };

    visit(directory);
    return files.sort();
  };

  const distDir = join(installedRoot, "dist");
  const sourceFiles = listRelativeFiles(join(installedRoot, "src")).filter((path) =>
    path.endsWith(".ts"),
  );
  const expectedDistFiles = sourceFiles
    .flatMap((path) => {
      const stem = path.slice(0, -".ts".length);
      return [`${stem}.d.ts`, `${stem}.d.ts.map`, `${stem}.js`, `${stem}.js.map`];
    })
    .sort();

  assert.deepEqual(
    listRelativeFiles(distDir),
    expectedDistFiles,
    "package dist must exactly match shipped TypeScript sources",
  );

  const requiredEntries = [
    "index",
    "identity",
    "evidence",
    "option",
    "protocol",
    "variant",
    "validation",
    "result/index",
  ];

  for (const entry of requiredEntries) {
    for (const suffix of [".js", ".d.ts", ".js.map", ".d.ts.map"]) {
      assert.equal(
        existsSync(join(distDir, `${entry}${suffix}`)),
        true,
        `package is missing dist/${entry}${suffix}`,
      );
    }
  }

  const visitMaps = (directory) => {
    for (const name of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, name.name);
      if (name.isDirectory()) {
        visitMaps(path);
        continue;
      }
      if (!name.name.endsWith(".map")) {
        continue;
      }

      const map = JSON.parse(readFileSync(path, "utf8"));
      for (const source of map.sources) {
        const sourcePath = resolve(dirname(path), map.sourceRoot ?? "", source);
        assert.equal(
          existsSync(sourcePath),
          true,
          `${path} references missing source ${source}`,
        );
      }
    }
  };

  visitMaps(distDir);

  console.log("selaws package verification passed");
} finally {
  rmSync(consumer, { force: true, recursive: true });
}
