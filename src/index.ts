import { Option as OptionFacade } from "./option.js";
import { Protocol as ProtocolFacade } from "./protocol.js";
import { Result as ResultFacade } from "./result/core.js";
import { Validation as ValidationFacade } from "./validation.js";
import { Variant as VariantFacade } from "./variant.js";

export { type Evidence, evidence } from "./evidence.js";
export { type Identity, identity, type Scalar } from "./identity.js";

/** Root-entry Protocol carrier paired with the Protocol facade value. */
export type Protocol<
  Transitions extends readonly import("./protocol.js").Transition[],
> = import("./protocol.js").Protocol<Transitions>;
/** Root-entry Protocol facade. */
export const Protocol: typeof ProtocolFacade = ProtocolFacade;

/** Root-entry Variant carrier paired with the Variant facade value. */
export type Variant<Family> = import("./variant.js").Variant<Family>;
/** Root-entry Variant facade. */
export const Variant: typeof VariantFacade = VariantFacade;
export namespace Variant {
  /** Extracts the closed value union produced by one Variant family. */
  export type Value<Family> = import("./variant.js").Variant<Family>;
}

export type { None, OptionValue, Some } from "./option.js";
/** Root-entry Option carrier paired with the Option facade value. */
export type Option<T> = import("./option.js").Option<T>;
/** Root-entry Option facade. */
export const Option: typeof OptionFacade = OptionFacade;

export type {
  Invalid,
  Valid,
  ValidationError,
  ValidationIssues,
  ValidationValue,
} from "./validation.js";
/** Root-entry Validation carrier paired with the Validation facade value. */
export type Validation<T, E> = import("./validation.js").Validation<T, E>;
/** Root-entry Validation facade. */
export const Validation: typeof ValidationFacade = ValidationFacade;

export type {
  AsyncResult,
  Err,
  Ok,
  ResultError,
  ResultValue,
} from "./result/core.js";
/** Root-entry Result carrier paired with the Result facade value. */
export type Result<T, E> = import("./result/core.js").Result<T, E>;
/** Root-entry Result facade. */
export const Result: typeof ResultFacade = ResultFacade;
