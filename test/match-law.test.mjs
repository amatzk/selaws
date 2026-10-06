import assert from "node:assert/strict";
import test from "node:test";

import { Option } from "../dist/option.js";
import { Result } from "../dist/result/index.js";
import { Validation } from "../dist/validation.js";
import { Variant } from "../dist/variant.js";

test("shared Match law selects one handler without supplying a receiver", () => {
  for (const [name, invoke, selectedKey, otherKey] of [
    ["Option", (arms) => Option.match(Option.some("option"), arms), "some", "none"],
    ["Result", (arms) => Result.match(Result.err("result"), arms), "err", "ok"],
    [
      "Validation",
      (arms) => Validation.match(Validation.invalid("validation"), arms),
      "invalid",
      "valid",
    ],
  ]) {
    let receiver = "unset";
    let selectedCalls = 0;
    let unselectedReads = 0;
    const arms = {};

    Object.defineProperty(arms, selectedKey, {
      enumerable: true,
      value: function (...args) {
        receiver = this;
        selectedCalls += 1;
        return args[0];
      },
    });
    Object.defineProperty(arms, otherKey, {
      enumerable: true,
      get() {
        unselectedReads += 1;
        throw new Error(`${name} read an unselected handler`);
      },
    });

    assert.doesNotThrow(() => invoke(arms), name);
    assert.equal(selectedCalls, 1, name);
    assert.equal(unselectedReads, 0, name);
    assert.equal(receiver, undefined, name);
  }

  const Family = Variant.define(Symbol("MatchReceiver"), [
    ["selected", Variant.payload()],
    ["other", Variant.unit],
  ]);

  let receiver = "unset";
  let selectedCalls = 0;
  let unselectedReads = 0;
  const handlers = {};

  Object.defineProperty(handlers, "selected", {
    enumerable: true,
    value: function (value) {
      receiver = this;
      selectedCalls += 1;
      return value;
    },
  });
  Object.defineProperty(handlers, "other", {
    enumerable: true,
    get() {
      unselectedReads += 1;
      throw new Error("Variant read an unselected handler");
    },
  });

  assert.equal(Family.match(Family.make.selected("variant"), handlers), "variant");
  assert.equal(selectedCalls, 1);
  assert.equal(unselectedReads, 0);
  assert.equal(receiver, undefined);
});

test("selected handler resolution remains owner-defined and abrupt", () => {
  for (const [name, invoke, selectedKey, otherKey] of [
    ["Option", (arms) => Option.match(Option.some(1), arms), "some", "none"],
    ["Result", (arms) => Result.match(Result.ok(1), arms), "ok", "err"],
    [
      "Validation",
      (arms) => Validation.match(Validation.valid(1), arms),
      "valid",
      "invalid",
    ],
  ]) {
    const selectedError = new Error(`${name} selected handler lookup`);
    let selectedReads = 0;
    let unselectedReads = 0;
    const arms = {};

    Object.defineProperty(arms, selectedKey, {
      get() {
        selectedReads += 1;
        throw selectedError;
      },
    });
    Object.defineProperty(arms, otherKey, {
      get() {
        unselectedReads += 1;
        throw new Error(`${name} read an unselected handler`);
      },
    });

    assert.throws(
      () => invoke(arms),
      (error) => error === selectedError,
    );
    assert.equal(selectedReads, 1, name);
    assert.equal(unselectedReads, 0, name);
  }

  const Family = Variant.define(Symbol("MatchAccessorBoundary"), [
    ["selected", Variant.payload()],
  ]);
  let selectedGetterCalls = 0;
  const handlers = {};

  Object.defineProperty(handlers, "selected", {
    get() {
      selectedGetterCalls += 1;
      return (value) => value;
    },
  });

  assert.throws(() => Family.match(Family.make.selected(1), handlers), /own function/);
  assert.equal(selectedGetterCalls, 0);
});

test("shared Match law preserves owner-defined branch payload and arity", () => {
  let optionNoneArguments = -1;
  assert.equal(
    Option.match(Option.none(), {
      some: () => "some",
      none(...args) {
        optionNoneArguments = args.length;
        return "none";
      },
    }),
    "none",
  );
  assert.equal(optionNoneArguments, 0);

  const resultError = { code: "result" };
  let seenResultError;
  assert.equal(
    Result.match(Result.err(resultError), {
      ok: () => 0,
      err(error) {
        seenResultError = error;
        return 1;
      },
    }),
    1,
  );
  assert.strictEqual(seenResultError, resultError);

  const validation = Validation.invalid("first", "second");
  let seenIssues;
  assert.equal(
    Validation.match(validation, {
      valid: () => 0,
      invalid(errors) {
        seenIssues = errors;
        return errors.length;
      },
    }),
    2,
  );
  assert.strictEqual(seenIssues, validation.errors);

  const Family = Variant.define(Symbol("MatchPayload"), [
    ["unitCase", Variant.unit],
    ["payloadCase", Variant.payload()],
  ]);

  let unitArguments = -1;
  assert.equal(
    Family.match(Family.make.unitCase(), {
      unitCase(...args) {
        unitArguments = args.length;
        return "unit";
      },
      payloadCase: () => "payload",
    }),
    "unit",
  );
  assert.equal(unitArguments, 0);

  const payload = { value: 1 };
  let seenPayload;
  assert.equal(
    Family.match(Family.make.payloadCase(payload), {
      unitCase: () => 0,
      payloadCase(value) {
        seenPayload = value;
        return 1;
      },
    }),
    1,
  );
  assert.strictEqual(seenPayload, payload);
});

