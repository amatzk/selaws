# Selaws API

This document is the public-surface index. For design guidance and complete
examples, see [GUIDE.md](./GUIDE.md). Normative behavior is defined in
[SEMANTICS.md](./SEMANTICS.md) and the owner/shared laws under
[docs/laws](./laws/).

## Root: `selaws`

The root exposes owner facades and principal carrier types so mixed-owner
application code can keep ownership visible.

Runtime values:

```text
identity
evidence
Protocol
Variant
Option
Validation
Result
```

Principal types:

```text
Scalar
Identity
Evidence
Protocol
Variant

Option
Some
None
OptionValue

Validation
Valid
Invalid
ValidationIssues
ValidationValue
ValidationError

Result
Ok
Err
AsyncResult
ResultValue
ResultError
```

Generic operation names such as `map`, `match`, `define`, and `Next` are
not exported as root-level functions. They belong to focused subpaths or to the
corresponding facade.

```ts
import {
  Option,
  Protocol,
  Result,
  Validation,
  Variant,
} from "selaws";

const maybe = Option.some(1);
const success = Result.ok(1);
```

Result capture helpers such as `attempt` and `wrap` live on
`selaws/result`; they are explicit JavaScript control-boundary operations, not
members of the root Result data facade.

## Shared Match law

Match is a first-class shared elimination law, not a public namespace or
dispatcher. There is no root `Match` export and no `selaws/match` entry point.

The public realizations stay on the semantic owner that defines the branch
universe:

```text
Option.match
Result.match
Validation.match
VariantFamily.match
```

All four require typed total handling of the owner's branches, invoke exactly
one selected handler without a library-defined `this` receiver, leave
unselected handlers untouched, and preserve the selected handler's ordinary
return, throw, or Promise completion.

The owner remains responsible for branch meaning and any extra runtime
validation. Variant therefore retains family-specific runtime representation
checks that fixed structural carriers do not share.

See [the Match law](./laws/match.md) for the normative cross-owner contract.

## `selaws/identity`

Exports:

```text
Scalar
Identity
defineIdentity
identity

identity.string
identity.number
identity.bigint
identity.boolean
identity.symbol
identity.define
identity.Value
```

### Named formation

```ts
const UserId = identity.string("UserId");
type UserId = identity.Value<typeof UserId>;

const id = UserId("u_1");
```

Each carrier factory accepts either a concrete string name or a narrow symbol.
Without a predicate, a correctly typed carrier is formed directly and unknown
input is checked for the correct scalar kind. With a predicate, formation can
return `undefined`.

```ts
const Port = identity.number(
  "Port",
  (value) =>
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 65_535,
);
```

String names define package-copy-stable structural identity. A bound symbol
defines declaration-owned identity.

### `defineIdentity`

`defineIdentity<T>()(token, build)` supplies a private `mint` function to the
declaration callback. Use it when the declaring module needs a custom formation
API rather than one scalar factory function.

## `selaws/evidence`

Exports:

```text
Scalar
Evidence
defineFact
evidence

evidence.string
evidence.number
evidence.bigint
evidence.boolean
evidence.symbol
evidence.define
evidence.Proven
```

Every Evidence factory requires a predicate.

```ts
const NonEmpty = evidence.string(
  "NonEmpty",
  (value) => value.length > 0,
);

const checked = NonEmpty(value);
// proven value | undefined
```

Successful establishment preserves identity and previously established evidence
on the same scalar.

`evidence.Proven<typeof Fact, Value>` applies a fact declaration's evidence
type to an already compatible scalar type.

`defineFact<T>()(token, build)` is the declaration-owned form. Its callback
receives the private establishment function.

## `selaws/protocol`

Types:

```text
State
Label
Transition
States
Labels
Next
Protocol
```

Runtime exports:

```text
define
Protocol
Protocol.define
```

### Define a relation

```ts
const transitions = [
  ["pending", "pay", "paid"],
  ["pending", "cancel", "cancelled"],
] as const;

const OrderProtocol =
  Protocol.define(transitions);
```

`Protocol.define` snapshots a readonly relation of readonly
`[from, label, to]` triples into an immutable membership relation. Typed
declarations reject directly mutable outer arrays and triples. A readonly view
over a separately mutable alias is still subject to the TypeScript trust model
described in [SEMANTICS.md](./SEMANTICS.md).

### Static projections

```ts
type State =
  States<typeof transitions>;

type Label =
  Labels<typeof transitions>;

type AfterPay =
  Next<
    typeof transitions,
    "pending",
    "pay"
  >;
// "paid"
```

`States` contains source and target identifiers that occur in the declaration.
`Labels` contains declared labels. `Next` projects the targets statically
admissible for a source/label pair.

### Runtime membership

```ts
OrderProtocol.allows(
  "pending",
  "pay",
  "paid",
);
// boolean
```

`allows` tests one concrete triple. It returns a boolean rather than a
target-narrowing type predicate. The relation may be nondeterministic.

Protocol does not store current state or perform a transition.

## `selaws/variant`

Type:

```text
Variant
```

Runtime exports and facade members:

```text
define
payload
unit
Variant

Variant.define
Variant.payload
Variant.unit
Variant.Value
```

### Declare a family

```ts
const Message = Variant.define("Message", [
  ["quit", Variant.unit],
  ["write", Variant.payload<string>()],
]);

type Message =
  Variant.Value<typeof Message>;
```

`Variant.define` accepts one finite readonly tuple of `[caseName, caseSpec]`
entries, snapshots that tuple, and returns an immutable family with:

```text
family.make.<case>(...)
family.match(value, handlers)
```

`Variant.unit` declares a nullary case.
`Variant.payload<T>()` declares a case carrying exactly one typed payload.
Case names must be concrete string literals. The outer declaration tuple and
each case-entry pair must be readonly. Duplicate names and broad-length or
union declaration lists are outside the typed grammar.

