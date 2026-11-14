/**
 * datasetd_status.ts turns an HTTP answer from datasetd into an outcome,
 * following the workspace convention of DR-0020 (ts_dataset DR-0001). Callers
 * match on the outcome and never on a bare status number. It mirrors
 * tms/datasetd_status.ts.
 */

/** OutcomeKind names what an answer means. */
export type OutcomeKind =
  | "ok"
  | "created"
  | "not_found"
  | "conflict"
  | "invalid"
  | "too_large"
  | "unauthenticated"
  | "forbidden"
  | "unavailable"
  | "internal"
  | "unexpected";

/** Outcome is an answer read as a meaning. */
export interface Outcome {
  /** kind is the meaning. */
  kind: OutcomeKind;
  /** status is the HTTP status it came from, when there was one. */
  status?: number;
  /** reason is why the request failed, when the service said. */
  reason?: string;
  /** retryAfter is the seconds to wait, for an unavailable outcome that said. */
  retryAfter?: number;
}

/** outcomeFromStatus reads an HTTP status as an outcome, by the table of
 * DR-0020: 404 is not found, 409 is conflict, 400, 405, 406, 415 and 422 are
 * invalid, 413 is too large, 429 and 502 to 504 are unavailable, 500 is
 * internal, and so on. 406 is invalid because datasetd without `strict_status`
 * answers malformed input with it.
 *
 * @param status {number} the HTTP status
 * @param extra {{ reason?: string; retryAfter?: string | null }} the reason the service gave, and its Retry-After header
 * @returns {Outcome} the outcome
 * @example
 * outcomeFromStatus(409).kind; // "conflict"
 */
export function outcomeFromStatus(
  status: number,
  extra: { reason?: string; retryAfter?: string | null } = {},
): Outcome {
  let kind: OutcomeKind;
  switch (status) {
    case 200:
    case 202:
    case 204:
      kind = "ok";
      break;
    case 201:
      kind = "created";
      break;
    case 401:
      kind = "unauthenticated";
      break;
    case 403:
      kind = "forbidden";
      break;
    case 404:
      kind = "not_found";
      break;
    case 409:
      kind = "conflict";
      break;
    case 413:
      kind = "too_large";
      break;
    case 429:
    case 502:
    case 503:
    case 504:
      kind = "unavailable";
      break;
    case 500:
      kind = "internal";
      break;
    default:
      if (status >= 200 && status < 300) kind = "ok";
      else if (status >= 400 && status < 500) kind = "invalid";
      else if (status >= 500 && status < 600) kind = "internal";
      else kind = "unexpected";
  }
  const o: Outcome = { kind, status };
  if (extra.reason !== undefined && extra.reason !== "") {
    o.reason = extra.reason;
  }
  if (kind === "unavailable" && extra.retryAfter != null) {
    if (/^\d+$/.test(extra.retryAfter.trim())) {
      o.retryAfter = Number(extra.retryAfter.trim());
    }
  }
  return o;
}

/** DatasetError is what the strict mode of Dataset throws when datasetd did
 * not do what was asked. It says what happened (outcome), the HTTP status when
 * there was one, the reason the service gave and the whole response body.
 *
 * @example
 * try {
 *   await ds.create("k1", { one: 1 });
 * } catch (err) {
 *   if (err instanceof DatasetError && err.outcome === "conflict") {
 *     // k1 exists; datasetd wrote nothing
 *   }
 * }
 */
export class DatasetError extends Error {
  /** outcome is what the answer means, e.g. "conflict". */
  outcome: OutcomeKind;
  /** status is the HTTP status, absent when there was no answer at all. */
  status?: number;
  /** reason is why the request failed, when the service said. */
  reason?: string;
  /** retryAfter is the seconds to wait, for an unavailable outcome that said. */
  retryAfter?: number;
  /** body is the response body, "" when there was none. */
  body: string;

  /** constructor builds the error from an outcome.
   *
   * @param outcome {Outcome} what the answer means
   * @param body {string} the response body, "" by default
   * @example
   * throw new DatasetError({ kind: "not_found", status: 404 });
   */
  constructor(outcome: Outcome, body = "") {
    const detail = outcome.reason ??
      (outcome.status !== undefined ? `HTTP ${outcome.status}` : "no answer");
    super(`${outcome.kind}: ${detail}`);
    this.name = "DatasetError";
    this.outcome = outcome.kind;
    this.status = outcome.status;
    this.reason = outcome.reason;
    this.retryAfter = outcome.retryAfter;
    this.body = body;
  }
}

/** datasetErrorFromResponse reads a failed response, once, into a
 * DatasetError. The reason is the `message` of a strict datasetd JSON error
 * body (`{"error": {"status", "outcome", "message"}}`), or else the plain text
 * body, trimmed. The body is consumed, so a caller must not read it again.
 *
 * @param resp {Response} the response that was not a success
 * @returns {Promise<DatasetError>} the error, ready to throw
 * @example
 * if (!resp.ok) throw await datasetErrorFromResponse(resp);
 */
export async function datasetErrorFromResponse(
  resp: Response,
): Promise<DatasetError> {
  let body = "";
  try {
    body = await resp.text();
  } catch (_err) {
    body = "";
  }
  let reason: string | undefined;
  const trimmed = body.trim();
  if (trimmed !== "") {
    reason = trimmed;
    try {
      const parsed = JSON.parse(trimmed);
      const message = parsed?.error?.message;
      if (typeof message === "string" && message !== "") {
        reason = message;
      }
    } catch (_err) {
      // Not JSON: the plain text is the reason.
    }
  }
  const outcome = outcomeFromStatus(resp.status, {
    reason,
    retryAfter: resp.headers.get("retry-after"),
  });
  return new DatasetError(outcome, body);
}
