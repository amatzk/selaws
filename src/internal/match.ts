type MatchHandler = (this: void, ...args: never[]) => unknown;

const isObjectLike = (value: unknown): value is object =>
  value !== null && (typeof value === "object" || typeof value === "function");

/**
 * Resolves exactly one Match handler without consulting accessors or prototypes.
 */
export const ownMatchHandler = <Handler extends MatchHandler>(
  handlers: unknown,
  key: PropertyKey,
): Handler => {
  if (!isObjectLike(handlers)) {
    throw new TypeError("Match handlers must be an object or function.");
  }

  const descriptor = Object.getOwnPropertyDescriptor(handlers, key);
  const handler =
    descriptor !== undefined && Object.hasOwn(descriptor, "value")
      ? descriptor.value
      : undefined;

  if (typeof handler !== "function") {
    throw new TypeError(
      "Match handlers must provide an own data function for the selected branch.",
    );
  }

  return handler as Handler;
};
