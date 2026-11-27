import { Vocabulary as RootVocabulary } from "../src/index.js";
import { Vocabulary, type Vocabulary as VocabularyType } from "../src/vocabulary.js";

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Expect<T extends true> = T;

const Status = Vocabulary.define(["open", "closed"]);
type Status = (typeof Status.values)[number];
type _exact = Expect<Equal<typeof Status.values, readonly ["open", "closed"]>>;
type _type = Expect<Equal<Status, "open" | "closed">>;
const root: VocabularyType<readonly ["open", "closed"]> = RootVocabulary.define([
  "open",
  "closed",
]);
declare const raw: unknown;
if (Status.has(raw)) {
  const known: Status = raw;
  void known;
}
declare const candidate: "open" | "closed" | "other";
if (!Status.has(candidate)) {
  const other: "other" = candidate;
  void other;
}
const s: unique symbol = Symbol();
// @ts-expect-error a unique symbol type is not an exact runtime member
Vocabulary.define([s]);
const mixed = Vocabulary.define(["x", 1, 2n, true]);
type _mixed = Expect<Equal<(typeof mixed.values)[number], "x" | 1 | 2n | true>>;
const Empty = Vocabulary.define([]);
type _empty = Expect<Equal<typeof Empty.values, readonly []>>;
declare const unionMember: "a" | "b";
declare const unionList: readonly ["a"] | readonly ["b"];
declare const broadString: string;
declare const broadNumber: number;
declare const broadBigint: bigint;
declare const broadBoolean: boolean;
declare const broadSymbol: symbol;
declare const pattern: `x:${string}`;
declare const branded: true & { readonly brand: "proof" };
declare const brandedNumber: 1 & { readonly brand: "proof" };
// @ts-expect-error alternative member is not an exact vocabulary
Vocabulary.define([unionMember]);
// @ts-expect-error alternative declarations do not define one vocabulary
Vocabulary.define(unionList);
// @ts-expect-error open array is not exact
Vocabulary.define([] as readonly string[]);
// @ts-expect-error mutable tuple may be lengthened
Vocabulary.define(["a"] as ["a"]);
// @ts-expect-error wide string
Vocabulary.define([broadString]);
// @ts-expect-error wide number
Vocabulary.define([broadNumber]);
// @ts-expect-error wide bigint
Vocabulary.define([broadBigint]);
// @ts-expect-error wide boolean
Vocabulary.define([broadBoolean]);
// @ts-expect-error wide symbol
Vocabulary.define([broadSymbol]);
// @ts-expect-error patterned strings are not exact
Vocabulary.define([pattern]);
// @ts-expect-error a phantom fact cannot be derived from raw equality
Vocabulary.define([branded]);
// @ts-expect-error a phantom fact cannot be derived from raw equality
Vocabulary.define([brandedNumber]);
// @ts-expect-error projection is readonly
Status.values.push("open");
void root;

// @ts-expect-error widening the exact set would invalidate false-branch narrowing
const widened: VocabularyType<readonly string[]> = Status;
// @ts-expect-error one exact member cannot stand for an alternative member
const alternative: VocabularyType<readonly ["open" | "other", "closed"]> = Status;
void widened;
void alternative;

const decorated = Object.assign(["a"] as const, { meta: 1 });
const snapshot = Vocabulary.define(decorated);
// @ts-expect-error only tuple members are snapshotted, not attached properties
snapshot.values.meta;

declare enum StringMember {
  A = "a",
}
declare enum NumericMember {
  A = 1,
}
// @ts-expect-error exact runtime membership cannot establish a nominal enum type
Vocabulary.define([StringMember.A]);
// @ts-expect-error same rule for numeric enums
Vocabulary.define([NumericMember.A]);
Vocabulary.define([1e-7, 1e21, -3.14, 0]);
