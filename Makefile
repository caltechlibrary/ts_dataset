#
# Makefile for running pandoc on all Markdown docs ending in .md and building
# the website documentation.
#
PROJECT = ts_dataset

PANDOC = $(shell which pandoc)

MD_PAGES = $(shell ls -1 *.md | grep -v 'nav.md')

HTML_PAGES = $(shell ls -1 *.md | grep -v 'nav.md' | sed -E 's/.md/.html/g')

build: version.ts CITATION.cff $(HTML_PAGES) $(MD_PAGES) docs website pagefind

$(HTML_PAGES): $(MD_PAGES) .FORCE
	if [ -f $(PANDOC) ]; then $(PANDOC) --metadata title=$(basename $@) -s --to html5 $(basename $@).md -o $(basename $@).html \
		--lua-filter=links-to-html.lua \
	    --template=page.tmpl; fi
	@if [ $@ = "README.html" ]; then mv README.html index.html; fi

version.ts: codemeta.json .FORCE
	echo '' | pandoc --from t2t --to plain \
                --metadata-file codemeta.json \
                --metadata package=$(PROJECT) \
                --metadata version=$(VERSION) \
                --metadata release_date=$(RELEASE_DATE) \
                --metadata release_hash=$(RELEASE_HASH) \
                --template codemeta-version-ts.tmpl \
                LICENSE >version.ts

CITATION.cff: codemeta.json .FORCE
	cat codemeta.json | sed -E   's/"@context"/"at__context"/g;s/"@type"/"at__type"/g;s/"@id"/"at__id"/g' >_codemeta.json
	echo "" | pandoc --metadata title="Cite $(PROJECT)" --metadata-file=_codemeta.json --template=codemeta-cff.tmpl >CITATION.cff

docs: .FORCE
	mkdir -p docs
	deno doc --html --name="ts_dataset" --output=./docs dataset.ts

test: .FORCE
	deno task test

website: .FORCE
	make -f website.mak

clean: .FORCE
	rm -fR docs/*
	rm -fR bin/$(PROGRAM)$(EXT)
	rm -fR dist/
	rm *.html

status:
	git status

save:
	if [ "$(msg)" != "" ]; then git commit -am "$(msg)"; else git commit -am "Quick Save"; fi
	git push origin $(BRANCH)

.FORCE:
