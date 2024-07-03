# ts_dataset a TypeScript module for working with datasetd

The [dataset project](https://github.com/caltechlibrary/dataset) provides a JSON API for JSON object storage via the datasetd application. This repository hosts a TypeScript module targetting [Deno](https://deno.land) for integrating datasetd JSON API managed dataset collections.

[![License](https://img.shields.io/badge/License-BSD--like-lightgrey)](https://github.com/caltechlibrary/ts_dataset/blob/main/LICENSE)
[![Latest release](https://img.shields.io/github/v/release/caltechlibrary/ts_dataset.svg?color=b44e88)](https://github.com/caltechlibrary/ts_dataset/releases)

## Table of contents

* [Introduction](#introduction)
* [Installation](#installation)
* [Requirements](#requirements)
* [Run demo](#run-demo)
* [Known issues and limitations](#known-issues-and-limitations)
* [Getting help](#getting-help)
* [Contributing](#contributing)
* [License](#license)
* [Acknowledgments](#acknowledgments)


## Introduction

The TypeScript **ts_dataset** module is for working with the JSON API provided by [datasetd](https://caltechlibrary.github.io/dataset/datasetd_api.5.html). There are two explorted classes defined -- `DatasetApiClient` and `Dataset`. The first is a low level HTTP wrapper mapping basic dataset verbs to the JSON API. The later provides those verbs where the objects are TypeScript based. Most applications using dataset collections hosted via datasetd will use the latter class.

Here's a simple example of exercising some of the method available with the Dataset object. This demo code assumes datasetd running on localhost on port 8485 and a dataset set collection called "my_objects.ds" has been defined the in YAML configuration of datasetd.

~~~typescript
import { Dataset } from "caltechlibrary.github.io/ts_dataset/mods.ts"
/* for a local copy use: import { Dataset } from "./mod.ts" */

const port = 8485;
const c_name = "my_objects.ds";

const ds = new Dataset(port, c_name);

// Get a list of keys 
let keys = await ds.keys();
if (keys === undefined) {
    throw new Error("Something went wrong, no keys!");
}
console.log(`there are ${keys.length} found in ${c_name}`);
// Create a new object
let key = "object_three";
let obj = {
    "three": 3,
    "four": "four",
    "five": true,
    "updated": (new Date).toISOString()
};

ds.create(key, obj);
keys = await ds.keys()
console.log(`there are now ${keys.length} found in ${c_name}`);

// Read back an object
let nObj = await ds.read(key);
console.log(`this is the read object ${nObj}`);

// Update our object.
obj.updated = (new Date).toLocaleString();
ds.update(key, obj);

// Read back updated object
nObj = await ds.read(key);
console.log(`this is the now our object ${nObj}`);

// Remove our object
ds.delete(key);

keys = await ds.keys()
console.log(`there are now ${keys.length} found in ${c_name}`);
~~~

## Installation

The latest release of `ts_dataset` is hosted on Caltech Library's GitHub website at <https://caltechlibrary.github.io/ts_dataset>. You can
add it to your `deps.ts` file with a line like.

~~~typescript
export * from "https://caltechlibrary.github.io/ts_dataset/mods.ts";
~~~

You can also clone the Git repository and include it locally. The Git repository is hosted at <https://github.com/caltechlibrary/ts_dataset>.

You will need `datasetd` running for the module to be useful. Find out more about `datasetd` at <https://caltechlibrary.github.io/dataset>.

## Requirements

- [dataset](https://github.com/caltechlibrary/dataset/releases)) >= 2.1.13, provides datasetd
- [deno](https://deno.land) >= 1.44
- [tmux](https://github.com/tmux/tmux/wiki) (recommended for running the demo)
- To generation or release ts_dataaset you need the following
  - [pandoc](https://pandoc.org) > 3.1
  - [GNU Make](https://www.gnu.org/software/make/)
  - [PageFind](https://pagefind.app)

To generate the website content clone this repository then run "make".

## Run demo

I use tmux to run the [demo](demo_ts_dataset.ts). It's convient. I start with one window and get everything setup and startup datasetd using a Deno task. Then I split the window and run the demo.  Below is what I type to run the demo (comments indicate where to switch windows, explain actions).

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
