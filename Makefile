#
# Makefile for ts_dataset, a TypeScript module for Deno.
#
# Everyday targets:   build, check, test, test-release, clean
# Release targets:    generate, release, dist (see "Releasing" below)
# Documentation:      docs, website (explicit, never part of build or release)
#
# A plain `make`, `make check` and `make test` need only git, make and deno
# (`make test` also needs dataset and datasetd 2.5.2 or later on the PATH).
# `cmt` is run only by `make generate` and by `make release`, never by the
# everyday targets, so a fresh clone builds with the committed version.ts and
# CITATION.cff.
#
PROJECT = ts_dataset

GIT_GROUP = caltechlibrary

# Every module and test: the library has nothing to compile, so building it
# means type-checking all of it.
TS_FILES = $(shell ls -1 *.ts)

# codemeta.json has a second "version" (the TypeScript entry under
# programmingLanguage); the package's own comes first, and is the one jq .version
# reads in release.bash.
VERSION = $(shell grep '"version":' codemeta.json | head -1 | cut -d\"  -f 4)

RELEASE_HASH = $(shell git log --pretty=format:'%h' -n 1)

BRANCH = $(shell git branch | grep '* ' | cut -d\  -f 2)

# The files a release zip carries. Deno imports the library by URL, so the zip
# is the source: the modules, their manifest and the project documents.
DIST_FILES = mod.ts dataset.ts datasetd_status.ts version.ts deno.json LICENSE codemeta.json CITATION.cff README.md CHANGES.md

build: check

# check type-checks every .ts file and lists, without changing them, the files
# deno fmt would reformat. Existing files are not reformatted as a side effect
# of other work.
check: .FORCE
	deno check $(TS_FILES)
	@UNFORMATTED="$$(NO_COLOR=1 deno fmt --check 2>&1 | grep '^from ' | sed -E 's/^from (.*):$$/\1/')"; if [ -n "$$UNFORMATTED" ]; then echo "not deno fmt-formatted (left as is):"; echo "$$UNFORMATTED"; fi

# test starts its own datasetd, on a free port, in each combination of client
# and server mode (see testutil.ts). It needs dataset and datasetd on the PATH,
# or named in DATASET and DATASETD.
test: .FORCE
	deno task test

# test-release runs the tests of release.bash, and of release.ps1 when pwsh is
# installed. They use throwaway repositories and a stub gh, so nothing reaches
# GitHub.
test-release: .FORCE
	./release_test.bash
	@if command -v pwsh >/dev/null 2>&1; then RELEASE_IMPL=ps1 ./release_test.bash; else echo "pwsh not found: release.ps1 not tested"; fi

# docs writes the API documentation from the doc comments into docs/ (not
# committed). website renders the project pages. Neither is part of build or
# release; the published site is still the committed HTML (see TODO.md).
docs: .FORCE
	mkdir -p docs
	deno doc --html --name="ts_dataset" --output=./docs mod.ts

website: .FORCE
	make -f website.mak

hash: .FORCE
	@git log --pretty=format:'%h' -n 1

# clean never removes version.ts: it is committed, so that a fresh clone builds.
clean: .FORCE
	-if [ -d dist ]; then rm -fR dist; fi
	-if [ -d docs ]; then rm -fR docs; fi

status:
	git status

save:
	@git commit -am "$${msg:-Quick Save}"
	git push origin $(BRANCH)

refresh:
	git fetch origin
	git pull origin $(BRANCH)

#
# Releasing
#
# 1. Edit codemeta.json by hand: version, dateModified, datePublished,
#    releaseNotes. The major and minor version match dataset's; the patch may
#    differ (ts_dataset DR-0001).
# 2. make release      regenerates version.ts and CITATION.cff from
#                      codemeta.json with cmt (the only place cmt runs besides
#                      an explicit `make generate`), runs the type check and the
#                      tests, builds the source zip in dist/ and runs
#                      release-check, which stops here if anything does not
#                      carry the version and the hash of the commit.
# 3. ./release.bash    refuses if anything beyond those files is uncommitted,
#                      asks for confirmation, commits and pushes the regenerated
#                      files ("prep for vX.Y.Z"), and creates the DRAFT GitHub
#                      release from dist/*.zip. Publish the draft from the
#                      repository's releases page (or with gh release edit).
#
# Run `make test-release` after changing release.bash, release.ps1 or
# release_test.bash.
#

# generate runs cmt over codemeta.json. Run it when the version or the
# metadata change; a plain `make` leaves the committed copies alone.
generate: version.ts CITATION.cff

version.ts: .FORCE
	cmt codemeta.json version.ts

CITATION.cff: .FORCE
	cmt codemeta.json CITATION.cff

# dist builds the source zip, starting from an empty dist/.
dist: check .FORCE
	@rm -fR dist
	@mkdir -p dist/stage
	@cp $(DIST_FILES) dist/stage/
	@(cd dist/stage && zip -qr ../$(PROJECT)-v$(VERSION).zip .) || exit 1
	@rm -fR dist/stage
	@echo "dist/$(PROJECT)-v$(VERSION).zip"

release-version: .FORCE
	@$(MAKE) -B generate

# release-check stops the release unless version.ts and CITATION.cff carry the
# version in codemeta.json and the hash of the commit being released, and the
# zip carries every file in DIST_FILES with that same version.ts.
release-check: .FORCE
	@HASH=$$(git log --pretty=format:%h -n 1); \
	if ! grep -q "^export const version: string = '$(VERSION)'" version.ts; then \
		echo "error: version.ts does not carry version $(VERSION)" >&2; exit 1; fi; \
	if ! grep -q "releaseHash: string = '$$HASH'" version.ts; then \
		echo "error: version.ts does not carry hash $$HASH" >&2; exit 1; fi; \
	if ! grep -q '^version: $(VERSION)' CITATION.cff; then \
		echo "error: CITATION.cff does not carry version $(VERSION)" >&2; exit 1; fi; \
	ZIP=dist/$(PROJECT)-v$(VERSION).zip; \
	if [ ! -f $$ZIP ]; then echo "error: missing $$ZIP" >&2; exit 1; fi; \
	for FNAME in $(DIST_FILES); do \
		if ! unzip -Z1 $$ZIP | grep -qx "$$FNAME"; then \
			echo "error: $$ZIP does not carry $$FNAME" >&2; exit 1; fi; \
	done; \
	if ! unzip -p $$ZIP version.ts | grep -q "releaseHash: string = '$$HASH'"; then \
		echo "error: $$ZIP version.ts does not carry hash $$HASH" >&2; exit 1; fi; \
	echo "release-check: version.ts, CITATION.cff and the source zip carry $(VERSION) $$HASH"

# release: see "Releasing" above. It commits nothing; release.bash does that.
release: clean release-version test dist release-check
	@printf "\nrelease-check passed. Now run: ./release.bash   (or ./release.bash --dry-run first)\n\n"

.FORCE:
