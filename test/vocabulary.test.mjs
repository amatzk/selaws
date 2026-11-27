import assert from "node:assert/strict";
import test from "node:test";
import { Vocabulary as Root } from "../dist/index.js";
import { define, Vocabulary } from "../dist/vocabulary.js";

test("one snapshot owns membership and immutable enumeration", () => {
  const input = ["a", "b"];
  const v = define(input);
  input[0] = "changed";
  assert.deepEqual(v.values, ["a", "b"]);
  assert.equal(v.has("a"), true);
  assert.equal(v.has("changed"), false);
  assert.equal(v.has({ value: "a" }), false);
  assert.equal(Object.isFrozen(v), true);
  assert.throws(() => v.values.push("extra"), TypeError);
  assert.strictEqual(Root, Vocabulary);
  assert.strictEqual(Vocabulary.define, define);
});

test("membership is SameValueZero, not coercion, and permits the empty vocabulary", () => {
  const key = Symbol("key");
  const v = define([0, NaN, 1n, true, "1", key]);
  for (const item of v.values) assert.equal(v.has(item), true);
  assert.equal(v.has(-0), true);
  assert.equal(v.has(Number.NaN), true);
  assert.equal(v.has(1), false);
  assert.equal(v.has(Symbol("key")), false);
  assert.equal(v.has(false), false);
  assert.deepEqual(define([]).values, []);
  assert.equal(define([]).has(undefined), false);
  assert.throws(() => define([0, -0]), /unique/);
  assert.throws(() => define([NaN, NaN]), /unique/);
});

test("declaration validation is based on own positions, not a replaceable iterator", () => {
  const entries = ["a", "b"];
  entries[Symbol.iterator] = function* () {
    yield "forged";
  };
  const v = define(entries);
  assert.deepEqual(v.values, ["a", "b"]);
  assert.equal(v.has("forged"), false);
  assert.throws(() => define(null), /arrays/);
  assert.throws(() => define(new Array(1)), /own members/);
  assert.throws(() => define([{}]), /scalar/);
  assert.throws(() => define([null]), /scalar/);
});
