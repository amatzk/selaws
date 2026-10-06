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

There is no root `Match` value, type, dispatcher, or `selaws/match` entry
point. Public realization stays on the owner:

```text
Option.match
Result.match
Validation.match
VariantFamily.match
```

## 1. Owner-defined branch universe

For one owner with branch universe `B` and payload assignment `P`, Match
eliminates one value from:

```text
sum over b in B of P(b)
```

through owner-defined branches.

Match does not reinterpret Option as Result, Result as Validation, or one
Variant family as another. Runtime structural similarity does not identify the
semantic owner.

## 2. Typed totality

A typed Match call provides a handler for every branch in the owning semantic
universe.

The obligation comes from the owner rather than the current narrowing of the
input value.

```text
Option      Some and None
Result      Ok and Err
Validation  Valid and Invalid
Variant     every declared family case
```

A narrowed Some, Ok, Valid, or Variant case does not reduce this obligation.

## 3. Selected own-data handler

The owning carrier determines exactly one selected branch.

Match resolves exactly one property: the selected branch key. The selected
handler must be an **own data property whose value is callable**.

Resolution uses the equivalent of:

```js
Object.getOwnPropertyDescriptor(handlers, selectedKey)
```

and accepts only a data descriptor containing a function value.

Consequences:

- inherited functions do not satisfy Match;
- selected accessors do not satisfy Match and their getter is not executed;
- unselected properties are not read, enumerated, or invoked;
- Match does not walk the prototype chain;
- Match does not enumerate the handler object merely to validate other keys.

A JavaScript Proxy may observe or throw from the single selected
`getOwnPropertyDescriptor` operation. That is native meta-object behavior, not
an additional Match communication channel.

When selected resolution succeeds, the handler is invoked exactly once.

## 4. `__proto__` is ordinary key identity

The string `"__proto__"` is not reserved by Match or Variant.

The special case belongs to one JavaScript object-literal syntax:

```js
{
  __proto__: handler
}
```

That syntax changes the created object's prototype and does not create an own
`"__proto__"` data property, so it does not satisfy Match.

These forms do create own data-function properties:

```js
{
  ["__proto__"]: handler
}
```

```js
{
  __proto__() {
    // ...
  }
}
```

Match has no `"__proto__"` runtime special case and never accepts an inherited
prototype function as a handler.

## 5. Payload correlation and arity

The selected handler receives exactly the payload owned by the selected branch.
Nullary branches receive zero arguments.

```text
Option Some        -> present value
Option None        -> zero arguments

Result Ok          -> success value
Result Err         -> error value

Validation Valid   -> valid value
Validation Invalid -> complete non-empty issue collection

Variant unit case  -> zero arguments
Variant payload    -> stored case payload
```

Match does not flatten, convert, accumulate, or reinterpret branch payloads.

## 6. Receiver neutrality

Selaws does not supply the handler carrier as a callback receiver.

The selected function is invoked as an ordinary callback without a
library-defined `this` value. A function with its own explicit JavaScript
binding, such as a bound function, keeps that native behavior.

## 7. Completion transparency

After successful selected-handler resolution, the selected handler's completion
is the Match completion.

```text
ordinary return -> ordinary Match return
throw           -> throw remains abrupt
Promise return  -> native Promise value remains native
```

Match does not capture exceptions, await Promises, introduce asynchronous
carriers, or normalize handler return values.

The static Match result remains a conservative union of participating handler
return types. Finite overloaded handlers preserve their exposed alternatives.
If TypeScript generic-callable reflection would cycle, Selaws may widen the
affected callback result to `unknown` rather than impose an arbitrary overload
count or exhaust compiler instantiation depth.

## 8. Runtime boundary ownership

The own-data selected-handler requirement is shared runtime Match law and is
implemented consistently for Option, Result, Validation, and Variant.

Additional runtime validation remains owner-specific.

Variant owns a runtime family declaration, so Variant additionally validates
its tagged representation, declared case membership, and payload
representation.

Fixed structural owners do not acquire Variant's family decoder merely because
they share Match handler resolution.

## 9. Implementation sharing

A shared law does not generally require one shared production abstraction.

For selected-handler resolution, however, the runtime law is identical and a
private shared helper reduces semantic drift without creating a public Match
owner or dispatcher.

A future Match-capable owner must define its branch universe and payload
correlation, conform to this selected-handler law, and keep any additional
runtime validation with the owner that can establish it.
