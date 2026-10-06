# Validation law

Validation represents valid data or a non-empty ordered issue collection.

Use Validation when multiple checks can be evaluated independently from values
that are already available and callers should receive every issue found in that
pass.

```ts
type ValidationIssues<E> =
  readonly [E, ...E[]];

type Validation<T, E> =
  | Readonly<{ valid: true; value: T }>
  | Readonly<{
      valid: false;
      issues: ValidationIssues<E>;
    }>;
```

## Non-empty invalidity

Every Invalid contains at least one issue. The constructor therefore requires
one first issue.

```ts
Validation.invalid(
  "name-required",
  "email-invalid",
);
```

There is no empty Invalid state.

## Independent accumulation

Validation accumulates issues only across inputs that are already independently
available.

```ts
const form = Validation.struct([
  ["name", validateName(raw.name)],
  ["email", validateEmail(raw.email)],
]);
```

`Validation.all` traverses tuple positions in order. Complete success
preserves the tuple shape. Failure concatenates every issue collection in input
order while retaining each collection's internal order and duplicates. Typed
input arrays must be readonly so array covariance cannot replace a Validation
with one carrying a different value or issue type before the call.

`Validation.struct` performs the analogous product for one finite readonly tuple
of readonly `[key, Validation]` entries. Keys are concrete string or symbol
identities. Complete success produces one ordinary data property per declared
key. Failure concatenates every issue collection in entry order while retaining
internal order and duplicates.

The typed grammar rejects directly mutable outer or inner tuples, duplicate
keys, broad string/symbol key spaces, and broad-length or union declarations
because those do not identify one exact stable keyed product. A readonly view
over separately mutable backing data remains subject to the TypeScript trust
model in [SEMANTICS.md](../SEMANTICS.md). Runtime JavaScript callers must supply one array of exact
pairs, unique string/symbol keys, and structural Validation values with own
branch fields. Large issue collections are accumulated iteratively.

Validation does not schedule checks and does not run dependent work whose input
does not yet exist.

## Match elimination

Validation's Match branch universe is exactly Valid and Invalid.

`Validation.match` conforms to the shared [Match law](./match.md). Valid
passes its value. Invalid passes the complete non-empty issue collection as one
handler payload; Match does not flatten or iterate that collection.

Typed elimination requires both branches even when the input is narrowed. The
selected handler must be an own data-function property, is invoked once without
a library-defined receiver, and preserves ordinary return, throw, or Promise
completion.

## Mapping and fallback

`map` transforms Valid.

`mapIssue` transforms each issue exactly once in order.

Side-effect-only observation stays in ordinary JavaScript branching over
`validation.valid`. Validation does not add observer callbacks whose only
result is the unchanged carrier.

`unwrapOr` and `unwrapOrElse` leave Validation through an explicit fallback.

## Target-owned conversions

`Validation.fromOption(option, onNone)` evaluates `onNone` only for None and
creates one issue.

`Validation.fromResult(result)` turns Err into exactly one issue. An array or
other aggregate Err value remains one issue value rather than being spread.

The reverse boundary is owned by Result:

```ts
const ready =
  Result.fromValidation(form);
```

That conversion carries Invalid's complete non-empty issue collection as one
Result issue value.
