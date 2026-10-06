# Selaws

Independent semantic primitives for TypeScript with explicit laws.

Selaws gives common domain meanings small, separate owners instead of placing
them behind one framework abstraction. You can introduce nominal scalar
identity, establish stable facts, declare admissible transitions, define closed
variants, model optional values, accumulate independent validation issues, and
carry recoverable failures without changing ordinary JavaScript control flow.

| Owner | Question it answers | Typical code |
| --- | --- | --- |
| Identity | What scalar value is this? | `UserId("user_1")` |
| Evidence | What stable fact is established about this scalar? | `NonEmpty(userId)` |
| Protocol | Which labeled transition is admissible? | `OrderProtocol.allows("pending", "pay", "paid")` |
| Variant | Which closed labeled alternative is this? | `Message.make.write("hello")` |
| Option | Is a value present? | `Option.fromUndefined(value)` |
| Validation | Which independent checks have issues? | `Validation.struct([["name", check], ...])` |
| Result | Did a recoverable computation succeed? | `Result.ok(value)` / `Result.err(error)` |

Each owner has its own laws and focused import path. The package does not add a
workflow runtime, async carrier, schema decoder, or application state store.

A useful reading classification is:

```text
Value / relation laws
  Identity
  Evidence
  Protocol
  Variant

Outcome algebras
  Option
  Validation
  Result

Shared laws
  Match
  declaration compatibility
```

This classification is only a navigation aid. It does not introduce
inheritance, merge semantic owners, or imply dependencies between them; package
co-location likewise does not merge their laws.

Match is a first-class shared elimination law across the sum-like owners, not a
separate owner or namespace:

```text
Option.match
Result.match
Validation.match
VariantFamily.match
```

Each owning surface supplies the branch universe and payload meaning. Match
requires total typed handling, resolves only an own data-function property for
the selected branch, invokes it without a library-defined `this` receiver,
and preserves ordinary return, throw, and Promise completion.

## Install

Selaws is pre-1.0. During 0.x, APIs and semantics may change incompatibly;
deprecated compatibility layers are intentionally kept minimal.

```sh
npm install selaws
```

Selaws is ESM, emits ES2022 JavaScript, has zero runtime dependencies, and
supports TypeScript 6 and 7. The repository uses a pinned TypeScript 7
development compiler; the public type surface is also verified with TypeScript 6.

## Give scalar values domain identity

```ts
import { identity } from "selaws/identity";

const userIdKey: unique symbol = Symbol("UserId");
const orderIdKey: unique symbol = Symbol("OrderId");

export const UserId = identity.string(userIdKey);
export type UserId = identity.Value<typeof UserId>;

export const OrderId = identity.string(orderIdKey);
export type OrderId = identity.Value<typeof OrderId>;

function loadUser(id: UserId) {}

loadUser(UserId("user_1"));
// loadUser(OrderId("order_1")); // type error
```

Identity formation returns the original JavaScript primitive. The type records
which domain identity the scalar carries.

Use a checked identity when formation itself owns a local condition:

```ts
const portKey: unique symbol = Symbol("Port");

const Port = identity.number(
  portKey,
  (value) =>
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 65_535,
);

const port = Port(input);
// Port | undefined
```

A bound `Symbol` is the default declaration-owned identity. Independent
packages that intentionally need structural compatibility opt into an explicit
contract with `identity.shared.*`. The same local/shared distinction applies
to Evidence and Variant family identity.

## Establish stable facts without replacing identity

```ts
import { evidence } from "selaws/evidence";
import type { UserId } from "./user-id.js";

const NonEmpty = evidence.string(
  "NonEmpty",
  (value) => value.length > 0,
);

declare const id: UserId;

const checked = NonEmpty(id);

if (checked !== undefined) {
  const stillUserId: UserId = checked;

  type NonEmptyUserId =
    evidence.Proven<typeof NonEmpty, UserId>;
}
```

Evidence describes a stable fact about the same immutable scalar. Independent
facts can accumulate while existing identity remains present.

## Declare transition admissibility

```ts
import { Protocol, type Next } from "selaws/protocol";

const orderTransitions = [
  ["pending", "pay", "paid"],
  ["pending", "cancel", "cancelled"],
  ["paid", "ship", "shipped"],
] as const;

const OrderProtocol = Protocol.define(orderTransitions);

type PendingPayNext =
  Next<typeof orderTransitions, "pending", "pay">;
// "paid"

OrderProtocol.allows("pending", "pay", "paid"); // true
OrderProtocol.allows("pending", "pay", "cancelled"); // false
```

Protocol owns the relation of admissible `[from, label, to]` triples. It does
not own the current state, choose a target, dispatch an event, perform effects,
persist state, or provide concurrency control.

Typed Protocol declarations are exact finite relations: the outer relation is
one finite readonly tuple and every `from`, `label`, and `to` member is one
concrete scalar identity rather than a broad scalar type. This keeps `Next`
and runtime `allows` tied to the same relation snapshot.

The relation may be nondeterministic: one `(from, label)` pair may admit more
than one target.

## Define a closed labeled data vocabulary

```ts
import { Variant } from "selaws/variant";

const messageKey: unique symbol = Symbol("Message");

const Message = Variant.define(messageKey, [
  ["quit", Variant.unit],
  ["write", Variant.payload<string>()],
  ["move", Variant.payload<Readonly<{ x: number; y: number }>>()],
]);

type Message = Variant.Value<typeof Message>;
type WriteMessage = Variant.Case<Message, "write">;

const message: Message = Message.make.write("hello");

const size = Message.match(message, {
  quit: () => 0,
  write: (text) => text.length,
  move: ({ x, y }) => x + y,
});
```

The finite case-entry tuple is the complete Variant family. `make.<case>`
preserves the correlation between a tag and its payload. `Variant.Case<Value,
Name>` extracts one reusable named member from the exported value union.
`match` is exhaustive and rejects undeclared handler keys in typed TypeScript,
so adding or removing a case exposes stale family-level matches.

Variant values remain ordinary tagged JavaScript objects:

```ts
Message.make.quit();
// { tag: "quit" }

Message.make.write("hello");
// { tag: "write", value: "hello" }
```

## Represent reasonless absence with Option

```ts
import { Option } from "selaws/option";

const nickname = Option.fromUndefined(row.nickname);

const displayName = Option.unwrapOr(
  nickname,
  "Anonymous",
);
```

Use Option when the whole meaning of the empty branch is “no value”. If absence
needs a reason, that reason belongs in Result or in a domain-specific Variant.

`some(undefined)` is still present. `Option.fromUndefined(undefined)` is
absent. The distinction is explicit.

## Accumulate independent issues with Validation

```ts
import { Validation } from "selaws/validation";

const input = Validation.struct([
  ["name", validateName(raw.name)],
  ["email", validateEmail(raw.email)],
]);

if (!input.valid) {
  console.log(input.errors);
  // non-empty issue collection
}
```

Validation combines checks that are already independently available. It keeps
all issues in deterministic input order instead of stopping at the first
failure.

## Sequence recoverable work with Result

```ts
import { Result, type Result as ResultValue } from "selaws/result";

const parsePort = (
  text: string,
): ResultValue<number, "invalid-port"> => {
  const value = Number(text);

  return Number.isInteger(value) && value > 0 && value <= 65_535
    ? Result.ok(value)
    : Result.err("invalid-port");
};
```

Result represents one recoverable success or error. Dependent composition is
fail-fast:

```ts
const user = await loadUser(userId);

if (!user.ok) {
  return user;
}

return loadAccount(user.value.accountId);
```

Selaws does not hide that control flow behind a generator or async Result
runtime.

## Move between owners at explicit boundaries

A common application path is to accumulate independent input issues first, then
enter dependent Result-based work:

```ts
const input = Validation.struct([
  ["userId", validateUserId(raw.userId)],
  ["email", validateEmail(raw.email)],
]);

const ready = Result.fromValidation(input);

if (!ready.ok) {
  return ready;
}

const user = await loadUser(ready.value.userId);

if (!user.ok) {
  return user;
}

return saveUser(user.value, ready.value.email);
```

A Result error can itself use a Variant-owned domain vocabulary:

```ts
const loadUserErrorKey: unique symbol = Symbol("LoadUserError");

const LoadUserError = Variant.define(loadUserErrorKey, [
  ["notFound", Variant.payload<{ id: string }>()],
  ["storage", Variant.payload<{ cause: unknown }>()],
]);

type LoadUserError = Variant.Value<typeof LoadUserError>;

type LoadUserResult =
  ResultValue<User, LoadUserError>;
```

Result owns recoverable success/failure. Variant owns which error alternative
exists and which payload belongs to it. Neither owner absorbs the other's law.

## Keep JavaScript completion and Promise visible

Result capture helpers mark explicit boundaries around throwing APIs:

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

`attempt` and `attemptAsync` translate explicit abrupt boundaries into Result
data. `orThrow` performs the reverse boundary when an Err should become a
thrown JavaScript value.

Promise remains the async owner:

```ts
Promise<ResultValue<T, E>>
Promise<Option<T>>
Promise<Validation<T, E>>
```

## Imports

Use focused entry points when one owner dominates a module:

```text
selaws/identity
selaws/evidence
selaws/protocol
selaws/variant
selaws/option
selaws/validation
selaws/result
```

Use the root facades when several owners are intentionally composed at one
application boundary:

```ts
import {
  Option,
  Protocol,
  Result,
  Validation,
  Variant,
} from "selaws";
```

Generic helper names such as `map`, `match`, `define`, and `Next` stay on
focused subpaths so the semantic owner remains visible. Match is shared as a
law rather than centralized as a dispatcher.

## Documentation

- [Guide](./docs/GUIDE.md) — practical patterns and owner composition.
- [API](./docs/API.md) — public exports and operation groups.
- [Semantics](./docs/SEMANTICS.md) — package-wide normative ownership and shared laws.
- [Laws](./docs/laws/) — normative owner laws and shared laws such as [Match](./docs/laws/match.md) and [Declaration compatibility](./docs/laws/declaration-compatibility.md).
