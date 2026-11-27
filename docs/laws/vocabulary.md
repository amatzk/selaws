# Vocabulary law

Vocabulary owns exact membership in one finite scalar universe, together with
enumeration of the same immutable snapshot. It adds no nominal identity,
payload, transition, application validation issue, or domain ordering.

```ts
const Status = Vocabulary.define(["open", "closed"]);
type Status = (typeof Status.values)[number];

declare const input: unknown;
if (Status.has(input)) {
  const status: Status = input;
}
```

## Exact declaration and projection

The declaration is a finite readonly tuple of concrete scalar identities
(raw literal string, number, bigint or boolean). Broad scalar types, union-valued
members, alternative tuples, mutable tuples, open arrays, phantom-branded
members, enum members and symbol types cannot establish an exact typed vocabulary.
Unique-symbol types need not correspond to runtime singletons. JavaScript callers
may still supply concrete symbol values with SameValueZero membership. The empty vocabulary is valid.
The runtime boundary requires an array of own scalar positions and rejects
duplicate members using SameValueZero equality. Duplicate declarations that
type-check are still runtime declaration errors; the successful return is the
guarantee, not a promise that every typed call returns.

The immutable snapshot exposes only the declared positions as `values`,
in declaration order. That order is available for presentation; membership
does not depend on it. Later mutation of the source array cannot change the
snapshot. No application payload or external state is snapshotted.

## Membership

`has(value)` returns true exactly when one member of the snapshot is
SameValueZero-equal to the input. There is no coercion. SameValueZero membership is not substitutability under
every observation: `+0` and `-0` are equal for membership but distinguishable
by `Object.is` and reciprocal. Membership does not establish a predicate that
is not invariant under the declared equality. The predicate narrows
both the positive and negative branches under the ordinary TypeScript trust
model. The vocabulary type is invariant in its declaration; widening a set
of members would invalidate the negative branch. As with ordinary TypeScript
type guards, explicitly widening a detached predicate or forging a structural
contract is not a Selaws-supported proof.

The guarantee concerns scalar membership only. It does not establish a
nominal identity, authorization, a schema for a containing object, or the
validity of an external operation. Result/Validation errors and fallback
decisions belong to the consuming domain.

## Ownership

A Vocabulary is appropriate when an application owns a closed scalar universe
and must enumerate and recognize it from the same declaration. A single
native literal union or readonly tuple can be sufficient when no such
membership boundary is needed. Variant owns alternatives with payload
correlation; Protocol owns admissible labeled transitions. Neither should
be introduced solely to represent scalar vocabulary membership.
