/**
 * demo_ts_dataset.ts is a demo of using the ts_dataset TypeScript module.
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
import { Dataset } from "./mods.ts"

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
