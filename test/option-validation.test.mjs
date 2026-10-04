import assert from "node:assert/strict";
import test from "node:test";

import { Option, Result, Validation } from "../dist/index.js";
import { err, ok } from "../dist/result/index.js";

test("Option constructors are structural ordinary data", () => {
  const present = Option.some(1);
  const absent = Option.none();

  assert.deepEqual(present, { some: true, value: 1 });
  assert.deepEqual(absent, { some: false });
  assert.equal(Object.isFrozen(present), false);
  assert.equal(Object.isFrozen(absent), false);
});

test("Option keeps Some(undefined) distinct from None", () => {
  assert.deepEqual(Option.some(undefined), {
    some: true,
    value: undefined,
  });
  assert.deepEqual(Option.fromUndefined(undefined), Option.none());
  assert.deepEqual(Option.fromUndefined(null), Option.some(null));
  assert.deepEqual(Option.fromNullable(null), Option.none());
  assert.deepEqual(Option.fromNullable(undefined), Option.none());
  assert.deepEqual(Option.fromNullable(0), Option.some(0));
  assert.deepEqual(Option.fromNullable(false), Option.some(false));
  assert.deepEqual(Option.fromNullable(""), Option.some(""));
});

test("Option algebra touches only the selected branch", () => {
  const present = Option.some(2);
  const absent = Option.none();

  assert.deepEqual(
    Option.map(present, (value) => value * 3),
    Option.some(6),
  );
  assert.strictEqual(
    Option.map(absent, () => assert.fail()),
    absent,
  );

  assert.deepEqual(
    Option.andThen(present, (value) => Option.some(String(value))),
    Option.some("2"),
  );
  assert.strictEqual(
    Option.andThen(absent, () => assert.fail()),
    absent,
  );

  assert.strictEqual(
    Option.orElse(present, () => Option.some(9)),
    present,
  );
  assert.deepEqual(
    Option.orElse(absent, () => Option.some(9)),
    Option.some(9),
  );

  assert.equal(
    Option.match(present, {
      some: (value) => value + 1,
      none: () => 0,
    }),
    3,
  );
  assert.equal(
    Option.match(absent, {
      some: () => 0,
      none: () => 4,
    }),
    4,
  );

  assert.strictEqual(
    Option.inspect(present, () => undefined),
    present,
  );
  assert.strictEqual(
    Option.inspect(absent, () => assert.fail()),
    absent,
  );

  assert.equal(Option.unwrapOr(present, 7), 2);
  assert.equal(Option.unwrapOr(absent, 7), 7);
  assert.equal(
    Option.unwrapOrElse(present, () => 7),
    2,
  );
  assert.equal(
    Option.unwrapOrElse(absent, () => 7),
    7,
  );
});

test("Option filter, flatten, all, and nullable exits preserve their laws", () => {
  const present = Option.some(2);
  const absent = Option.none();

  assert.strictEqual(
    Option.filter(present, (value) => value > 0),
    present,
  );
  assert.deepEqual(
    Option.filter(present, (value) => value < 0),
    absent,
  );
  assert.strictEqual(
    Option.filter(absent, () => assert.fail()),
    absent,
  );

  assert.deepEqual(Option.flatten(Option.some(Option.some(1))), Option.some(1));
  assert.deepEqual(Option.flatten(Option.some(absent)), absent);
  assert.strictEqual(Option.flatten(absent), absent);

  assert.deepEqual(
    Option.all([Option.some(1), Option.some("two")]),
    Option.some([1, "two"]),
  );
  assert.deepEqual(Option.all([Option.some(1), absent, Option.some(3)]), absent);
  assert.deepEqual(Option.all([]), Option.some([]));

  const hostileOptions = [Option.some(1), Option.some(2)];
  hostileOptions[Symbol.iterator] = function* hostileIterator() {};
  assert.deepEqual(Option.all(hostileOptions), Option.some([1, 2]));

  assert.equal(Option.toUndefined(Option.some(null)), null);
  assert.equal(Option.toUndefined(absent), undefined);
  assert.equal(Option.toNullable(Option.some(undefined)), undefined);
  assert.equal(Option.toNullable(absent), null);
});

