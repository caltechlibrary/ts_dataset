/**
 * dataset_test.ts a test module for ts_dataset project.
 *
 * @author R. S. Doiel, <rsdoiel@caltech.edu>
 *
 * Copyright (c) 2024, Caltech.
 * All rights not granted herein are expressly reserved by Caltech.
 * 
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 * 
 * 1. Redistributions of source code must retain the above copyright notice,
 * this list of conditions and the following disclaimer.
 * 
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 * this list of conditions and the following disclaimer in the documentation
 * and/or other materials provided with the distribution.
 * 
 * 3. Neither the name of the copyright holder nor the names of its contributors
 * may be used to endorse or promote products derived from this software without
 * specific prior written permission.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 *
 */
import { 
	assertEquals,
	assertStrictEquals
} from "@std/assert";
import { Dataset } from "./dataset.ts";

const c_name = "test_dataset.ds";
const port = 8485;

Deno.test("test_Dataset", async () => {
  const ds = new Dataset(port, c_name);
  let sObj: object | undefined;
  let nObj: object = {};
  nObj = {
    "one": "once upon a time",
    "two": 2,
    "three": false,
  };
  let key = "once";
  let ok = await ds.create(key, nObj);
  assertStrictEquals(
    ok,
    true,
    `expected ${key} -> ${nObj} to be created, failed`,
  );
  if (ok) {
    sObj = await ds.read(key);
    assertEquals(
      sObj,
      nObj,
      `expected to read ${key} -> ${nObj}, got ${nObj}`,
    );
    nObj = {
      "one": "once upon a time",
      "two": 2,
      "three": false,
      "four": 4,
    };
    ok = await ds.update(key, nObj);
    if (ok) {
      assertStrictEquals(
        ok,
        true,
        `expected ${key} -> ${sObj} to be updated, failed`,
      );
      sObj = await ds.read(key);
      assertEquals(
        sObj,
        nObj,
        `expected to read ${key} -> ${nObj} (after update), got ${nObj}`,
      );
    }
    let results = await ds.query("list_item", [], {});

    let keys = await ds.keys();
    assertStrictEquals(
      1,
      keys.length,
      `expected keys.length === 1, got keys.length === ${keys.length}, failed`,
    );
    assertStrictEquals(
      keys[0],
      key,
      `expected single key === "${key}", got ${keys[0]}`,
    );
    ok = await ds.delete(key);
    assertStrictEquals(
      ok,
      true,
      `expected delete to return true for key ${key}`,
    );
    keys = await ds.keys();
    assertStrictEquals(
      keys.length,
      0,
      `expected zero keys after delete, got ${keys.length}`,
    );
  }
});
