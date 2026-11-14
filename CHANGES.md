
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
- Build and release brought to the workspace's current practice (workspace DR-0017, ts_dataset DR-0002): a plain
  `make` only type-checks (`make check`) and no longer runs pandoc or the website build; `make generate`
  regenerates `version.ts` and `CITATION.cff` with `cmt`; `make release` regenerates, runs the tests, builds a
  source zip in `dist/` and runs `release-check`, which stops if anything does not carry the version and the
  commit hash; `release.bash` and `release.ps1` are the shared scripts, tested by `release_test.bash`
  (`make test-release`). `version.ts` is now the generated form (`version`, `releaseDate`, `releaseHash`);
  the old hand-written `appInfo` and `fmtHelp` were not used by anything.
- Fixed `demo_ts_dataset.ts`, which imported `./mods.ts` (the module is `mod.ts`), found by the new type check.

(Versions 0.0.2 to 0.0.4 were not recorded here.)

## Version 0.0.1

- Working proof of concept
