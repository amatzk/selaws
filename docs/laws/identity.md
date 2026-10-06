# Identity law

Identity answers:

```text
What scalar domain value is this?
```

Use Identity when two values can have the same JavaScript scalar
representation but belong to different application domains.

```ts
const userIdKey: unique symbol =
  Symbol("UserId");
const orderIdKey: unique symbol =
  Symbol("OrderId");

const UserId =
  identity.string(userIdKey);
const OrderId =
  identity.string(orderIdKey);

type UserId =
  identity.Value<typeof UserId>;
type OrderId =
  identity.Value<typeof OrderId>;
```

A `UserId` and an `OrderId` may both be strings at runtime while remaining
distinct typed meanings.

## Carrier

Identity applies to immutable scalar carriers:

```text
string | number | bigint | boolean | symbol
```

Formation preserves the original runtime primitive. Identity does not wrap the
value in an object.

## Declaration-owned identity

Declaration ownership is the default.

```ts
const userIdKey: unique symbol =
  Symbol("UserId");

const UserId =
  identity.string(userIdKey);

type UserId =
  identity.Value<typeof UserId>;
```

The symbol token is the phantom property key. One identity requires one narrow
symbol token.

```text
same symbol token       => same local identity
different symbol tokens => different local identities
same Symbol description => no compatibility by itself
```

This remains true across duplicate compatible Selaws installations when the
application shares the same symbol token with both copies.

For a custom formation API, use `defineIdentity`:

```ts
const UserId = defineIdentity<string>()(
  userIdKey,
  (mint) => ({
    fromString(value: string): UserId {
      return mint(value);
    },
  }),
);
```

`defineIdentity` supplies `mint` only inside the definition callback. The
declaring module chooses which public formation operations can introduce the
identity. At runtime, `mint` still enforces the Identity owner boundary that
the carrier is a scalar; the more specific generic carrier type remains a
TypeScript boundary.

## Explicit shared identity

Intentional structural compatibility across independently compiled producers is
a separate opt-in:

```ts
const UserId =
  identity.shared.string(
    "example.domain/UserId@1",
  );
```

A concrete shared contract maps to the structural phantom key:

```text
~selaws.identity:<Contract>
```

Using the same shared contract is an explicit interoperability assertion. The
contract is not a display label. Selaws cannot prove that unrelated producers
which choose the same string mean the same domain concept.

Prefer qualified, revisioned contracts when independent packages intentionally
share a type meaning.

See [Declaration compatibility](./declaration-compatibility.md).

## Checked local formation

A predicate can own a local scalar formation condition:

```ts
const portKey: unique symbol =
  Symbol("Port");

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

Accepted scalar input returns the identity-bearing value. Rejected or
wrong-carrier input returns `undefined`.

The predicate establishes only this owner's scalar formation condition. Identity
does not become an object-schema decoder, normalizer, authorization system, or
external data validator.

Local factories require a symbol token. Shared factories require a string
contract. When a predicate is supplied, it must be callable at declaration
time.

## Composition

Forming a new identity on a scalar preserves existing intersections carried by
that same value. Independent identities can therefore coexist when explicitly
formed.

Identity and Evidence are independent. A value's identity does not imply that a
fact has been established about it.
