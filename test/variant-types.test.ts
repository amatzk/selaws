import {
  Variant as RootVariant,
  type Variant as RootVariantValue,
} from "../src/index.js";
import {
  define,
  payload,
  shared,
  unit,
  type Variant,
  Variant as VariantFacade,
} from "../src/variant.js";

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? (<T>() => T extends B ? 1 : 2) extends <T>() => T extends A ? 1 : 2
      ? true
      : false
    : false;
type Expect<T extends true> = T;
type IsNever<T> = [T] extends [never] ? true : false;

const messageKey: unique symbol = Symbol("Message");
const Message = define(messageKey, [
  ["quit", unit],
  ["write", payload<string>()],
  ["move", payload<Readonly<{ x: number; y: number }>>()],
  ["explicitUndefined", payload<undefined>()],
]);

type Message = Variant.Value<typeof Message>;
type FocusedMessage = Variant<typeof Message>;
type RootMessage = RootVariant.Value<typeof Message>;
type RootAliasMessage = RootVariantValue<typeof Message>;
type _FocusedVariantType = Expect<Equal<FocusedMessage, Message>>;
type _RootVariantType = Expect<Equal<RootMessage, Message>>;
type _RootAliasVariantType = Expect<Equal<RootAliasMessage, Message>>;

type WriteCase = VariantFacade.Case<Message, "write">;
type RootWriteCase = RootVariant.Case<Message, "write">;
type _WriteCaseTag = Expect<Equal<WriteCase["tag"], "write">>;
type _WriteCasePayload = Expect<Equal<WriteCase["value"], string>>;
type _RootCaseMatchesFocused = Expect<Equal<RootWriteCase, WriteCase>>;

type CaseByName<
  Value extends Readonly<{ tag: string }>,
  Name extends Value["tag"],
> = VariantFacade.Case<Value, Name>;
type _GenericCaseName = Expect<Equal<CaseByName<Message, "quit">["tag"], "quit">>;

// @ts-expect-error Variant.Case accepts only names in the closed value union
type _MissingMessageCase = VariantFacade.Case<Message, "missing">;

const quit = Message.make.quit();
const write = Message.make.write("hello");
const writeAsCase: WriteCase = write;
const move = Message.make.move({ x: 1, y: 2 });
const explicitUndefined = Message.make.explicitUndefined(undefined);
void move;
void writeAsCase;

type _MessageTag = Expect<
  Equal<Message["tag"], "quit" | "write" | "move" | "explicitUndefined">
>;
type _QuitTag = Expect<Equal<typeof quit.tag, "quit">>;
type _WritePayloadPreservesLiteral = Expect<Equal<typeof write.value, "hello">>;
type _ExplicitUndefinedHasPayload = Expect<
  Equal<typeof explicitUndefined.value, undefined>
>;

const matched = Message.match(write, {
  quit: () => 0,
  write: (text) => text.length,
  move: ({ x, y }) => x + y,
  explicitUndefined: (value) => (value === undefined ? 1 : 0),
});
type _MatchResult = Expect<Equal<typeof matched, number>>;

declare const message: Message;
if (message.tag === "write") {
  const narrowedPayload: string = message.value;
  void narrowedPayload;
}

const impossibleKey: unique symbol = Symbol("Impossible");
const Impossible = define(impossibleKey, [["impossible", payload<never>()]]);
type Impossible = Variant.Value<typeof Impossible>;
// @ts-expect-error an honestly typed never payload has no constructor argument
Impossible.make.impossible(undefined);
type _NeverPayloadFamilyIsNotEmpty = Expect<
  IsNever<Impossible> extends false ? true : false
>;

// @ts-expect-error every family case is required even when the value is narrowed
Message.match(write, {
  write: (text) => text.length,
});

// @ts-expect-error wrong payload
Message.make.write(123);

// @ts-expect-error unit cases accept no payload
Message.make.quit(undefined);

// @ts-expect-error payload cases require a payload even when it is undefined
Message.make.explicitUndefined();

const doorKey: unique symbol = Symbol("Door");
const paymentKey: unique symbol = Symbol("Payment");
const Door = define(doorKey, [
  ["open", unit],
  ["closed", unit],
]);
const Payment = define(paymentKey, [
  ["open", unit],
  ["closed", unit],
]);
type Door = Variant<typeof Door>;
type Payment = Variant<typeof Payment>;
type DoorOpen = VariantFacade.Case<Door, "open">;
type PaymentOpen = VariantFacade.Case<Payment, "open">;
declare const door: Door;
declare const doorOpen: DoorOpen;

