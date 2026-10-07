import assert from "node:assert/strict";
import test from "node:test";

import {
  all,
  andThen,
  attempt,
  attemptAsync,
  err,
  flatten,
  map,
  mapError,
  match,
  ok,
  orElse,
  orThrow,
  Result,
  unwrapOr,
  unwrapOrElse,
} from "../dist/result/index.js";

test("constructors produce structural, unfrozen data", () => {
  const success = ok(1);
  const failure = err("bad");

  assert.deepEqual(success, { ok: true, value: 1 });
  assert.deepEqual(failure, { error: "bad", ok: false });
  assert.equal(Object.isFrozen(success), false);
  assert.equal(Object.isFrozen(failure), false);
  assert.strictEqual(Result.ok, ok);
  assert.strictEqual(Result.err, err);
});

test("core algebra touches only the selected arm", () => {
  const success = ok(2);
  const failure = err("bad");

  assert.deepEqual(
    map(success, (value) => value * 3),
    ok(6),
  );
  assert.strictEqual(
    map(failure, () => 0),
    failure,
  );

  assert.strictEqual(
    mapError(success, () => "changed"),
    success,
  );
  assert.deepEqual(
    mapError(failure, (error) => error.length),
    err(3),
  );

  assert.deepEqual(
    andThen(success, (value) => ok(String(value))),
    ok("2"),
  );
  assert.strictEqual(
    andThen(failure, () => ok("unused")),
    failure,
  );

  assert.strictEqual(
    orElse(success, () => ok(0)),
    success,
  );
  assert.deepEqual(
    orElse(failure, () => ok(9)),
    ok(9),
  );

  assert.equal(
    match(success, {
      ok: (value) => value + 1,
      err: () => 0,
    }),
    3,
  );
  assert.equal(
    match(failure, {
      ok: () => 0,
      err: (error) => error.length,
    }),
    3,
  );

  assert.equal(unwrapOr(success, 7), 2);
  assert.equal(unwrapOr(failure, 7), 7);
  assert.equal(
    unwrapOrElse(success, () => 7),
    2,
  );
  assert.equal(
    unwrapOrElse(failure, (error) => error.length),
    3,
  );
});

test("core combinators never capture thrown exceptions", () => {
  const marker = new Error("marker");

  assert.throws(
    () =>
      map(ok(1), () => {
        throw marker;
      }),
    (caught) => caught === marker,
  );

  assert.throws(
    () =>
      mapError(err("bad"), () => {
        throw marker;
      }),
    (caught) => caught === marker,
  );
});

test("flatten is explicit and all is ordered fail-fast", () => {
  assert.deepEqual(flatten(ok(ok(1))), ok(1));
  assert.deepEqual(flatten(ok(err("inner"))), err("inner"));
  assert.deepEqual(flatten(err("outer")), err("outer"));

  const firstFailure = err({ kind: "first" });
  const secondFailure = err({ kind: "second" });

  assert.strictEqual(all([ok(1), firstFailure, secondFailure]), firstFailure);
  assert.deepEqual(all([ok(1), ok("two")]), ok([1, "two"]));
  assert.deepEqual(all([]), ok([]));

  const hostileResults = [ok(1), firstFailure];
  hostileResults[Symbol.iterator] = function* hostileIterator() {};
  assert.strictEqual(all(hostileResults), firstFailure);
});

