# Selaws semantics

Selaws is one distribution package containing independent semantic owners.
Package co-location does not merge their laws.

| Owner | Question |
| --- | --- |
| Identity | What scalar value is this? |
| Evidence | What stable fact is established about this scalar? |
| Protocol | Which labeled state transitions are admissible? |
| Variant | Which closed labeled alternative is this, and what payload does it carry? |
| Option | Is a value present? |
| Validation | Which independently available checks have issues? |
| Result | Did a recoverable computation succeed? |

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

The detailed owner contracts are:

- [Identity](./laws/identity.md)
- [Evidence](./laws/evidence.md)
- [Protocol](./laws/protocol.md)
- [Variant](./laws/variant.md)
- [Option](./laws/option.md)
- [Validation](./laws/validation.md)
- [Result](./laws/result.md)

Cross-owner semantics can also be first-class shared laws without becoming new
owners. The shared Match contract is [laws/match.md](./laws/match.md).
Declaration-local versus explicit shared structural identity is governed by
[declaration compatibility](./laws/declaration-compatibility.md).

The [Guide](./GUIDE.md) shows application patterns. This file defines the
shared package laws those patterns must preserve.

## 1. Semantic selection law

Choose an owner by the meaning the application needs, not by implementation
shape.

A tagged union does not automatically imply Variant. Option, Validation, and
Result are also sum-shaped, but their branches carry different laws:

```text
Variant    closed alternative identity + correlated payload
Option     presence / reasonless absence
Validation independent issue accumulation
Result     recoverable success / fail-fast error
```

Likewise, a list of state-like strings does not automatically imply Protocol.
Protocol begins only when the application needs an admissible labeled relation
between scalar identifiers.

Using one owner as a carrier for another owner's meaning does not transfer the
second owner's laws automatically.

## 2. Ownership law

Each primitive owns one dominant meaning. Similar implementation shapes do not
create a shared semantic owner.

Cross-owner operations are named on the target owner because the conversion
introduces the target meaning:

```text
Result.fromOption
Result.fromValidation

Validation.fromOption
Validation.fromResult
```

The source information preserved by each boundary is part of the target
owner's law.

Protocol is independent of every other semantic owner. It consumes
application-owned scalar identifiers without importing Identity, Evidence, or
Variant meaning.

Variant owns exact closed labeled alternatives and correlated payload
formation. Option, Validation, and Result retain their presence, accumulation,
and recoverable-failure meanings even when their carriers are also tagged
unions.

Identity and Evidence remain independent scalar meanings. Identity says which
domain scalar this is. Evidence says which stable fact has been established
about that same scalar.

Application code composes owners through ordinary typed values.

## 3. Composition law

Owner independence does not prohibit useful composition. It determines which
owner is responsible for each statement.

Examples:

```text
Identity + Evidence
  UserId carrying a separately established NonEmpty fact

Variant inside Result
  Result<User, LoadUserError>
  where LoadUserError is a closed Variant family

Validation -> Result
  independent field issues accumulate first,
  then the complete issue collection becomes one Result error

Variant label + Protocol
  Variant owns event payload/case identity;
  Protocol can use the scalar event tag as a transition label

Promise<Result<T,E>>
  Promise owns scheduling/awaiting;
  Result owns recoverable success/error data
```

Composition must preserve those boundaries. A convenience helper that makes one
owner silently perform another owner's job changes the semantic surface and
requires its own owner justification.

## 4. Match law

Match is the shared elimination law for Option, Result, Validation, and Variant.
It is not another semantic owner and introduces no root value, type, dispatcher,
or package subpath.

The owning carrier determines the complete branch universe and the payload
associated with each branch. Typed Match requires a handler for every branch in
that universe even when the current value is already narrowed.

For the selected branch, Match:

