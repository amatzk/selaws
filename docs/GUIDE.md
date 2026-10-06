# Selaws guide

Selaws works best when code names the semantic question before choosing the
data shape. Several owners use unions or phantom types internally, but those
similar representations do not make their meanings interchangeable.

## 1. Choose the owner from the question

Start with the question the code must answer.

| Question | Owner | Typical representation |
| --- | --- | --- |
| What scalar value is this? | Identity | branded scalar |
| What stable fact is established about this scalar? | Evidence | additional scalar fact |
| Which transition is admissible? | Protocol | labeled relation |
| Which member of a closed family is this? | Variant | tagged object |
| Is a value present? | Option | Some / None |
| Which independent checks have issues? | Validation | Valid / non-empty Invalid |
| Did a recoverable computation succeed? | Result | Ok / Err |

This usually gives a smaller design than starting with “I need a union type” or
“I need a state machine”.

### Shared Match law: one elimination model, owner-scoped syntax

Option, Result, Validation, and Variant are different semantic owners, but all
four expose the same kind of total elimination:

```ts
Option.match(maybeValue, {
  some: (value) => use(value),
  none: () => fallback(),
});

Result.match(result, {
  ok: (value) => use(value),
  err: (error) => recover(error),
});

Validation.match(validation, {
  valid: (value) => use(value),
  invalid: (errors) => report(errors),
});

Message.match(message, {
  quit: () => stop(),
  write: (text) => write(text),
});
```

The common meaning is Match: handle the complete branch universe owned by the
carrier, invoke exactly one selected handler, preserve that branch's payload,
and let ordinary JavaScript return, throw, or Promise completion pass through.

Match is a shared law rather than a new owner or API namespace. There is no
`Match(...)` dispatcher. Keeping the syntax on `Option`, `Result`,
`Validation`, or the Variant family keeps branch ownership visible and
preserves TypeScript's owner-specific inference.

Use Match when an operation conceptually handles the whole sum. Ordinary
TypeScript narrowing remains appropriate when local control flow already owns
one branch.

## 2. Give scalar values domain identity

Use Identity when two runtime-identical scalar values must remain distinct in
TypeScript.

```ts
import { identity } from "selaws/identity";

const userIdKey: unique symbol = Symbol("UserId");
const orderIdKey: unique symbol = Symbol("OrderId");

export const UserId = identity.string(userIdKey);
export type UserId = identity.Value<typeof UserId>;

export const OrderId = identity.string(orderIdKey);
export type OrderId = identity.Value<typeof OrderId>;

function findUser(id: UserId) {}

findUser(UserId("u_1"));
// findUser(OrderId("o_1")); // type error
```

The runtime value stays a string. Identity changes the type-level meaning, not
the JavaScript representation.

### Checked formation

Use an Identity predicate when the same owner can decide whether an incoming
scalar is admissible.

```ts
const Port = identity.number(
  "Port",
  (value) =>
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 65_535,
);

type Port = identity.Value<typeof Port>;

const port = Port(rawPort);

if (port === undefined) {
  // rawPort did not satisfy the Port formation condition.
}
```

The predicate is a local formation condition, not a general schema-decoding
framework.

## 3. Establish stable scalar facts with Evidence

Use Evidence when a value already has the right identity, but another stable
fact must be established independently.

```ts
import { evidence } from "selaws/evidence";

const NonEmpty = evidence.string(
  "NonEmpty",
  (value) => value.length > 0,
);

declare const userId: UserId;

const checked = NonEmpty(userId);

if (checked !== undefined) {
  const stillUserId: UserId = checked;
}
```

Identity and Evidence accumulate on the same scalar. Evidence does not replace
the domain identity that was already present.

If an operation produces a new scalar, establish the relevant fact again:

```ts
const trimmed = userId.trim();
const checkedTrimmed = NonEmpty(trimmed);
```

Evidence applies to the scalar value that was actually checked.

## 4. Use Option only when absence has no reason

```ts
import { Option } from "selaws/option";

const nickname = Option.fromUndefined(row.nickname);

const label = Option.match(nickname, {
  some: (value) => value,
  none: () => "Anonymous",
});
```

Option is appropriate for lookups, optional fields, and other cases where the
empty branch carries no diagnostic information.

Presence is explicit:

