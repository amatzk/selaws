# Match law

Match is Selaws' shared elimination law for sum-like semantic owners.

It applies to:

```text
Option      Some / None
Result      Ok / Err
Validation  Valid / Invalid
Variant     one declared family case
```

Match is not an eighth semantic owner. The owning carrier still defines which
branches exist, what each branch means, and which payload belongs to each
branch.

There is no root `Match` value, `Match` type, or `selaws/match` entry point.
The public realizations stay on their owners:

```text
Option.match
Result.match
Validation.match
VariantFamily.match
```

## 1. Owner-defined branch universe

For one owner with finite branch universe `B` and branch payload assignment
`P`, Match eliminates one value from:

```text
sum over b in B of P(b)
```

through one handler per branch.

The owner supplies `B` and `P`.

Match does not reinterpret Option as Result, Result as Validation, or one
Variant family as another. Runtime structural similarity does not identify the
semantic owner.

## 2. Typed totality

A typed Match call provides a handler for every branch in the owning semantic
universe.

This requirement is determined by the owner, not by the current narrowing of
the input value.

Examples:

```text
Option      requires Some and None
Result      requires Ok and Err
Validation  requires Valid and Invalid
Variant     requires every case in the declared family
```

A narrowed Some, Ok, Valid, or Variant case does not reduce the family-level
handler obligation.

## 3. Unique selection

The owning carrier determines exactly one selected branch.

Match resolves only that branch's handler according to the owner's handler
boundary. Unselected handler properties are not read or invoked by Selaws
Match execution.

When selected-handler resolution completes with a callable handler, that
handler is invoked exactly once. Any abrupt completion while resolving the
selected handler remains ordinary JavaScript abrupt completion.

## 4. Payload correlation and arity

The selected handler receives exactly the payload owned by the selected branch.

Nullary branches receive zero arguments.

Examples:

```text
Option Some       -> present value
Option None       -> zero arguments

Result Ok         -> success value
Result Err        -> error value

Validation Valid  -> valid value
Validation Invalid-> complete non-empty issue collection

Variant unit case -> zero arguments
Variant payload   -> stored case payload
```

Match does not flatten, convert, accumulate, or otherwise reinterpret a branch
payload.

## 5. Receiver neutrality

Selaws does not supply the handler object as a callback receiver.

The selected handler is invoked as an ordinary callback without a
library-defined `this` value. A function that carries its own explicit JavaScript
binding, such as a bound function, retains that ordinary language behavior.

Receiver semantics are therefore not a hidden communication channel between a
semantic owner and its Match handler. This rule governs callback invocation;
it does not rewrite ordinary JavaScript property-access semantics used by an
owner to resolve the selected handler.

## 6. Completion transparency

After selected-handler resolution, the selected handler's completion is the
Match completion.

```text
ordinary return -> ordinary Match return
throw           -> throw remains abrupt
Promise return  -> native Promise value remains native
```

Match does not capture exceptions, await Promises, introduce asynchronous
carriers, or normalize handler return values.

The static Match result is a conservative union of the return types exposed by
the participating handlers. Finite overloaded handlers therefore preserve
their exposed return alternatives rather than collapsing to one overload.

TypeScript can reflect some generic callable signatures as the same instantiated
signature repeatedly. When that reflection would cycle, Selaws widens the
affected callback result to `unknown` instead of imposing an arbitrary overload
count or exhausting compiler instantiation depth.

## 7. Runtime boundary ownership

The shared Match law does not require one universal runtime validator.

Fixed structural owners rely on their ordinary typed carrier boundary and
ordinary JavaScript property lookup for the selected handler.

Variant additionally owns runtime family checks because its family declaration
exists at runtime. Variant Match therefore validates its own tagged
representation, declared case membership, payload representation, and selected
own handler availability.

Those Variant checks are owner-specific enforcement of Variant meaning, not
additional shared Match meaning.

## 8. Implementation independence

A shared law does not require one shared production helper.

Each owner may keep a local implementation when that preserves clearer
ownership, inference, and runtime boundaries. Shared conformance tests establish
the cross-owner law.

A future Match-capable owner must define its branch universe and payload
correlation, conform to this shared law, and keep any additional runtime
validation with the owner that can establish it.