test("attempt captures only its explicit abrupt boundary", () => {
  const thrown = new Error("boom");
  const captured = attempt(
    () => {
      throw thrown;
    },
    (caught) => ({ caught }),
  );

  assert.equal(captured.ok, false);
  assert.strictEqual(captured.error.caught, thrown);

  const nested = attempt(
    () => err("domain"),
    () => "thrown",
  );
  assert.deepEqual(nested, ok(err("domain")));

  const mapperFailure = new Error("mapper");
  assert.throws(
    () =>
      attempt(
        () => {
          throw thrown;
        },
        () => {
          throw mapperFailure;
        },
      ),
    (caught) => caught === mapperFailure,
  );

  let mapperCalls = 0;
  const thenKey = ["th", "en"].join("");
  assert.throws(
    () =>
      attempt(
        () => Promise.resolve(1),
        () => {
          mapperCalls += 1;
          return "mapped";
        },
      ),
    (caught) =>
      caught instanceof TypeError &&
      caught.message === "attempt() expects a synchronous thunk.",
  );
  assert.equal(mapperCalls, 0);

  const callableThen = {};
  Object.defineProperty(callableThen, thenKey, {
    configurable: true,
    value: () => 1,
  });
  assert.throws(
    () =>
      attempt(
        () => callableThen,
        () => {
          mapperCalls += 1;
          return "mapped";
        },
      ),
    (caught) =>
      caught instanceof TypeError &&
      caught.message === "attempt() expects a synchronous thunk.",
  );
  assert.equal(mapperCalls, 0);

  const callableFunctionThen = () => undefined;
  Object.defineProperty(callableFunctionThen, thenKey, {
    value: () => undefined,
  });
  assert.throws(
    () =>
      attempt(
        () => callableFunctionThen,
        () => {
          mapperCalls += 1;
          return "mapped";
        },
      ),
    (caught) =>
      caught instanceof TypeError &&
      caught.message === "attempt() expects a synchronous thunk.",
  );
  assert.equal(mapperCalls, 0);

  const proxyThenable = new Proxy(
    {},
    {
      get(target, key, receiver) {
        return key === thenKey ? () => undefined : Reflect.get(target, key, receiver);
      },
    },
  );
  assert.throws(
    () =>
      attempt(
        () => proxyThenable,
        () => {
          mapperCalls += 1;
          return "mapped";
        },
      ),
    (caught) =>
      caught instanceof TypeError &&
      caught.message === "attempt() expects a synchronous thunk.",
  );
  assert.equal(mapperCalls, 0);

  const observationMessage =
    "attempt() could not establish synchronous completion because reading the returned value's then property threw.";

  const ownGetterFailure = Symbol("own getter");
  let ownGetterReads = 0;
  const throwingOwnGetter = {};
  Object.defineProperty(throwingOwnGetter, thenKey, {
    get() {
      ownGetterReads += 1;
      throw ownGetterFailure;
    },
  });
  assert.throws(
    () =>
      attempt(
        () => throwingOwnGetter,
        () => {
          mapperCalls += 1;
          return "mapped";
        },
      ),
    (caught) =>
      caught instanceof TypeError &&
      caught.message === observationMessage &&
      caught.cause === ownGetterFailure,
  );
  assert.equal(ownGetterReads, 1);
  assert.equal(mapperCalls, 0);

  const inheritedGetterFailure = new Error("inherited getter");
  let inheritedGetterReads = 0;
  const inheritedGetterPrototype = {};
  Object.defineProperty(inheritedGetterPrototype, thenKey, {
    get() {
      inheritedGetterReads += 1;
      throw inheritedGetterFailure;
    },
  });
  const throwingInheritedGetter = Object.create(inheritedGetterPrototype);
  assert.throws(
    () =>
      attempt(
        () => throwingInheritedGetter,
        () => {
          mapperCalls += 1;
          return "mapped";
        },
      ),
    (caught) =>
      caught instanceof TypeError &&
      caught.message === observationMessage &&
      caught.cause === inheritedGetterFailure,
  );
  assert.equal(inheritedGetterReads, 1);
  assert.equal(mapperCalls, 0);

  const proxyGetFailure = new Error("proxy get");
  let proxyGetReads = 0;
  const throwingProxyGet = new Proxy(
    {},
    {
      get(target, key, receiver) {
        if (key === thenKey) {
          proxyGetReads += 1;
          throw proxyGetFailure;
        }
        return Reflect.get(target, key, receiver);
      },
    },
  );
  assert.throws(
    () =>
      attempt(
        () => throwingProxyGet,
        () => {
          mapperCalls += 1;
          return "mapped";
        },
      ),
    (caught) =>
      caught instanceof TypeError &&
      caught.message === observationMessage &&
      caught.cause === proxyGetFailure,
  );
  assert.equal(proxyGetReads, 1);
  assert.equal(mapperCalls, 0);

  let nonCallableReads = 0;
  const nonCallableAccessor = {};
  Object.defineProperty(nonCallableAccessor, thenKey, {
    get() {
      nonCallableReads += 1;
      return "not callable";
    },
  });
  const nonCallableResult = attempt(
    () => nonCallableAccessor,
    () => {
      mapperCalls += 1;
      return "mapped";
    },
  );
  assert.deepEqual(nonCallableResult, ok(nonCallableAccessor));
  assert.equal(nonCallableReads, 1);
  assert.equal(mapperCalls, 0);

  let changingReads = 0;
  const changingAccessor = {};
  Object.defineProperty(changingAccessor, thenKey, {
    get() {
      changingReads += 1;
      return changingReads === 1 ? undefined : () => undefined;
    },
  });
  const changingResult = attempt(
    () => changingAccessor,
    () => {
      mapperCalls += 1;
      return "mapped";
    },
  );
  assert.deepEqual(changingResult, ok(changingAccessor));
  assert.equal(changingReads, 1);
  assert.equal(typeof Reflect.get(changingAccessor, thenKey), "function");
  assert.equal(changingReads, 2);
  assert.equal(mapperCalls, 0);
});

test("attemptAsync captures invocation throws and Promise rejection", async () => {
  const syncThrown = new Error("sync");
  const rejected = new Error("rejected");

  assert.deepEqual(
    await attemptAsync(
      () => {
        throw syncThrown;
      },
      (caught) => (caught === syncThrown ? "sync" : "other"),
    ),
    err("sync"),
  );

  assert.deepEqual(
    await attemptAsync(
      () => Promise.reject(rejected),
      (caught) => (caught === rejected ? "rejected" : "other"),
    ),
    err("rejected"),
  );

  assert.deepEqual(
    await attemptAsync(
      async () => err("domain"),
      () => "thrown",
    ),
    ok(err("domain")),
  );

  const assimilationFailure = new Error("then getter");
  const thenKey = ["th", "en"].join("");
  let assimilationReads = 0;
  let mappedAssimilation = 0;
  const throwingThen = {};
  Object.defineProperty(throwingThen, thenKey, {
    get() {
      assimilationReads += 1;
      throw assimilationFailure;
    },
  });

  assert.deepEqual(
    await attemptAsync(
      () => throwingThen,
      (caught) => {
        assert.strictEqual(caught, assimilationFailure);
        mappedAssimilation += 1;
        return "assimilation";
      },
    ),
    err("assimilation"),
  );
  assert.equal(assimilationReads, 1);
  assert.equal(mappedAssimilation, 1);
});

test("orThrow is the explicit recoverable-to-abrupt adapter", () => {
  assert.equal(
    orThrow(ok(3), () => new Error("unused")),
    3,
  );

  const marker = new Error("mapped");
  assert.throws(
    () => orThrow(err("bad"), () => marker),
    (caught) => caught === marker,
  );
});
