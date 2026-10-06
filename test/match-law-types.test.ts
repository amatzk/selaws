// @ts-expect-error Match is a shared law, not a root public namespace or dispatcher
import { Match as RootMatch } from "../src/index.js";
import { Option, type Option as OptionValue } from "../src/option.js";
import { Result, type Result as ResultValue } from "../src/result/index.js";
import {
  Validation,
  type ValidationIssues,
  type Validation as ValidationValue,
} from "../src/validation.js";
import { Variant } from "../src/variant.js";

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? (<T>() => T extends B ? 1 : 2) extends <T>() => T extends A ? 1 : 2
      ? true
      : false
    : false;

type Assert<T extends true> = T;

declare const option: OptionValue<string>;
const optionMatched = Option.match(option, {
  some: (value) => value.length,
  none: () => "none" as const,
});
type _OptionPayload = Assert<Equal<typeof optionMatched, number | "none">>;

// @ts-expect-error total elimination requires the None branch even for a narrowed Some
Option.match(Option.some("value"), {
  some: (value) => value.length,
});

declare const result: ResultValue<number, "failed">;
const resultMatched = Result.match(result, {
  ok: (value) => value + 1,
  err: (error) => error,
});
type _ResultPayload = Assert<Equal<typeof resultMatched, number | "failed">>;

// @ts-expect-error total elimination requires the Err branch even for a narrowed Ok
Result.match(Result.ok(1), {
  ok: (value) => value + 1,
});

declare const validation: ValidationValue<number, "first" | "second">;
const validationMatched = Validation.match(validation, {
  valid: (value) => value + 1,
  invalid: (issues) => issues,
});
type _ValidationPayload = Assert<
  Equal<typeof validationMatched, number | ValidationIssues<"first" | "second">>
>;

// @ts-expect-error total elimination requires the Invalid branch even for a narrowed Valid
Validation.match(Validation.valid(1), {
  valid: (value) => value + 1,
});

const matchTypesKey: unique symbol = Symbol("MatchTypes");
const Message = Variant.define(matchTypesKey, [
  ["quit", Variant.unit],
  ["write", Variant.payload<string>()],
]);
type Message = Variant.Value<typeof Message>;
declare const message: Message;

const variantMatched = Message.match(message, {
  quit: () => "quit" as const,
  write: (value) => value.length,
});
type _VariantPayload = Assert<Equal<typeof variantMatched, number | "quit">>;

// @ts-expect-error Variant handler keys must equal the closed family universe
Message.match(message, {
  quit: () => 0,
  write: (value) => value.length,
  extra: () => "stale" as const,
});

const staleVariantHandlers = {
  quit: () => 0,
  write: (value: string) => value.length,
  extra: () => "stale" as const,
};
// @ts-expect-error prebuilt handler objects cannot retain undeclared Variant cases
Message.match(message, staleVariantHandlers);

const emptyMatchTypesKey: unique symbol = Symbol("EmptyMatchTypes");
const EmptyVariant = Variant.define(emptyMatchTypesKey, []);
type EmptyVariantValue = Variant.Value<typeof EmptyVariant>;
declare const emptyVariantValue: EmptyVariantValue;
const emptyVariantMatched = EmptyVariant.match(emptyVariantValue, {});
type _EmptyVariantMatchResult = Assert<Equal<typeof emptyVariantMatched, never>>;

// @ts-expect-error total elimination is defined by the whole family, not current narrowing
Message.match(Message.make.write("value"), {
  write: (value) => value.length,
});

const optionAsync = Option.match(option, {
  some: async (value) => value.length,
  none: () => "none" as const,
});
type _OptionCompletion = Assert<Equal<typeof optionAsync, Promise<number> | "none">>;

const resultAsync = Result.match(result, {
  ok: async (value) => value + 1,
  err: (error) => error,
});
type _ResultCompletion = Assert<Equal<typeof resultAsync, Promise<number> | "failed">>;

const validationAsync = Validation.match(validation, {
  valid: async (value) => value + 1,
  invalid: (issues) => issues,
});
type _ValidationCompletion = Assert<
  Equal<typeof validationAsync, Promise<number> | ValidationIssues<"first" | "second">>
>;

const variantAsync = Message.match(message, {
  quit: () => "quit" as const,
  write: async (value) => value.length,
});
type _VariantCompletion = Assert<Equal<typeof variantAsync, Promise<number> | "quit">>;

function overloadedMatchHandler(value: number): number;
function overloadedMatchHandler(value: string): string;
function overloadedMatchHandler(value: number | string): number | string {
  return typeof value === "number" ? value + 1 : value;
}

const overloadedOption = Option.match(Option.some(1 as number), {
  some: overloadedMatchHandler,
  none: () => false as const,
});
type _OverloadedOptionResult = Assert<
  Equal<typeof overloadedOption, number | string | false>
>;

const overloadedResult = Result.match(Result.ok(1 as number), {
  ok: overloadedMatchHandler,
  err: (_error: never) => false as const,
});
type _OverloadedResultResult = Assert<
  Equal<typeof overloadedResult, number | string | false>
>;

const overloadedValidation = Validation.match(Validation.valid(1 as number), {
  valid: overloadedMatchHandler,
  invalid: (_issues: ValidationIssues<never>) => false as const,
});
type _OverloadedValidationResult = Assert<
  Equal<typeof overloadedValidation, number | string | false>
>;

const genericIdentityHandler = <T>(value: T): T => value;
const genericOption = Option.match(Option.some(1 as number), {
  some: genericIdentityHandler,
  none: () => false as const,
});
type _GenericHandlerFallsBackConservatively = Assert<
  Equal<typeof genericOption, unknown>
>;

const genericFixedHandler = <T>(_value: T): "generic" => "generic";
const genericFixedOption = Option.match(Option.some(1 as number), {
  some: genericFixedHandler,
  none: () => false as const,
});
type _GenericFixedReturnRemainsPrecise = Assert<
  Equal<typeof genericFixedOption, "generic" | false>
>;

declare const genericOverloadedHandler: {
  (value: number): number;
  <T>(value: T): "generic";
};
const genericOverloadedOption = Option.match(Option.some(1 as number), {
  some: genericOverloadedHandler,
  none: () => false as const,
});
type _GenericOverloadCycleWidensSafely = Assert<
  Equal<typeof genericOverloadedOption, unknown>
>;

function optionReceiverHandler(
  this: { readonly owner: "Option" },
  value: string,
): number {
  return value.length;
}
Option.match(option, {
  // @ts-expect-error Match callbacks cannot require a handler-object receiver
  some: optionReceiverHandler,
  none: () => 0,
});

function resultReceiverHandler(
  this: { readonly owner: "Result" },
  value: number,
): number {
  return value;
}
Result.match(result, {
  // @ts-expect-error Match callbacks cannot require a handler-object receiver
  ok: resultReceiverHandler,
  err: () => 0,
});

function validationReceiverHandler(
  this: { readonly owner: "Validation" },
  value: number,
): number {
  return value;
}
Validation.match(validation, {
  // @ts-expect-error Match callbacks cannot require a handler-object receiver
  valid: validationReceiverHandler,
  invalid: () => 0,
});

function variantReceiverHandler(
  this: { readonly owner: "Variant" },
  value: string,
): number {
  return value.length;
}
Message.match(message, {
  quit: () => 0,
  // @ts-expect-error Match callbacks cannot require a handler-object receiver
  write: variantReceiverHandler,
});

void RootMatch;
