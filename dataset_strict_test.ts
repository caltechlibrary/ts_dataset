/**
 * dataset_strict_test.ts tests the strictStatus option of Dataset against a
 * real datasetd, in all four combinations of client mode and server mode
 * (ts_dataset DR-0001, dataset DR-0001). Each case starts its own datasetd on a
 * free port with a throwaway collection, see testutil.ts.
 *
 * Run with: deno task test
 */
import {
  assert,
  assertEquals,
  assertInstanceOf,
  assertRejects,
  assertStrictEquals,
} from "@std/assert";
import { Dataset, DatasetApiClient } from "./dataset.ts";
import { DatasetError } from "./datasetd_status.ts";
import { freePort, startDatasetd } from "./testutil.ts";

/** rejection runs fn, which must fail with a DatasetError, and returns it. */
async function rejection(fn: () => Promise<unknown>): Promise<DatasetError> {
  try {
    await fn();
  } catch (err) {
    assertInstanceOf(err, DatasetError);
    return err;
  }
  throw new Error("expected a DatasetError, nothing was thrown");
}

const first = { one: "first", two: 2 };
const second = { one: "second", two: 2 };

Deno.test("server off, client off: the 2.5.1 answers, falsy values and silent successes", async () => {
  const srv = await startDatasetd(false);
  try {
    const ds = new Dataset(srv.port, srv.collection);
    assertEquals(await ds.keys(), []);
    assertStrictEquals(await ds.create("a", first), true);
    // A repeated create overwrites silently and says true.
    assertStrictEquals(await ds.create("a", second), true);
    assertEquals(await ds.read("a"), second);
    // A missing key reads as an empty object, not as undefined.
    assertEquals(await ds.read("missing"), {});
    // Update and delete of a missing key say true and do nothing.
    assertStrictEquals(await ds.update("missing", first), true);
    assertEquals(await ds.keys(), ["a"]);
    assertStrictEquals(await ds.delete("missing"), true);
    // A query that cannot be answered is undefined; an empty answer is [].
    assertStrictEquals(await ds.query("nope", [], {}), undefined);
    assertEquals(await ds.query("by_key", ["key"], { key: "zzz" }), []);
    assertStrictEquals(await ds.checkStrict(), false);
  } finally {
    await srv.stop();
  }
});

Deno.test("server off, client on: failures throw, but a missing key still reads as {}", async () => {
  const srv = await startDatasetd(false);
  try {
    const ds = new Dataset(srv.port, srv.collection, { strictStatus: true });
    assertEquals(await ds.keys(), []);
    assertStrictEquals(await ds.create("a", first), true);
    assertEquals(await ds.read("a"), first);
    // The mismatch that misleads: the legacy server answers 200 {}.
    assertEquals(await ds.read("missing"), {});
    // Failures the legacy server does report still throw, with the reason.
    const err = await rejection(() => ds.query("nope", [], {}));
    assertStrictEquals(err.outcome, "invalid");
    assertStrictEquals(err.status, 400);
    assert(err.reason?.includes("is not defined"), `reason: ${err.reason}`);
    // checkStrict is how a strict client finds out, loudly.
    const mismatch = await rejection(() => ds.checkStrict());
    assertStrictEquals(mismatch.outcome, "unexpected");
    assert(
      mismatch.message.includes("strict_status"),
      `message: ${mismatch.message}`,
    );
  } finally {
    await srv.stop();
  }
});

Deno.test("server on, client off: strict answers read as failures, as failures always did", async () => {
  const srv = await startDatasetd(true);
  try {
    const ds = new Dataset(srv.port, srv.collection);
    assertEquals(await ds.keys(), []);
    assertStrictEquals(await ds.create("b", first), true);
    // A repeated create is refused by the server, so false, and nothing changed.
    assertStrictEquals(await ds.create("b", second), false);
    assertEquals(await ds.read("b"), first);
    assertStrictEquals(await ds.read("missing"), undefined);
    assertStrictEquals(await ds.update("missing", first), false);
    assertEquals(await ds.keys(), ["b"]);
    assertStrictEquals(await ds.delete("missing"), false);
    assertStrictEquals(await ds.query("nope", [], {}), undefined);
    assert(Array.isArray(await ds.query("list_item", [], {})));
    // Asking is allowed and does not throw when the client is not strict.
    assertStrictEquals(await ds.checkStrict(), true);
  } finally {
    await srv.stop();
  }
});

