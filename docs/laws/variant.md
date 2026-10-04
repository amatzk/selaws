# Variant law

Variant represents one exact closed family of labeled alternatives.

For one family declaration with case names `K` and payload assignment `P`:

```text
Variant(F) = sum over k in K of P(k)
```

A unit case has one nullary alternative. A payload case carries one value of its
declared payload type.

Use Variant when a domain owns a finite alternative vocabulary whose case name
and payload type must stay correlated.

```ts
const Message = Variant.define("Message", [
  ["quit", Variant.unit],
  ["write", Variant.payload<string>()],
]);

type Message =
  Variant.Value<typeof Message>;
```

## 1. Closed family

One `Variant.define` call owns one finite readonly tuple of
`[caseName, caseSpec]` entries. That tuple is the complete case universe for
the family.

The outer tuple and every case-entry pair must be readonly, its length must be
statically concrete, and every case name must be one concrete string literal.
Mutable tuples, broad arrays, optional/union entry sets, duplicate names, and
patterned/broad string names do not define one exact closed family. Empty
declarations are valid and produce an uninhabited Variant value type.

Declaration order carries no meaning.

The finite readonly tuple is part of the typed boundary. Ordinary record width
subtyping can hide runtime properties behind a narrower static record type, so
Variant derives the family from an exact tuple rather than record keys. Directly
mutable declaration tuples are rejected. A readonly view over separately
mutable backing data can still be invalidated through TypeScript's unsound
aliasing and is governed by the trust model in
[SEMANTICS.md](../SEMANTICS.md).

Adding or removing a case changes the family declaration and therefore the
family-level exhaustive handling obligation.

## 2. Family identity

A string family name gives package-copy-stable named identity. A bound
`Symbol` gives declaration-owned identity.

Named family values use the structural phantom key:

```text
~selaws.variant:<Name>
```

Declaration-owned families use the caller-owned symbol as the phantom property
key.

The phantom marker includes the Variant category, closed case-name universe,
and case signatures. Case-name universes are exact; payload positions retain
ordinary TypeScript structural variance.

Duplicate compatible Selaws installations therefore agree on an identically
declared named family, while distinct names and distinct caller-owned symbols
remain separate families.

## 3. Case formation

`Variant.unit` declares a nullary case.

`Variant.payload<T>()` declares a case carrying one `T`.

These declaration markers are opaque, package-copy-stable sentinels; their
runtime representation carries no domain payload.

`Variant.define` produces one `make` constructor for every declared case.
Formation preserves the selected case name and payload:

```ts
Message.make.quit();
// { tag: "quit" }

Message.make.write("hello");
// { tag: "write", value: "hello" }
```

A unit case and a payload case remain distinct even when the payload type is
`undefined` or `never`.

## 4. Representation

Variant values are ordinary transparent JavaScript objects.

A unit case has the representation:

```ts
{ tag: caseName }
```

A payload case has the representation:

```ts
{ tag: caseName, value: payload }
```

The family phantom identity is static TypeScript information. Formation adds no
runtime brand to the value.

Constructed values are ordinary structural data. The family declaration and
its `make` namespace are immutable; payload values themselves are not
deep-frozen by Variant.

## 5. Exhaustive elimination

Variant family `match` conforms to the shared [Match law](./match.md). The
Variant family owns the branch universe: one branch for every declared case,
with the payload assignment defined by that family.

Typed family `match` requires one handler for every declared case. The
complete family declaration, rather than the current narrowing of the input
value, determines the required handler object.

```ts
const length = Message.match(
  Message.make.write("hello"),
  {
    quit: () => 0,
    write: (text) => text.length,
  },
);
```

Exactly the selected own data-property handler runs once and without a
library-defined `this` receiver. Inherited properties and accessors do not
satisfy handler availability. Unit handlers receive zero arguments. Payload
handlers receive exactly the stored payload. Unselected handler properties are
not read by Match execution.

At runtime, `match` requires the Variant tag to be an own data property.
Payload cases also require an own data `value` property. Inherited properties
and accessors therefore cannot supply either part of the Variant
representation. `match` then validates that the selected tag belongs to the
family and that the selected handler is an own function property. TypeScript
owns whole-handler exhaustiveness for honestly typed calls.

Handler return and abrupt completion follow ordinary JavaScript semantics.
Promise values remain native Promise values.

Normal TypeScript discriminant narrowing remains available when local control
flow owns the branch:

```ts
if (message.tag === "write") {
  message.value;
  // string
}
```

## 6. Generic and recursive families

A generic family can be an ordinary factory:

```ts
const Remote = <T>() =>
  Variant.define("Remote", [
    ["idle", Variant.unit],
    ["success", Variant.payload<T>()],
  ]);

type Remote<T> =
  Variant.Value<ReturnType<typeof Remote<T>>>;
```

Recursive payloads can refer back to the Variant value through an ordinary
object or interface boundary:

```ts
interface AddPayload {
  readonly left: Expr;
  readonly right: Expr;
}

const Expr = Variant.define("Expr", [
  ["literal", Variant.payload<number>()],
  ["add", Variant.payload<AddPayload>()],
]);

type Expr =
  Variant.Value<typeof Expr>;
```

Variant does not introduce a separate recursive-data runtime.

## 7. Snapshot stability

`Variant.define` snapshots its case-entry tuple into constructor and
elimination behavior. Later mutation of caller-owned JavaScript arrays cannot
change the already-defined family. Typed declarations reject directly mutable outer and inner tuples. A readonly
view whose backing array is mutated through another alias before definition is
a TypeScript trust-model escape rather than a guarantee Variant can reify at
runtime.

The returned family and its `make` namespace are immutable runtime
declarations. Constructed Variant values remain ordinary structural data.

## 8. Typed boundary

Variant formation consumes already-typed payloads.

Runtime schema decoding, normalization, authorization, mutable freshness, and
version negotiation belong to application owners that can establish those
facts.

The runtime declaration boundary recognizes its finite case grammar. `match`
checks selected case membership and selected handler availability. Payload type
validity remains a TypeScript guarantee inside the ordinary Selaws trust model.

```ts
const UserEvent = Variant.define("UserEvent", [
  ["loaded", Variant.payload<User>()],
]);
```

This declaration does not validate unknown JSON as `User`; the decoding
boundary must do that before constructing `loaded`.

## 9. Owner independence

Variant owns labeled alternative identity, correlated payload formation, and
the complete case universe used for elimination. Its family `match` conforms
to the shared Match law; Match does not become a Variant-owned or independent
carrier.

Protocol owns admissible labeled transitions between application-owned state
identifiers.

Option owns presence.

Result owns recoverable success or failure.

Validation owns deterministic accumulation of independent issues.

Those owners may use sum-shaped structural data or compose values without
transferring their domain laws to Variant.