test("Option and Validation observation reject Promise-like runtime completion", () => {
  assert.throws(
    () => Option.inspect(Option.some(1), () => Promise.resolve()),
    (caught) =>
      caught instanceof TypeError &&
      caught.message === "Option.inspect() expects a synchronous observer.",
  );

  const callableThen = {};
  Object.defineProperty(callableThen, ["th", "en"].join(""), {
    configurable: true,
    value: () => 1,
  });
  assert.throws(
    () => Option.inspect(Option.some(1), () => callableThen),
    (caught) =>
      caught instanceof TypeError &&
      caught.message === "Option.inspect() expects a synchronous observer.",
  );

  assert.throws(
    () => Validation.inspect(Validation.valid(1), () => Promise.resolve()),
    (caught) =>
      caught instanceof TypeError &&
      caught.message === "Validation.inspect() expects a synchronous observer.",
  );

  assert.throws(
    () => Validation.inspectErrors(Validation.invalid("bad"), () => Promise.resolve()),
    (caught) =>
      caught instanceof TypeError &&
      caught.message === "Validation.inspectErrors() expects a synchronous observer.",
  );

  const proxyThenable = new Proxy(
    {},
    {
      get(target, key, receiver) {
        return key === "then" ? () => undefined : Reflect.get(target, key, receiver);
      },
    },
  );

  assert.throws(
    () => Option.inspect(Option.some(1), () => proxyThenable),
    (caught) =>
      caught instanceof TypeError &&
      caught.message === "Option.inspect() expects a synchronous observer.",
  );
  assert.throws(
    () => Validation.inspect(Validation.valid(1), () => proxyThenable),
    (caught) =>
      caught instanceof TypeError &&
      caught.message === "Validation.inspect() expects a synchronous observer.",
  );
});

test("Option callbacks leave thrown exceptions abrupt", () => {
  const marker = new Error("option");

  assert.throws(
    () =>
      Option.map(Option.some(1), () => {
        throw marker;
      }),
    (caught) => caught === marker,
  );

  assert.throws(
    () =>
      Option.orElse(Option.none(), () => {
        throw marker;
      }),
    (caught) => caught === marker,
  );
});

test("Validation constructors keep Invalid non-empty structural data", () => {
  const success = Validation.valid(1);
  const failure = Validation.invalid("first", "second");

  assert.deepEqual(success, { valid: true, value: 1 });
  assert.deepEqual(failure, {
    errors: ["first", "second"],
    valid: false,
  });
  assert.equal(Object.isFrozen(success), false);
  assert.equal(Object.isFrozen(failure), false);
  assert.equal(Object.isFrozen(failure.errors), false);

  assert.throws(
    () => Validation.invalid(),
    (caught) =>
      caught instanceof TypeError &&
      caught.message === "Validation.invalid() expects at least one issue.",
  );
});

