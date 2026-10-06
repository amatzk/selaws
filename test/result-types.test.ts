import {
  type AsyncResult,
  all,
  andThen,
  attempt,
  attemptAsync,
  type Err,
  err,
  flatten,
  map,
  mapError,
  type Ok,
  ok,
  orElse,
  orThrow,
  Result,
  type ResultError,
  type Result as ResultValue,
  type ResultValue as SuccessOf,
  wrap,
  wrapAsync,
} from "../src/result/index.js";

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? (<T>() => T extends B ? 1 : 2) extends <T>() => T extends A ? 1 : 2
      ? true
      : false
    : false;

type Assert<T extends true> = T;

const literalOk = ok(1 as const);
const literalErr = err("bad" as const);

type _OkShape = Assert<Equal<typeof literalOk, ResultValue<1, never>>>;
type _ErrShape = Assert<Equal<typeof literalErr, ResultValue<never, "bad">>>;
type _SuccessProjection = Assert<Equal<SuccessOf<Ok<1> | Err<"e">>, 1>>;
type _ErrorProjection = Assert<Equal<ResultError<Ok<1> | Err<"e">>, "e">>;

declare const input: ResultValue<number, "parse">;

if (input.ok) {
  const value: number = input.value;
  void value;
  // @ts-expect-error the error arm is absent after narrowing
  input.error;
} else {
  const error: "parse" = input.error;
  void error;
  // @ts-expect-error the value arm is absent after narrowing
  input.value;
}

const mapped = map(input, (value) => value.toString());
type _Mapped = Assert<Equal<typeof mapped, ResultValue<string, "parse">>>;

const mappedError = mapError(input, (error) => ({ kind: error }) as const);
type _MappedError = Assert<
  Equal<typeof mappedError, ResultValue<number, Readonly<{ kind: "parse" }>>>
>;

const chained = andThen(
  input,
  (value): ResultValue<string, "negative"> =>
    value >= 0 ? ok(String(value)) : err("negative"),
);
type _Chained = Assert<
  Equal<typeof chained, ResultValue<string, "parse" | "negative">>
>;

const recovered = orElse(
  input,
  (error): ResultValue<string, "fallback"> =>
    error === "parse" ? ok("recovered") : err("fallback"),
);
type _Recovered = Assert<
  Equal<typeof recovered, ResultValue<number | string, "fallback">>
>;

declare const nested: ResultValue<ResultValue<number, "inner">, "outer">;
const flattened = flatten(nested);
type _Flattened = Assert<
  Equal<typeof flattened, ResultValue<number, "inner" | "outer">>
>;

declare const first: ResultValue<number, "first">;
declare const second: ResultValue<string, "second">;
const tuple = all([first, second] as const);
type _Tuple = Assert<
  Equal<typeof tuple, ResultValue<readonly [number, string], "first" | "second">>
>;

const empty = all([] as const);
type _Empty = Assert<Equal<typeof empty, ResultValue<readonly [], never>>>;

const mutableResultTuple: [ResultValue<number, "first">] = [first];
// @ts-expect-error finite positional tuples must be readonly at the all boundary
all(mutableResultTuple);

declare const broadResults: ResultValue<number, "issue">[];
// @ts-expect-error mutable arrays can be widened and changed before the all boundary
all(broadResults);

declare const readonlyBroadResults: readonly ResultValue<number, "issue">[];
const broadResultList = all(readonlyBroadResults);
type _BroadResultList = Assert<
  Equal<typeof broadResultList, ResultValue<readonly number[], "issue">>
>;

declare const nonCallableThenCompletion: { then: string };
declare const callableThenCompletion: { then(): number };
declare const broadCallableThenCompletion: { then: FunctionConstructor["prototype"] };

const captured = attempt(
  () => 1,
  (caught) => String(caught),
);
type _Captured = Assert<Equal<typeof captured, ResultValue<1, string>>>;

const jsonCaptured = attempt(
  () => JSON.parse("{}"),
  (caught) => String(caught),
);
const jsonCapturedResult: ResultValue<unknown, string> = jsonCaptured;
void jsonCapturedResult;

attempt(
  // @ts-expect-error synchronous capture rejects Promise-returning thunks
  () => Promise.resolve(1),
  (caught) => String(caught),
);

declare const maybeAsyncRead: () => number | Promise<number>;
// @ts-expect-error synchronous capture rejects thunks that may return a PromiseLike
attempt(maybeAsyncRead, (caught) => String(caught));

attempt(
  () => nonCallableThenCompletion,
  (caught) => String(caught),
);
attempt(
  // @ts-expect-error synchronous capture rejects callable-then return shapes
  () => callableThenCompletion,
  (caught) => String(caught),
);
attempt(
  // @ts-expect-error synchronous capture rejects broad Function-typed then returns
  () => broadCallableThenCompletion,
  (caught) => String(caught),
);

function captureGenericString<T extends string>(value: T): ResultValue<T, string> {
  return attempt(
    () => value,
    (caught) => String(caught),
  );
}

function captureGenericObject<T extends { readonly value: number }>(
  value: T,
): ResultValue<T, string> {
  return attempt(
    () => value,
    (caught) => String(caught),
  );
}

const genericString = captureGenericString("literal" as const);
type _GenericStringCapture = Assert<
  Equal<typeof genericString, ResultValue<"literal", string>>
>;

const genericObject = captureGenericObject({ value: 1, tag: "x" } as const);
type _GenericObjectCapture = Assert<
  Equal<typeof genericObject, ResultValue<Readonly<{ value: 1; tag: "x" }>, string>>
>;

const capturedAsync = attemptAsync(
  async () => 1,
  (caught) => String(caught),
);
type _CapturedAsync = Assert<
  Equal<typeof capturedAsync, Promise<ResultValue<number, string>>>
