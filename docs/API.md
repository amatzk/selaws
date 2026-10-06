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
ValidationIssue

Result
Ok
Err
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

Result's explicit JavaScript control boundaries are available as
`Result.attempt`, `Result.attemptAsync`, and `Result.orThrow` on the
owner-qualified facade. The same operations remain standalone exports from
`selaws/result` for focused imports.

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

All four require typed total handling of the owner's branches. The selected
handler must be an own data-function property; Match does not consult selected
accessors or prototypes and does not read unselected handlers. The selected
function is invoked once without a library-defined `this` receiver and keeps
ordinary return, throw, or Promise completion.

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
identity.shared.string
identity.shared.number
identity.shared.bigint
identity.shared.boolean
identity.shared.symbol
identity.define
identity.Value
```

### Local formation and explicit shared contracts

```ts
const userIdKey: unique symbol = Symbol("UserId");
const UserId = identity.string(userIdKey);
type UserId = identity.Value<typeof UserId>;

const id = UserId("u_1");
```

Local carrier factories require one narrow symbol token. Without a predicate, a
correctly typed carrier is formed directly and unknown input is checked for the
correct scalar kind. With a predicate, formation can return `undefined`.

```ts
const portKey: unique symbol = Symbol("Port");
const Port = identity.number(
  portKey,
  (value) =>
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 65_535,
);
```

Intentional cross-package structural compatibility is explicit:

```ts
const SharedUserId =
  identity.shared.string(
    "example.domain/UserId@1",
  );
```

Shared factories require one concrete literal string contract. See
[Declaration compatibility](./laws/declaration-compatibility.md).

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
evidence.shared.string
evidence.shared.number
evidence.shared.bigint
evidence.shared.boolean
evidence.shared.symbol
evidence.define
evidence.Proven
```

Every Evidence factory requires a predicate.

```ts
const nonEmptyKey: unique symbol = Symbol("NonEmpty");

const NonEmpty = evidence.string(
  nonEmptyKey,
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

`Protocol.define` snapshots one exact finite relation of readonly
`[from, label, to]` triples into an immutable membership relation. Typed
declarations require a finite readonly outer tuple, readonly triples, and one
concrete scalar identity in each source/label/target position. Broad-length
arrays, relation unions, and broad scalar member types are outside the typed
Protocol grammar. JavaScript callers still receive runtime shape/scalar
validation and concrete snapshot semantics.

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

`States` contains source and target identifiers that occur in the exact
relation. `Labels` contains its declared labels. `Next` projects exactly the
targets in that same relation for a source/label pair. These projections do not
treat a broad relation type as an upper approximation.

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
shared
payload
unit
Variant

Variant.define
Variant.shared
Variant.payload
Variant.unit
Variant.Value
Variant.Case
```

### Declare a family

```ts
const messageKey: unique symbol = Symbol("Message");

const Message = Variant.define(messageKey, [
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

`Variant.Case<Value, Name>` extracts one named member from an exported Variant
value union while preserving that member's payload and family identity:

```ts
type Write =
  Variant.Case<Message, "write">;
```

### Construct and eliminate

```ts
const value =
  Message.make.write("hello");

const length = Message.match(value, {
  quit: () => 0,
  write: (text) => text.length,
});
```

Typed `match` requires exactly the complete family handler-key set: missing
and undeclared keys are rejected statically, including on prebuilt handler
objects. Runtime Match still resolves only the selected handler and does not
enumerate keys. At runtime, the
Variant value must carry its tag as an own data property; payload cases must
also carry their payload as an own data `value` property. The selected tag must
belong to the declaration, and the selected handler must be an own data-function
property.

`Variant.define` requires a declaration-owned narrow symbol token.
`Variant.shared` requires an explicit concrete string interoperability
contract. Shared families remain structurally compatible across duplicate
package copies only when the contract and exact family signature agree.

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
| Fallback | `unwrapOr`, `unwrapOrElse` | leave Option with an explicit fallback |
| Collection | `all` | combine already-materialized Options |
| JS boundary | `toUndefined`, `toNullable` | project None to a conventional JS sentinel |

`OptionValue<O>` extracts the Some payload type.

`some(undefined)` is Some; `fromUndefined(undefined)` is None.

`Option.all` preserves finite tuple positions. Typed input arrays must be
readonly; broad `readonly Option<T>[]` inputs remain valid.

Side-effect-only observation uses ordinary JavaScript branching rather than a
public `inspect` helper.

## `selaws/validation`

Types:

```text
Valid
Invalid
Validation
ValidationIssues
ValidationValue
ValidationIssue
```

Runtime exports and facade members:

```text
valid
invalid
isValid
isInvalid
match
map
mapIssue
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
| Mapping | `map`, `mapIssue` | transform values or every issue |
| Fallback | `unwrapOr`, `unwrapOrElse` | leave Validation with an explicit fallback |
| Accumulation | `all`, `struct` | combine independent available checks |
| Conversion | `fromOption`, `fromResult` | introduce Validation meaning at an explicit boundary |

`ValidationIssues<E>` is a non-empty readonly tuple type.

`ValidationValue<V>` extracts the Valid payload.
`ValidationIssue<V>` extracts one issue type.

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
| Fallback | `unwrapOr`, `unwrapOrElse` | leave Result with an explicit fallback |
| Collection | `all` | combine already-materialized Results, stopping at the first Err |
| Conversion | `fromOption`, `fromValidation` | introduce Result meaning at an explicit boundary |

`ResultValue<R>` extracts the Ok payload.
`ResultError<R>` extracts the Err payload.

`Result.all` traverses in input order and returns the first Err object itself.
Typed input arrays must be readonly; broad readonly Result arrays remain valid.

`Result.fromValidation` carries the entire non-empty issue collection as one
Err value.

### JavaScript control boundaries

Owner-qualified facade members and focused standalone exports:

```text
Result.attempt       / attempt
Result.attemptAsync  / attemptAsync
Result.orThrow       / orThrow
```

`attempt(read, mapThrown)` captures one synchronous invocation boundary.
Thrown values become Err through `mapThrown`. A Promise-like return violates
the synchronous contract and raises `TypeError`.

`attemptAsync(read, mapThrown)` captures invocation throws and Promise-like
rejection into `Promise<Result<...>>`.

The capture boundary remains visible at each `attempt` / `attemptAsync`
invocation; Result does not expose reusable wrapper factories.

`orThrow(result, mapErrorToThrowable)` returns the Ok value or explicitly maps
Err back to a thrown JavaScript value.

Promise remains the async scheduling owner; these helpers do not introduce an
async Result runtime.
