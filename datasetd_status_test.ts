/**
 * datasetd_status_test.ts tests the outcomes of datasetd's HTTP answers
 * (workspace DR-0020, ts_dataset DR-0001). It needs no running datasetd.
 */
import {
  assert,
  assertEquals,
  assertInstanceOf,
  assertStrictEquals,
} from "@std/assert";
import {
  DatasetError,
  datasetErrorFromResponse,
  outcomeFromStatus,
} from "./datasetd_status.ts";

Deno.test("outcomeFromStatus maps the DR-0020 table", () => {
  const table: [number, string][] = [
    [200, "ok"],
    [201, "created"],
    [202, "ok"],
    [204, "ok"],
    [303, "unexpected"],
    [400, "invalid"],
    [401, "unauthenticated"],
    [403, "forbidden"],
    [404, "not_found"],
    [405, "invalid"],
    [406, "invalid"],
    [409, "conflict"],
    [413, "too_large"],
    [415, "invalid"],
    [422, "invalid"],
    [429, "unavailable"],
    [500, "internal"],
    [502, "unavailable"],
    [503, "unavailable"],
    [504, "unavailable"],
    [599, "internal"],
  ];
  for (const [status, kind] of table) {
    assertStrictEquals(
      outcomeFromStatus(status).kind,
      kind,
      `status ${status} should be ${kind}`,
    );
  }
});

Deno.test("outcomeFromStatus carries the status, the reason and Retry-After", () => {
  const o = outcomeFromStatus(409, { reason: "already exists" });
  assertEquals(o, { kind: "conflict", status: 409, reason: "already exists" });
  assertStrictEquals(
    outcomeFromStatus(503, { retryAfter: "30" }).retryAfter,
    30,
  );
  // An HTTP date is not seconds; it is left out rather than guessed.
  assertStrictEquals(
    outcomeFromStatus(503, { retryAfter: "Fri, 13 Nov 2026 20:00:00 GMT" })
      .retryAfter,
    undefined,
  );
  // Retry-After means nothing on an answer that is not unavailable.
  assertStrictEquals(
    outcomeFromStatus(404, { retryAfter: "30" }).retryAfter,
    undefined,
  );
});

Deno.test("DatasetError is an Error that says what happened", () => {
  const err = new DatasetError(
    { kind: "not_found", status: 404, reason: "no record with key k1" },
    '{"error":{}}',
  );
  assertInstanceOf(err, Error);
  assertInstanceOf(err, DatasetError);
  assertStrictEquals(err.outcome, "not_found");
  assertStrictEquals(err.status, 404);
  assertStrictEquals(err.reason, "no record with key k1");
  assertStrictEquals(err.body, '{"error":{}}');
  assert(err.message.includes("not_found"), err.message);
  assert(err.message.includes("no record with key k1"), err.message);
});

Deno.test("datasetErrorFromResponse reads the strict JSON error body", async () => {
  const resp = new Response(
    JSON.stringify({
      error: { status: 409, outcome: "conflict", message: "key k1 exists" },
    }),
    { status: 409, headers: { "content-type": "application/json" } },
  );
  const err = await datasetErrorFromResponse(resp);
  assertStrictEquals(err.outcome, "conflict");
  assertStrictEquals(err.status, 409);
  assertStrictEquals(err.reason, "key k1 exists");
  assert(err.body.includes("conflict"), err.body);
});

Deno.test("datasetErrorFromResponse reads a plain text body as the reason", async () => {
  const resp = new Response(
    'Bad Request: query "nope" is not defined\n',
    { status: 400, headers: { "content-type": "text/plain; charset=utf-8" } },
  );
  const err = await datasetErrorFromResponse(resp);
  assertStrictEquals(err.outcome, "invalid");
  assertStrictEquals(err.status, 400);
  assertStrictEquals(err.reason, 'Bad Request: query "nope" is not defined');
});

Deno.test("datasetErrorFromResponse copes with no body and with Retry-After", async () => {
  const resp = new Response(null, {
    status: 503,
    headers: { "retry-after": "12" },
  });
  const err = await datasetErrorFromResponse(resp);
  assertStrictEquals(err.outcome, "unavailable");
  assertStrictEquals(err.retryAfter, 12);
  assertStrictEquals(err.reason, undefined);
  assertStrictEquals(err.body, "");
});
