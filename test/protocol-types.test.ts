import {
  Protocol as RootProtocol,
  type Protocol as RootProtocolValue,
} from "../src/index.js";
import {
  define,
  type Label,
  type Labels,
  type Next,
  Protocol,
  type Protocol as ProtocolValue,
  type States,
  type Transition,
} from "../src/protocol.js";

type Extends<Left, Right> = Left extends Right ? true : false;
type Equal<Left, Right> =
  (<T>() => T extends Left ? 1 : 2) extends <T>() => T extends Right ? 1 : 2
    ? true
    : false;
type Expect<T extends true> = T;
type IsNever<T> = [T] extends [never] ? true : false;

const orderTransitions = [
  ["pending", "pay", "paid"],
  ["pending", "cancel", "cancelled"],
  ["paid", "ship", "shipped"],
] as const;

const OrderProtocol = define(orderTransitions);
const RootOrderProtocol = RootProtocol.define(orderTransitions);
const FacadeOrderProtocol = Protocol.define(orderTransitions);

type OrderState = States<typeof orderTransitions>;
type OrderLabel = Labels<typeof orderTransitions>;
type PendingPayNext = Next<typeof orderTransitions, "pending", "pay">;
type PendingCancelNext = Next<typeof orderTransitions, "pending", "cancel">;
type PendingDynamicNext = Next<typeof orderTransitions, "pending", OrderLabel>;

type _states = Expect<Equal<OrderState, "pending" | "paid" | "cancelled" | "shipped">>;
type _labels = Expect<Equal<OrderLabel, "pay" | "cancel" | "ship">>;
type _pendingPayNext = Expect<Equal<PendingPayNext, "paid">>;
type _pendingCancelNext = Expect<Equal<PendingCancelNext, "cancelled">>;
type _pendingDynamicNext = Expect<Equal<PendingDynamicNext, "paid" | "cancelled">>;

const broadSourceTransitions: readonly [readonly [string, "pay", "paid"]] = [
  ["pending", "pay", "paid"],
];
type _broadSourceHasNoProtocolStates = Expect<
  IsNever<States<typeof broadSourceTransitions>>
>;
// @ts-expect-error a broad source does not define one exact relation
define(broadSourceTransitions);
// @ts-expect-error Next is defined only over an exact finite relation
type _broadSourceNext = Next<typeof broadSourceTransitions, "pending", "pay">;

const broadLabelTransitions: readonly [readonly ["pending", string, "paid"]] = [
  ["pending", "pay", "paid"],
];
// @ts-expect-error a broad label does not define one exact relation
define(broadLabelTransitions);

const broadTargetTransitions: readonly [readonly ["pending", "pay", string]] = [
  ["pending", "pay", "paid"],
];
// @ts-expect-error a broad target does not define one exact relation
define(broadTargetTransitions);

declare const broadLengthTransitions: readonly (readonly ["pending", "pay", "paid"])[];
// @ts-expect-error a broad-length relation is not one exact finite relation
define(broadLengthTransitions);

declare const unionRelation:
  | readonly [readonly ["a", "go", "b"]]
  | readonly [readonly ["c", "go", "d"]];
// @ts-expect-error a union of relation declarations is not one concrete relation
define(unionRelation);

declare const broadState: string;
// @ts-expect-error a broad scalar member is not one concrete state identity
define([[broadState, "go", "done"]] as const);

declare const broadNumber: number;
// @ts-expect-error a broad numeric member is not one concrete scalar identity
define([[broadNumber, "go", 1]] as const);

declare const broadBoolean: boolean;
// @ts-expect-error broad boolean is two possible runtime scalar identities
define([["a", broadBoolean, "b"]] as const);

declare const broadBigint: bigint;
// @ts-expect-error broad bigint is not one concrete scalar identity
define([[1n, "go", broadBigint]] as const);

declare const broadProtocolSymbol: symbol;
// @ts-expect-error broad symbol is not one concrete symbol identity
define([[broadProtocolSymbol, "go", "done"]] as const);

declare const patternState: `state:${string}`;
// @ts-expect-error a patterned string space is not one concrete state identity
define([[patternState, "go", "done"]] as const);

declare const scalarBrand: unique symbol;
type BrandedState = string & { readonly [scalarBrand]: true };
declare const brandedState: BrandedState;
// @ts-expect-error a branded broad string still denotes multiple runtime scalars
define([[brandedState, "go", "done"]] as const);

const nondeterministicTransitions = [
  ["open", "advance", "left"],
  ["open", "advance", "right"],
] as const;

type _nondeterministicNext = Expect<
  Equal<Next<typeof nondeterministicTransitions, "open", "advance">, "left" | "right">
>;

const occurrenceTransitions = [
  ["open", "complete", "completed"],
  ["open", "cancel", "cancelled"],
] as const;

type _occurrenceCompleteNext = Expect<
  Equal<Next<typeof occurrenceTransitions, "open", "complete">, "completed">
>;

