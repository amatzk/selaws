# Declaration compatibility law

Identity, Evidence, and Variant can carry nominal meaning without changing
their transparent JavaScript representation.

They support local and shared nominal compatibility; Variant additionally supports intentional unbranded structural values.

## Local declaration identity

Local declaration identity is owned by one caller-provided narrow symbol type.
A token is a static declaration name, not a runtime equality proof or a fresh
type per call. Repeated evaluation of one declaration does not create a new
type; separate declarations of the same registered symbol need not share a type.
Use one shared declaration or an explicit string contract for interoperability.

```text
same static symbol token type       => compatible declaration identity
different static symbol token types => distinct declaration identities
symbol description text             => non-semantic
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

## Unbranded structural Variant

`Variant.structural(entries)` deliberately makes no nominal family assertion.
Values have the ordinary tagged structural union, so compatibility follows
TypeScript structural assignability rather than equality of family tokens or
signatures. The family still owns its exact case vocabulary and total Match.
A structural value does not acquire nominal meaning by shape coincidence.

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

The declaration modes have distinct runtime-observable call grammar:

```text
local Identity/Evidence factory -> symbol token
shared Identity/Evidence factory -> string contract
Variant.define                  -> symbol token
Variant.shared                  -> string contract
Variant.structural              -> no identity token
```

Wrong token kinds raise `TypeError` for JavaScript callers.

TypeScript additionally requires one narrow symbol or one concrete literal
string. Runtime JavaScript cannot observe whether a string value originated
from a broad TypeScript string type, so that exactness remains a typed-boundary
guarantee.

These checks validate Selaws-owned declaration metadata. They do not turn
Selaws into an application schema decoder.

## Public declaration composition

An application may publish a factory, a projected type, or a composed value
formed through the public Selaws surface. Selaws-owned types needed by an
emitted declaration must be nameable through package export paths, preserving
the declaration's identity, correlation and applicable owner laws. Package verification emits and then type-checks a
separate downstream consumer; checking source with noEmit alone is not
evidence of this property.

This does not guarantee inference for every TypeScript program. For example,
a parameter that shadows a private unique-symbol token can prevent the
compiler from naming that token; use a distinct token name or an explicit
public return annotation.
