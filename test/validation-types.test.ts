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

const uncertainKey: unique symbol = Symbol("uncertain");
declare const uncertainName: Validation<string, "name">;
declare const uncertainSymbol: Validation<number, "symbol">;
const uncertainRecord = struct([
  ["name", uncertainName],
  [uncertainKey, uncertainSymbol],
]);
type _UncertainStruct = Assert<
  Equal<
    typeof uncertainRecord,
    Validation<
      Readonly<{
        name: string;
        [uncertainKey]: number;
      }>,
      "name" | "symbol"
    >
  >
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

const uniqueBelowStructChunk = struct([
  ["below0", valid(0)],
  ["below1", valid(1)],
  ["below2", valid(2)],
  ["below3", valid(3)],
  ["below4", valid(4)],
  ["below5", valid(5)],
  ["below6", valid(6)],
  ["below7", valid(7)],
  ["below8", valid(8)],
]);
const uniqueAtStructChunk = struct([
  ["at0", valid(0)],
  ["at1", valid(1)],
  ["at2", valid(2)],
  ["at3", valid(3)],
  ["at4", valid(4)],
  ["at5", valid(5)],
  ["at6", valid(6)],
  ["at7", valid(7)],
  ["at8", valid(8)],
  ["at9", valid(9)],
]);
const uniqueAboveStructChunk = struct([
  ["above0", valid(0)],
  ["above1", valid(1)],
  ["above2", valid(2)],
  ["above3", valid(3)],
  ["above4", valid(4)],
  ["above5", valid(5)],
  ["above6", valid(6)],
  ["above7", valid(7)],
  ["above8", valid(8)],
  ["above9", valid(9)],
  ["above10", valid(10)],
]);
void uniqueBelowStructChunk;
void uniqueAtStructChunk;
void uniqueAboveStructChunk;

// @ts-expect-error first/last duplicate inside one chunk remains rejected
struct([
  ["within", valid(0)],
  ["within1", valid(1)],
  ["within2", valid(2)],
  ["within3", valid(3)],
  ["within4", valid(4)],
  ["within5", valid(5)],
  ["within6", valid(6)],
  ["within7", valid(7)],
  ["within8", valid(8)],
  ["within", valid(9)],
]);

const crossBoundarySymbol: unique symbol = Symbol("CrossBoundary");
// @ts-expect-error symbol-key duplicates spanning the chunk boundary remain rejected
struct([
  ["cross0", valid(0)],
  ["cross1", valid(1)],
  ["cross2", valid(2)],
  ["cross3", valid(3)],
  ["cross4", valid(4)],
  ["cross5", valid(5)],
  ["cross6", valid(6)],
  ["cross7", valid(7)],
  ["cross8", valid(8)],
  [crossBoundarySymbol, valid(9)],
  [crossBoundarySymbol, valid(10)],
]);

const firstTailSymbol: unique symbol = Symbol("FirstTail");
// @ts-expect-error the final tail compares symbol keys against the first chunk
struct([
  [firstTailSymbol, valid(0)],
  ["tail1", valid(1)],
  ["tail2", valid(2)],
  ["tail3", valid(3)],
  ["tail4", valid(4)],
  ["tail5", valid(5)],
  ["tail6", valid(6)],
  ["tail7", valid(7)],
  ["tail8", valid(8)],
  ["tail9", valid(9)],
  [firstTailSymbol, valid(10)],
]);

const multiChunkSymbol: unique symbol = Symbol("MultiChunk");
// @ts-expect-error Seen must survive more than one full recursive chunk
struct([
  [multiChunkSymbol, valid(0)],
  ["multi1", valid(1)],
  ["multi2", valid(2)],
  ["multi3", valid(3)],
  ["multi4", valid(4)],
  ["multi5", valid(5)],
  ["multi6", valid(6)],
  ["multi7", valid(7)],
  ["multi8", valid(8)],
  ["multi9", valid(9)],
  ["multi10", valid(10)],
  ["multi11", valid(11)],
  ["multi12", valid(12)],
  ["multi13", valid(13)],
  ["multi14", valid(14)],
  ["multi15", valid(15)],
  ["multi16", valid(16)],
  ["multi17", valid(17)],
  ["multi18", valid(18)],
  ["multi19", valid(19)],
  [multiChunkSymbol, valid(20)],
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