Deno.test("server on, client on: failures throw a DatasetError that says why", async () => {
  const srv = await startDatasetd(true);
  try {
    const ds = new Dataset(srv.port, srv.collection, { strictStatus: true });
    // [] means empty, nothing else.
    assertEquals(await ds.keys(), []);
    assertStrictEquals(await ds.read("missing"), undefined);
    assertStrictEquals(await ds.create("c", first), true);
    assertEquals(await ds.keys(), ["c"]);

    const conflict = await rejection(() => ds.create("c", second));
    assertStrictEquals(conflict.outcome, "conflict");
    assertStrictEquals(conflict.status, 409);
    assert(conflict.reason?.includes("already exists"), conflict.reason);
    assert(conflict.body.includes("conflict"), conflict.body);
    assertEquals(await ds.read("c"), first);

    assertStrictEquals(await ds.update("c", second), true);
    assertEquals(await ds.read("c"), second);
    const noUpdate = await rejection(() => ds.update("missing", first));
    assertStrictEquals(noUpdate.outcome, "not_found");
    assertStrictEquals(noUpdate.status, 404);
    assertEquals(await ds.keys(), ["c"]);

    const noDelete = await rejection(() => ds.delete("missing"));
    assertStrictEquals(noDelete.outcome, "not_found");
    assertStrictEquals(await ds.delete("c"), true);
    assertEquals(await ds.keys(), []);

    // Queries: a result is a list, an empty result is [], a failure throws.
    assertStrictEquals(await ds.create("d", first), true);
    assertEquals((await ds.query("list_item", [], {}) as unknown[]).length, 1);
    assertEquals(await ds.query("by_key", ["key"], { key: "zzz" }), []);
    const badParam = await rejection(() => ds.query("by_key", ["key"], {}));
    assertStrictEquals(badParam.outcome, "invalid");
    assertStrictEquals(badParam.status, 400);
    const noQuery = await rejection(() => ds.query("nope", [], {}));
    assertStrictEquals(noQuery.outcome, "not_found");
    assert(noQuery.reason?.includes("is not defined"), noQuery.reason);

    assertStrictEquals(await ds.checkStrict(), true);
  } finally {
    await srv.stop();
  }
});

Deno.test("DatasetApiClient answers with the raw Response in both modes", async () => {
  for (const serverStrict of [false, true]) {
    const srv = await startDatasetd(serverStrict);
    try {
      for (const clientStrict of [false, true]) {
        const raw = new DatasetApiClient(srv.port, srv.collection, {
          strictStatus: clientStrict,
        });
        assertStrictEquals(raw.strictStatus, clientStrict);
        const resp = await raw.read("missing");
        assertStrictEquals(resp.status, serverStrict ? 404 : 200);
        await resp.body?.cancel();
        // The check only reports; throwing on a mismatch is Dataset's job.
        assertStrictEquals(await raw.checkStrict(), serverStrict);
      }
    } finally {
      await srv.stop();
    }
  }
});

Deno.test("no answer at all: off rejects as before, on throws unavailable", async () => {
  const port = freePort();
  await assertRejects(() => new Dataset(port, "test.ds").keys(), TypeError);
  const err = await rejection(() =>
    new Dataset(port, "test.ds", { strictStatus: true }).keys()
  );
  assertStrictEquals(err.outcome, "unavailable");
  assertStrictEquals(err.status, undefined);
});

Deno.test("a collection datasetd does not serve: off says [] and undefined, on throws", async () => {
  for (const serverStrict of [false, true]) {
    const srv = await startDatasetd(serverStrict);
    try {
      const off = new Dataset(srv.port, "nope.ds");
      const on = new Dataset(srv.port, "nope.ds", { strictStatus: true });
      // As in 0.0.4: the failure is indistinguishable from empty.
      assertEquals(await off.keys(), []);
      assertStrictEquals(await off.read("k"), undefined);
      // Strict: the failure is thrown, and says which kind it is. A legacy
      // datasetd answers 403 for an unknown collection, a strict one 404.
      const keysErr = await rejection(() => on.keys());
      assertStrictEquals(
        keysErr.outcome,
        serverStrict ? "not_found" : "forbidden",
      );
      assertStrictEquals(keysErr.status, serverStrict ? 404 : 403);
      if (serverStrict) {
        // 404 is "no such record" to read(), whatever the cause, so it is
        // undefined here; keys() and the writes are what name the real cause.
        assertStrictEquals(await on.read("k"), undefined);
      } else {
        const readErr = await rejection(() => on.read("k"));
        assertStrictEquals(readErr.outcome, "forbidden");
      }
    } finally {
      await srv.stop();
    }
  }
});
