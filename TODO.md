
Action Items
============

X
: completed

D
: declined, decided not to implement

Bugs
----

- [ ] The site is still the committed HTML (`CHANGES.html`, `index.html` and the others, deployed by
      `.github/workflows/static.yml`, with the old `publish.bash` for gh-pages). Workspace DR-0010 moves generated
      HTML out of the repositories, built in CI from caltechlibrary/workflows. Do that migration in its own
      change: it needs the docs workflow added before the HTML is untracked, or the published site goes stale.
      Until then `make website` and `make docs` are explicit targets, not part of `make` or `make release`.

- [ ] `deno fmt --check` lists `version.ts`, `dataset_test.ts` and `demo_ts_dataset.ts` as unformatted (`make check`
      prints them). Reformat each in a commit of its own, not as a side effect of other work.

- [X] Done for 2.5.2 as the opt-in `strictStatus` option (default off, so COLD and the other callers see no
      change); making it the default, and the audit of COLD's call sites it needs first, are not done. See
      `agents/projects/ts_dataset/decisions/0001-*.md`. Every method in the high-level `Dataset` class collapses a failed
      request into a falsy or empty value, so a caller cannot distinguish
      "the collection said no" from "the request never succeeded". Found
      2026-09-18 while building a COLD report against `rdm_requests.ds`;
      the server half is filed in `dataset`'s `TODO.md`.

      | method | line | on success | on failure | distinguishable? |
      |---|---|---|---|---|
      | `keys()`   | 261 | `string[]` | `[]`        | **no** |
      | `read()`   | 312 | `object`   | `undefined` | only by convention |
      | `query()`  | 413 | `object`   | `undefined` | only by convention |
      | `create()` | 283 | `true`     | `false`     | yes, but no cause |
      | `update()` | 343 | `true`     | `false`     | yes, but no cause |
      | `delete()` | 372 | `true`     | `false`     | yes, but no cause |

      `keys()` is the worst of these: it returns `[]` from two different
      branches — line 268 when the collection is genuinely empty, line 273
      when the request failed — and its `Promise<string[]>` signature cannot
      express the difference even in principle.

      `query()` is the one that was actually hit. It returns `undefined` for
      any non-ok response and `[]` for a genuinely empty result set. Both were
      verified against a running `datasetd` on 2026-09-18: a bogus query name
      returns HTTP 400, and a parameterised query matching nothing returns HTTP
      200 with `[]`. So the distinction *exists*, but it is undocumented and
      invisible in the type — and the natural `results ?? []` idiom erases it.

      In every case the cause is discarded: the response body is cancelled
      (`resp.body.cancel()`) without being read, so even the status code the
      server sent is gone by the time the caller sees a falsy value.

      **This library is the outlier in its own ecosystem.** Two sibling
      clients already fail loudly:
      `dataset/wrappers/typescript/libdataset.ts:132` throws
      `new DatasetError(resp.error ?? "unknown error")`, and
      `content-dashboard/ds-client.ts` throws on `!res.ok` and reads the body
      to report a cause. Align with those rather than the reverse.

      **Recommended change.** Throw a `DatasetError` carrying the HTTP status
      and the response body, matching `libdataset.ts`. Read the body before
      cancelling it — that is where the cause lives, and discarding it is what
      makes these failures unattributable today.

      A discriminated result (`{ok: true, value} | {ok: false, error}`) is the
      more honest shape for a library and avoids exceptions for expected
      conditions, but it changes *every* call site including the correct ones,
      whereas throwing changes only the sites that were already silently wrong.
      Prefer throwing unless there is a reason to make callers handle failure
      inline.

      Whichever is chosen, document that an empty result set is `200` with
      `[]`, so "no rows" and "request failed" are stated as different answers
      rather than left to be inferred.

      **Impact — check before changing.** `cold` is the main consumer, with
      20+ call sites, most casting the result straight to a type. The worst
      class is the RDM vocabulary generators: `group_vocabulary.ts` checks for
      `undefined` and then prints an **empty vocabulary** to stdout and exits
      0, so a failed query yields a valid-looking file that would wipe the
      vocabulary it replaces. `people_vocabulary.ts`,
      `thesis_option_vocabulary.ts` and `journal_vocabulary.ts` share the
      shape. Also `generate_country_collaboration_rpt.ts:147`
      (`return results ?? []`), `cold_reports.ts:243` and `:693`,
      `journals.ts:227`, `subjects.ts:159`, `groups.ts:296`,
      `funders.ts:193`, `utils.ts:162`.
      `cold/generate_technical_reports_rpt.ts` is the one place that already
      distinguishes the two cases, deliberately, and it will keep working
      whichever way this is resolved.

      `content-dashboard` is **not** affected — it has its own `ds-client.ts`
      and does not import this library.

      Making the library throw turns each of those sites from a silent wrong
      answer into a loud failure, which is the point; but it means a caller
      that currently "works" by ignoring failures will start reporting them.
      That is a behaviour change worth a minor version bump and a note in
      `CHANGES.md`. Current version is 0.0.4.

Someday, Maybe
--------------