```text
resolves the selected handler only as an own data-function property
invokes exactly one handler exactly once
does not read, enumerate, or invoke unselected handler properties
does not consult selected accessors or prototypes
preserves the owner-defined branch payload and arity
supplies no library-defined this receiver
returns the selected handler completion unchanged
```

Therefore a returned Promise remains a native Promise and a thrown handler
remains abrupt. Match does not capture, await, or normalize completion.

Selected own-data handler resolution is shared runtime Match law. Runtime
validation beyond that shared elimination boundary remains owner-specific.
Variant can validate its runtime family representation because Variant owns a
runtime case declaration. Fixed structural owners retain their own typed
boundaries.

The public grammar remains owner-scoped:

```text
Option.match
Result.match
Validation.match
VariantFamily.match
```

A centralized `Match(value, handlers)` could not recover semantic ownership
from transparent structural data, while `Match(owner, value, handlers)` would
duplicate the owner and weaken TypeScript inference. Shared law therefore does
not imply shared dispatch.

## 5. Representation law

Identity and Evidence enrich immutable JavaScript scalar values:

```ts
string | number | bigint | boolean | symbol
```

Successful formation returns that same primitive representation.

Protocol uses those JavaScript scalar kinds as application-owned state and
label identifiers. A typed Protocol declaration is one exact finite readonly
relation whose transition members are concrete scalar identities.
`Protocol.define` snapshots that relation into private runtime membership.
The runtime relation is not application state.

Variant snapshots a finite case declaration into immutable family constructors
and elimination behavior. Its values remain transparent tagged JavaScript
objects:

```ts
{ tag: caseName }
{ tag: caseName, value: payload }
```

Variant phantom family identity adds no runtime brand.

Option, Validation, and Result also use ordinary structural object and array
data. Their TypeScript `Readonly` contracts describe typed use; runtime values
remain transparent JavaScript data.

Transparent representation is not permission to bypass each owner's formation
and boundary laws in typed application code.

## 6. Declaration compatibility law

Declaration-owned identity is the default for Identity, Evidence, and Variant.
A caller-owned narrow symbol determines local declaration identity.

```text
same symbol token       => compatible local declaration identity
different symbol tokens => distinct local declaration identity
symbol description text => non-semantic
```

Intentional structural interoperability is explicit:

```text
identity.shared.*
evidence.shared.*
Variant.shared
```

Shared declarations use Selaws-owned package-copy-stable structural keys:

```text
~selaws.identity:<Contract>
~selaws.evidence:<Contract>
~selaws.variant:<Contract>
```

The contract string is an interoperability assertion, not a display name.
Selaws does not prove that two independent producers using the same contract
have equivalent external business semantics.

Owner categories remain distinct. Reusing one local symbol or equal shared
contract text does not make Identity imply Evidence or make either owner become
Variant.

Variant family markers additionally retain the exact closed case-name universe
and case signatures needed for typed compatibility. Two shared Variant
declarations with the same contract but different family signatures therefore
remain incompatible.

Local factories require symbol tokens at runtime. Shared factories require
string contracts. TypeScript additionally requires narrow symbols and concrete
literal contracts.

See [Declaration compatibility](./laws/declaration-compatibility.md).

## 7. Completion law

Ordinary transformation, recovery, fallback, predicate, conversion, and
elimination callbacks follow JavaScript completion semantics. A thrown callback
remains abrupt unless an explicit Result capture boundary owns the conversion.

Side-effect-only observation stays in ordinary JavaScript control flow rather
than introducing a separate carrier callback law.

Result capture helpers are the explicit boundary that maps thrown or rejected
JavaScript completion into recoverable Result error data. Synchronous
`attempt` rejects Promise-like completion rather than silently treating an
asynchronous operation as synchronous.

## 8. Async law

Native Promise composition owns scheduling, awaiting, and rejection.

```ts
Promise<Result<T, E>>
Promise<Option<T>>
Promise<Validation<T, E>>
```

