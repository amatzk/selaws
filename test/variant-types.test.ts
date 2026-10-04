import {
  Variant as RootVariant,
  type Variant as RootVariantValue,
} from "../src/index.js";
import {
  define,
  payload,
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

const Message = define("Message", [
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

const quit = Message.make.quit();
const write = Message.make.write("hello");
const move = Message.make.move({ x: 1, y: 2 });
const explicitUndefined = Message.make.explicitUndefined(undefined);
void move;

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

const Impossible = define("Impossible", [["impossible", payload<never>()]]);
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

const Door = define("Door", [
  ["open", unit],
  ["closed", unit],
]);
const Payment = define("Payment", [
  ["open", unit],
  ["closed", unit],
]);
type Door = Variant<typeof Door>;
type Payment = Variant<typeof Payment>;
declare const door: Door;

// @ts-expect-error same shape does not erase distinct named family identity
const payment: Payment = door;
void payment;

const SharedA = define("Shared", [
  ["left", payload<string>()],
  ["right", unit],
]);
const SharedB = define("Shared", [
  ["left", payload<string>()],
  ["right", unit],
]);
type SharedA = Variant<typeof SharedA>;
type SharedB = Variant<typeof SharedB>;
declare const sharedA: SharedA;
declare const sharedB: SharedB;
const namedForward: SharedB = sharedA;
const namedBackward: SharedA = sharedB;
void namedForward;
void namedBackward;

const SharedExtended = define("Shared", [
  ["left", payload<string>()],
  ["right", unit],
  ["extra", unit],
]);
type SharedExtended = Variant<typeof SharedExtended>;

// @ts-expect-error a different closed case universe is a different snapshot
const extendedFromOld: SharedExtended = sharedA;
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

const Empty = define("Empty", []);
type Empty = Variant<typeof Empty>;
type _EmptyIsNever = Expect<IsNever<Empty>>;

interface AddPayload {
  readonly left: Expr;
  readonly right: Expr;
}

const Expr = define("Expr", [
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

const List = <T>() =>
  define("List", [
    ["nil", unit],
    ["cons", payload<ConsPayload<T>>()],
  ]);

type List<T> = Variant<ReturnType<typeof List<T>>>;

const NumberList = List<number>();
const nil: List<number> = NumberList.make.nil();
const cons: List<number> = NumberList.make.cons({ head: 1, tail: nil });
void cons;

const Remote = <T>() =>
  define("Remote", [
    ["idle", unit],
    ["success", payload<T>()],
    ["failure", payload<Error>()],
  ]);

type Remote<T> = Variant<ReturnType<typeof Remote<T>>>;
const RemoteNumber = Remote<number>();
const remoteNumber: Remote<number> = RemoteNumber.make.success(42);
void remoteNumber;

declare const broadName: string;
// @ts-expect-error family names must be one literal name
define(broadName, [["ready", unit]]);

declare const nameUnion: "A" | "B";
// @ts-expect-error family names cannot be a union
define(nameUnion, [["ready", unit]]);

declare const broadSymbol: symbol;
// @ts-expect-error declaration-owned family tokens require one unique symbol
define(broadSymbol, [["ready", unit]]);

declare const broadCases: readonly (readonly [string, typeof unit])[];
// @ts-expect-error a broad-length declaration is not one finite closed case universe
define("BroadCases", broadCases);

declare const patternedName: `event:${string}`;
// @ts-expect-error a template-pattern name is not one concrete runtime case
define("PatternedCases", [[patternedName, unit]]);

declare const optionalCases: readonly [(readonly ["ready", typeof unit])?];
// @ts-expect-error optional tuple positions do not declare one exact runtime case list
define("OptionalCases", optionalCases);

const stringPayloadSpec = payload<string>();
declare const mixedCaseKind: typeof unit | typeof stringPayloadSpec;
// @ts-expect-error one case cannot vary between unit and payload runtime kinds
define("MixedCaseKind", [["value", mixedCaseKind]]);

declare const unionCaseList:
  | readonly [readonly ["left", typeof unit]]
  | readonly [readonly ["right", typeof unit]];
// @ts-expect-error a union of declaration lists is not one exact case snapshot
define("UnionCaseList", unionCaseList);

const numberPayloadSpec = payload<number>();
declare const payloadKindUnion: typeof stringPayloadSpec | typeof numberPayloadSpec;
const PayloadKindUnion = define("PayloadKindUnion", [["value", payloadKindUnion]]);
PayloadKindUnion.make.value("text");
PayloadKindUnion.make.value(1);

// @ts-expect-error duplicate runtime case names are not one closed family
define("DuplicateCases", [
  ["same", unit],
  ["same", payload<string>()],
]);

// @ts-expect-error numeric case names are outside the string case grammar
define("Numeric", [[1, unit]]);

const symbolCase: unique symbol = Symbol("case");
// @ts-expect-error symbol case names are outside the string case grammar
define("SymbolCase", [[symbolCase, unit]]);

const fullCaseList = [
  ["a", unit],
  ["b", payload<string>()],
] as const;
// @ts-expect-error tuple length prevents hidden runtime cases through width subtyping
const narrowedCaseList: readonly [(typeof fullCaseList)[0]] = fullCaseList;
void narrowedCaseList;

const mutableCaseEntry: ["a", typeof unit] = ["a", unit];
// @ts-expect-error mutable case pairs can be widened and changed before definition
define("MutableCaseEntry", [mutableCaseEntry]);

const mutableCaseList: [readonly ["a", typeof unit]] = [["a", unit]];
// @ts-expect-error mutable outer tuples can be widened and changed before definition
define("MutableCaseList", mutableCaseList);

const HostileNames = define("HostileNames", [
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

const rootMessage = RootVariant.define("RootMessage", [
  ["value", RootVariant.payload<number>()],
  ["empty", RootVariant.unit],
]);
type RootFacadeMessage = RootVariantValue<typeof rootMessage>;
const rootFacadeValue: RootFacadeMessage = rootMessage.make.value(1);
void rootFacadeValue;

const facadeMessage = VariantFacade.define("FacadeMessage", [
  ["value", VariantFacade.payload<number>()],
  ["empty", VariantFacade.unit],
]);
type FacadeMessage = Variant<typeof facadeMessage>;
const facadeValue: FacadeMessage = facadeMessage.make.value(1);
void facadeValue;

const OverloadedCase = define("OverloadedCase", [["value", payload<number>()]]);

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
