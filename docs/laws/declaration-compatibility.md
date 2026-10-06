# Declaration compatibility law

Identity, Evidence, and Variant can carry nominal meaning without changing
their transparent JavaScript representation.

They support two intentionally different compatibility modes.

## Local declaration identity

Local declaration identity is owned by one caller-provided narrow symbol.

```text
same symbol token       => compatible declaration identity
different symbol tokens => distinct declaration identity
symbol description text => non-semantic
```

Examples:

```ts
const userIdKey: unique symbol =
  Symbol("UserId");

const UserId =
  identity.string(userIdKey);
```

```ts
const messageKey: unique symbol =
  Symbol("Message");

const Message =
  Variant.define(messageKey, [
    ["quit", Variant.unit],
    ["write", Variant.payload<string>()],
  ]);
```

A duplicate compatible Selaws installation can agree with the same local
meaning when both receive the same caller-owned symbol token.

## Explicit shared structural identity

Independent packages that intentionally need structural compatibility can opt
into one concrete string contract.

```ts
const UserId =
  identity.shared.string(
    "example.domain/UserId@1",
  );
```

```ts
const Message =
  Variant.shared(
    "example.protocol/Message@1",
    [
      ["quit", Variant.unit],
      ["write", Variant.payload<string>()],
    ],
  );
```

For Identity and Evidence, the owner category plus the concrete contract
determines the structural phantom key.

For Variant, the owner category, contract, and exact family signature determine
compatibility. Two shared Variant declarations with the same contract but
different case universes or case signatures are not compatible.

The shared contract is an interoperability assertion, not a display name.
Selaws does not authenticate the producer, compare predicates, inspect business
definitions, or prove that two independent declarations using the same string
carry the same external meaning.

Applications should therefore choose shared contracts deliberately. Qualified
and revisioned strings are recommended when independently versioned packages
need a stable agreement.

## Category independence

Compatibility never crosses semantic owners merely because token or contract
text is reused.

```text
Identity contract != Evidence contract
Identity symbol   != Evidence fact merely because the symbol is reused
Variant family    != either scalar owner
```

Each owner retains its own law.

## Runtime declaration grammar

The local/shared distinction is runtime-observable declaration grammar:

```text
local Identity/Evidence factory -> symbol token
shared Identity/Evidence factory -> string contract
Variant.define                  -> symbol token
Variant.shared                  -> string contract
```

Wrong token kinds raise `TypeError` for JavaScript callers.

TypeScript additionally requires one narrow symbol or one concrete literal
string. Runtime JavaScript cannot observe whether a string value originated
from a broad TypeScript string type, so that exactness remains a typed-boundary
guarantee.

These checks validate Selaws-owned declaration metadata. They do not turn
Selaws into an application schema decoder.
