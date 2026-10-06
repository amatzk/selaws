import assert from "node:assert/strict";
import test from "node:test";

import { Variant as RootVariant } from "../dist/index.js";
import { define, payload, shared, unit, Variant } from "../dist/variant.js";

test("root and focused facades share the Variant owner", () => {
  assert.strictEqual(RootVariant, Variant);
  assert.strictEqual(Variant.define, define);
  assert.strictEqual(Variant.payload, payload);
  assert.strictEqual(Variant.shared, shared);
  assert.strictEqual(Variant.unit, unit);
  assert.deepEqual(Object.keys(unit), []);
  assert.deepEqual(Object.keys(payload()), []);

  const Family = define(Symbol("ProjectionSurface"), [["ready", unit]]);
  assert.equal(Object.hasOwn(Family, "~selaws.variant.family"), false);
});

test("local and shared family APIs validate token kind", () => {
  assert.throws(
    () => define("example.variant/Message@1", [["ready", unit]]),
    /symbol token/,
  );
  assert.throws(() => shared(Symbol("Message"), [["ready", unit]]), /string contract/);

  const SharedA = shared("example.variant/Message@1", [["ready", unit]]);
  const SharedB = shared("example.variant/Message@1", [["ready", unit]]);
  assert.deepEqual(SharedA.make.ready(), SharedB.make.ready());
});

test("constructors preserve transparent tagged-data representation", () => {
  const Message = define(Symbol("Message"), [
    ["quit", unit],
    ["write", payload()],
    ["explicitUndefined", payload()],
  ]);

  assert.deepEqual(Message.make.quit(), { tag: "quit" });
  assert.deepEqual(Message.make.write("hello"), {
    tag: "write",
    value: "hello",
  });
  assert.deepEqual(Message.make.explicitUndefined(undefined), {
    tag: "explicitUndefined",
    value: undefined,
  });
});

test("match invokes exactly the declared case handler with declared arity", () => {
  const Message = define(Symbol("Message"), [
    ["quit", unit],
    ["write", payload()],
  ]);

  let quitCalls = 0;
  let writeCalls = 0;
  let quitArguments = -1;
  let writeArguments = -1;

  const quitResult = Message.match(Message.make.quit(), {
    quit(...args) {
      quitCalls += 1;
      quitArguments = args.length;
      return "quit";
    },
    write(value, ...rest) {
      writeCalls += 1;
      writeArguments = 1 + rest.length;
      return value;
    },
  });

  assert.equal(quitResult, "quit");
  assert.equal(quitCalls, 1);
  assert.equal(writeCalls, 0);
  assert.equal(quitArguments, 0);

  const writeResult = Message.match(Message.make.write("hello"), {
    quit() {
      quitCalls += 1;
      return "quit";
    },
    write(value, ...rest) {
      writeCalls += 1;
      writeArguments = 1 + rest.length;
      return value;
    },
  });

  assert.equal(writeResult, "hello");
  assert.equal(quitCalls, 1);
  assert.equal(writeCalls, 1);
  assert.equal(writeArguments, 1);
});

test("definition snapshots case entries and ignores later declaration mutation", () => {
  const cases = [
    ["first", unit],
    ["second", payload()],
  ];
  const Family = define(Symbol("Snapshot"), cases);

  cases[0][1] = payload();
  cases[1][0] = "renamed";
  cases.push(["third", unit]);

  assert.deepEqual(Family.make.first(), { tag: "first" });
  assert.deepEqual(Family.make.second(2), { tag: "second", value: 2 });
  assert.equal("renamed" in Family.make, false);
  assert.equal("third" in Family.make, false);
});

test("family and constructor namespace are immutable", () => {
  const Family = define(Symbol("Frozen"), [["ready", unit]]);

  assert.equal(Object.isFrozen(Family), true);
  assert.equal(Object.isFrozen(Family.make), true);
  assert.throws(() => {
    Family.make.ready = () => ({ tag: "wrong" });
  }, TypeError);
});

test("hostile but legal case names do not collide with family operations", () => {
  const Family = define(Symbol("Names"), [
    ["__proto__", unit],
    ["constructor", unit],
    ["make", unit],
    ["match", unit],
  ]);

  const protoConstructor = Reflect.get(Family.make, "__proto__");
  assert.equal(typeof protoConstructor, "function");
  assert.deepEqual(protoConstructor(), { tag: "__proto__" });
  assert.deepEqual(Family.make.constructor(), { tag: "constructor" });
  assert.deepEqual(Family.make.make(), { tag: "make" });
  assert.deepEqual(Family.make.match(), { tag: "match" });
});

test("definition rejects malformed, duplicate, non-string, and forged case entries", () => {
  assert.throws(() => define(Symbol("Null"), null), /arrays/);
  assert.throws(() => define(Symbol("Object"), {}), /arrays/);
  assert.throws(() => define(Symbol("MissingSpec"), [["ready"]]), /pairs/);
  assert.throws(
    () => define(Symbol("ExtraField"), [["ready", unit, "extra"]]),
    /pairs/,
  );
  assert.throws(() => define(Symbol("Sparse"), new Array(1)), /own case entries/);

  assert.throws(
    () =>
      define(Symbol("SymbolCase"), [
        [Symbol("hidden"), unit],
        ["ready", unit],
      ]),
    /case names must be strings/,
  );

  assert.throws(
    () =>
      define(Symbol("Duplicate"), [
        ["ready", unit],
        ["ready", payload()],
      ]),
    /case names must be unique/,
  );

  assert.throws(
    () => define(Symbol("Forged"), [["ready", {}]]),
    /Variant\.unit or Variant\.payload/,
  );

  const inheritedEntries = new Array(1);
  Object.setPrototypeOf(inheritedEntries, {
    0: ["ready", unit],
  });
  assert.throws(
    () => define(Symbol("InheritedEntry"), inheritedEntries),
    /own case entries/,
  );

  const inheritedPair = new Array(2);
  Object.setPrototypeOf(inheritedPair, {
    0: "ready",
    1: unit,
  });
  assert.throws(
    () => define(Symbol("InheritedPair"), [inheritedPair]),
    /own \[name, spec\] pairs/,
  );
});

