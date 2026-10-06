import assert from "node:assert/strict";
import test from "node:test";

import { defineFact, evidence } from "../dist/evidence.js";
import { defineIdentity, identity } from "../dist/identity.js";

test("declaration-owned identity formation is representation preserving", () => {
  const userIdKey = Symbol("UserId");

  const UserId = defineIdentity()(userIdKey, (mint) => ({
    fromString(value) {
      return mint(value);
    },
  }));

  const input = "user-1";
  const output = UserId.fromString(input);

  assert.equal(output, input);
  assert.equal(typeof output, "string");
});

test("declaration-owned fact establishment is representation preserving", () => {
  const nonEmptyKey = Symbol("NonEmpty");

  const NonEmpty = defineFact()(nonEmptyKey, (establish) => ({
    check(value) {
      return value.length > 0 ? establish(value) : undefined;
    },
  }));

  assert.equal(NonEmpty.check("value"), "value");
  assert.equal(NonEmpty.check(""), undefined);
});

test("definition callbacks execute once and expose only their returned API", () => {
  const identityKey = Symbol("Example");
  let definitions = 0;

  const Example = defineIdentity()(identityKey, (mint) => {
    definitions += 1;

    return Object.freeze({
      create(value) {
        return mint(value);
      },
    });
  });

  assert.equal(definitions, 1);
  assert.deepEqual(Object.keys(Example), ["create"]);
  assert.equal(Example.create(42), 42);
});

test("local facade domains form accepted values without wrappers", () => {
  const revisionKey = Symbol("RevisionId");
  const RevisionId = identity.number(revisionKey);

  assert.equal(RevisionId(42), 42);
  assert.equal(RevisionId("42"), undefined);
  assert.equal(Object.hasOwn(RevisionId, "~selaws.identity.declaration"), false);
});

test("checked local facade domains return undefined when their predicate rejects", () => {
  const userIdKey = Symbol("UserId");
  const UserId = identity.string(userIdKey, (value) => value.startsWith("user_"));

  assert.equal(UserId("user_1"), "user_1");
  assert.equal(UserId("order_1"), undefined);
  assert.equal(UserId(42), undefined);
});

test("local facade facts preserve representation and reject failed evidence", () => {
  const nonEmptyKey = Symbol("NonEmpty");
  const NonEmpty = evidence.string(nonEmptyKey, (value) => value.length > 0);

  assert.equal(NonEmpty("value"), "value");
  assert.equal(NonEmpty(""), undefined);
  assert.equal(NonEmpty(42), undefined);
  assert.equal(Object.hasOwn(NonEmpty, "~selaws.evidence.declaration"), false);
});

test("shared facade contracts preserve transparent scalar representation", () => {
  const SharedUserId = identity.shared.string("example.domain/UserId@1");
  const SharedNonEmpty = evidence.shared.string(
    "example.fact/NonEmpty@1",
    (value) => value.length > 0,
  );

  const input = "user_1";
  assert.equal(SharedUserId(input), input);
  assert.equal(SharedNonEmpty(input), input);
});

test("local and shared factories reject the wrong runtime token kinds", () => {
  assert.throws(() => identity.string("example.domain/UserId@1"), /symbol token/);
  assert.throws(() => identity.shared.string(Symbol("UserId")), /string contract/);
  assert.throws(
    () => evidence.string("example.fact/NonEmpty@1", () => true),
    /symbol token/,
  );
  assert.throws(
    () => evidence.shared.string(Symbol("NonEmpty"), () => true),
    /string contract/,
  );
});

test("low-level declarations validate runtime grammar before callbacks", () => {
  let identityBuilds = 0;
  let evidenceBuilds = 0;

  assert.throws(
    () =>
      defineIdentity()("not-a-symbol", () => {
        identityBuilds += 1;
        return {};
      }),
    /symbol token/,
  );
  assert.equal(identityBuilds, 0);

  assert.throws(
    () =>
      defineFact()("not-a-symbol", () => {
        evidenceBuilds += 1;
        return {};
      }),
    /symbol token/,
  );
  assert.equal(evidenceBuilds, 0);

  assert.throws(
    () => defineIdentity()(Symbol("Identity"), null),
    /builders must be functions/,
  );
  assert.throws(
    () => defineFact()(Symbol("Evidence"), null),
    /builders must be functions/,
  );

  const IdentityApi = defineIdentity()(Symbol("IdentityValue"), (mint) => ({ mint }));
  const EvidenceApi = defineFact()(Symbol("EvidenceValue"), (establish) => ({
    establish,
  }));

  for (const scalar of ["value", 1, 1n, true, Symbol("value")]) {
    assert.strictEqual(IdentityApi.mint(scalar), scalar);
    assert.strictEqual(EvidenceApi.establish(scalar), scalar);
  }

  for (const nonScalar of [{}, [], () => 1, null, undefined]) {
    assert.throws(() => IdentityApi.mint(nonScalar), /must be scalars/);
    assert.throws(() => EvidenceApi.establish(nonScalar), /must be scalars/);
  }
});

test("identity and evidence predicates are validated at declaration time", () => {
  const idKey = Symbol("Checked");
  const factKey = Symbol("Fact");

  assert.throws(
    () => identity.string(idKey, "not-a-function"),
    /predicates must be functions/,
  );
  assert.throws(
    () => identity.shared.string("example.domain/Checked@1", 1),
    /predicates must be functions/,
  );
  assert.throws(() => evidence.string(factKey, null), /predicates must be functions/);
  assert.throws(
    () => evidence.shared.string("example.fact/Fact@1", {}),
    /predicates must be functions/,
  );
});
