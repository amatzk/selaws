# Evidence law

Evidence answers:

```text
What stable fact is established about this scalar value?
```

Use Evidence when the application already has the right scalar value and must
record that a separate predicate has been established without replacing the
value's identity.

```ts
const NonEmpty = evidence.string(
  "NonEmpty",
  (value) => value.length > 0,
);

const checked = NonEmpty(userId);
```

Evidence applies to immutable scalar carriers, so aliasing cannot mutate the
underlying value after the fact is established.

## Named evidence

```ts
import { evidence } from "selaws/evidence";

const NonEmpty = evidence.string(
  "NonEmpty",
  (value) => value.length > 0,
);
```

A concrete literal name maps to
`~selaws.evidence:<Name>`. This Selaws-owned key keeps compatible producers
and duplicate Selaws installations structurally compatible.

Every Evidence factory has a predicate because evidence is introduced only
after the fact is established.

## Declaration-owned evidence

```ts
import {
  defineFact,
  type Evidence,
} from "selaws/evidence";

const nonEmptyKey: unique symbol =
  Symbol("NonEmpty");

type NonEmpty<T extends string> =
  Evidence<T, typeof nonEmptyKey>;

const NonEmpty = defineFact<string>()(
  nonEmptyKey,
  (establish) => ({
    check<T extends string>(value: T) {
      return value.length > 0
        ? establish(value)
        : undefined;
    },
  }),
);
```

A non-empty finite set of narrow symbol fact keys represents accumulated
declaration-owned evidence.

`defineFact` keeps the establishment operation private to the declaration
callback so the declaring module owns how the fact becomes available.

## Composition

Establishing evidence preserves identity and earlier evidence on the same
scalar.

```text
UserId
+ NonEmpty
+ Ascii
```

Identity and Evidence use distinct phantom categories. Reusing one symbol for
both categories does not make identity imply evidence.

`evidence.Proven<typeof Fact, Value>` expresses a named or declaration-owned
fact on an existing compatible scalar type when inference alone is not
sufficient.

## Transformation

Evidence applies to the scalar value that was established.

```ts
const checked = NonEmpty(userId);

if (checked !== undefined) {
  const trimmed = checked.trim();

  const checkedTrimmed =
    NonEmpty(trimmed);
}
```

An operation such as `.trim()` produces another scalar value. Relevant
evidence is established again on that new value.

Evidence does not claim mutable freshness, authorization, external provenance,
or facts about aggregate objects. Those meanings remain with owners that can
establish them.