const shiftWriteTransitions = [
  ["draft", "write_succeeded", "written"],
  ["draft", "write_failed", "write_failed"],
  ["write_failed", "write_succeeded", "written"],
  ["written", "manual_edit", "draft"],
  ["synced", "manual_edit", "draft"],
  ["draft", "sync", "synced"],
] as const;

type _shiftManualEditNext = Expect<
  Equal<Next<typeof shiftWriteTransitions, "written", "manual_edit">, "draft">
>;
type _shiftWriteFailureNext = Expect<
  Equal<Next<typeof shiftWriteTransitions, "draft", "write_failed">, "write_failed">
>;

const protocolType: ProtocolValue<typeof orderTransitions> = OrderProtocol;
const rootProtocolType: RootProtocolValue<typeof orderTransitions> = RootOrderProtocol;
const facadeProtocolType: ProtocolValue<typeof orderTransitions> = FacadeOrderProtocol;
const labelType: Label = "pay";
const transitionType: Transition<"pending", "pay", "paid"> = ["pending", "pay", "paid"];

declare let dynamicLabel: OrderLabel;
declare let dynamicTarget: OrderState;

const pendingPayMembership: boolean = OrderProtocol.allows(
  "pending",
  "pay",
  dynamicTarget,
);
const dynamicMembership: boolean = OrderProtocol.allows(
  "pending",
  dynamicLabel,
  dynamicTarget,
);

const cyclicTransitions = [
  ["a", "go", "b"],
  ["b", "go", "a"],
] as const;
const CyclicProtocol = define(cyclicTransitions);
const numericTransitions = [[1, 2, 3]] as const;
const NumericProtocol = define(numericTransitions);
const numericMembership: boolean = NumericProtocol.allows(1, 2, 3);

const bigintTransitions = [[1n, 2n, 3n]] as const;
const BigintProtocol = define(bigintTransitions);
const bigintMembership: boolean = BigintProtocol.allows(1n, 2n, 3n);

const booleanTransitions = [[false, true, false]] as const;
const BooleanProtocol = define(booleanTransitions);
const booleanMembership: boolean = BooleanProtocol.allows(false, true, false);

const sourceSymbol: unique symbol = Symbol("source");
const labelSymbol: unique symbol = Symbol("label");
const targetSymbol: unique symbol = Symbol("target");
const symbolTransitions = [[sourceSymbol, labelSymbol, targetSymbol]] as const;
const SymbolProtocol = define(symbolTransitions);
const symbolMembership: boolean = SymbolProtocol.allows(
  sourceSymbol,
  labelSymbol,
  targetSymbol,
);

declare let cyclicSource: "a" | "b";
declare let cyclicTarget: "a" | "b";

if (!CyclicProtocol.allows(cyclicSource, "go", cyclicTarget)) {
  type _FalseBranchRemainsPossible = Expect<Equal<typeof cyclicTarget, "a" | "b">>;
  const stillPossible: _FalseBranchRemainsPossible = true;
  void stillPossible;
}

// @ts-expect-error "shipped" is not an admissible target for pending + pay
const impossiblePendingPayTarget: PendingPayNext = "shipped";

// @ts-expect-error unknown state identifiers are not part of this relation
OrderProtocol.allows("missing", "pay", "paid");

// @ts-expect-error unknown transition labels are not part of this relation
OrderProtocol.allows("pending", "refund", "paid");

// @ts-expect-error aggregate objects are not scalar protocol states
define([[{ state: "pending" }, "pay", "paid"]] as const);

// @ts-expect-error aggregate objects are not scalar protocol labels
define([["pending", { operation: "pay" }, "paid"]] as const);

const mutableTransition: ["pending", "pay", "paid"] = ["pending", "pay", "paid"];
const readonlyOuterWithMutableTransition: readonly [typeof mutableTransition] = [
  mutableTransition,
];
// @ts-expect-error mutable triples can be widened and mutated through array covariance
define(readonlyOuterWithMutableTransition);

const readonlyTransition = ["pending", "pay", "paid"] as const;
const mutableOuter: [typeof readonlyTransition] = [readonlyTransition];
// @ts-expect-error a mutable outer relation can replace an exact triple through covariance
define(mutableOuter);

declare const mixedOuter:
  | [typeof readonlyTransition]
  | readonly [typeof readonlyTransition];
// @ts-expect-error every possible outer relation carrier must be readonly
define(mixedOuter);

declare const mixedInner: readonly [
  ["pending", "pay", "paid"] | typeof readonlyTransition,
];
// @ts-expect-error every possible transition triple must be readonly
define(mixedInner);

// @ts-expect-error generic Protocol helpers stay on the focused owner surface
import type { Next as RootNext } from "../src/index.js";

type _rootNextUnavailable = RootNext;

type _protocolIsStructural = Expect<
  Extends<typeof OrderProtocol, ProtocolValue<typeof orderTransitions>>
>;

void protocolType;
void rootProtocolType;
void facadeProtocolType;
void labelType;
void transitionType;
void pendingPayMembership;
void dynamicMembership;
void numericMembership;
void bigintMembership;
void booleanMembership;
void symbolMembership;
void impossiblePendingPayTarget;
