import {
  Validation as RootValidation,
  type Validation as RootValidationType,
} from "../src/index.js";
import { none, some } from "../src/option.js";
import { err, Result, type Result as ResultValue } from "../src/result/index.js";
import {
  all,
  fromOption,
  fromResult,
  invalid,
  map,
  mapIssue,
  struct,
  type Validation,
  type ValidationIssue,
  type ValidationIssues,
  type ValidationValue,
  valid,
} from "../src/validation.js";

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? (<T>() => T extends B ? 1 : 2) extends <T>() => T extends A ? 1 : 2
      ? true
      : false
    : false;

type Assert<T extends true> = T;

const literalValid = valid(1 as const);
const literalInvalid = invalid("bad" as const);
const heterogeneousInvalid = invalid("bad" as const, 2 as const);

type _ValidShape = Assert<Equal<typeof literalValid, Validation<1, never>>>;
type _InvalidShape = Assert<Equal<typeof literalInvalid, Validation<never, "bad">>>;
type _HeterogeneousInvalid = Assert<
  Equal<typeof heterogeneousInvalid, Validation<never, "bad" | 2>>
>;
type _ValueProjection = Assert<Equal<ValidationValue<Validation<number, "e">>, number>>;
type _IssueProjection = Assert<Equal<ValidationIssue<Validation<number, "e">>, "e">>;

// @ts-expect-error Invalid must always contain at least one issue
invalid();

declare const input: Validation<number, "parse" | "range">;

if (input.valid) {
  const value: number = input.value;
  void value;
  // @ts-expect-error Valid carries no issues
  input.issues;
} else {
  const issues: ValidationIssues<"parse" | "range"> = input.issues;
  void issues;
  // @ts-expect-error Invalid exposes issues, not the old errors property
  input.errors;
  // @ts-expect-error Invalid carries no value
  input.value;
}

const mapped = map(input, (value) => value.toString());
type _Mapped = Assert<Equal<typeof mapped, Validation<string, "parse" | "range">>>;

const mappedIssue = mapIssue(input, (issue) => ({ kind: issue }) as const);
// @ts-expect-error Validation no longer exposes the old mapError alias
RootValidation.mapError(input, (issue) => issue);
type _MappedError = Assert<
  Equal<typeof mappedIssue, Validation<number, Readonly<{ kind: "parse" | "range" }>>>
>;

declare const first: Validation<number, "first">;
declare const second: Validation<string, "second">;
const tuple = all([first, second] as const);
type _Tuple = Assert<
  Equal<typeof tuple, Validation<readonly [number, string], "first" | "second">>
>;

const empty = all([] as const);
type _Empty = Assert<Equal<typeof empty, Validation<readonly [], never>>>;

const mutableValidationTuple: [Validation<number, "first">] = [first];
// @ts-expect-error finite positional tuples must be readonly at the all boundary
all(mutableValidationTuple);

declare const broadValidations: Validation<number, "issue">[];
// @ts-expect-error mutable arrays can be widened and changed before the all boundary
all(broadValidations);

declare const readonlyBroadValidations: readonly Validation<number, "issue">[];
const broadValidationList = all(readonlyBroadValidations);
type _BroadValidationList = Assert<
  Equal<typeof broadValidationList, Validation<readonly number[], "issue">>
>;

const record = struct([
  ["name", valid("alice")],
  ["age", valid(20)],
]);
type _Struct = Assert<
  Equal<typeof record, Validation<Readonly<{ name: string; age: number }>, never>>
>;

const prebuiltEntries = [
  ["name", valid("alice")],
  ["age", invalid("age" as const)],
] as const;
const prebuiltRecord = struct(prebuiltEntries);
type _PrebuiltStruct = Assert<
  Equal<
    typeof prebuiltRecord,
    Validation<Readonly<{ name: string; age: never }>, "age">
  >
>;

const symbolKey: unique symbol = Symbol("key");
const symbolRecord = struct([[symbolKey, valid(1 as const)]]);
type _SymbolStruct = Assert<
  Equal<typeof symbolRecord, Validation<Readonly<{ [symbolKey]: 1 }>, never>>
>;

declare const broadEntries: readonly (readonly [
  string,
  Validation<unknown, unknown>,
])[];
// @ts-expect-error broad arrays do not identify one exact finite struct
struct(broadEntries);

declare const broadKey: string;
// @ts-expect-error one runtime key cannot stand for a broad string key space
struct([[broadKey, valid(1)]]);

declare const broadSymbolKey: symbol;
// @ts-expect-error declaration keys require one concrete symbol identity
struct([[broadSymbolKey, valid(1)]]);

// @ts-expect-error duplicate runtime keys do not define one struct field set
struct([
  ["name", valid("first")],
  ["name", valid("second")],
]);

declare const unionEntries:
  | readonly [readonly ["name", Validation<string, "name">]]
  | readonly [readonly ["age", Validation<number, "age">]];
// @ts-expect-error a union of entry lists is not one exact runtime struct
struct(unionEntries);

const fullEntries = [
  ["name", valid("alice")],
  ["hidden", invalid("hidden" as const)],
] as const;
// @ts-expect-error tuple length prevents hidden runtime fields through width subtyping
const narrowedEntries: readonly [(typeof fullEntries)[0]] = fullEntries;
void narrowedEntries;

const mutableStructEntry: ["name", Validation<string, never>] = [
  "name",
  valid("alice"),
];
// @ts-expect-error mutable key pairs can be widened and changed before struct
struct([mutableStructEntry]);

const mutableStructEntries: [readonly ["name", Validation<string, never>]] = [
  ["name", valid("alice")],
];
// @ts-expect-error mutable outer tuples can be widened and changed before struct
struct(mutableStructEntries);

declare const result: ResultValue<number, "result-issue">;
const validationFromResult = fromResult(result);
type _FromResult = Assert<
  Equal<typeof validationFromResult, Validation<number, "result-issue">>
>;

const validationFromOption = fromOption(some(1), () => "missing" as const);
type _FromOption = Assert<
  Equal<typeof validationFromOption, Validation<number, "missing">>
>;

const missingValidation = fromOption(none(), () => "missing" as const);
type _MissingOption = Assert<
  Equal<typeof missingValidation, Validation<never, "missing">>
>;

const resultFromOption = Result.fromOption(some(1), () => "missing" as const);
type _ResultFromOption = Assert<
  Equal<typeof resultFromOption, ResultValue<number, "missing">>
>;

const validResultFromValidation = Result.fromValidation(valid(1 as const));
type _ValidResultFromValidation = Assert<
  Equal<typeof validResultFromValidation, ResultValue<1, never>>
>;

const resultFromValidation = Result.fromValidation(
  invalid("first" as const, "second" as const),
);
type _ResultFromValidation = Assert<
  Equal<
    typeof resultFromValidation,
    ResultValue<never, ValidationIssues<"first" | "second">>
  >
>;

const nestedIssue = fromResult(err(["a", "b"] as const));
type _NestedIssue = Assert<
  Equal<typeof nestedIssue, Validation<never, readonly ["a", "b"]>>
>;

const rootValid: RootValidation<number, never> = RootValidation.valid(1);
type _RootFacade = Assert<Equal<typeof rootValid, RootValidationType<number, never>>>;

void literalValid;
void literalInvalid;
void heterogeneousInvalid;