test("match rejects undeclared tags and incomplete JavaScript handler objects", () => {
  const Family = define(Symbol("Family"), [
    ["ready", unit],
    ["value", payload()],
  ]);

  assert.throws(
    () => Family.match({ tag: "missing" }, { ready: () => 1, value: () => 2 }),
    /undeclared case tag/,
  );

  assert.throws(
    () =>
      Family.match(Object.create({ tag: "ready" }), {
        ready: () => 1,
        value: () => 2,
      }),
    /own data tag/,
  );

  const accessorTag = {};
  Object.defineProperty(accessorTag, "tag", {
    configurable: true,
    get() {
      return "ready";
    },
  });
  assert.throws(
    () => Family.match(accessorTag, { ready: () => 1, value: () => 2 }),
    /own data tag/,
  );

  assert.throws(
    () =>
      Family.match(Object.assign(Object.create({ value: 1 }), { tag: "value" }), {
        ready: () => 1,
        value: () => 2,
      }),
    /own data value/,
  );

  const accessorValue = { tag: "value" };
  Object.defineProperty(accessorValue, "value", {
    configurable: true,
    get() {
      return 1;
    },
  });
  assert.throws(
    () => Family.match(accessorValue, { ready: () => 1, value: () => 2 }),
    /own data value/,
  );

  assert.throws(
    () =>
      Family.match(Family.make.ready(), {
        value: () => 2,
      }),
    /own data function/,
  );

  const ConstructorCase = define(Symbol("ConstructorCase"), [
    ["constructor", unit],
    ["ready", unit],
  ]);

  assert.throws(
    () =>
      ConstructorCase.match(ConstructorCase.make.constructor(), {
        ready: () => 1,
      }),
    /own data function/,
  );

  const ProtoCase = define(Symbol("ProtoCase"), [
    ["__proto__", unit],
    ["ready", unit],
  ]);

  const protoCase = Reflect.get(ProtoCase.make, "__proto__");

  const ordinaryProtoHandlers = {
    __proto__: () => "prototype-setter",
    ready: () => "ready",
  };
  assert.equal(Object.hasOwn(ordinaryProtoHandlers, "__proto__"), false);
  assert.throws(
    () => ProtoCase.match(protoCase(), ordinaryProtoHandlers),
    /own data function/,
  );

  assert.equal(
    ProtoCase.match(protoCase(), {
      ["__proto__"]: () => "proto",
      ready: () => "ready",
    }),
    "proto",
  );

  assert.equal(
    ProtoCase.match(protoCase(), {
      __proto__() {
        return "method";
      },
      ready() {
        return "ready";
      },
    }),
    "method",
  );

  const inheritedValue = Object.getOwnPropertyDescriptor(Object.prototype, "value");
  let inheritedCalls = 0;
  Object.defineProperty(Object.prototype, "value", {
    configurable: true,
    value: () => {
      inheritedCalls += 1;
      return "polluted";
    },
  });
  try {
    const handlers = {};
    const handlerDescriptor = Object.assign(Object.create(null), {
      enumerable: true,
      get() {
        return () => "accessor";
      },
    });
    Object.defineProperty(handlers, "ready", handlerDescriptor);
    assert.throws(
      () => Family.match(Family.make.ready(), handlers),
      /own data function/,
    );
    assert.equal(inheritedCalls, 0);
  } finally {
    if (inheritedValue === undefined) {
      delete Object.prototype.value;
    } else {
      Object.defineProperty(Object.prototype, "value", inheritedValue);
    }
  }
});

test("match uses the declaration snapshot rather than value extra properties", () => {
  const Family = define(Symbol("Extra"), [
    ["unitCase", unit],
    ["payloadCase", payload()],
  ]);

  const unitWithExtraValue = {
    ...Family.make.unitCase(),
    value: "not-a-payload",
  };

  let argumentsSeen = -1;
  Family.match(unitWithExtraValue, {
    unitCase(...args) {
      argumentsSeen = args.length;
    },
    payloadCase() {},
  });

  assert.equal(argumentsSeen, 0);
});

test("handler throws and async returns keep native JavaScript completion", async () => {
  const Family = define(Symbol("Completion"), [
    ["unitCase", unit],
    ["payloadCase", payload()],
  ]);

  const thrown = new Error("boom");
  assert.throws(
    () =>
      Family.match(Family.make.unitCase(), {
        unitCase() {
          throw thrown;
        },
        payloadCase() {},
      }),
    (error) => error === thrown,
  );

  const promise = Family.match(Family.make.payloadCase(1), {
    unitCase: async () => 0,
    payloadCase: async (value) => value + 1,
  });
  assert.equal(await promise, 2);
});