```ts
Option.some(undefined);
// { some: true, value: undefined }

Option.fromUndefined(undefined);
// { some: false }
```

If callers need to know why a value is missing, use Result or a domain-specific
Variant instead of putting an implicit reason behind None.

### Transform and combine Options

```ts
const normalized = Option.map(nickname, (value) =>
  value.trim(),
);

const pair = Option.all([
  maybeFirstName,
  maybeLastName,
] as const);
```

`Option.all` succeeds only when every input is Some and preserves tuple
positions.

## 5. Use Validation for independent checks

Validation is for checks that can all run from already-available inputs.

```ts
import {
  Validation,
  type Validation as ValidationValue,
} from "selaws/validation";

type Issue =
  | "name-required"
  | "email-invalid";

const validateName = (
  value: string,
): ValidationValue<string, Issue> =>
  value.length > 0
    ? Validation.valid(value)
    : Validation.invalid("name-required");

const validateEmail = (
  value: string,
): ValidationValue<string, Issue> =>
  value.includes("@")
    ? Validation.valid(value)
    : Validation.invalid("email-invalid");

const form = Validation.struct([
  ["name", validateName(raw.name)],
  ["email", validateEmail(raw.email)],
]);
```

If both fields are invalid, `form.errors` contains both issues in deterministic
input order.

Use `Validation.all` for positional tuples and `Validation.struct` for finite keyed products.

Do not use Validation to model a sequence where the second operation cannot run
until the first succeeds. That is Result-shaped work.

## 6. Use Result for dependent recoverable work

```ts
import {
  Result,
  type Result as ResultValue,
} from "selaws/result";

const parsePort = (
  text: string,
): ResultValue<number, "invalid-port"> => {
  const value = Number(text);

  return Number.isInteger(value) && value > 0 && value <= 65_535
    ? Result.ok(value)
    : Result.err("invalid-port");
};
```

Dependent steps can stay explicit:

```ts
const user = await loadUser(userId);

if (!user.ok) {
  return user;
}

const account = await loadAccount(user.value.accountId);

if (!account.ok) {
  return account;
}

return saveAccount(account.value);
```

This is ordinary JavaScript control flow over Result data. Selaws does not add
an implicit early-return runtime.

### Functional composition

For local data pipelines, the focused helpers remain available:

```ts
import {
  andThen,
  map,
  type Result,
} from "selaws/result";

const parsed = parsePort(text);

const endpoint = map(
  parsed,
  (port) => ({ host: "localhost", port }),
);
```

Use `andThen` when the next function itself returns Result.

## 7. Accumulate first, then fail fast

Form validation often has two phases:

1. inspect independent inputs and report every issue;
2. after valid input exists, perform dependent work that can fail.

The owner boundary can remain explicit.

```ts
const input = Validation.struct([
  ["userId", validateUserId(raw.userId)],
  ["email", validateEmail(raw.email)],
]);

const ready = Result.fromValidation(input);

if (!ready.ok) {
  return ready;
}

const current = await loadUser(ready.value.userId);

if (!current.ok) {
  return current;
}

return saveUser(
  current.value,
  ready.value.email,
);
```

`Result.fromValidation` carries the complete non-empty Validation issue
collection as one Result error value. It does not flatten that collection into
separate Result errors.

## 8. Use Variant for a closed domain vocabulary

Variant is useful when a domain has a finite set of alternatives and each
alternative owns its payload shape.

```ts
import { Variant } from "selaws/variant";

const loadUserErrorKey: unique symbol = Symbol("LoadUserError");

const LoadUserError = Variant.define(loadUserErrorKey, [
  ["notFound", Variant.payload<Readonly<{ id: UserId }>>()],
  ["forbidden", Variant.unit],
  ["storage", Variant.payload<Readonly<{ cause: unknown }>>()],
]);

type LoadUserError =
  Variant.Value<typeof LoadUserError>;
```

Constructors are generated from the declaration:

```ts
const missing =
  LoadUserError.make.notFound({ id: userId });

const denied =
  LoadUserError.make.forbidden();
```

Each constructor preserves the tag/payload correlation. A wrong payload is a
type error.

### Eliminate the complete family

```ts
const message = LoadUserError.match(error, {
  notFound: ({ id }) =>
    `User ${id} was not found`,
  forbidden: () =>
    "Access is forbidden",
  storage: ({ cause }) =>
    `Storage failed: ${String(cause)}`,
});
```

