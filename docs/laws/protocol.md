# Protocol laws

Protocol owns one exact finite admissible labeled transition relation over
application-owned scalar state and label identifiers.

For a typed declaration `R`:

```text
R subset State x Label x State
```

`allows(from, label, to)` is true exactly when `(from, label, to)` belongs to
that relation.

Use Protocol when an application must declare admissible labeled transitions
without introducing a state-machine runtime.

```ts
const transitions = [
  ["pending", "pay", "paid"],
  ["pending", "cancel", "cancelled"],
  ["paid", "ship", "shipped"],
] as const;

const OrderProtocol =
  Protocol.define(transitions);
```

## 1. Exact finite typed relation

A typed Protocol declaration identifies one concrete relation snapshot.

The outer declaration must be one finite readonly tuple. Every transition must
be one readonly length-three tuple, and each `from`, `label`, and `to`
member must denote one concrete scalar identity.

Typed member identities are raw literal strings, numbers, bigints and booleans.
Nominal enum members and symbol types are not exact runtime singleton types.

A phantom brand on a primitive does not create another runtime scalar identity.
For example, two differently branded values whose runtime carrier is the same
string would compare equal in Protocol's SameValueZero relation. Such
phantom-only distinctions are therefore outside the exact Protocol declaration
grammar; use runtime-distinct raw literals for typed state and label identifiers.

Broad or alternative scalar spaces do not denote one concrete relation member:

```text
string
number
bigint
boolean
symbol
"a" | "b"
`state:${string}`
branded broad scalar spaces
```

Broad-length arrays and unions of alternative relation tuples likewise do not
declare one typed Protocol.

This exactness keeps the static projections and runtime membership tied to the
same declaration rather than treating the type as an upper approximation of a
different runtime snapshot.

Runtime JavaScript callers do not have TypeScript tuple exactness. They may
supply ordinary arrays; Protocol validates the concrete runtime grammar and
snapshots the values present at the call.

## 2. Application-owned identifiers

The application owns the meaning of state identifiers and transition labels.
Protocol receives scalar identifiers and does not construct domain states,
commands, events, or operations.

A Protocol declaration does not define a complete state universe.
`States<Transitions>` contains only source and target identifiers that occur
in the exact relation.

## 3. Single static/runtime relation

For an exact declaration, the same `Transitions` determines:

```text
States<Transitions>
Labels<Transitions>
Next<Transitions, From, Label>
Protocol.define(Transitions).allows(...)
```

`Next` projects exactly the targets declared for one source/label pair. If
`From` or `Label` is a union, the projected target union is existential: a
target occurs for at least one pair in those inputs. It does not establish
admissibility for every pair. An application that requires every possible
outcome to be admissible must check that universal condition separately.

```ts
type AfterPay =
  Next<
    typeof transitions,
    "pending",
    "pay"
  >;
// "paid"
```

`allows` tests concrete runtime membership and returns a boolean. It does not
claim target-narrowing through a type predicate; a caller may pass union-valued
state/label/target variables whose correlations TypeScript cannot preserve
through a boolean call.

Exact typed identifiers require agreement between static type equality and
runtime SameValueZero. Distinct unique-symbol types can denote one registered
symbol, and repeated evaluation of one declaration can produce distinct symbols
of the same static type. Symbol types cannot justify exact typed projections.
JavaScript callers still may supply concrete symbol values.

### Runtime projections

The immutable relation also exposes frozen arrays:

- `states`: every distinct source or target identifier in the relation.
- `labels`: every distinct label in the relation.
- `targets(from, label)`: every distinct admissible target of that pair.

Membership in these projections follows the same SameValueZero relation as
`allows`. A pair with no edge has an empty target array. Projections expose
identifiers in first-occurrence order; order does not carry domain meaning.
They do not declare isolated states or select a transition. The state and
label arrays are non-empty in typed non-empty relations; target arrays may
always be empty, and their element type is `Next`.

## 4. Label preservation

Labels are part of relation identity. Equal source and target values do not
collapse distinct labels.

```ts
Protocol.define([
  ["ready", "retry", "ready"],
  ["ready", "refresh", "ready"],
] as const);
```

Both transitions remain distinct.

## 5. Snapshot stability

`Protocol.define` snapshots concrete declaration values. Later mutation of a
caller-owned JavaScript array cannot change the already-defined relation.

Typed declarations reject directly mutable outer arrays and inner triples.
TypeScript assertions, `any`, or separately mutable aliases remain part of the
package trust model rather than something erased static types can prove at
runtime.

## 6. Set semantics and equality

Duplicate triples do not change admissibility. Declaration order is not
semantic. Equal state/label projections alone do not determine equal edge
relations. Neither reachability nor reflexive/transitive closure is implied
by a single-step admissibility relation.

Runtime state and label identity follows JavaScript SameValueZero, matching
`Map` and `Set` key semantics. JavaScript runtime declarations can therefore
contain values such as `NaN`; TypeScript has no singleton `NaN` type, so such
values do not form exact typed relation members.

`-0` and `0` are not distinct Protocol identities because SameValueZero
treats them as equal.

## 7. Relational semantics

Protocol does not require determinism. The same `(from, label)` pair may
admit multiple targets.

```ts
const Routing = Protocol.define([
  ["open", "advance", "left"],
  ["open", "advance", "right"],
] as const);
```

Protocol also does not require totality. A source/label pair may have no target.

## 8. Execution independence

Protocol describes admissibility only. It does not choose a target, store
current state, dispatch events, execute effects, schedule timers, persist
state, retry, or orchestrate a workflow.

Variant may independently own an event vocabulary whose `tag` is used as a
Protocol label. The Variant payload and Protocol relation retain separate
meaning.

## 9. Freshness independence

An admissible triple does not prove that a persisted or concurrently observed
source state is still current.

```ts
if (
  OrderProtocol.allows(
    observedState,
    "pay",
    "paid",
  )
) {
  // A storage owner must still establish freshness
  // when applying a mutation.
}
```

Atomic mutation and concurrency checks remain application-owned.

A labeled trace is Protocol-valid exactly when every consecutive
`(state[i], label[i], state[i + 1])` triple is admissible.
