import assert from "node:assert/strict";
import test from "node:test";

import {
  evidence,
  identity,
  Option,
  Protocol,
  Result,
  Validation,
  Variant,
  Vocabulary,
} from "../dist/index.js";

// Exhaustive finite models, not a claim of proof for arbitrary JS functions.
// Equivalence here observes the transparent data, not object reference identity.
function* lists(values, length) {
  if (length === 0) {
    yield [];
    return;
  }
  for (const head of values) {
    for (const tail of lists(values, length - 1)) {
      yield [head, ...tail];
    }
  }
}

const bits = [0, 1];
const endofunctions = [...lists(bits, 2)].map((table) => (x) => table[x]);
const options = [Option.none(), ...bits.map(Option.some)];
const results = [...bits.map(Result.ok), Result.err("e1"), Result.err("e2")];
const validations = [
  ...bits.map(Validation.valid),
  Validation.invalid("e1"),
  Validation.invalid("e2"),
  Validation.invalid("e1", "e1"),
];

test("finite coproduct functor and dependent composition laws", () => {
  for (const [owner, values, pure] of [
    [Option, options, Option.some],
    [Result, results, Result.ok],
    [Validation, validations, Validation.valid],
  ]) {
    for (const value of values) {
      assert.deepEqual(
        owner.map(value, (x) => x),
        value,
      );
      for (const f of endofunctions) {
        for (const g of endofunctions) {
          assert.deepEqual(
            owner.map(owner.map(value, f), g),
            owner.map(value, (x) => g(f(x))),
          );
        }
      }
    }
    // Accumulating Validation intentionally has no dependent bind.
    if (owner === Validation) continue;
    const arrows = [...lists(values, 2)].map((table) => (x) => table[x]);
    for (const value of values) {
      assert.deepEqual(owner.andThen(value, pure), value);
      for (const f of arrows) {
        for (const x of bits) assert.deepEqual(owner.andThen(pure(x), f), f(x));
        for (const g of arrows) {
          assert.deepEqual(
            owner.andThen(owner.andThen(value, f), g),
            owner.andThen(value, (x) => owner.andThen(f(x), g)),
          );
        }
      }
    }
  }
});

test("independent products and ordered issue semigroup agree with finite reference models", () => {
  for (let length = 0; length <= 4; length += 1) {
    for (const xs of lists(options, length)) {
      const expected = xs.every((x) => x.some)
        ? { some: true, value: xs.map((x) => x.value) }
        : { some: false };
      assert.deepEqual(Option.all(xs), expected);
    }
    for (const xs of lists(results, length)) {
      const error = xs.find((x) => !x.ok);
      const actual = Result.all(xs);
      if (error) assert.strictEqual(actual, error);
      else assert.deepEqual(actual, { ok: true, value: xs.map((x) => x.value) });
    }
    for (const xs of lists(validations, length)) {
      const errors = xs.flatMap((x) => (x.valid ? [] : x.issues));
      const expected =
        errors.length === 0
          ? { valid: true, value: xs.map((x) => x.value) }
          : { valid: false, issues: errors };
      const actual = Validation.all(xs);
      assert.deepEqual(actual, expected);
      const entries = xs.map((x, i) => [String(i), x]);
      const product = Validation.struct(entries);
      assert.deepEqual(
        product,
        errors.length === 0
          ? {
              valid: true,
              value: Object.fromEntries(entries.map(([k, x]) => [k, x.value])),
            }
          : expected,
      );
      for (let split = 0; split <= xs.length; split += 1) {
        const grouped = Validation.map(
          Validation.all([
            Validation.all(xs.slice(0, split)),
            Validation.all(xs.slice(split)),
          ]),
          ([left, right]) => [...left, ...right],
        );
        assert.deepEqual(grouped, actual);
      }
      const rename = (e) => `mapped:${e}`;
      assert.deepEqual(
        Validation.mapIssue(actual, rename),
        Validation.all(xs.map((x) => Validation.mapIssue(x, rename))),
      );
    }
  }
  const a = Validation.invalid("a");
  const b = Validation.invalid("b");
  assert.notDeepEqual(Validation.all([a, b]), Validation.all([b, a]));
  assert.deepEqual(Validation.all([a, a]), Validation.invalid("a", "a"));
  assert.notDeepEqual(
    Result.all([Result.err("a"), Result.err("b")]),
    Result.all([Result.err("b"), Result.err("a")]),
  );
});