test("Validation maps values and each issue without changing issue order", () => {
  const success = Validation.valid(2);
  const failure = Validation.invalid("a", "bb");

  assert.deepEqual(
    Validation.map(success, (value) => value * 3),
    Validation.valid(6),
  );
  assert.strictEqual(
    Validation.map(failure, () => assert.fail()),
    failure,
  );

  const visited = [];
  assert.deepEqual(
    Validation.mapError(failure, (error) => {
      visited.push(error);
      return error.length;
    }),
    Validation.invalid(1, 2),
  );
  assert.deepEqual(visited, ["a", "bb"]);

  const hostileFailure = Validation.invalid("a", "b");
  hostileFailure.errors[Symbol.iterator] = function* hostileIterator() {};
  assert.deepEqual(
    Validation.mapError(hostileFailure, (error) => error.toUpperCase()),
    Validation.invalid("A", "B"),
  );

  const mutationSensitive = Validation.invalid("first", "second");
  assert.deepEqual(
    Validation.mapError(mutationSensitive, (error) => {
      if (error === "first") {
        mutationSensitive.errors.pop();
      }
      return error.toUpperCase();
    }),
    Validation.invalid("FIRST", "SECOND"),
  );

  assert.deepEqual(
    Validation.mapError(Validation.invalid("10", "10", "10"), parseInt),
    Validation.invalid(10, 10, 10),
  );

  assert.equal(
    Validation.match(success, {
      valid: (value) => value + 1,
      invalid: () => 0,
    }),
    3,
  );
  assert.equal(
    Validation.match(failure, {
      valid: () => 0,
      invalid: (errors) => errors.join(","),
    }),
    "a,bb",
  );
});

test("Validation all accumulates every issue in deterministic input order", () => {
  const result = Validation.all([
    Validation.invalid("a1", "a2"),
    Validation.valid(2),
    Validation.invalid("b1"),
    Validation.invalid("c1", "c2"),
  ]);

  assert.deepEqual(result, Validation.invalid("a1", "a2", "b1", "c1", "c2"));
  assert.deepEqual(
    Validation.all([Validation.valid(1), Validation.valid("two")]),
    Validation.valid([1, "two"]),
  );
  assert.deepEqual(Validation.all([]), Validation.valid([]));

  const hostileIssue = Validation.invalid("first", "second");
  hostileIssue.errors[Symbol.iterator] = function* hostileIssueIterator() {};
  const hostileValidations = [hostileIssue, Validation.valid(1)];
  hostileValidations[Symbol.iterator] = function* hostileOuterIterator() {};
  assert.deepEqual(
    Validation.all(hostileValidations),
    Validation.invalid("first", "second"),
  );
});

