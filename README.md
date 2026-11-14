# ts_dataset a TypeScript module for working with datasetd

The [dataset project](https://github.com/caltechlibrary/dataset) provides a JSON API for JSON object storage via the datasetd application. This repository hosts a TypeScript module targeting [Deno](https://deno.land) for integrating datasetd JSON API managed dataset collections.

[![License](https://img.shields.io/badge/License-BSD--like-lightgrey)](https://github.com/caltechlibrary/ts_dataset/blob/main/LICENSE)
[![Latest release](https://img.shields.io/github/v/release/caltechlibrary/ts_dataset.svg?color=b44e88)](https://github.com/caltechlibrary/ts_dataset/releases)

## Table of contents

* [Introduction](#introduction)
* [Installation](#installation)
* [Requirements](#requirements)
* [HTTP status and the strictStatus option](#http-status-and-the-strictstatus-option)
* [Versions](#versions)
* [Run demo](#run-demo)
* [Known issues and limitations](#known-issues-and-limitations)
* [Getting help](#getting-help)
* [Contributing](#contributing)
* [License](#license)
* [Acknowledgments](#acknowledgments)


## Introduction

The TypeScript **ts_dataset** module is for working with the JSON API provided by [datasetd](https://software.library.caltech.edu/dataset/datasetd_api.5.html). There are two exported classes defined -- `DatasetApiClient` and `Dataset`. The first is a low level HTTP wrapper mapping basic dataset verbs to the JSON API. The later provides those verbs where the objects are TypeScript based. Most applications using dataset collections hosted via datasetd will use the latter class.

Here's a simple example of exercising some of the method available with the Dataset object. This demo code assumes datasetd running on localhost on port 8485 and a dataset set collection called "my_objects.ds" has been defined the in YAML configuration of datasetd.

~~~typescript
import { Dataset } from "https://software.library.caltech.edu/ts_dataset/mod.ts"; 

const port = 8485;
const c_name = "my_objects.ds";

const ds = new Dataset(port, c_name);

// Get a list of keys 
let keys = await ds.keys();
console.log(`there are ${keys.length} object(s) found in ${c_name}`);
// Create a new object
let key = "object_key_three";
let obj = {
    "one": 1,
    "two": "number 2",
    "three": true,
    "updated": (new Date).toISOString()
};

await ds.create(key, obj);
keys = await ds.keys()
console.log(`there are now ${keys.length} object(s) found in ${c_name}`);

// Read back an object
let nObj = await ds.read(key);
console.log(`this is the read object ${JSON.stringify(nObj, null, "  ")}`);

// Update our object.
obj.updated = (new Date).toLocaleString();
await ds.update(key, obj);

// Read back updated object
nObj = await ds.read(key);
console.log(`this is the now our object ${JSON.stringify(nObj, null, "  ")}`);

// Remove our object
await ds.delete(key);

keys = await ds.keys()
console.log(`there are now ${keys.length} object(s) found in ${c_name}`);
~~~

## Installation

`ts_dataset` is a TypeScript module targeting Deno. Installation can be done via an import statement in your TypeScript module. You can also clone the GitHub repository at <https://software.library.caltech.edu/ts_dataset>. The from value in your import statement should point to <https://software.library.caltech.edu/ts_dataset/mod.ts> if you want to use it that way. Similarly you can add it to your project's `deps.ts` file with a line like.

~~~typescript
export * from "https://software.library.caltech.edu/ts_dataset/mod.ts";
~~~

`ts_dataset` is only useful in conjunction with a running [dataset](https://software.library.caltech.edu/dataset) web service. This is provided by datasetd available as part of installing dataset. See the GitHub repo <https://github.com/caltechlibrary/dataset> for more details.

## Requirements

- [dataset](https://github.com/caltechlibrary/dataset/releases) 2.5.x (>= 2.5.2), provides datasetd. ts_dataset 2.5.x needs dataset 2.5.x, see [Versions](#versions)
- [deno](https://deno.land) >= 1.44
- To run the tests (`deno task test`) you need `dataset` and `datasetd` 2.5.2 or later on your `PATH` (or named in the `DATASET` and `DATASETD` environment variables); the tests start their own datasetd on a free port
- [tmux](https://github.com/tmux/tmux/wiki) (recommended for running the demo)
- To generation or release ts_dataset you need the following
  - [Pandoc](https://pandoc.org) > 3.1
  - [GNU Make](https://www.gnu.org/software/make/)
  - [PageFind](https://pagefind.app)

To (re)generate the website content clone this repository, change into it and run "make".

## HTTP status and the strictStatus option

By default `Dataset` behaves as ts_dataset 0.0.4 did: a request that fails is reported as `false`, `[]` or `undefined`, so a failure can look like "nothing there". Pass `{ strictStatus: true }` and every failure throws a `DatasetError` that says what happened.

~~~typescript
import { Dataset, DatasetError } from "https://software.library.caltech.edu/ts_dataset/mod.ts";

const ds = new Dataset(8485, "my_objects.ds", { strictStatus: true });
try {
    await ds.create("object_key_three", { one: 1 });
} catch (err) {
    if (err instanceof DatasetError && err.outcome === "conflict") {
        // the key exists; datasetd wrote nothing
    } else {
        throw err;
    }
}
~~~

A `DatasetError` has an `outcome` (`not_found`, `conflict`, `invalid`, `too_large`, `unauthenticated`, `forbidden`, `unavailable`, `internal` or `unexpected`), the HTTP `status` (absent when there was no answer at all), the `reason` datasetd gave, any `retryAfter`, and the response `body`. Match on the outcome, not on a bare status number.

| method | `strictStatus` off (the default) | `strictStatus` on |
|---|---|---|
| `keys()` | `[]` for an empty collection **and** for a failure | `[]` only for an empty collection; a failure throws |
| `read(key)` | the object, or `undefined` for a failure | the object, `undefined` only when datasetd says 404, any other failure throws |
| `create`, `update`, `delete` | `true` or `false` | `true`, or a throw (`conflict` for a repeated create, `not_found` for an update or delete of a key that is not there) |
| `query(name, fields, kv)` | the results (an empty result is `[]`), or `undefined` for a failure | the results (`[]` for an empty result); a failure throws (`not_found` for a query name that is not defined, `invalid` for a bad parameter) |
| no answer at all (datasetd is down) | the `fetch` error as it is | a `DatasetError` with the outcome `unavailable` |

`DatasetApiClient` always answers with the raw `Response`; the option does not change it.

### The client and the server are set separately

The strict behaviours above go with a datasetd started with `strict_status: true` in its [YAML settings](https://software.library.caltech.edu/dataset/datasetd_yaml.5.html) (dataset 2.5.2 and later). The two settings are independent:

| client `strictStatus` | datasetd `strict_status` | result |
|---|---|---|
| off | off | as ts_dataset 0.0.4 and datasetd 2.5.1 |
| off | on | works. A refused request (404, 409, ...) is `false` or `undefined`, as failures always were |
| on | on | the intended behaviour |
| on | off | **misleads**: datasetd still answers a missing key with 200 and `{}`, so `read()` returns `{}` and a repeated `create()` overwrites and says `true` |

`await ds.checkStrict()` finds out which you have. It reads a key that cannot exist: a strict datasetd answers 404, one that is not strict answers 200. It returns `true` or `false`, and when the client is strict and datasetd is not it throws a `DatasetError` with the outcome `unexpected`. It is never called for you, so creating a `Dataset` never makes a request; call it once at start up.

## Versions

ts_dataset's major and minor version match dataset's, so the number says what is expected to work together: ts_dataset 2.5.x needs dataset 2.5.x. The patch number may differ, so a fix to this module alone is 2.5.3 with no dataset release.

## Run demo

I use tmux to run the [demo](demo_ts_dataset.ts). It's convenient. I start with one window and get everything setup and startup datasetd using a Deno task. Then I split the window and run the demo.  Below is what I type to run the demo (comments indicate where to switch windows, explain actions).

~~~shell
# Start up tmux
tmux
# clone this repository and change directory
git clone https://github.com/caltechlibrary/ts_dataset
cd ts_dataset
# Use deno tasks to setup our test and demo dataset collections
deno task setup_datasets
# Start the datasetd
deno task run_datasetd
# Split the tmux window (e.g. Ctrl-b ") and run the demo
deno task demo
~~~

## Known issues and limitations

- this is a proof of concept only
- only has small subset of dataset features
- it is very experimental and subject to change
- it is not suitable for production

## Getting help

You can file a GitHub [issue](https://github.com/caltechlibrary/ts_dataset/issues) or reach out to the authors listed in the [codemeta.json](codemeta.json) file. See [SUPPORT](SUPPORT.md) file in this repository.

## Contributing

Contributions and help are welcome. See [`CONTRIBUTING.md`](CONTRIBUTING.md) file in this repository.

## License

Software produced by the Caltech Library is Copyright © 2024 California Institute of Technology. This software is freely distributed under a modified BSD 3-clause license. Please see the [LICENSE](LICENSE) file for more information.


## Acknowledgments

This work was funded by the California Institute of Technology Library.

<div align="center">
  <br>
  <a href="https://www.caltech.edu">
    <img width="100" height="100" alt="Caltech logo" src="https://raw.githubusercontent.com/caltechlibrary/template/main/.graphics/caltech-round.png">
  </a>
</div>