test("boundary conversions preserve their specified information, not an invented isomorphism", () => {
  for (const value of [...bits, undefined, null, false, "", NaN, -0]) {
    const present = Option.some(value);
    assert.deepEqual(
      Result.fromOption(present, () => assert.fail()),
      Result.ok(value),
    );
    assert.deepEqual(
      Validation.fromOption(present, () => assert.fail()),
      Validation.valid(value),
    );
  }
  const none = Option.none();
  assert.equal(Option.toUndefined(Option.some(undefined)), Option.toUndefined(none));
  assert.notDeepEqual(Option.some(undefined), none);
  for (const value of validations) {
    const converted = Result.fromValidation(value);
    if (value.valid) {
      assert.deepEqual(Validation.fromResult(converted), value);
    } else {
      assert.equal(converted.ok, false);
      assert.strictEqual(converted.error, value.issues);
      assert.deepEqual(
        Validation.fromResult(converted),
        Validation.invalid(value.issues),
      );
      assert.notDeepEqual(Validation.fromResult(converted), value);
    }
  }
});

test("every labeled relation over two states and two labels agrees with its edge-set model", () => {
  const states = ["a", "b"];
  const labels = ["x", "y"];
  const triples = states.flatMap((from) =>
    labels.flatMap((label) => states.map((to) => [from, label, to])),
  );
  for (let mask = 0; mask < 2 ** triples.length; mask += 1) {
    const edges = triples.filter((_, i) => (mask & (1 << i)) !== 0);
    const p = Protocol.define(edges);
    const permuted = Protocol.define([...edges].reverse().concat(edges));
    assert.deepEqual(
      [...p.states].sort(),
      states.filter((s) => edges.some(([f, , t]) => f === s || t === s)),
    );
    assert.deepEqual(
      [...p.labels].sort(),
      labels.filter((l) => edges.some(([, via]) => via === l)),
    );
    for (const from of states) {
      for (const label of labels) {
        const targets = states.filter((to) =>
          edges.some(([f, l, t]) => f === from && l === label && t === to),
        );
        assert.deepEqual([...p.targets(from, label)].sort(), targets);
        assert.deepEqual([...permuted.targets(from, label)].sort(), targets);
        for (const to of states) {
          assert.equal(p.allows(from, label, to), targets.includes(to));
          assert.equal(permuted.allows(from, label, to), targets.includes(to));
        }
      }
    }
  }
  // Equal vertex/label projections do not determine the edge relation.
  const left = Protocol.define([["a", "x", "b"]]);
  const right = Protocol.define([["b", "x", "a"]]);
  assert.deepEqual([...left.states].sort(), [...right.states].sort());
  assert.deepEqual(left.labels, right.labels);
  assert.equal(left.allows("a", "x", "b"), true);
  assert.equal(right.allows("a", "x", "b"), false);
});

test("finite vocabulary membership and scalar representation use different equality laws", () => {
  const symbol = Symbol("distinct");
  const representatives = [-0, NaN, 1, 1n, "1", true, symbol];
  const probes = [
    ...representatives,
    0,
    false,
    "",
    Infinity,
    -Infinity,
    undefined,
    null,
    Symbol("distinct"),
  ];
  const equal = (x, y) => x === y || (Object.is(x, NaN) && Object.is(y, NaN));
  for (let mask = 0; mask < 2 ** representatives.length; mask += 1) {
    const members = representatives.filter((_, i) => (mask & (1 << i)) !== 0);
    const set = Vocabulary.define(members);
    assert.deepEqual(set.values, members);
    for (const value of probes)
      assert.equal(
        set.has(value),
        members.some((x) => equal(x, value)),
      );
  }
  const NumberId = identity.number(Symbol("number"));
  const NegativeZero = evidence.number(Symbol("negative zero"), (value) =>
    Object.is(value, -0),
  );
  for (const value of [
    0,
    -0,
    NaN,
    Infinity,
    -Infinity,
    Number.MIN_VALUE,
    Number.MAX_VALUE,
    Number.MAX_SAFE_INTEGER,
  ]) {
    assert.equal(Object.is(NumberId(value), value), true);
  }
  assert.equal(Object.is(NegativeZero(-0), -0), true);
  assert.equal(NegativeZero(0), undefined);
  const zeros = Vocabulary.define([-0]);
  assert.equal(zeros.has(0), true);
  assert.notEqual(1 / 0, 1 / -0);
});

test("finite sum elimination preserves the exact selected injection and no other callback", () => {
  const Cases = Variant.structural([
    ["empty", Variant.unit],
    ["data", Variant.payload()],
    ["toString", Variant.unit],
  ]);
  for (const value of [
    Cases.make.empty(),
    Cases.make.data(undefined),
    Cases.make.data(-0),
    Cases.make.toString(),
  ]) {
    const called = [];
    const actual = Cases.match(value, {
      empty: (...args) => {
        called.push("empty");
        return args;
      },
      data: (...args) => {
        called.push("data");
        return args;
      },
      toString: (...args) => {
        called.push("toString");
        return args;
      },
    });
    assert.deepEqual(called, [value.tag]);
    assert.deepEqual(actual, value.tag === "data" ? [value.value] : []);
  }
});