test("Validation struct preserves exact entry keys and order", () => {
  assert.deepEqual(
    Validation.struct([
      ["name", Validation.valid("alice")],
      ["age", Validation.valid(20)],
    ]),
    Validation.valid({ name: "alice", age: 20 }),
  );

  assert.deepEqual(
    Validation.struct([
      ["name", Validation.invalid("name-empty")],
      ["age", Validation.invalid("age-small", "age-range")],
      ["city", Validation.valid("Tokyo")],
    ]),
    Validation.invalid("name-empty", "age-small", "age-range"),
  );

  const symbolKey = Symbol("key");
  const symbolResult = Validation.struct([[symbolKey, Validation.valid(42)]]);
  assert.equal(symbolResult.valid, true);
  assert.equal(symbolResult.value[symbolKey], 42);

  const protoResult = Validation.struct([["__proto__", Validation.valid("literal")]]);
  assert.equal(protoResult.valid, true);
  assert.equal(Object.hasOwn(protoResult.value, "__proto__"), true);
  assert.equal(Reflect.get(protoResult.value, "__proto__"), "literal");

  assert.throws(() => Validation.struct(null), /array of entries/);
  assert.throws(
    () => Validation.struct({ value: Validation.valid(1) }),
    /array of entries/,
  );
  assert.throws(() => Validation.struct([["missing"]]), /\[key, Validation\] pairs/);
  assert.throws(
    () => Validation.struct([["extra", Validation.valid(1), "field"]]),
    /\[key, Validation\] pairs/,
  );
  assert.throws(
    () => Validation.struct([[1, Validation.valid(1)]]),
    /keys must be strings or symbols/,
  );
  assert.throws(
    () =>
      Validation.struct([
        ["same", Validation.valid(1)],
        ["same", Validation.valid(2)],
      ]),
    /keys must be unique/,
  );
  assert.throws(
    () => Validation.struct([["optional", undefined]]),
    /entry value to be a Validation/,
  );
  assert.throws(
    () => Validation.struct([["malformed", { errors: [], valid: false }]]),
    /entry value to be a Validation/,
  );

  const sparseErrors = new Array(1);
  assert.throws(
    () =>
      Validation.struct([["sparse-errors", { errors: sparseErrors, valid: false }]]),
    /entry value to be a Validation/,
  );

  const inheritedErrors = new Array(1);
  Object.setPrototypeOf(inheritedErrors, { 0: "polluted" });
  assert.throws(
    () =>
      Validation.struct([
        ["inherited-errors", { errors: inheritedErrors, valid: false }],
      ]),
    /entry value to be a Validation/,
  );

  const inheritedEntries = new Array(1);
  Object.setPrototypeOf(inheritedEntries, {
    0: ["value", Validation.valid(1)],
  });
  assert.throws(() => Validation.struct(inheritedEntries), /own entry positions/);

  const inheritedPair = new Array(2);
  Object.setPrototypeOf(inheritedPair, {
    0: "value",
    1: Validation.valid(1),
  });
  assert.throws(
    () => Validation.struct([inheritedPair]),
    /own \[key, Validation\] pairs/,
  );

  let errorReads = 0;
  const unstable = {
    valid: false,
    get errors() {
      errorReads += 1;
      return errorReads === 1 ? ["issue"] : [];
    },
  };
  assert.deepEqual(
    Validation.struct([["unstable", unstable]]),
    Validation.invalid("issue"),
  );
  assert.equal(errorReads, 1);

  let lengthReads = 0;
  const changingLength = new Proxy(["issue"], {
    get(target, key, receiver) {
      if (key === "length") {
        lengthReads += 1;
        return lengthReads === 1 ? 1 : 0;
      }
      return Reflect.get(target, key, receiver);
    },
  });
  assert.deepEqual(
    Validation.struct([
      [
        "changingLength",
        {
          errors: changingLength,
          valid: false,
        },
      ],
    ]),
    Validation.invalid("issue"),
  );
  assert.equal(lengthReads, 1);

  const hostileErrors = ["iterated"];
  hostileErrors[Symbol.iterator] = function* hostileIterator() {};
  assert.deepEqual(
    Validation.struct([
      [
        "hostile",
        {
          errors: hostileErrors,
          valid: false,
        },
      ],
    ]),
    Validation.invalid("iterated"),
  );

  const entries = [
    ["first", Validation.invalid("first")],
    ["second", Validation.invalid("second")],
  ];
  entries[Symbol.iterator] = function* hostileIterator() {};
  assert.deepEqual(Validation.struct(entries), Validation.invalid("first", "second"));

  const originalFromEntries = Object.fromEntries;
  let fromEntriesIndependent;
  Object.fromEntries = () => ({ forged: true });
  try {
    fromEntriesIndependent = Validation.struct([["value", Validation.valid(1)]]);
  } finally {
    Object.fromEntries = originalFromEntries;
  }
  assert.deepEqual(fromEntriesIndependent, Validation.valid({ value: 1 }));

  const pollutedKey = "__selaws_validation_struct_test__";
  let inheritedSetterCalls = 0;
  Object.defineProperty(Object.prototype, pollutedKey, {
    configurable: true,
    set() {
      inheritedSetterCalls += 1;
    },
  });
  let pollutionIndependent;
  try {
    pollutionIndependent = Validation.struct([[pollutedKey, Validation.valid(1)]]);
  } finally {
    delete Object.prototype[pollutedKey];
  }
  assert.equal(inheritedSetterCalls, 0);
  assert.deepEqual(pollutionIndependent, Validation.valid({ [pollutedKey]: 1 }));

  const oldValid = Object.getOwnPropertyDescriptor(Object.prototype, "valid");
  const oldErrors = Object.getOwnPropertyDescriptor(Object.prototype, "errors");
  Object.defineProperty(Object.prototype, "valid", {
    configurable: true,
    value: false,
  });
  Object.defineProperty(Object.prototype, "errors", {
    configurable: true,
    value: ["polluted"],
  });
  try {
    assert.throws(
      () => Validation.struct([["polluted", {}]]),
      /entry value to be a Validation/,
    );
  } finally {
    if (oldValid === undefined) {
      delete Object.prototype.valid;
    } else {
      Object.defineProperty(Object.prototype, "valid", oldValid);
    }
    if (oldErrors === undefined) {
      delete Object.prototype.errors;
    } else {
      Object.defineProperty(Object.prototype, "errors", oldErrors);
    }
  }

  assert.deepEqual(Validation.struct([]), Validation.valid({}));
});

