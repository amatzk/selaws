# Protocol laws

Protocol owns one admissible labeled transition relation over
application-owned scalar state and label identifiers.

For a declaration `R`:

```text
R subset State x Label x State
```

`allows(from, label, to)` is true exactly when `(from, label, to)` is in that
relation.

Use Protocol when the application must state which labeled transitions are
admissible without also introducing a state-machine runtime.

```ts
const transitions = [
  ["pending", "pay", "paid"],
  ["pending", "cancel", "cancelled"],
  ["paid", "ship", "shipped"],
] as const;

const OrderProtocol =
  Protocol.define(transitions);
```

## 1. Application-owned identifiers

The application owns the meaning of state identifiers and transition labels.
Protocol receives scalar identifiers and does not construct domain states,
commands, events, or operations.

A Protocol declaration therefore does not define a complete state universe.
`States<Transitions>` contains states that occur in declared source or target
positions. A state with no declared edge is outside that projection unless the
application represents it elsewhere.

## 2. Label preservation

Labels are part of relation identity. Two declared transitions with the same
source and target but different labels remain distinct transitions.

```ts
Protocol.define([
  ["ready", "retry", "ready"],
  ["ready", "refresh", "ready"],
] as const);
```

`retry` and `refresh` remain separate even though their source and target are
the same.

## 3. Single relation

The same readonly transition declaration determines both the TypeScript
`Next<Transitions, From, Label>` projection and runtime
`allows(from, label, to)` membership. The typed declaration requires a readonly outer relation and readonly
transition triples, rejecting mutation through the declaration type itself.
A readonly view over separately mutable backing data remains subject to the
TypeScript trust model in [SEMANTICS.md](../SEMANTICS.md).

```ts
type AfterPay =
  Next<
    typeof transitions,
    "pending",
    "pay"
  >;
// "paid"

OrderProtocol.allows(
  "pending",
  "pay",
  "paid",
);
// true
```

`Next` is the static target projection.

`allows` returns the runtime membership boolean. It does not assert a
target-narrowing type predicate because broad or union source and label values
do not preserve the correlation required for that narrowing.

## 4. Snapshot stability

`Protocol.define` snapshots declaration values. Typed declarations use readonly
arrays and readonly triples. Runtime JavaScript callers may still pass ordinary
arrays; later mutation of those caller-owned arrays does not change the already
defined runtime relation.

## 5. Set semantics

Duplicate triples do not change admissibility. Declaration order is not
semantic.

## 6. Equality

Runtime state and label identity follows JavaScript SameValueZero, matching
`Map` and `Set` key semantics.

## 7. Relational semantics

Protocol does not require determinism. The same `(from, label)` pair may admit
multiple target states.

```ts
const Routing = Protocol.define([
  ["open", "advance", "left"],
  ["open", "advance", "right"],
] as const);
```

Both targets are admissible. Protocol does not choose one.

Protocol also does not require totality. A source/label pair may have no
declared target.

## 8. Execution independence

Protocol describes admissibility. It does not choose a target, store current
state, dispatch events, execute effects, schedule timers, persist state, retry,
or orchestrate a workflow.

Variant may independently own an event vocabulary whose `tag` is used as a
Protocol label. The Variant payload and the Protocol relation remain separate
meanings.

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
  // A storage owner must still establish
  // that observedState is current when writing.
}
```

Atomic mutation and concurrency checks remain application-owned.

A labeled trace is protocol-valid exactly when every
`(state[i], label[i], state[i + 1])` triple is admissible.