Selaws does not introduce an asynchronous carrier wrapper or an `AsyncResult`
alias. Native `Promise<Result<T, E>>` is the canonical asynchronous spelling.

Result does not introduce a generator or asynchronous control-flow runtime.
Dependent async composition remains ordinary JavaScript control flow over
`Promise<Result<T, E>>` values.

Independent asynchronous work may be scheduled with Promise first and then
combined by the relevant Selaws data owner.

## 9. Information law

Owner boundaries preserve information according to the target contract.

- Option None gains an error only when converted to Result.
- Option None gains an issue only when converted to Validation.
- Invalid's complete non-empty issue collection becomes one Result error value.
- One Result Err value becomes one Validation issue, even when that value is
  itself an array.
- Variant payloads remain attached to their declared case; conversion through
  another owner must not erase that correlation unless that boundary explicitly
  defines such a projection.
- Protocol labels remain part of relation identity even when source and target
  states are otherwise equal.

Applications can state a different projection explicitly before or after an
owner boundary.

## 10. Snapshot law

Protocol and Variant both define immutable runtime declarations from
caller-provided declaration data.

`Protocol.define` snapshots transition triples.

`Variant.define` snapshots case names and case kinds.

Protocol and Variant typed declarations require readonly finite tuples and
reject directly mutable declaration arrays. Protocol additionally requires one
concrete scalar identity in every transition position; broad scalar spaces and
unions do not denote one exact typed relation. This prevents static Protocol
projections from becoming an upper approximation of a different concrete
runtime snapshot. TypeScript can still create a readonly view over a separately
mutable alias and mutate the same backing array before definition; that
language-level unsound aliasing is governed by the trust model below.

At runtime, both owners snapshot caller-provided declaration data. Later
mutation of caller-owned JavaScript arrays does not change the already-defined
Protocol or Variant family.

Snapshotting the declaration does not freeze application payloads, application
state, or external storage.

## 11. TypeScript trust model

Selaws validates runtime-observable declaration grammar that belongs to Selaws.
That includes local/shared declaration token kind, concrete Protocol runtime
scalar entries, Variant declaration entry shape and duplicate-name/case-marker
identity, `Validation.struct` entry/key grammar, and the selected Match
handler's own-data-callable boundary.

Selaws does not reify application meaning erased by TypeScript. In particular,
runtime checks do not establish a `Variant.payload<User>()` object schema,
authorization, persisted freshness, external provenance, or application
normalization merely because a static type mentions those concepts.

A phantom distinction does not create another runtime declaration identity.
When a Selaws declaration law depends on exact runtime equality of a state,
label, case name, or object key, the declaration uses the runtime-distinct
scalar or property-key identity itself. A phantom-branded primitive intersection
such as an Identity or Evidence value still erases to the same primitive, so it
cannot stand for a second exact Protocol member, Variant case name, or
`Validation.struct` key. Those typed declaration boundaries reject such
phantom-only key distinctions rather than claiming runtime equality can preserve
them.

Selaws expresses semantic guarantees for values whose runtime state is still
described by their ordinary TypeScript type. Formation APIs centralize honest
introduction of phantom meaning. Assertions, `any`, and TypeScript's unsound mutable aliasing can break that
relationship; Selaws does not reify erased static types at runtime. A readonly
view is therefore trusted to describe the current backing value when it crosses
a Selaws typed boundary.

Protocol runtime membership establishes only whether one concrete triple was
declared. It does not establish authorization, current-state freshness, or an
atomic state mutation.

Variant runtime formation establishes the selected declared case and preserves
the supplied payload. Runtime payload schema validity still belongs to the
application boundary that decoded or produced that value.

Identity and Evidence predicates can validate their own scalar formation or
fact condition. They are not general object-schema decoders.

Runtime authorization, mutable freshness, revocation, schema decoding,
normalization, persistence, version negotiation, and resource enforcement
remain owned by application layers that can establish those facts at runtime.
