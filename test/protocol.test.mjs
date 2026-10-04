import assert from "node:assert/strict";
import test from "node:test";

import { Protocol as RootProtocol } from "../dist/index.js";
import { define, Protocol } from "../dist/protocol.js";

test("root and focused Protocol facades share one owner", () => {
  assert.strictEqual(RootProtocol, Protocol);
  assert.strictEqual(Protocol.define, define);
});

test("allows exactly declared labeled transitions", () => {
  const protocol = define([
    ["pending", "pay", "paid"],
    ["pending", "cancel", "cancelled"],
    ["paid", "ship", "shipped"],
  ]);

  assert.equal(protocol.allows("pending", "pay", "paid"), true);
  assert.equal(protocol.allows("pending", "cancel", "cancelled"), true);
  assert.equal(protocol.allows("paid", "ship", "shipped"), true);
  assert.equal(protocol.allows("pending", "ship", "shipped"), false);
  assert.equal(protocol.allows("pending", "pay", "cancelled"), false);
});

test("transition labels preserve distinct meanings between the same state pair", () => {
  const protocol = define([
    ["ready", "retry", "ready"],
    ["ready", "refresh", "ready"],
  ]);

  assert.equal(protocol.allows("ready", "retry", "ready"), true);
  assert.equal(protocol.allows("ready", "refresh", "ready"), true);
  assert.equal(protocol.allows("ready", "missing", "ready"), false);
});

test("definition snapshots transition input", () => {
  const transitions = [["a", "go", "b"]];
  const protocol = define(transitions);

  transitions[0][2] = "c";
  transitions.push(["b", "go", "c"]);

  assert.equal(protocol.allows("a", "go", "b"), true);
  assert.equal(protocol.allows("a", "go", "c"), false);
  assert.equal(protocol.allows("b", "go", "c"), false);
});

test("duplicate triples do not change relation membership", () => {
  const protocol = define([
    ["a", "go", "b"],
    ["a", "go", "b"],
  ]);

  assert.equal(protocol.allows("a", "go", "b"), true);
});

test("definition uses array positions rather than a replaceable iterator", () => {
  const transitions = [
    ["a", "go", "b"],
    ["b", "go", "c"],
  ];
  transitions[Symbol.iterator] = function* hostileIterator() {
    yield transitions[0];
  };

  transitions[1][Symbol.iterator] = function* hostileTripleIterator() {
    yield "forged";
    yield "forged";
    yield "forged";
  };

  const protocol = define(transitions);

  assert.equal(protocol.allows("a", "go", "b"), true);
  assert.equal(protocol.allows("b", "go", "c"), true);
  assert.equal(protocol.allows("forged", "forged", "forged"), false);
});

test("the relation does not impose determinism", () => {
  const protocol = define([
    ["a", "go", "b"],
    ["a", "go", "c"],
  ]);

  assert.equal(protocol.allows("a", "go", "b"), true);
  assert.equal(protocol.allows("a", "go", "c"), true);
});

test("SameValueZero applies to state and label identity", () => {
  const protocol = define([[Number.NaN, Number.NaN, "observed"]]);

  assert.equal(protocol.allows(Number.NaN, Number.NaN, "observed"), true);
});

test("membership matches the declared relation across scalar identifier kinds", () => {
  const stateSymbol = Symbol("state");
  const labelSymbol = Symbol("label");
  const transitions = [
    ["a", "go", "b"],
    [1, true, 2],
    [Number.NaN, Number.NaN, "nan"],
    [stateSymbol, labelSymbol, stateSymbol],
    [-0, "zero", 0],
  ];
  const protocol = define(transitions);
  const states = ["a", "b", 1, 2, Number.NaN, "nan", stateSymbol, -0, 0];
  const labels = ["go", true, Number.NaN, labelSymbol, "zero"];

  const sameValueZero = (left, right) =>
    left === right || (Number.isNaN(left) && Number.isNaN(right));

  for (const from of states) {
    for (const label of labels) {
      for (const to of states) {
        const expected = transitions.some(
          ([declaredFrom, declaredLabel, declaredTo]) =>
            sameValueZero(declaredFrom, from) &&
            sameValueZero(declaredLabel, label) &&
            sameValueZero(declaredTo, to),
        );

        assert.equal(protocol.allows(from, label, to), expected);
      }
    }
  }
});

test("runtime JavaScript callers must provide an array of exact triples", () => {
  assert.throws(() => define(null), /declarations must be arrays/);
  assert.throws(() => define([["a", "b"]]), /triples/);
  assert.throws(() => define([["a", "go", "b", "extra"]]), /triples/);

  const saved = [0, 1, 2].map((index) =>
    Object.getOwnPropertyDescriptor(Array.prototype, index),
  );

  try {
    Object.defineProperty(Array.prototype, 0, {
      configurable: true,
      value: "a",
      writable: true,
    });
    Object.defineProperty(Array.prototype, 1, {
      configurable: true,
      value: "go",
      writable: true,
    });
    Object.defineProperty(Array.prototype, 2, {
      configurable: true,
      value: "b",
      writable: true,
    });

    assert.throws(() => define(new Array(1)), /own transition entries/);
    assert.throws(() => define([new Array(3)]), /own \[from, label, to\] triples/);
  } finally {
    for (let index = 0; index < saved.length; index += 1) {
      const descriptor = saved[index];
      if (descriptor === undefined) {
        delete Array.prototype[index];
      } else {
        Object.defineProperty(Array.prototype, index, descriptor);
      }
    }
  }
});

test("runtime JavaScript callers cannot declare aggregate identifiers", () => {
  assert.throws(() => define([[{}, "go", "next"]]), /scalar identifiers/);
  assert.throws(() => define([["current", {}, "next"]]), /scalar identifiers/);
  assert.throws(() => define([["current", "go", {}]]), /scalar identifiers/);
});