>;

void attemptAsync(
  // @ts-expect-error asynchronous capture requires a PromiseLike-returning thunk
  () => 1,
  (caught) => String(caught),
);

// @ts-expect-error asynchronous capture requires every return path to be PromiseLike
void attemptAsync(maybeAsyncRead, (caught) => String(caught));

function add(this: { base: number }, delta: number): number {
  return this.base + delta;
}

const safeAdd = wrap(add, (caught) => String(caught));
const wrappedResult = safeAdd.call({ base: 2 }, 3);
type _Wrapped = Assert<Equal<typeof wrappedResult, ResultValue<number, string>>>;

function overloadedRead(value: number): number;
function overloadedRead(value: string): string;
function overloadedRead(value: number | string): number | string {
  return value;
}

const safeOverloadedRead = wrap(overloadedRead, (caught) => String(caught));
const overloadedNumber = safeOverloadedRead(1);
const overloadedString = safeOverloadedRead("one");
type _WrappedOverloadNumber = Assert<
  Equal<typeof overloadedNumber, ResultValue<number, string>>
>;
type _WrappedOverloadString = Assert<
  Equal<typeof overloadedString, ResultValue<string, string>>
>;
// @ts-expect-error the wrapped overload set keeps the original argument domain
safeOverloadedRead(true);

function partlyAsyncRead(value: number): number;
function partlyAsyncRead(value: string): Promise<string>;
function partlyAsyncRead(value: number | string): number | Promise<string> {
  return typeof value === "number" ? value : Promise.resolve(value);
}

// @ts-expect-error every synchronous overload must exclude PromiseLike returns
wrap(partlyAsyncRead, (caught) => String(caught));

const safeJsonParse = wrap(JSON.parse, (caught) => String(caught));
const wrappedJson = safeJsonParse("{}");
const wrappedJsonResult: ResultValue<unknown, string> = wrappedJson;
void wrappedJsonResult;

declare const maybeAsyncFunction: (value: number) => number | Promise<number>;
// @ts-expect-error wrap rejects functions that may return a PromiseLike
wrap(maybeAsyncFunction, (caught) => String(caught));

declare const unionSyncFunction:
  | ((value: number) => number)
  | ((value: string) => string);
// @ts-expect-error a runtime union of callables is not an overload set
wrap(unionSyncFunction, (caught) => String(caught));

wrap(
  () => nonCallableThenCompletion,
  (caught) => String(caught),
);
wrap(
  // @ts-expect-error wrap rejects callable-then return shapes
  () => callableThenCompletion,
  (caught) => String(caught),
);
wrap(
  // @ts-expect-error wrap rejects broad Function-typed then returns
  () => broadCallableThenCompletion,
  (caught) => String(caught),
);

function wrapGenericString<T extends string>(value: T): ResultValue<T, string> {
  const safe = wrap(
    (input: T) => input,
    (caught) => String(caught),
  );
  return safe(value);
}

const genericWrapped = wrapGenericString("wrapped" as const);
type _GenericWrapped = Assert<
  Equal<typeof genericWrapped, ResultValue<"wrapped", string>>
>;

async function addAsync(this: { base: number }, delta: number): Promise<number> {
  return this.base + delta;
}

const safeAddAsync = wrapAsync(addAsync, (caught) => String(caught));
const wrappedAsyncResult = safeAddAsync.call({ base: 2 }, 3);
type _WrappedAsync = Assert<
  Equal<typeof wrappedAsyncResult, Promise<ResultValue<number, string>>>
>;

function overloadedAsyncRead(value: number): Promise<number>;
function overloadedAsyncRead(value: string): Promise<string>;
async function overloadedAsyncRead(value: number | string): Promise<number | string> {
  return value;
}

const safeOverloadedAsyncRead = wrapAsync(overloadedAsyncRead, (caught) =>
  String(caught),
);
const overloadedAsyncNumber = safeOverloadedAsyncRead(1);
const overloadedAsyncString = safeOverloadedAsyncRead("one");
type _WrappedAsyncOverloadNumber = Assert<
  Equal<typeof overloadedAsyncNumber, Promise<ResultValue<number, string>>>
>;
type _WrappedAsyncOverloadString = Assert<
  Equal<typeof overloadedAsyncString, Promise<ResultValue<string, string>>>
>;
// @ts-expect-error the wrapped overload set keeps the original argument domain
safeOverloadedAsyncRead(true);

function partlySyncRead(value: number): Promise<number>;
function partlySyncRead(value: string): string;
function partlySyncRead(value: number | string): Promise<number> | string {
  return typeof value === "number" ? Promise.resolve(value) : value;
}

// @ts-expect-error every asynchronous overload must return PromiseLike
wrapAsync(partlySyncRead, (caught) => String(caught));

declare const maybeAsyncWrappedFunction: (value: number) => number | Promise<number>;
// @ts-expect-error wrapAsync requires every return path to be PromiseLike
wrapAsync(maybeAsyncWrappedFunction, (caught) => String(caught));

declare const unionAsyncFunction:
  | ((value: number) => Promise<number>)
  | ((value: string) => Promise<string>);
// @ts-expect-error a runtime union of async callables is not an overload set
wrapAsync(unionAsyncFunction, (caught) => String(caught));

const thrown = orThrow(input, (error) => new Error(error));
type _OrThrow = Assert<Equal<typeof thrown, number>>;

const facadeOk = Result.ok(1);
type _Facade = Assert<Equal<typeof facadeOk, ResultValue<number, never>>>;

declare const asyncAlias: AsyncResult<number, "e">;
const promiseAlias: Promise<ResultValue<number, "e">> = asyncAlias;
void promiseAlias;