Typed `match` is exhaustive over the declared family. If a new case is added,
family-level matches must account for it.

Normal TypeScript narrowing also works:

```ts
if (error.tag === "notFound") {
  error.value.id;
  // UserId
}
```

Use `match` when the operation conceptually handles the family as a whole.
Use ordinary narrowing when local control flow already owns the branch.

When a named case type must cross a function or module boundary, use the
exported value union rather than the private family object:

```ts
type NotFound =
  Variant.Case<
    LoadUserError,
    "notFound"
  >;
```

This preserves family identity and payload correlation without adding a runtime
predicate API.

### Generic Variant families

```ts
const remoteKey: unique symbol = Symbol("Remote");

const Remote = <T>() =>
  Variant.define(remoteKey, [
    ["idle", Variant.unit],
    ["success", Variant.payload<T>()],
    ["failure", Variant.payload<Error>()],
  ]);

type Remote<T> =
  Variant.Value<ReturnType<typeof Remote<T>>>;

const RemoteUser = Remote<User>();

const loaded: Remote<User> =
  RemoteUser.make.success(user);
```

### Recursive Variant families

Put the recursive reference through an ordinary object or interface boundary:

```ts
interface AddPayload {
  readonly left: Expr;
  readonly right: Expr;
}

const exprKey: unique symbol = Symbol("Expr");

const Expr = Variant.define(exprKey, [
  ["literal", Variant.payload<number>()],
  ["add", Variant.payload<AddPayload>()],
]);

type Expr = Variant.Value<typeof Expr>;
```

## 9. Let Variant own an error vocabulary and Result transport it

A closed domain error family composes naturally with Result.

```ts
type LoadUserResult =
  ResultValue<User, LoadUserError>;

const loadUser = async (
  id: UserId,
): Promise<LoadUserResult> => {
  const row = await repository.find(id);

  if (row === undefined) {
    return Result.err(
      LoadUserError.make.notFound({ id }),
    );
  }

  return Result.ok(row);
};
```

Result answers whether the operation succeeded. Variant answers which
domain-specific error alternative exists. The two owners remain independent.

The caller can inspect the Result first and then eliminate the Variant:

```ts
const loaded = await loadUser(userId);

if (!loaded.ok) {
  return LoadUserError.match(loaded.error, {
    notFound: ({ id }) =>
      `missing: ${id}`,
    forbidden: () =>
      "forbidden",
    storage: () =>
      "storage unavailable",
  });
}

return loaded.value;
```

## 10. Use Protocol for admissible transitions

Protocol describes a labeled transition relation. It is deliberately smaller
than a state-machine runtime.

```ts
import {
  Protocol,
  type Next,
} from "selaws/protocol";

const orderTransitions = [
  ["pending", "pay", "paid"],
  ["pending", "cancel", "cancelled"],
  ["paid", "ship", "shipped"],
] as const;

const OrderProtocol =
  Protocol.define(orderTransitions);

type AfterPayment =
  Next<
    typeof orderTransitions,
    "pending",
    "pay"
  >;
// "paid"
```

At runtime, ask whether one concrete triple belongs to the declaration:

```ts
OrderProtocol.allows(
  "pending",
  "pay",
  "paid",
);
// true
```

The application still owns the current state and the mutation:

```ts
if (
  OrderProtocol.allows(
    currentState,
    "pay",
    nextState,
  )
) {
  await persistTransition(
    currentState,
    nextState,
  );
}
```

`allows` establishes relation membership. It does not prove that
`currentState` is still current at commit time. The storage/concurrency layer
owns that fact.

### Nondeterministic relations are allowed

```ts
const routing = Protocol.define([
  ["open", "advance", "left"],
  ["open", "advance", "right"],
] as const);
```

Protocol does not choose between `left` and `right`. It only states that both
triples are admissible.

## 11. Compose Protocol and Variant without merging them

Variant can own an event vocabulary while Protocol owns the relation between
scalar state identifiers and event labels.

