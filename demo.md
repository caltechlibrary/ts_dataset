---
title: A TypeScript module for dataset
pubDate: 2024-07-03
created: 2025-07-03
author: R. S. Doiel
keywords:
  - TypeScript
  - JavaScript
  - Deno
  - WASM
required_software:
  - dataset >= v2.1.13
  - deno >= 1.44
---

# A TypeScript module for dataset

This is a proof of concept demonstration of managing a [dataset](https://caltechlibrary.github.io/dataset) from [TypeScript](https://typescriptlang.org) running in [Deno](https://deno.land).

The `ts_dataset` includes a simple demo, [demo_ts_dataset.ts](demo_ts_dataset.ts). It includes a minimal set of dataset operations (verbs) from TypeScript. `datasetd` is used to provide access to the dataset collections via a JSON API. The collection must be available via the JSON API for this TypeScript module to be useful. Take a look at the code for the [demo](https://caltechlibrary.github.io/ts_dataset/demo_ts_dataset.ts). It gives a nice simple example of using the API.

## Watch the demo

Here's a quick demo of Deno, datasetd and tmux. The demo assumes you already have Deno, dataset and tmux installed. Here's the stops covered.

1. clone ts_dataset
2. setup the dataset collections for the demo
3. run datasetd via a deno task
3. run the demo via a deno task

![An asciinema cast of the running demo](demo_ts_dataset.gif)

