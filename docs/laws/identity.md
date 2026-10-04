# Identity law

Identity answers:

```text
What scalar value is this?
```

Use Identity when two values can have the same JavaScript scalar
representation but belong to different application domains.

```ts
const UserId = identity.string("UserId");
const OrderId = identity.string("OrderId");

type UserId = identity.Value<typeof UserId>;
type OrderId = identity.Value<typeof OrderId>;
```

A `UserId` and an `OrderId` may both be strings at runtime while remaining
distinct typed meanings.

## Carrier

Identity applies to immutable scalar carriers:

```ts
string | number | bigint | boolean | symbol
```

Formation preserves the original runtime primitive. Identity does not wrap the
value in an object.

## Named identity

```ts
import { identity } from "selaws/identity";

const UserId = identity.string("UserId");
type UserId = identity.Value<typeof UserId>;

const id = UserId("u_1");
```

A concrete literal name maps to the Selaws-owned structural phantom key
`~selaws.identity:<Name>`.

```text
same carrier + same literal name => same named identity
different literal names          => different named identities
```

The name must denote one concrete identity. Broad strings, unions, patterns,
and branded string spaces do not satisfy that requirement.

Named identity is appropriate when compatible producers intentionally share the
same structural identity contract.

## Declaration-owned identity

```ts
import {
  defineIdentity,
  type Identity,
} from "selaws/identity";

const userIdKey: unique symbol =
  Symbol("UserId");

type UserId =
  Identity<string, typeof userIdKey>;

const UserId = defineIdentity<string>()(
  userIdKey,
  (mint) => ({
    fromString(value: string): UserId {
      return mint(value);
    },
  }),
);
```

The token itself is the phantom property key. One identity requires one narrow
symbol token. Separate symbols denote separate identities.

`defineIdentity` supplies `mint` only inside the definition callback. The
declaring module chooses which public formation operations can introduce the
identity.

## Checked local formation

A predicate can own a local scalar formation condition:

```ts
const Port = identity.number(
  "Port",
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

The predicate establishes only this owner's scalar condition. Identity does not
become an object-schema decoder, normalizer, authorization system, or external
data validator.

## Composition

Forming a new identity on a scalar preserves existing intersections carried by
that same value. Independent identities can therefore coexist when explicitly
formed.

Named identity keeps its structural key spelling unchanged, so compatible
producers and duplicate Selaws installations preserve the same identity.
Declaration-owned identity remains keyed by the caller-owned symbol rather than
a package-owned unique symbol.

Identity and Evidence are independent. A value's identity does not imply that a
fact has been established about it.