// @ts-expect-error same case name does not erase distinct local family identity
const paymentOpen: PaymentOpen = doorOpen;
void paymentOpen;

// @ts-expect-error same shape does not erase distinct declaration-owned family identity
const payment: Payment = door;
void payment;

const sharedA = shared("example.variant/Shared@1", [
  ["left", payload<string>()],
  ["right", unit],
]);
const sharedB = shared("example.variant/Shared@1", [
  ["left", payload<string>()],
  ["right", unit],
]);
type SharedA = Variant<typeof sharedA>;
type SharedB = Variant<typeof sharedB>;
declare const sharedValueA: SharedA;
declare const sharedValueB: SharedB;
const sharedForward: SharedB = sharedValueA;
const sharedBackward: SharedA = sharedValueB;
void sharedForward;
void sharedBackward;

const sharedExtended = shared("example.variant/Shared@1", [
  ["left", payload<string>()],
  ["right", unit],
  ["extra", unit],
]);
type SharedExtended = Variant<typeof sharedExtended>;

// @ts-expect-error a different closed case universe is a different shared contract snapshot
const extendedFromOld: SharedExtended = sharedValueA;
// @ts-expect-error snapshot identity is symmetric rather than width-subtyped
const oldFromExtended: SharedA = {} as SharedExtended;
void extendedFromOld;
void oldFromExtended;

const sharedToken: unique symbol = Symbol("Shared");
const StrictA = define(sharedToken, [["left", payload<string>()]]);
const StrictB = define(sharedToken, [["left", payload<string>()]]);
type StrictA = Variant<typeof StrictA>;
type StrictB = Variant<typeof StrictB>;
declare const strictA: StrictA;
declare const strictB: StrictB;
const strictForward: StrictB = strictA;
const strictBackward: StrictA = strictB;
void strictForward;
void strictBackward;

const otherToken: unique symbol = Symbol("Other");
const OtherStrict = define(otherToken, [["left", payload<string>()]]);
type OtherStrict = Variant<typeof OtherStrict>;

// @ts-expect-error declaration-owned family tokens remain distinct
const otherStrict: OtherStrict = strictA;
void otherStrict;

const emptyKey: unique symbol = Symbol("Empty");
const Empty = define(emptyKey, []);
type Empty = Variant<typeof Empty>;
type _EmptyIsNever = Expect<IsNever<Empty>>;

interface AddPayload {
  readonly left: Expr;
  readonly right: Expr;
}

const exprKey: unique symbol = Symbol("Expr");
const Expr = define(exprKey, [
  ["lit", payload<number>()],
  ["add", payload<AddPayload>()],
]);
type Expr = Variant<typeof Expr>;

const one: Expr = Expr.make.lit(1);
const two: Expr = Expr.make.add({ left: one, right: one });
void two;

interface ConsPayload<T> {
  readonly head: T;
  readonly tail: Variant.Value<ReturnType<typeof List<T>>>;
}

const listKey: unique symbol = Symbol("List");
const List = <T>() =>
  define(listKey, [
    ["nil", unit],
    ["cons", payload<ConsPayload<T>>()],
  ]);

type List<T> = Variant<ReturnType<typeof List<T>>>;

const NumberList = List<number>();
const nil: List<number> = NumberList.make.nil();
const cons: List<number> = NumberList.make.cons({ head: 1, tail: nil });
void cons;

const remoteKey: unique symbol = Symbol("Remote");
const Remote = <T>() =>
  define(remoteKey, [
    ["idle", unit],
    ["success", payload<T>()],
    ["failure", payload<Error>()],
  ]);

type Remote<T> = Variant<ReturnType<typeof Remote<T>>>;
type RemoteSuccess<T> = VariantFacade.Case<Remote<T>, "success">;
type _GenericCasePayload = Expect<Equal<RemoteSuccess<number>["value"], number>>;
const RemoteNumber = Remote<number>();
const remoteNumber: Remote<number> = RemoteNumber.make.success(42);
const remoteSuccess: RemoteSuccess<number> = RemoteNumber.make.success(42);
void remoteNumber;
void remoteSuccess;

declare const broadSymbol: symbol;
// @ts-expect-error declaration-owned family tokens require one unique symbol
define(broadSymbol, [["ready", unit]]);

// @ts-expect-error local family declarations do not accept shared string contracts
define("example.variant/Broad@1", [["ready", unit]]);

declare const broadContract: string;
// @ts-expect-error shared family contracts require one literal string
shared(broadContract, [["ready", unit]]);

declare const contractUnion: "A" | "B";
// @ts-expect-error one shared family declaration cannot vary between contracts
shared(contractUnion, [["ready", unit]]);

