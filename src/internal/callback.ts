type Same<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? (<T>() => T extends B ? 1 : 2) extends <T>() => T extends A ? 1 : 2
      ? true
      : false
    : false;

type UnknownCallback = (this: void, ...args: never[]) => unknown;

type OverloadUnion<
  Callback,
  Partial = unknown,
  Previous = never,
  Repeated extends boolean = false,
  Accumulated = never,
> = Callback extends (this: infer This, ...args: infer Args) => infer Result
  ? ((this: This, ...args: Args) => Result) extends infer Current
    ? Same<Current, Previous> extends true
      ? Repeated extends true
        ? Accumulated | UnknownCallback
        : Partial extends Callback
          ? Accumulated
          : OverloadUnion<
              Partial & Callback,
              Partial & Current,
              Current,
              true,
              Accumulated | Current
            >
      : Partial extends Callback
        ? Accumulated
        : OverloadUnion<
            Partial & Callback,
            Partial & Current,
            Current,
            false,
            Accumulated | Current
          >
    : Accumulated
  : Accumulated;

/**
 * Extracts a conservative union of callable return types.
 *
 * TypeScript exposes overloads as intersections. Generic callable reflection
 * can repeat one instantiated signature indefinitely; repeated reflection
 * widens to unknown instead of exhausting compiler instantiation depth.
 */
export type CallbackResult<Callback> =
  OverloadUnion<Callback> extends infer One
    ? One extends (...args: never[]) => infer Result
      ? Result
      : never
    : never;
