# Selaws contributor contract

Selaws is one distribution package for independent semantic primitives.

Current semantic owners:

| Owner | Responsibility |
| --- | --- |
| Identity | scalar domain identity and its formation |
| Evidence | stable facts on the same scalar and their establishment |
| Protocol | admissible labeled transitions over application-owned scalar identifiers |
| Variant | exact closed labeled alternatives and their correlated payloads |
| Option | explicit presence or reasonless absence |
| Validation | non-empty issue accumulation across independent inputs |
| Result | recoverable fail-fast success/error data and its control boundaries |

Read `README.md`, `docs/SEMANTICS.md`, `docs/API.md`, `docs/GUIDE.md`, and the
affected owner or shared law before changing a public contract.

Match is a first-class shared elimination law across Option, Result, Validation,
and Variant. It is not an eighth semantic owner. Its public realizations stay
on the owning surfaces: `Option.match`, `Result.match`, `Validation.match`,
and `VariantFamily.match`.

## Ownership rules

- Keep each public operation at the owner whose meaning it introduces or
  transforms.
- Local Identity, Evidence, and Variant declarations are symbol-owned by
  default. Structural cross-package compatibility must be an explicit shared
  contract through `identity.shared`, `evidence.shared`, or `Variant.shared`;
  display-name coincidence is not semantic authority.
- Scalar formation stays with Identity or Evidence; Variant owns formation for
  its declared alternatives.
- Protocol owns one exact finite typed relation: finite readonly declaration,
  readonly triples, and concrete scalar members. Broad relation/member types do
  not acquire exact Protocol meaning.
- Protocol owns relation membership, not current state, target selection,
  dispatch, effects, persistence, freshness, or concurrency control.
- Result capture and recoverable-to-abrupt conversion stay under Result;
  asynchronous scheduling and control flow remain native JavaScript concerns.
- Shared implementation mechanisms in `src/internal` carry no public semantic
  authority.
- Keep Protocol independent from Identity, Evidence, Variant, Option,
  Validation, and Result.
- Keep Variant independent from Protocol, Option, Validation, and Result.
- Keep Identity/Evidence independent from Variant/Option/Validation/Result.
- Keep target-owned Result/Validation conversions explicit.
- A shared law may constrain several owners without creating a new owner,
  runtime dispatcher, carrier, or package subpath.
- Match implementations must preserve typed totality, selected-only invocation,
  owner-defined payload correlation, receiver neutrality, and ordinary
  JavaScript completion.
- Keep owner-specific runtime validation with the owner that can establish it;
  Variant family validation stays in Variant.
- Prefer semantic duplication over a shared implementation abstraction that
  would couple independent laws. Shared conformance tests may enforce a common
  law across owner-local implementations.

A useful composition does not imply a merged owner. For example, a Variant may
be the error type carried by Result, or a Variant tag may be used as a Protocol
label. The consumer-facing code may compose both meanings while each law stays
with its original owner.

## Public surface

The root exposes owner facades and principal carrier types. Generic operation
names belong to focused subpaths:

```text
selaws/identity
selaws/evidence
selaws/protocol
selaws/variant
selaws/option
selaws/validation
selaws/result
```

A new subpath requires an independently closable semantic responsibility.
A cross-owner law does not satisfy that condition merely because several
owners implement it. In particular, Match creates neither a root export nor a
`selaws/match` entry point.

Prefer a small public grammar whose operation names reveal the owner. Do not add
aliases only to imitate another library or to shorten a call by one token when
the alias creates another concept users and tools must reconstruct.

## Documentation ownership

Keep the document layers distinct:

| Document | Responsibility |
| --- | --- |
| `README.md` | first-use orientation and representative code |
| `docs/GUIDE.md` | practical design choices and owner composition |
| `docs/API.md` | searchable public export/reference surface |
| `docs/SEMANTICS.md` | package-wide normative laws and owner boundaries |
| `docs/laws/*.md` | normative owner laws and first-class shared laws |
| `AGENTS.md` | contributor behavior and repository contract |

Documentation examples must be realizable by the current public API. Examples
may omit application-specific implementations such as repositories or decoders,
but they must not imply Selaws owns those omitted responsibilities.

When documentation changes wording around a public guarantee, check both
directions:

1. every existing material guarantee still appears somewhere that owns it;
2. every new guarantee in the text is supported by implementation, tests, or a
   normative owner/shared law.

Shared laws must identify which owners conform, which meaning remains
owner-specific, and whether conformance belongs in common tests rather than a
shared production helper.

Do not turn a tutorial convenience into normative law. Do not weaken a law
merely to make an example shorter.

Prefer concrete TypeScript over abstract prose when code can demonstrate the
same public behavior without hiding an important boundary. Keep normative
documents compact enough that the actual law remains easy to identify.

## Verification

Before committing ordinary changes:

```sh
pnpm check
```

For distribution-affecting changes, pack the artifact and run the isolated
consumer verifier. `prepack` already owns the normal check:

```sh
mkdir -p .pack
pnpm pack --out .pack/selaws.tgz
node scripts/verify-package.mjs
```

For documentation changes, also review code examples against the current
exports and run:

```sh
git diff --check
```

Keep source free of formatter/linter/type-check suppression comments.
