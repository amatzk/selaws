# Evidence law

Evidence answers:

```text
What stable fact is established about this scalar value?
```

Use Evidence when the application already has the right scalar value and must
record that a separate predicate has been established without replacing the
value's identity.

```ts
const nonEmptyKey: unique symbol =
  Symbol("NonEmpty");

const NonEmpty = evidence.string(
  nonEmptyKey,
  (value) => value.length > 0,
);

const checked = NonEmpty(userId);
```

Evidence applies to immutable scalar carriers, so aliasing cannot mutate the
underlying value after the fact is established.

## Declaration-owned evidence

Declaration ownership is the default.

```ts
const nonEmptyKey: unique symbol =
  Symbol("NonEmpty");

const NonEmpty = evidence.string(
  nonEmptyKey,
  (value) => value.length > 0,
);
```

The fact token is the phantom property key.

```text
same symbol token       => same local fact identity
different symbol tokens => different local fact identities
same Symbol description => no compatibility by itself
```

Every Evidence factory requires a predicate because evidence is introduced only
after the fact is established.

For a custom establishment API, use `defineFact`:

```ts
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

`defineFact` keeps the establishment operation private to the declaration
callback so the declaring module owns how the fact becomes available.

## Explicit shared evidence

Intentional structural fact compatibility is an explicit opt-in:

```ts
const NonEmpty =
  evidence.shared.string(
    "example.fact/NonEmpty@1",
    (value) => value.length > 0,
  );
```

The structural phantom key is:

```text
~selaws.evidence:<Contract>
```

Choosing the same shared contract asserts interoperability. Selaws does not
compare two independent predicates and cannot establish that their business
meaning is equivalent.

See [Declaration compatibility](./declaration-compatibility.md).

## Composition

Establishing evidence preserves identity and earlier evidence on the same
scalar.

```text
UserId
+ NonEmpty
+ Ascii
```

Identity and Evidence use distinct phantom categories. Reusing one local symbol
for both categories does not make identity imply evidence. Likewise, equal
shared contract text in different categories does not merge those categories.

`evidence.Proven<typeof Fact, Value>` expresses a local or shared fact on an
existing compatible scalar type when inference alone is not sufficient.

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

Local factories require a symbol token. Shared factories require a string
contract. Predicates must be callable at declaration time.