test("shared Match law preserves selected handler completion", async () => {
  const thrown = new Error("match boom");

  assert.throws(
    () =>
      Option.match(Option.some(1), {
        some() {
          throw thrown;
        },
        none: () => 0,
      }),
    (error) => error === thrown,
  );

  assert.throws(
    () =>
      Result.match(Result.ok(1), {
        ok() {
          throw thrown;
        },
        err: () => 0,
      }),
    (error) => error === thrown,
  );

  assert.throws(
    () =>
      Validation.match(Validation.valid(1), {
        valid() {
          throw thrown;
        },
        invalid: () => 0,
      }),
    (error) => error === thrown,
  );

  const Family = Variant.define(Symbol("MatchCompletion"), [
    ["value", Variant.payload()],
  ]);
  assert.throws(
    () =>
      Family.match(Family.make.value(1), {
        value() {
          throw thrown;
        },
      }),
    (error) => error === thrown,
  );

  const optionPromise = Promise.resolve("option");
  const resultPromise = Promise.resolve("result");
  const validationPromise = Promise.resolve("validation");
  const variantPromise = Promise.resolve("variant");

  assert.strictEqual(
    Option.match(Option.some(1), {
      some: () => optionPromise,
      none: () => Promise.resolve("none"),
    }),
    optionPromise,
  );
  assert.strictEqual(
    Result.match(Result.ok(1), {
      ok: () => resultPromise,
      err: () => Promise.resolve("err"),
    }),
    resultPromise,
  );
  assert.strictEqual(
    Validation.match(Validation.valid(1), {
      valid: () => validationPromise,
      invalid: () => Promise.resolve("invalid"),
    }),
    validationPromise,
  );
  assert.strictEqual(
    Family.match(Family.make.value(1), {
      value: () => variantPromise,
    }),
    variantPromise,
  );

  assert.deepEqual(
    await Promise.all([
      optionPromise,
      resultPromise,
      validationPromise,
      variantPromise,
    ]),
    ["option", "result", "validation", "variant"],
  );
});

test("receiver-neutral Match preserves explicit JavaScript binding", () => {
  const receiver = { marker: "bound" };
  function boundHandler(value) {
    assert.strictEqual(this, receiver);
    return value;
  }
  const selected = boundHandler.bind(receiver);

  assert.equal(
    Option.match(Option.some("option"), {
      some: selected,
      none: () => "none",
    }),
    "option",
  );
  assert.equal(
    Result.match(Result.ok("result"), {
      ok: selected,
      err: () => "err",
    }),
    "result",
  );
  assert.equal(
    Validation.match(Validation.valid("validation"), {
      valid: selected,
      invalid: () => "invalid",
    }),
    "validation",
  );

  const Family = Variant.define(Symbol("BoundMatch"), [["value", Variant.payload()]]);
  assert.equal(
    Family.match(Family.make.value("variant"), {
      value: selected,
    }),
    "variant",
  );
});

test("Match returns arbitrary thenables unchanged", () => {
  const thenable = {};
  const thenKey = ["th", "en"].join("");
  Object.defineProperty(thenable, thenKey, {
    value() {
      throw new Error("Match must not inspect or await thenables");
    },
  });

  assert.strictEqual(
    Option.match(Option.some(1), {
      some: () => thenable,
      none: () => null,
    }),
    thenable,
  );
  assert.strictEqual(
    Result.match(Result.ok(1), {
      ok: () => thenable,
      err: () => null,
    }),
    thenable,
  );
  assert.strictEqual(
    Validation.match(Validation.valid(1), {
      valid: () => thenable,
      invalid: () => null,
    }),
    thenable,
  );

  const Family = Variant.define(Symbol("ThenableMatch"), [
    ["value", Variant.payload()],
  ]);
  assert.strictEqual(
    Family.match(Family.make.value(1), {
      value: () => thenable,
    }),
    thenable,
  );
});
