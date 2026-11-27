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
const developmentTypeScriptVersion = packageJson.devDependencies?.typescript;
const compatibilityTypeScriptVersions = ["6.0.3", developmentTypeScriptVersion];

assert.equal(
  typeof developmentTypeScriptVersion === "string" &&
    /^7\./u.test(developmentTypeScriptVersion),
  true,
  "package verification requires the pinned TypeScript 7 development compiler",
);

const run = (command, args, failureLabel = `${command} ${args.join(" ")}`) => {
  const result = spawnSync(command, args, {
    cwd: consumer,
    encoding: "utf8",
    stdio: "pipe",
  });

  if (result.status !== 0) {
    throw new Error(
      [`${failureLabel} failed`, result.stdout, result.stderr]
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

  run("pnpm", ["add", "--ignore-scripts", tarball]);

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
    join(consumer, "tsconfig.exact.json"),
    JSON.stringify(
      {
        extends: "./tsconfig.json",
        compilerOptions: {
          exactOptionalPropertyTypes: true,
        },
      },
      null,
      2,
    ),
  );

  // Compile the actual first-use examples from the distributed README.
  const readme = readFileSync(join(installedRoot, "README.md"), "utf8");
  const readmeBlocks = [...readme.matchAll(/```ts\n([\s\S]*?)\n```/gu)].map(
    (match) => match[1],
  );
  const exampleImports = [
    ["user-id.ts", 'import { identity } from "selaws/identity";'],
    ["readme-evidence.ts", 'import { evidence } from "selaws/evidence";'],
    ["readme-vocabulary.ts", 'import { Vocabulary } from "selaws/vocabulary";'],
    ["readme-protocol.ts", 'import { Protocol, type Next } from "selaws/protocol";'],
    ["readme-variant.ts", 'import { Variant } from "selaws/variant";'],
    [
      "readme-result.ts",
      'import { Result, type Result as ResultValue } from "selaws/result";',
    ],
  ];
  for (const [path, prefix] of exampleImports) {
    const examples = readmeBlocks.filter((block) => block.startsWith(prefix));
    assert.equal(examples.length, 1, `expected one README example for ${path}`);
    writeFileSync(join(consumer, path), `${examples[0]}\n`);
  }
  writeFileSync(
    join(consumer, "tsconfig.readme.json"),
    JSON.stringify({
      extends: "./tsconfig.json",
      include: exampleImports.map(([path]) => path),
    }),
  );

  // Type checking an installed consumer without emit does not establish that its
  // public contracts can themselves be published and consumed through .d.ts.
  writeFileSync(
    join(consumer, "tsconfig.emit.json"),
    JSON.stringify({
      extends: "./tsconfig.json",
      compilerOptions: {
        noEmit: false,
        declaration: true,
        emitDeclarationOnly: true,
        rootDir: ".",
        outDir: "emitted",
      },
      include: ["domain.ts"],
    }),
  );
  writeFileSync(
    join(consumer, "tsconfig.downstream.json"),
    JSON.stringify({
      extends: "./tsconfig.json",
      include: ["downstream.ts"],
    }),
  );
  writeFileSync(
    join(consumer, "domain.ts"),
    `import { identity } from "selaws/identity";
import { evidence } from "selaws/evidence";
import { Variant } from "selaws/variant";
import { Vocabulary } from "selaws/vocabulary";
import { Protocol } from "selaws/protocol";
import { Result } from "selaws/result";
import { Option } from "selaws/option";
import { Validation } from "selaws/validation";

const userKey: unique symbol = Symbol("User");
const orderKey: unique symbol = Symbol("Order");
const factKey: unique symbol = Symbol("NonEmpty");
const familyKey: unique symbol = Symbol("UserEvent");
export const User = identity.string(userKey, (s) => s.length > 0);
export type User = identity.Value<typeof User>;
export const Order = identity.string(orderKey);
export type Order = identity.Value<typeof Order>;
export const Shared = identity.shared.string("example/User@1");
export const SharedChecked = identity.shared.number("example/Number@1", (n) => n > 0);
export const NonEmpty = evidence.string(factKey, (s) => s.length > 0);
export const SharedFact = evidence.shared.string("example/NonEmpty@1", (s) => s.length > 0);
export type NonEmptyUser = evidence.Proven<typeof NonEmpty, User>;
export const Events = Variant.define(familyKey, [
  ["empty", Variant.unit],
  ["loaded", Variant.payload<User>()],
]);
export type Event = Variant.Value<typeof Events>;
export const Structural = Variant.structural([
  ["empty", Variant.unit],
  ["loaded", Variant.payload<User>()],
]);
export type StructuralValue = Variant.Value<typeof Structural>;
export const structuralLoaded = (value: User) => Structural.make.loaded(value);
export const ProtocolValue = Protocol.define([["idle", "load", "ready"]]);
export const Status = Vocabulary.define(["open", "closed"]);
export type Status = (typeof Status.values)[number];

export const checked = (value: User) => NonEmpty(value);
export const empty = Events.make.empty();
export const loaded = (value: User) => Events.make.loaded(value);
export const result = (value: User) => Result.ok(Events.make.loaded(value));
export const optional = (value: User) => Option.some(value);
export const validated = (value: User) => Validation.valid(value);
export const parse = (raw: unknown) => {
  const value = User(raw);
  return value === undefined ? Result.err("invalid" as const) : Result.ok(value);
};
`,
  );
  writeFileSync(
    join(consumer, "downstream.ts"),
    `import {
  User, Order, Events, ProtocolValue, checked, empty, loaded, result, optional,
  validated, parse, Structural, structuralLoaded, type StructuralValue, type Event, type NonEmptyUser, Status,
} from "./emitted/domain.js";
import { Variant } from "selaws/variant";
import { Result as importedResult, type Result } from "selaws/result";
import { Option as importedOption } from "selaws/option";
import { Vocabulary as importedVocabulary } from "selaws/vocabulary";
import { Validation as importedValidation } from "selaws/validation";
import { Protocol as importedProtocol } from "selaws/protocol";

const user = User("u");
if (user !== undefined) {
  const verified: NonEmptyUser | undefined = checked(user);
  const event: Event = loaded(user);
  const res: Result<Variant.Case<Event, "loaded">, never> = result(user);
  if (res.ok) {
    const preserved: User = res.value.value;
    void preserved;
  }
  const opt = optional(user);
  if (opt.some) {
    const preserved: User = opt.value;
    void preserved;
  }
  const val = validated(user);
  if (val.valid) {
    const preserved: User = val.value;
    void preserved;
  }
  void verified;
  void event;
}
const wire: StructuralValue = { tag: "empty" };
Structural.match(wire, { empty: () => 0, loaded: (value) => value.length });
// @ts-expect-error structural values cannot gain a nominal family
const wrongFamily: Event = wire;
if (user !== undefined) {
  const value: StructuralValue = structuralLoaded(user);
  void value;
}
void wrongFamily;
declare const status: "open" | "closed" | "other";
if (!Status.has(status)) {
  const remaining: "other" = status;
  void remaining;
}
declare const alternativeKey: "a" | "b";
// @ts-expect-error case names must denote one exact scalar identity
Variant.structural([[alternativeKey, Variant.unit]]);
// @ts-expect-error vocabulary members must denote one exact scalar identity
importedVocabulary.define([alternativeKey]);
// @ts-expect-error struct cannot project both alternative keys
importedValidation.struct([[alternativeKey, importedValidation.valid(1)]]);
declare enum EnumOne { A = "a" }
declare enum EnumTwo { A = "a" }
declare const brandedBoolean: true & { readonly proof: true };
// @ts-expect-error runtime equality cannot establish a phantom boolean fact
importedVocabulary.define([brandedBoolean]);
// @ts-expect-error a raw scalar cannot distinguish nominal enum members
importedVocabulary.define([EnumOne.A]);
// @ts-expect-error a raw scalar cannot distinguish nominal enum members
importedProtocol.define([[EnumOne.A, "go", "x"], [EnumTwo.A, "go", "y"]]);
const runtimeKey: unique symbol = Symbol("key");
const registeredOne: unique symbol = Symbol.for("same");
const registeredTwo: unique symbol = Symbol.for("same");
// @ts-expect-error exact typed membership requires raw literal identities
importedVocabulary.define([runtimeKey]);
// @ts-expect-error a nominal symbol type does not identify one runtime key
importedValidation.struct([[runtimeKey, importedValidation.valid(1)]]);
// @ts-expect-error two unique symbol types can be one runtime symbol
importedProtocol.define([[registeredOne, "go", "x"], [registeredTwo, "go", "y"]]);
// @ts-expect-error output arrays contain positions, not extra properties
importedOption.all(Object.assign([importedOption.some(1)] as const, {meta: 1}));
// @ts-expect-error output arrays contain positions, not extra properties
importedResult.all(Object.assign([importedResult.ok(1)] as const, {meta: 1}));
// @ts-expect-error output arrays contain positions, not extra properties
importedValidation.all(Object.assign([importedValidation.valid(1)] as const, {meta: 1}));
const oneCase = Variant.structural([["a", Variant.unit]]);
declare const extraAlternatives: { a: () => number; x: () => number } | { a: () => number; y: () => number };
// @ts-expect-error every handler alternative must have exactly the declared keys
oneCase.match(oneCase.make.a(), extraAlternatives);
const ObjectCase = Variant.structural([["toString", Variant.unit]]);
const objectCase = ObjectCase.make.toString();
// @ts-expect-error Object's implicit method is not an explicit handler key
ObjectCase.match(objectCase, {});
ObjectCase.match(objectCase, { toString: () => 1 });
const normalConstructorNamespace = Variant.structural([["ready", Variant.unit]]);
const nativeDescription: string = normalConstructorNamespace.make.toString();
void nativeDescription;


const emptyEvent: Event = empty;
// @ts-expect-error the emitted family must preserve distinct scalar identities
loaded(Order("o"));
// @ts-expect-error raw data must not acquire declaration-owned family identity
const forged: Event = { tag: "empty" };
// @ts-expect-error a valid case has its declared payload
Events.make.loaded(Order("o"));
const next: readonly "ready"[] = ProtocolValue.targets("idle", "load");
const parsed = parse("u");
if (parsed.ok) {
  const preserved: User = parsed.value;
  void preserved;
}
void emptyEvent;
void forged;
void next;
`,
  );

  // These are compiler-regression floors, not public declaration-size limits.
  const scaleEntryCount = 2000;
  const protocolNextProbeCount = 64;
  const scaleOwners = ["variant", "validation", "protocol"];

  for (const owner of scaleOwners) {
    writeFileSync(
      join(consumer, `tsconfig.scale-${owner}.json`),
      JSON.stringify(
        {
          extends: "./tsconfig.json",
          include: [`scale-${owner}.ts`],
        },
        null,
        2,
      ),
    );
  }

  const variantScaleEntries = Array.from({ length: scaleEntryCount }, (_, index) =>
    index % 2 === 0
      ? `  ["case${index}", Variant.unit],`
      : `  ["case${index}", Variant.payload<number>()],`,
  ).join("\n");

  writeFileSync(
    join(consumer, "scale-variant.ts"),
    `import { Variant, type Variant as VariantValue } from "selaws/variant";

const scaleVariantKey: unique symbol = Symbol("ScaleVariant");
const ScaleVariant = Variant.define(scaleVariantKey, [
${variantScaleEntries}
]);

type ScaleVariantValue = VariantValue<typeof ScaleVariant>;
type ScaleVariantLast = Variant.Case<ScaleVariantValue, "case1999">;

const scaleVariantFirst: ScaleVariantValue = ScaleVariant.make.case0();
const scaleVariantLast: ScaleVariantLast = ScaleVariant.make.case1999(1999);
const scaleVariantValue: ScaleVariantValue = scaleVariantLast;

if (scaleVariantValue.tag === "case1999") {
  const payload: number = scaleVariantValue.value;
  void payload;
}

void scaleVariantFirst;
`,
  );

  const validationScaleEntries = Array.from({ length: scaleEntryCount }, (_, index) =>
    index === scaleEntryCount - 1
      ? `  ["field${index}", Validation.invalid("scale-issue" as const)],`
      : `  ["field${index}", Validation.valid(${index} as const)],`,
  ).join("\n");
  const validationExpectedFields = Array.from(
    { length: scaleEntryCount },
    (_, index) =>
      index === scaleEntryCount - 1
        ? `  field${index}: never;`
        : `  field${index}: ${index};`,
  ).join("\n");

  writeFileSync(
    join(consumer, "scale-validation.ts"),
    `import {
  Validation,
  type ValidationIssue,
  type ValidationValue,
} from "selaws/validation";

const ScaleValidation = Validation.struct([
${validationScaleEntries}
]);

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? (<T>() => T extends B ? 1 : 2) extends <T>() => T extends A ? 1 : 2
      ? true
      : false
    : false;
type Expect<T extends true> = T;
type ScaleValidationSuccess = ValidationValue<typeof ScaleValidation>;
type ScaleValidationIssue = ValidationIssue<typeof ScaleValidation>;
type ScaleValidationExpected = Readonly<{
${validationExpectedFields}
}>;
type _ScaleValidationSuccess = Expect<
  Equal<ScaleValidationSuccess, ScaleValidationExpected>
>;
type _ScaleValidationIssue = Expect<Equal<ScaleValidationIssue, "scale-issue">>;

declare const scaleValidationSuccess: ScaleValidationSuccess;
const scaleField0: 0 = scaleValidationSuccess.field0;
const scaleField1998: 1998 = scaleValidationSuccess.field1998;
const scaleField1999: never = scaleValidationSuccess.field1999;

void scaleField0;
void scaleField1998;
void scaleField1999;
`,
  );

  const protocolScaleTransitions = Array.from(
    { length: scaleEntryCount },
    (_, index) => `  ["state${index}", "label${index}", "state${index + 1}"],`,
  ).join("\n");
  const protocolNextProbes = Array.from(
    { length: protocolNextProbeCount },
    (_, probeIndex) => {
      const transitionIndex = probeIndex;
      return [
        `type ScaleNext${probeIndex} = ProtocolNext<`,
        "  typeof scaleTransitions,",
        `  "state${transitionIndex}",`,
        `  "label${transitionIndex}"`,
        ">;",
        `const scaleNext${probeIndex}: ScaleNext${probeIndex} = "state${transitionIndex + 1}";`,
        `void scaleNext${probeIndex};`,
      ].join("\n");
    },
  ).join("\n");

  writeFileSync(
    join(consumer, "scale-protocol.ts"),
    `import { Protocol, type Next as ProtocolNext } from "selaws/protocol";

const scaleTransitions = [
${protocolScaleTransitions}
] as const;
const ScaleProtocol = Protocol.define(scaleTransitions);

${protocolNextProbes}

const scaleProtocolAllowed: boolean = ScaleProtocol.allows(
  "state0",
  "label0",
  "state1",
);
void scaleProtocolAllowed;
`,
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

type PackageFakeFamily = {
  readonly make: {
    readonly forged: () => Readonly<{ tag: "forged"; value: 1 }>;
  };
};
type _PackageFakeFamilyRejected = Expect<
  IsNever<Variant.Value<PackageFakeFamily>>
>;

const PackageMessageCopy = VariantCopyFacade.shared("example.variant/PackageMessage@1", [
  ["none", variantUnitCopy],
  ["text", variantPayloadCopy<string>()],
]);
type PackageMessageCopy = VariantCopyFacade.Value<typeof PackageMessageCopy>;
type PackageMessageCopyAlias = VariantCopy<typeof PackageMessageCopy>;
type PackageMessageCopyReadByPrimary = Variant.Value<typeof PackageMessageCopy>;
type _CopyVariantNamespace = Expect<
  Equal<PackageMessageCopyAlias, PackageMessageCopy>
>;
type _CopyVariantProjection = Expect<
  Equal<PackageMessageCopyReadByPrimary, PackageMessageCopy>
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

const PackagePayloadNarrow = Variant.shared("example.variant/PayloadVariance@1", [
  ["value", variantPayload<"a">()],
]);
const PackagePayloadWide = Variant.shared("example.variant/PayloadVariance@1", [
  ["value", variantPayload<string>()],
]);
type PackagePayloadNarrow = Variant.Value<typeof PackagePayloadNarrow>;
type PackagePayloadWide = Variant.Value<typeof PackagePayloadWide>;
declare const packagePayloadNarrow: PackagePayloadNarrow;
declare const packagePayloadWide: PackagePayloadWide;
// @ts-expect-error exact shared family signatures are invariant in payload type
const packageNarrowAsWide: PackagePayloadWide = packagePayloadNarrow;
// @ts-expect-error exact shared family signatures are invariant in payload type
const packageWideAsNarrow: PackagePayloadNarrow = packagePayloadWide;
void packageNarrowAsWide;
void packageWideAsNarrow;

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
type StrictVariantBReadByPrimary = Variant.Value<typeof StrictVariantB>;
type _CopyLocalVariantProjection = Expect<
  Equal<StrictVariantBReadByPrimary, StrictVariantB>
>;
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
// @ts-expect-error internal Result modules are not public package subpaths
import type { Result as ResultCoreSubpath } from "selaws/result/core";
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
void (null as unknown as ResultCoreSubpath);
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
import { Vocabulary } from "selaws/vocabulary";
import { Result } from "selaws/result";
import { Validation } from "selaws/validation";

assert.deepEqual(
  Object.keys(root).sort(),
  ["Option", "Protocol", "Result", "Validation", "Variant", "Vocabulary", "evidence", "identity"],
);

const expectedFocusedSurfaces = new Map([
  ["selaws/identity", ["defineIdentity", "identity"]],
  ["selaws/evidence", ["defineFact", "evidence"]],
  ["selaws/protocol", ["Protocol", "define"]],
  ["selaws/variant", ["Variant", "define", "payload", "shared", "structural", "unit"]],
  ["selaws/vocabulary", ["Vocabulary", "define"]],
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

const expectedFacadeSurfaces = new Map([
  [identity, ["bigint", "boolean", "define", "number", "shared", "string", "symbol"]],
  [evidence, ["bigint", "boolean", "define", "number", "shared", "string", "symbol"]],
  [Protocol, ["define"]],
  [Variant, ["define", "payload", "shared", "structural", "unit"]],
  [Vocabulary, ["define"]],
  [
    Option,
    expectedFocusedSurfaces
      .get("selaws/option")
      .filter((name) => name !== "Option"),
  ],
  [
    Validation,
    expectedFocusedSurfaces
      .get("selaws/validation")
      .filter((name) => name !== "Validation"),
  ],
  [
    Result,
    expectedFocusedSurfaces
      .get("selaws/result")
      .filter((name) => name !== "Result"),
  ],
]);

for (const [facade, expected] of expectedFacadeSurfaces) {
  assert.deepEqual(Object.keys(facade).sort(), [...expected].sort());
}

assert.deepEqual(
  Object.keys(identity.shared).sort(),
  ["bigint", "boolean", "number", "string", "symbol"],
);
assert.deepEqual(
  Object.keys(evidence.shared).sort(),
  ["bigint", "boolean", "number", "string", "symbol"],
);

assert.strictEqual(root.identity, identity);
assert.strictEqual(root.evidence, evidence);
assert.strictEqual(root.Option, Option);
assert.strictEqual(root.Protocol, Protocol);
assert.strictEqual(root.Variant, Variant);
assert.strictEqual(root.Vocabulary, Vocabulary);
const vocabularyInput = ["open", "closed"];
const vocabulary = Vocabulary.define(vocabularyInput);
vocabularyInput[0] = "other";
assert.deepEqual(vocabulary.values, ["open", "closed"]);
assert.equal(vocabulary.has("open"), true);
assert.equal(vocabulary.has("other"), false);
assert.equal(Object.isFrozen(vocabulary.values), true);

assert.equal(Object.hasOwn(Variant, "Case"), false);
assert.strictEqual(Variant.unit, VariantCopy.unit);
const projectionSurfaceFamily = Variant.define(Symbol("ProjectionSurface"), [
  ["ready", Variant.unit],
]);
assert.equal(
  Object.hasOwn(projectionSurfaceFamily, "~selaws.variant.family"),
  false,
);
assert.strictEqual(Variant.payload(), VariantCopy.payload());
assert.strictEqual(root.Result, Result);
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
assert.deepEqual(runtimeProtocol.states, ["pending", "paid", "cancelled"]);
assert.deepEqual(runtimeProtocol.labels, ["pay", "cancel"]);
assert.deepEqual(runtimeProtocol.targets("pending", "pay"), ["paid"]);
assert.equal(Object.isFrozen(runtimeProtocol.states), true);

const runtimeVariant = Variant.define(Symbol("RuntimeVariant"), [
  ["empty", Variant.unit],
  ["value", Variant.payload()],
]);
assert.deepEqual(runtimeVariant.tags, ["empty", "value"]);
assert.equal(Object.isFrozen(runtimeVariant.tags), true);
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

const packageThenFailure = new Error("package then getter");
const packageThenKey = ["th", "en"].join("");
let packageThenReads = 0;
let packageMapperCalls = 0;
const packageThrowingThen = {};
Object.defineProperty(packageThrowingThen, packageThenKey, {
  get() {
    packageThenReads += 1;
    throw packageThenFailure;
  },
});
assert.throws(
  () =>
    Result.attempt(
      () => packageThrowingThen,
      () => {
        packageMapperCalls += 1;
        return "mapped";
      },
    ),
  (caught) =>
    caught instanceof TypeError &&
    caught.message ===
      "attempt() could not establish synchronous completion because reading the returned value's then property threw." &&
    caught.cause === packageThenFailure,
);
assert.equal(packageThenReads, 1);
assert.equal(packageMapperCalls, 0);

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

for (const internalSpecifier of [
  "selaws/result/core",
  "selaws/internal/scalar",
  "selaws/match",
]) {
  await assert.rejects(
    import(internalSpecifier),
    (error) => error?.code === "ERR_PACKAGE_PATH_NOT_EXPORTED",
    internalSpecifier,
  );
}
`,
  );

  for (const version of compatibilityTypeScriptVersions) {
    assert.equal(typeof version, "string");

    for (const config of ["tsconfig.json", "tsconfig.exact.json"]) {
      run("pnpm", [`--package=typescript@${version}`, "dlx", "tsc", "-p", config]);
    }

    for (const exact of ["false", "true"]) {
      run("pnpm", [
        `--package=typescript@${version}`,
        "dlx",
        "tsc",
        "-p",
        "tsconfig.readme.json",
        "--exactOptionalPropertyTypes",
        exact,
      ]);
      run("pnpm", [
        `--package=typescript@${version}`,
        "dlx",
        "tsc",
        "-p",
        "tsconfig.emit.json",
        "--exactOptionalPropertyTypes",
        exact,
      ]);
      const emitted = readFileSync(join(consumer, "emitted", "domain.d.ts"), "utf8");
      assert.doesNotMatch(emitted, /node_modules|selaws\/dist\/|selaws\/result\/core/u);
      run("pnpm", [
        `--package=typescript@${version}`,
        "dlx",
        "tsc",
        "-p",
        "tsconfig.downstream.json",
        "--exactOptionalPropertyTypes",
        exact,
      ]);
    }

    for (const owner of scaleOwners) {
      run(
        "pnpm",
        [
          `--package=typescript@${version}`,
          "dlx",
          "tsc",
          "-p",
          `tsconfig.scale-${owner}.json`,
        ],
        `TypeScript ${version} ${owner} scale fixture`,
      );
    }
  }

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
    "./vocabulary",
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
    "docs/laws/vocabulary.md",
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

  console.log(
    `selaws package verification passed (TypeScript ${compatibilityTypeScriptVersions.join(
      ", ",
    )})`,
  );
} finally {
  rmSync(consumer, { force: true, recursive: true });
}
