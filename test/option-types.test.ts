import { Option as RootOption, type Option as RootOptionType } from "../src/index.js";
import {
  all,
  andThen,
  filter,
  flatten,
  fromNullable,
  fromUndefined,
  inspect,
  type None,
  none,
  type Option,
  type OptionValue,
  orElse,
  type Some,
  some,
  toNullable,
  toUndefined,
} from "../src/option.js";

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? (<T>() => T extends B ? 1 : 2) extends <T>() => T extends A ? 1 : 2
      ? true
      : false
    : false;

type Assert<T extends true> = T;

const literalSome = some(1 as const);
const literalNone = none();

type _SomeShape = Assert<Equal<typeof literalSome, Option<1>>>;
type _NoneShape = Assert<Equal<typeof literalNone, Option<never>>>;
type _ValueProjection = Assert<Equal<OptionValue<Some<1> | None>, 1>>;

declare const input: Option<string | number>;

if (input.some) {
  const value: string | number = input.value;
  void value;
} else {
  const absent: None = input;
  void absent;
  // @ts-expect-error None carries no value
  input.value;
}

const mapped = RootOption.map(input, (value) => String(value));
type _Mapped = Assert<Equal<typeof mapped, Option<string>>>;

const chained = andThen(input, (value) =>
  typeof value === "number" ? some(value + 1) : none(),
);
type _Chained = Assert<Equal<typeof chained, Option<number>>>;

const recovered = orElse(input, () => some(true));
type _Recovered = Assert<Equal<typeof recovered, Option<string | number | boolean>>>;

declare const nested: Option<Option<number>>;
const flattened = flatten(nested);
type _Flattened = Assert<Equal<typeof flattened, Option<number>>>;

const narrowed = filter(input, (value): value is string => typeof value === "string");
type _Filtered = Assert<Equal<typeof narrowed, Option<string>>>;

declare const first: Option<number>;
declare const second: Option<string>;
const tuple = all([first, second] as const);
type _Tuple = Assert<Equal<typeof tuple, Option<readonly [number, string]>>>;

const empty = all([] as const);
type _Empty = Assert<Equal<typeof empty, Option<readonly []>>>;

const mutableOptionTuple: [Option<number>] = [first];
// @ts-expect-error finite positional tuples must be readonly at the all boundary
all(mutableOptionTuple);

declare const broadOptions: Option<number>[];
// @ts-expect-error mutable arrays can be widened and changed before the all boundary
all(broadOptions);

declare const readonlyBroadOptions: readonly Option<number>[];
const broadOptionList = all(readonlyBroadOptions);
type _BroadOptionList = Assert<
  Equal<typeof broadOptionList, Option<readonly number[]>>
>;

declare const maybeUndefined: string | null | undefined;
const onlyUndefinedAbsent = fromUndefined(maybeUndefined);
type _FromUndefined = Assert<Equal<typeof onlyUndefinedAbsent, Option<string | null>>>;

const nullishAbsent = fromNullable(maybeUndefined);
type _FromNullable = Assert<Equal<typeof nullishAbsent, Option<string>>>;

const undefinedValue = toUndefined(first);
type _ToUndefined = Assert<Equal<typeof undefinedValue, number | undefined>>;

const nullableValue = toNullable(first);
type _ToNullable = Assert<Equal<typeof nullableValue, number | null>>;

inspect(first, (value) => {
  void value;
});

// @ts-expect-error inspect must not silently discard a Promise
inspect(first, async (value) => {
  void value;
});

declare const maybeAsyncObserver: (value: number) => void | Promise<void>;
// @ts-expect-error inspect rejects callbacks that may return a PromiseLike
inspect(first, maybeAsyncObserver);

declare const nonCallableThenCompletion: { then: string };
declare const callableThenCompletion: { then(): number };
declare const broadCallableThenCompletion: { then: FunctionConstructor["prototype"] };
inspect(first, () => nonCallableThenCompletion);
// @ts-expect-error inspect rejects callable-then completions
inspect(first, () => callableThenCompletion);
// @ts-expect-error inspect rejects broad Function-typed then completions
inspect(first, () => broadCallableThenCompletion);

function overloadedObserver(value: number): Promise<void>;
function overloadedObserver(value: string): void;
function overloadedObserver(value: number | string): Promise<void> | undefined {
  return typeof value === "number" ? Promise.resolve() : undefined;
}

// @ts-expect-error inspect checks the overload applicable to the Option value
inspect(first, overloadedObserver);

const rootSome: RootOption<number> = RootOption.some(1);
type _RootFacade = Assert<Equal<typeof rootSome, RootOptionType<number>>>;

void literalSome;
void literalNone;
