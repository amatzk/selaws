# Option law

Option represents explicit presence or reasonless absence.

Use Option when callers only need to distinguish “a value exists” from “no
value exists”.

```ts
type Some<T> = Readonly<{
  some: true;
  value: T;
}>;

type None = Readonly<{
  some: false;
}>;

type Option<T> = Some<T> | None;
```

If the absent branch needs a diagnostic reason, use Result or a domain-specific
Variant instead of placing hidden meaning behind None.

## Presence

`Some(value)` means a value is present, including `undefined` or `null`
when explicitly wrapped. `None` carries no diagnostic reason.

Constructors preserve this distinction:

```text
some(undefined)           => Some(undefined)
fromUndefined(undefined)  => None
fromUndefined(null)       => Some(null)
fromNullable(undefined)   => None
fromNullable(null)        => None
```

Falsy values such as `0`, `false`, and `""` remain present.

```ts
const maybeName =
  Option.fromUndefined(row.name);

const label = Option.match(maybeName, {
  some: (name) => name,
  none: () => "Anonymous",
});
```

## Match elimination

Option's Match branch universe is exactly Some and None.

`Option.match` conforms to the shared [Match law](./match.md). Typed
elimination requires both branches even when the current input is narrowed.
Some passes its present value to the selected handler. None is nullary and
passes zero arguments.

Option owns the presence/absence meaning. Match owns the shared elimination
behavior: exactly one selected receiver-neutral callback runs, unselected
handlers are untouched, and the selected callback's ordinary JavaScript
completion is preserved.

## Composition

`map` transforms Some.

`andThen` sequences presence-dependent work.

`orElse` evaluates fallback only for None.

`flatten` removes one explicit nested Option layer.

`filter` keeps a present value only when its predicate accepts it.

`all` combines already-materialized Options. It preserves tuple position when
every input is Some; any None produces None. Typed input arrays must be readonly so array covariance cannot change element
meaning behind the static type before the call. Inline array literals infer
readonly tuples; broad `readonly Option<T>[]` inputs remain valid.

```ts
const pair = Option.all([
  maybeFirst,
  maybeLast,
] as const);
```

## Observation and projection

`inspect` synchronously observes Some and returns the original Option.
Promise-like observer completion is outside that synchronous contract.

`unwrapOr` and `unwrapOrElse` leave Option by choosing a fallback value.

`toUndefined` and `toNullable` leave Option by projecting None to a
conventional JavaScript sentinel.

These projections do not change the law of the Option value before the
boundary.
