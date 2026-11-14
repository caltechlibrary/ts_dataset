
# Change log for ts_dataset

## Version 2.5.2

- The version now tracks dataset's: major and minor match, the patch may differ. ts_dataset 2.5.x needs
  dataset 2.5.x (it was 0.0.4, which asked for dataset >= 2.1.13).
- Added the `strictStatus` option to `Dataset` and `DatasetApiClient`, false unless set. Off, every method
  behaves exactly as in 0.0.4. On, a failure throws a `DatasetError` (outcome, status, reason, body);
  `read()` is `undefined` only for 404; `keys()` and `query()` return `[]` only for an empty result; a
  failure to get any answer is the outcome `unavailable`. It goes with datasetd's `strict_status: true`
  (dataset 2.5.2).
- Added `checkStrict()`, which reports whether datasetd is strict and, when the client is strict and the
  server is not, throws a `DatasetError`. It is never called by the constructor.
- Added `datasetd_status.ts`: `outcomeFromStatus`, `DatasetError` and `datasetErrorFromResponse`, mirroring
  tms/datasetd_status.ts. `mod.ts` exports them.
- Tests run against a real datasetd in all four combinations of client and server mode (`deno task test`;
  `testutil.ts` starts datasetd). The old test that needs a hand-started datasetd is `deno task test_external`.
- Documented that an empty result is `[]` and a failure is not (README, "HTTP status and the strictStatus option").

(Versions 0.0.2 to 0.0.4 were not recorded here.)

## Version 0.0.1

- Working proof of concept