`Variant.Value<Family>` extracts the complete tagged value union. The
top-level type `Variant<Family>` is the equivalent carrier type.

### Construct and eliminate

```ts
const value =
  Message.make.write("hello");

const length = Message.match(value, {
  quit: () => 0,
  write: (text) => text.length,
});
```

Typed `match` requires handlers for the complete family. At runtime, the
Variant value must carry its tag as an own data property; payload cases must
also carry their payload as an own data `value` property. The selected tag must
belong to the declaration, and the selected handler must be an own function
property.

A string family token defines named package-copy-stable identity. A bound
symbol defines declaration-owned family identity.

## `selaws/option`

Types:

```text
Some
None
Option
OptionValue
```

Runtime exports and facade members:

```text
some
none
isSome
isNone
match
map
andThen
orElse
flatten
filter
inspect
unwrapOr
unwrapOrElse
all
fromUndefined
fromNullable
toUndefined
toNullable
Option
```

Operation groups:

| Group | Operations | Meaning |
| --- | --- | --- |
| Formation | `some`, `none`, `fromUndefined`, `fromNullable` | create explicit presence/absence |
| Narrowing/elimination | `isSome`, `isNone`, `match` | inspect the branch |
| Composition | `map`, `andThen`, `orElse`, `flatten`, `filter` | transform while preserving Option meaning |
| Observation/fallback | `inspect`, `unwrapOr`, `unwrapOrElse` | observe or leave Option |
| Collection | `all` | combine already-materialized Options |
| JS boundary | `toUndefined`, `toNullable` | project None to a conventional JS sentinel |

`OptionValue<O>` extracts the Some payload type.

`some(undefined)` is Some; `fromUndefined(undefined)` is None.

`inspect` is synchronous and returns the original Option.

`Option.all` preserves finite tuple positions. Typed input arrays must be
readonly; broad `readonly Option<T>[]` inputs remain valid.

## `selaws/validation`

Types:

```text
Valid
Invalid
Validation
ValidationIssues
ValidationValue
ValidationError
```

Runtime exports and facade members:

```text
valid
invalid
isValid
isInvalid
match
map
mapError
inspect
inspectErrors
unwrapOr
unwrapOrElse
all
struct
fromOption
fromResult
Validation
```

Operation groups:

| Group | Operations | Meaning |
| --- | --- | --- |
| Formation | `valid`, `invalid` | construct valid data or non-empty issues |
| Narrowing/elimination | `isValid`, `isInvalid`, `match` | inspect the branch |
| Mapping | `map`, `mapError` | transform values or every issue |
| Observation/fallback | `inspect`, `inspectErrors`, `unwrapOr`, `unwrapOrElse` | observe or leave Validation |
| Accumulation | `all`, `struct` | combine independent available checks |
| Conversion | `fromOption`, `fromResult` | introduce Validation meaning at an explicit boundary |

`ValidationIssues<E>` is a non-empty readonly tuple type.

`ValidationValue<V>` extracts the Valid payload.
`ValidationError<V>` extracts one issue type.

`Validation.all` preserves finite tuple positions. Typed input arrays must be
readonly; broad readonly Validation arrays remain valid. `Validation.struct` accepts one
finite readonly tuple of readonly `[key, Validation]` entries, preserves those
string or symbol keys, and accumulates issues in entry order. Directly mutable
outer or inner tuples, duplicate keys, broad keys, and broad-length declarations
are outside the typed grammar. Readonly views over separately mutable aliases
remain subject to the package TypeScript trust model.

`Validation.fromResult` turns one Err value into one Validation issue even
when that Err value is itself an array.

## `selaws/result`

Types:

```text
Ok
Err
Result
AsyncResult
ResultValue
ResultError
```

### Result data algebra

Runtime exports and Result facade members:

```text
ok
err
isOk
isErr
match
map
mapError
andThen
orElse
flatten
inspect
inspectError
unwrapOr
unwrapOrElse
all
fromOption
fromValidation
Result
```

Operation groups:

| Group | Operations | Meaning |
| --- | --- | --- |
| Formation | `ok`, `err` | construct recoverable success/error data |
| Narrowing/elimination | `isOk`, `isErr`, `match` | inspect the branch |
| Composition | `map`, `mapError`, `andThen`, `orElse`, `flatten` | transform or sequence Result data |
| Observation/fallback | `inspect`, `inspectError`, `unwrapOr`, `unwrapOrElse` | observe or leave Result |
| Collection | `all` | combine already-materialized Results, stopping at the first Err |
| Conversion | `fromOption`, `fromValidation` | introduce Result meaning at an explicit boundary |

`ResultValue<R>` extracts the Ok payload.
`ResultError<R>` extracts the Err payload.

`Result.all` traverses in input order and returns the first Err object itself.
Typed input arrays must be readonly; broad readonly Result arrays remain valid.

`Result.fromValidation` carries the entire non-empty issue collection as one
Err value.

### JavaScript control boundaries

Focused-only runtime exports:

```text
attempt
attemptAsync
wrap
wrapAsync
orThrow
```

`attempt(read, mapThrown)` captures one synchronous invocation boundary.
Thrown values become Err through `mapThrown`. A Promise-like return violates
the synchronous contract and raises `TypeError`.

`attemptAsync(read, mapThrown)` captures invocation throws and Promise
rejection into `Promise<Result<...>>`.

`wrap` and `wrapAsync` produce reusable wrapped functions while preserving
arguments and `this`.

`orThrow(result, mapErrorToThrowable)` returns the Ok value or explicitly maps
Err back to a thrown JavaScript value.

Promise remains the async scheduling owner; these helpers do not introduce an
async Result runtime.