```ts
const orderEventKey: unique symbol = Symbol("OrderEvent");

const OrderEvent = Variant.define(orderEventKey, [
  ["pay", Variant.payload<Readonly<{
    transactionId: string;
  }>>()],
  ["cancel", Variant.unit],
]);

type OrderEvent =
  Variant.Value<typeof OrderEvent>;

const transitions = [
  ["pending", "pay", "paid"],
  ["pending", "cancel", "cancelled"],
] as const;

const OrderProtocol =
  Protocol.define(transitions);
```

The Variant payload carries event data. The Protocol label is the scalar
`event.tag` used to ask about admissibility. Protocol does not need to import
or understand the Variant payload.

```ts
const event =
  OrderEvent.make.pay({
    transactionId: "tx_1",
  });

const target = "paid" as const;

if (
  OrderProtocol.allows(
    "pending",
    event.tag,
    target,
  )
) {
  // Application code performs the payment
  // and owns the state update.
}
```

This separation keeps “what event is this?” distinct from “is this transition
allowed?”.

## 12. Translate throwing APIs at explicit Result boundaries

Use `attempt` for a synchronous API that may throw:

```ts
import { attempt } from "selaws/result";

const parsed = attempt(
  () => JSON.parse(text) as unknown,
  (cause) => ({
    kind: "invalid-json" as const,
    cause,
  }),
);
```

Use `attemptAsync` for a Promise-returning boundary whose invocation or
rejection should become recoverable Result data.

`wrap` and `wrapAsync` apply those boundaries to reusable functions while
preserving arguments and `this`.

Use `orThrow` when an application boundary intentionally converts Err back to
an abrupt JavaScript completion.

## 13. Keep Promise as the async owner

Selaws does not define `AsyncOption`, `AsyncValidation`, or an asynchronous
Result carrier. Use Promise directly.

```ts
Promise<ResultValue<T, E>>
Promise<Option<T>>
Promise<ValidationValue<T, E>>
```

Independent asynchronous work can be scheduled first and then combined:

```ts
const [name, email] = await Promise.all([
  validateNameAsync(raw.name),
  validateEmailAsync(raw.email),
]);

const input = Validation.struct([
  ["name", name],
  ["email", email],
]);
```

Scheduling belongs to Promise. Accumulation belongs to Validation.

## 14. Choose local or shared declaration compatibility deliberately

Identity, Evidence, and Variant default to declaration-owned symbols.

```ts
const userIdKey: unique symbol =
  Symbol("UserId");

const UserId =
  identity.string(userIdKey);
```

The symbol description is only diagnostic text. Two distinct symbols remain
distinct meanings even when both were created as `Symbol("UserId")`.

When independently compiled producers intentionally need structural
compatibility, opt in with a shared contract:

```ts
const SharedUserId =
  identity.shared.string(
    "example.domain/UserId@1",
  );
```

Variant uses the same split:

```ts
const eventKey: unique symbol =
  Symbol("Event");

const Event = Variant.define(eventKey, [
  ["started", Variant.unit],
  ["stopped", Variant.unit],
]);

const SharedEvent = Variant.shared(
  "example.protocol/Event@1",
  [
    ["started", Variant.unit],
    ["stopped", Variant.unit],
  ],
);
```

The shared string is a compatibility contract, not a display name. Use it only
when structural interoperability is intentional.

## 15. Keep boundary work with the application

Selaws deliberately leaves these concerns with the layer that can actually
establish them:

- decoding unknown JSON or wire data;
- authorization and policy decisions;
- mutable freshness and optimistic/transactional concurrency;
- persistence and event dispatch;
- retry, scheduling, and timers;
- resource limits and cancellation;
- protocol-version negotiation.

For example, `Variant.payload<User>()` says that typed construction expects a
`User`. It does not validate an unknown JSON object as User at runtime.

Likewise, `Protocol.allows(a, label, b)` says the triple was declared. It does
not authorize the action or prove that persisted state is still `a`.

## 16. Choose the import surface for the file

Focused imports work well when one owner dominates the module:

```ts
import {
  andThen,
  map,
  ok,
  type Result,
} from "selaws/result";
```

Root facades make mixed-owner application code readable:

```ts
import {
  Option,
  Protocol,
  Result,
  Validation,
  Variant,
} from "selaws";

Protocol.define(...);
Variant.define(...);
Option.map(...);
Validation.map(...);
Result.map(...);
```

The facade name keeps the semantic owner visible even when several primitives
appear in the same function.