test("Validation handles large issue collections without argument spreading", () => {
  const issues = Array.from({ length: 200_000 }, (_, index) => index);
  const failure = {
    errors: issues,
    valid: false,
  };

  const mapped = Validation.mapError(failure, (issue) => issue + 1);
  assert.equal(mapped.valid, false);
  assert.equal(mapped.errors.length, issues.length);
  assert.equal(mapped.errors[0], 1);
  assert.equal(mapped.errors.at(-1), issues.length);

  const combined = Validation.all([failure]);
  assert.equal(combined.valid, false);
  assert.equal(combined.errors.length, issues.length);
  assert.equal(combined.errors.at(-1), issues.at(-1));

  const record = Validation.struct([["field", failure]]);
  assert.equal(record.valid, false);
  assert.equal(record.errors.length, issues.length);
  assert.equal(record.errors.at(-1), issues.at(-1));
});

test("Validation observation and total elimination expose the whole error group", () => {
  const failure = Validation.invalid("a", "b");
  let observed;

  assert.strictEqual(
    Validation.inspectErrors(failure, (errors) => {
      observed = errors;
    }),
    failure,
  );
  assert.strictEqual(observed, failure.errors);

  assert.equal(Validation.unwrapOr(Validation.valid(2), 9), 2);
  assert.equal(Validation.unwrapOr(failure, 9), 9);
  assert.equal(
    Validation.unwrapOrElse(failure, (errors) => errors.length),
    2,
  );
});

test("Option, Validation, and Result conversions are explicit and lazy", () => {
  let calls = 0;
  const onNone = () => {
    calls += 1;
    return "missing";
  };

  assert.deepEqual(Result.fromOption(Option.some(1), onNone), ok(1));
  assert.equal(calls, 0);
  assert.deepEqual(Result.fromOption(Option.none(), onNone), err("missing"));
  assert.equal(calls, 1);

  assert.deepEqual(Validation.fromOption(Option.some(1), onNone), Validation.valid(1));
  assert.equal(calls, 1);
  assert.deepEqual(
    Validation.fromOption(Option.none(), onNone),
    Validation.invalid("missing"),
  );
  assert.equal(calls, 2);

  assert.deepEqual(Validation.fromResult(ok(1)), Validation.valid(1));
  assert.deepEqual(Validation.fromResult(err("bad")), Validation.invalid("bad"));

  const invalid = Validation.invalid("first", "second");
  const converted = Result.fromValidation(invalid);
  assert.equal(converted.ok, false);
  assert.strictEqual(converted.error, invalid.errors);

  assert.deepEqual(
    Validation.fromResult(err(["a", "b"])),
    Validation.invalid(["a", "b"]),
  );
});

test("Validation and conversion callbacks leave thrown exceptions abrupt", () => {
  const marker = new Error("validation");

  assert.throws(
    () =>
      Validation.mapError(Validation.invalid("bad"), () => {
        throw marker;
      }),
    (caught) => caught === marker,
  );

  assert.throws(
    () =>
      Validation.fromOption(Option.none(), () => {
        throw marker;
      }),
    (caught) => caught === marker,
  );

  assert.throws(
    () =>
      Result.fromOption(Option.none(), () => {
        throw marker;
      }),
    (caught) => caught === marker,
  );
});
