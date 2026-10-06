# Result law

Result represents recoverable success or error with fail-fast composition.

Use Result when later work depends on earlier success or when one recoverable
error value should stop the current dependent path.

```ts
type Result<T, E> =
  | Readonly<{ ok: true; value: T }>
  | Readonly<{ ok: false; error: E }>;
```

Constructors preserve the impossible generic axis as `never`.

## Data algebra

`map` transforms Ok.

`mapError` transforms Err.

`andThen` sequences a dependent Result-producing step.

`orElse` recovers from Err.

`flatten` removes one explicit nested Result layer.

```ts
const user = await loadUser(userId);

if (!user.ok) {
  return user;
}

return loadAccount(
  user.value.accountId,
);
```

Ordinary JavaScript branching is a first-class way to compose Result values.
It is also the boundary for side-effect-only observation; Result does not add
observer callbacks that return the unchanged carrier.

`Result.all` inspects already-materialized inputs in order and returns the
first Err object itself. Complete success preserves tuple positions. Typed
input arrays must be readonly so array covariance cannot replace a Result with
one carrying a different success or error type before the call.

## Match elimination

Result's Match branch universe is exactly Ok and Err.

`Result.match` conforms to the shared [Match law](./match.md). Typed
elimination requires both branches even when the input is narrowed. Ok passes
the success value; Err passes the recoverable error value.

Result owns recoverable success/failure meaning. Match requires the selected
branch to be an own data-function property, does not consult accessors or
prototypes, and does not capture a handler throw, await a handler Promise, or
provide the handler object as `this`.

## Target-owned conversions

`Result.fromOption(option, onNone)` evaluates `onNone` only for None.

`Result.fromValidation(validation)` carries Invalid's complete non-empty issue
collection as one Result error value and preserves that collection object.

A Result error may itself be a domain-specific Variant. Result owns
success/error; Variant owns the closed error vocabulary.

## Abrupt capture

`attempt` captures one synchronous invocation boundary at the call site.

```ts
const parsed = attempt(
  () => JSON.parse(text) as unknown,
  (cause) => ({
    kind: "invalid-json" as const,
    cause,
  }),
);
```

The caller supplies an `unknown -> E` mapper. A returned Result or other
ordinary value is success data; capture does not flatten it.

A returned Promise-like value, meaning a non-null object or function with a
callable `then`, violates the synchronous boundary and raises `TypeError`.
That contract error is outside the user's thrown-value mapper.

`attemptAsync` owns invocation throws plus rejection from the returned
Promise-like value. Its successful payload follows native `Awaited` semantics.

Selaws does not provide reusable capture-wrapper factories. Keeping the capture
operation at the invocation site makes the abrupt-to-recoverable conversion
visible where it occurs.

Mapper throws and ordinary Result callback throws remain abrupt.

## Composition boundary

Dependent Result composition uses ordinary JavaScript control flow or the
data-level `andThen` combinator.

Result does not define a generator protocol, asynchronous control runtime,
implicit early-return syntax, scheduler, retry policy, or cancellation model.

There is no `AsyncResult` alias; the canonical type remains
`Promise<Result<T, E>>`.

For asynchronous work, Promise remains the scheduling and awaiting owner:

```ts
const user = await loadUser(userId);

if (!user.ok) {
  return user;
}

return loadAccount(user.value.accountId);
```

## Recoverable-to-abrupt boundary

`orThrow(result, mapErrorToThrowable)` returns Ok and explicitly maps Err to a
thrown JavaScript value.

This boundary is intentional and visible; an Err does not throw merely because
it exists.
