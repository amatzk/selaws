import assert from "node:assert/strict";
import test from "node:test";

import { defineFact, evidence } from "../dist/evidence.js";
import { defineIdentity, identity } from "../dist/identity.js";

test("identity formation is representation preserving", () => {
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

test("fact establishment is representation preserving", () => {
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

test("named facade domains form accepted values with one callable", () => {
  const RevisionId = identity.number("RevisionId");

  assert.equal(RevisionId(42), 42);
  assert.equal(RevisionId("42"), undefined);
});

test("checked facade domains return undefined when their predicate rejects", () => {
  const UserId = identity.string("UserId", (value) => value.startsWith("user_"));

  assert.equal(UserId("user_1"), "user_1");
  assert.equal(UserId("order_1"), undefined);
  assert.equal(UserId(42), undefined);
});

test("facade facts preserve representation and reject failed evidence", () => {
  const NonEmpty = evidence.string("NonEmpty", (value) => value.length > 0);

  assert.equal(NonEmpty("value"), "value");
  assert.equal(NonEmpty(""), undefined);
  assert.equal(NonEmpty(42), undefined);
});

test("strict facade keys do not add runtime wrappers", () => {
  const userIdKey = Symbol("UserId");
  const UserId = identity.string(userIdKey);

  const input = "user_1";
  const output = UserId(input);

  assert.equal(output, input);
  assert.equal(typeof output, "string");
});
