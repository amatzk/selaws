import type { CallbackResult } from "../src/internal/callback.js";

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? (<T>() => T extends B ? 1 : 2) extends <T>() => T extends A ? 1 : 2
      ? true
      : false
    : false;

type Assert<T extends true> = T;

function overloaded(value: number): number;
function overloaded(value: string): string;
function overloaded(value: number | string): number | string {
  return value;
}

type _OrdinaryOverloads = Assert<
  Equal<CallbackResult<typeof overloaded>, number | string>
>;

declare const unionCallable:
  | ((this: void, value: number) => 1)
  | ((this: void, value: number) => "one");

type _UnionCallable = Assert<Equal<CallbackResult<typeof unionCallable>, 1 | "one">>;

declare const genericIdentity: <T>(value: T) => T;
type _GenericIdentityWidensSafely = Assert<
  Equal<CallbackResult<typeof genericIdentity>, unknown>
>;

declare const genericFixed: <T>(value: T) => string;
type _GenericFixedReturnStaysPrecise = Assert<
  Equal<CallbackResult<typeof genericFixed>, string>
>;

interface GenericLastOverload {
  (value: number): number;
  <T>(value: T): "generic";
}

type _GenericReflectionCycleWidensSafely = Assert<
  Equal<CallbackResult<GenericLastOverload>, unknown>
>;

interface GenericFirstOverload {
  <T>(value: T): "generic";
  (value: number): number;
}

type _GenericFirstStillExposesFiniteOverloads = Assert<
  Equal<CallbackResult<GenericFirstOverload>, number | "generic">
>;

interface ManyOverloads {
  (value: 0): 0;
  (value: 1): 1;
  (value: 2): 2;
  (value: 3): 3;
  (value: 4): 4;
  (value: 5): 5;
  (value: 6): 6;
  (value: 7): 7;
  (value: 8): 8;
  (value: 9): 9;
  (value: 10): 10;
  (value: 11): 11;
  (value: 12): 12;
  (value: 13): 13;
  (value: 14): 14;
  (value: 15): 15;
}

type _ManyOverloadsHaveNoArbitraryExtractionCap = Assert<
  Equal<
    CallbackResult<ManyOverloads>,
    0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15
  >
>;

declare const neverCallback: (value: number) => never;
type _NeverRemainsNever = Assert<Equal<CallbackResult<typeof neverCallback>, never>>;