declare const contractPattern: `variant:${string}`;
// @ts-expect-error a pattern is not one shared family contract
shared(contractPattern, [["ready", unit]]);

// @ts-expect-error shared families do not accept symbol tokens
shared(messageKey, [["ready", unit]]);

declare const broadCases: readonly (readonly [string, typeof unit])[];
// @ts-expect-error a broad-length declaration is not one finite closed case universe
define(messageKey, broadCases);

declare const patternedName: `event:${string}`;
// @ts-expect-error a template-pattern name is not one concrete runtime case
define(messageKey, [[patternedName, unit]]);

declare const optionalCases: readonly [(readonly ["ready", typeof unit])?];
// @ts-expect-error optional tuple positions do not declare one exact runtime case list
define(messageKey, optionalCases);

const stringPayloadSpec = payload<string>();
declare const mixedCaseKind: typeof unit | typeof stringPayloadSpec;
// @ts-expect-error one case cannot vary between unit and payload runtime kinds
define(messageKey, [["value", mixedCaseKind]]);

declare const unionCaseList:
  | readonly [readonly ["left", typeof unit]]
  | readonly [readonly ["right", typeof unit]];
// @ts-expect-error a union of declaration lists is not one exact case snapshot
define(messageKey, unionCaseList);

const numberPayloadSpec = payload<number>();
declare const payloadKindUnion: typeof stringPayloadSpec | typeof numberPayloadSpec;
const PayloadKindUnion = define(messageKey, [["value", payloadKindUnion]]);
PayloadKindUnion.make.value("text");
PayloadKindUnion.make.value(1);

// @ts-expect-error duplicate runtime case names are not one closed family
define(messageKey, [
  ["same", unit],
  ["same", payload<string>()],
]);

// @ts-expect-error numeric case names are outside the string case grammar
define(messageKey, [[1, unit]]);

const symbolCase: unique symbol = Symbol("case");
// @ts-expect-error symbol case names are outside the string case grammar
define(messageKey, [[symbolCase, unit]]);

const fullCaseList = [
  ["a", unit],
  ["b", payload<string>()],
] as const;
// @ts-expect-error tuple length prevents hidden runtime cases through width subtyping
const narrowedCaseList: readonly [(typeof fullCaseList)[0]] = fullCaseList;
void narrowedCaseList;

const mutableCaseEntry: ["a", typeof unit] = ["a", unit];
// @ts-expect-error mutable case pairs can be widened and changed before definition
define(messageKey, [mutableCaseEntry]);

const mutableCaseList: [readonly ["a", typeof unit]] = [["a", unit]];
// @ts-expect-error mutable outer tuples can be widened and changed before definition
define(messageKey, mutableCaseList);

const hostileNamesKey: unique symbol = Symbol("HostileNames");
const HostileNames = define(hostileNamesKey, [
  ["__proto__", unit],
  ["constructor", unit],
  ["make", unit],
  ["match", unit],
]);
const hostileConstructor = HostileNames.make.constructor();
const hostileMake = HostileNames.make.make();
const hostileMatch = HostileNames.make.match();
void hostileConstructor;
void hostileMake;
void hostileMatch;

const rootMessageKey: unique symbol = Symbol("RootMessage");
const rootMessage = RootVariant.define(rootMessageKey, [
  ["value", RootVariant.payload<number>()],
  ["empty", RootVariant.unit],
]);
type RootFacadeMessage = RootVariantValue<typeof rootMessage>;
const rootFacadeValue: RootFacadeMessage = rootMessage.make.value(1);
void rootFacadeValue;

const facadeMessageKey: unique symbol = Symbol("FacadeMessage");
const facadeMessage = VariantFacade.define(facadeMessageKey, [
  ["value", VariantFacade.payload<number>()],
  ["empty", VariantFacade.unit],
]);
type FacadeMessage = Variant<typeof facadeMessage>;
const facadeValue: FacadeMessage = facadeMessage.make.value(1);
void facadeValue;

const overloadedCaseKey: unique symbol = Symbol("OverloadedCase");
const OverloadedCase = define(overloadedCaseKey, [["value", payload<number>()]]);

function overloadedCaseHandler(value: number): number;
function overloadedCaseHandler(value: string): string;
function overloadedCaseHandler(value: number | string): number | string {
  return value;
}

const overloadedMatch = OverloadedCase.match(OverloadedCase.make.value(1), {
  value: overloadedCaseHandler,
});
type _OverloadedMatchResultIsConservative = Expect<
  Equal<typeof overloadedMatch, number | string>
>;
