/**
 * dataset.ts a TypeScript module for working with datasetd JSON API.
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
 */

import { DatasetError, datasetErrorFromResponse } from "./datasetd_status.ts";

/**
 * DatasetApiClient class implements a thin wrapper around a dataset collection mapping most of the
 * command line verbs to methods.
 */
/**
 * DatasetOptions are the optional settings of Dataset and DatasetApiClient.
 *
 * @example
 *
 * ```
 *    const ds = new Dataset(8485, "test.ds", { strictStatus: true });
 * ```
 */
export interface DatasetOptions {
  /**
   * strictStatus, false unless set, selects the behaviour that goes with a
   * datasetd running with `strict_status: true` in its YAML. Off, Dataset
   * behaves exactly as ts_dataset 0.0.4 did: a failure is `false`, `[]` or
   * `undefined`. On, a failure throws a DatasetError, and `read()` is
   * `undefined` only when datasetd says 404. The client's setting and the
   * server's are separate; see Dataset.checkStrict().
   */
  strictStatus?: boolean;
}

export class DatasetApiClient {
  port = 8485;
  c_name = "";
  dataset_api = "";
  strictStatus = false;

  /**
   * constructor for object
   * @param {number} port is the port number to use when request data from datasetd service
   * @param {sting} c_name is the collection name used to form API requests.
   * @param {DatasetOptions} options, optional; strictStatus is recorded here and
   * read by Dataset. DatasetApiClient always answers with the raw Response.
   *
   * @example
   *
   * ```
   *    const ds = new DatasetApiClient(8485, "test.ds");
   * ```
   */
  constructor(port: number, c_name: string, options: DatasetOptions = {}) {
    this.port = port;
    this.c_name = c_name;
    this.dataset_api = `http://localhost:${port}/api/${c_name}`;
    this.strictStatus = options.strictStatus === true;
  }

  /**
   * checkStrict finds out whether datasetd is running with `strict_status: true`
   * by reading a key that cannot exist. A legacy datasetd answers 200 with `{}`,
   * a strict one 404 with a JSON error object. It only reports; it never throws
   * because of a mismatch with this client's strictStatus (Dataset.checkStrict
   * does that). It throws a DatasetError when the answer is neither, for example
   * 403 from a legacy datasetd for a collection it does not serve.
   *
   * @returns {Promise<boolean>} true when datasetd is strict, false when it is not
   *
   * @example
   *
   * ```
   *    const ds = new DatasetApiClient(8485, "test.ds");
   *    const strict = await ds.checkStrict();
   * ```
   */
  async checkStrict(): Promise<boolean> {
    const key = `ts_dataset-strict-probe-${crypto.randomUUID()}`;
    const resp = await this.read(key);
    if (resp.status === 200) {
      await resp.body?.cancel();
      return false;
    }
    const err = await datasetErrorFromResponse(resp);
    if (resp.status === 404) {
      try {
        if (JSON.parse(err.body)?.error?.outcome === "not_found") {
          return true;
        }
      } catch (_err) {
        // not a strict error object
      }
    }
    throw err;
  }

  /**
   * keys retrieves a list of keys expressed as JSON from the datasetd JSON API
   *
   * @example
   *
   * ```
   *    const ds = new DatasetApiClient(8485, "test.ds");
   *    const key_list_text = await ds.keys();
   *    const keys = JSON.parse(key_list_text);
   * ```
   */
  async keys(): Promise<Response> {
    return await fetch(`${this.dataset_api}/keys`, {
      headers: { "content-type": "application/json" },
      method: "GET",
    });
  }

  /**
   * create retrieves creates a new object in the collection from a key and JSON encoded object.
   * It does this through the datasetd JSON API.
   *
   * @param {string} key
   * @param {string} body
   * @returns {Promise<Response>}
   *
   * @example
   *
   * ```
   *    const ds = new DatasetApiClient(8485, "test.ds");
   *    let obj = {
   *       "one": 1,
   *       "two": false,
   *       "three": "one for all and all for one"
   *    };
   *    let key = "3musketeers";
   *    let resp = await ds.create(key, JSON.stringify(obj));
   * ```
   */
  async create(key: string, body: string): Promise<Response> {
    return fetch(`${this.dataset_api}/object/${key}`, {
      headers: { "content-type": "application/json" },
      method: "POST",
      body: body,
    });
  }

  /**
   * read retrieves a single object expressed as JSON from the datasetd JSON API
   *
   * @param {string} key
   * @returns {Promise<Response>}
   *
   * @example
   *
   * ```
   *    const ds = new DatasetApiClient(8485, "test.ds");
   *    let key = "3musketeers";
   *    let resp = await ds.read(key);
   * ```
   */
  async read(key: string): Promise<Response> {
    return fetch(`${this.dataset_api}/object/${key}`, {
      headers: { "content-type": "application/json" },
      method: "GET",
    });
  }

  /**
   * update replaces an new object in the collection from a key and JSON encoded object.
   * It does this through the datasetd JSON API.
   *
   * @param {string} key
   * @param {string} body
   * @returns {Promise<Response>}
   *
   * @example
   *
   * ```
   *    const ds = new DatasetApiClient(8485, "test.ds");
   *    let obj = {
   *       "one": 1,
   *       "two": false,
   *       "three": "one for all and all for one"
   *    };
   *    let key = "3musketeers";
   *    let resp = await ds.update(key, JSON.stringify(obj));
   * ```
   */
  async update(key: string, body: string): Promise<Response> {
    return fetch(`${this.dataset_api}/object/${key}`, {
      headers: { "content-type": "application/json" },
      method: "PUT",
      body: body,
    });
  }

  /**
   * delete removes an new object from the collection from given key.
   * It does this through the datasetd JSON API.
   *
   * @param {string} key
   * @returns {Promise<Response>}
   *
   * @example
   *
   * ```
   *    const ds = new DatasetApiClient(8485, "test.ds");
   *    let key = "3musketeers";
   *    let resp = await ds.delete(key);
   * ```
   */
  async delete(key: string): Promise<Response> {
    return fetch(`${this.dataset_api}/object/${key}`, {
      headers: { "content-type": "application/json" },
      method: "DELETE",
    });
  }

  /**
   * query performns a named query based on the YAML file running the datasetd API.
   * If they query has parameters then the field order needs to be supplied in the fields
   * and the key/value pairs in the body which will be transmitted as a POST body encoded
   * as application/json.
   *
   * @param {string} query_name
   * @param {string[]} fields, an ordered array of fields defined in the query
   * @param {string} body holds the JSON encoded key/value pairs for the query
   * @returns {Promise<Repsonse>}
   *
   * @example
   *
   * ```
   *    const ds = new DatasetApiClient(8485, "test.ds");
   *    // NOTE: the backup_object query doesn't take parameters
   *    // so fields and body are empty
   *    const query_name = "backup_objects";
   *    let key = "3musketeers";
   *    let resp = await ds.query(query_name, [], '');
   * ```
   */
  async query(
    query_name: string,
    fields: string[],
    body: string,
  ): Promise<Response> {
    if (fields.length === 0) {
      return fetch(`${this.dataset_api}/query/${query_name}`, {
        headers: { "content-type": "application/json" },
        method: "POST",
        body: body,
      });
    } else {
      return fetch(
        `${this.dataset_api}/query/${query_name}/${fields.join("/")}`,
        {
          headers: { "content-type": "application/json" },
          method: "POST",
          body: body,
        },
      );
    }
  }
}

/**
 * Dataset implements the high level functions associated with the dataset cli via the datasetd service.
 * It relies on DatasetClient to perform the http request and return response while dataset wraps the
 * conversion request and responses to and from lists and objects.
 */
export class Dataset {
  _ds: DatasetApiClient;

  /**
   * constructor for object
   *
   * @param {number} port is the port number to use when request data from datasetd service
   * @param {sting} c_name is the collection name used to form API requests.
   *
   * @example
   *
   * ```
   *    const ds = new Dataset(8485, "test.ds");
   * ```
   */
  /** strictStatus is true when failures throw a DatasetError. */
  strictStatus = false;

  /**
   * constructor for object
   *
   * @param {number} port is the port number to use when request data from datasetd service
   * @param {sting} c_name is the collection name used to form API requests.
   * @param {DatasetOptions} options, optional. `{ strictStatus: true }` selects
   * the behaviour that goes with a datasetd running with `strict_status: true`.
   *
   * @example
   *
   * ```
   *    const ds = new Dataset(8485, "test.ds", { strictStatus: true });
   * ```
   */
  constructor(port: number, c_name: string, options: DatasetOptions = {}) {
    this._ds = new DatasetApiClient(port, c_name, options);
    this.strictStatus = options.strictStatus === true;
  }

  /**
   * checkStrict asks datasetd whether it is running with `strict_status: true`
   * and returns the answer. When this client is strict and datasetd is not, it
   * throws a DatasetError (outcome "unexpected"), because that combination
   * misleads: a missing key still answers 200 `{}` and so reads as an object.
   * It is never called by the constructor, so constructing a client never
   * touches the network.
   *
   * @returns {Promise<boolean>} true when datasetd is strict, false when it is not
   * @throws {DatasetError} when strictStatus is on and datasetd is not strict, or
   * when the answer cannot be read as either
   *
   * @example
   *
   * ```
   *    const ds = new Dataset(8485, "test.ds", { strictStatus: true });
   *    await ds.checkStrict(); // throws if datasetd was started without strict_status
   * ```
   */
  async checkStrict(): Promise<boolean> {
    const server = await this._send(() => this._ds.checkStrict());
    if (this.strictStatus && !server) {
      throw new DatasetError({
        kind: "unexpected",
        status: 200,
        reason:
          "this client is strict but datasetd is not running with strict_status: true, " +
          "so a missing key reads as an empty object; set strict_status: true in the datasetd YAML",
      });
    }
    return server;
  }

  /**
   * _send runs a request. In strict mode a failure to get any answer (a refused
   * connection, say) is thrown as a DatasetError with the outcome "unavailable";
   * otherwise the error is passed on as it always was.
   */
  async _send<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      if (this.strictStatus && !(err instanceof DatasetError)) {
        throw new DatasetError({
          kind: "unavailable",
          reason: err instanceof Error ? err.message : String(err),
        });
      }
      throw err;
    }
  }

  /**
   * keys returns a list of all keys from a dataset collection. An empty list
   * means the collection is empty. With strictStatus on, a failed request throws
   * a DatasetError instead of returning an empty list.
   *
   * @returns {Promise<string[]>} the keys
   * @throws {DatasetError} in strict mode, when the request fails
   *
   * @example
   *
   * ```
   *    const ds = new Dataset(8485, "test.ds");
   *    const keys = await ds.keys();
   * ```
   */
  async keys(): Promise<string[]> {
    const resp = await this._send(() => this._ds.keys());
    if (resp.ok && resp.body) {
      const key_list = await resp.json();
      if (key_list !== null) {
        return key_list;
      }
      return [];
    }
    if (this.strictStatus) {
      throw await datasetErrorFromResponse(resp);
    }
    if (resp.body !== null) {
      resp.body.cancel();
    }
    return [];
  }

  /**
   * create takes an key and object creating them via the datasetd JSON API.
   *
   * @param {string} key
   * @param {object} obj is the thing you want to create in the collection.
   * @returns {boolean} true if successful, false otherwise
   * @throws {DatasetError} with strictStatus on, when it fails: outcome "conflict"
   * when the key exists (datasetd running with strict_status writes nothing)
   *
   * @example
   *
   * ```
   *    const ds = new Dataset(8485, "test.ds");
   *    const ok = await ds.create("3musketeers", { one: 1 });
   * ```
   */
  async create(key: string, obj: object): Promise<boolean> {
    const text = JSON.stringify(obj);
    const resp = await this._send(() => this._ds.create(key, text));
    if (resp.ok) {
      if (resp.body !== null) {
        resp.body.cancel();
      }
      return true;
    }
    if (this.strictStatus) {
      throw await datasetErrorFromResponse(resp);
    }
    if (resp.body !== null) {
      resp.body.cancel();
    }
    return false;
  }

  /**
   * read retrieves an object from a dataset collection using the datasetd JSON API.
   *
   * @param {string} key, the key to the object you want to retrieve.
   * @returns {object} returns the object or undefined if it fails. With
   * strictStatus on it is undefined only when datasetd answers 404 (no such
   * record); any other failure throws.
   * @throws {DatasetError} in strict mode, for a failure other than 404
   *
   * @example
   *
   * ```
   *    const ds = new Dataset(8485, "test.ds");
   *    let key = "3musketeers";
   *    let obj = await ds.read(key);
   * ```
   */
  async read(key: string): Promise<object | undefined> {
    const resp = await this._send(() => this._ds.read(key));
    if (resp.ok && resp.body) {
      return await resp.json();
    }
    if (this.strictStatus && resp.status !== 404) {
      throw await datasetErrorFromResponse(resp);
    }
    if (resp.body !== null) {
      resp.body.cancel();
    }
    return undefined;
  }

  /**
   * update takes an key and object updating the collection via the datasetd JSON API.
   *
   * @param {string} key
   * @param {object} obj is the replacement object for the key in the collection.
   * @returns {boolean} true if successful, false otherwise
   * @throws {DatasetError} with strictStatus on, when it fails: outcome "not_found"
   * when the key does not exist
   *
   * @example
   *
   * ```
   *    const ds = new Dataset(8485, "test.ds");
   *    let obj = {
   *       "one": 1,
   *       "two": false,
   *       "three": "one for all and all for one"
   *    };
   *    let key = "3musketeers";
   *    let resp = await ds.create(key, obj)l
   * ```
   */
  async update(key: string, obj: object): Promise<boolean> {
    const text = JSON.stringify(obj);
    const resp = await this._send(() => this._ds.update(key, text));
    if (resp.ok) {
      if (resp.body !== null) {
        resp.body.cancel();
      }
      return true;
    }
    if (this.strictStatus) {
      throw await datasetErrorFromResponse(resp);
    }
    if (resp.body !== null) {
      resp.body.cancel();
    }
    return false;
  }

  /**
   * delete removes object from a dataset collection using the datasetd JSON API.
   *
   * @param {string} key, the key to the object you want to remove.
   * @returns {boolean} true if successful, false otherwise
   * @throws {DatasetError} with strictStatus on, when it fails: outcome "not_found"
   * when the key does not exist
   *
   * @example
   *
   * ```
   *    const ds = new Dataset(8485, "test.ds");
   *    let key = "3musketeers";
   *    let resp = await ds.delete(key);
   * ```
   */
  async delete(key: string): Promise<boolean> {
    const resp = await this._send(() => this._ds.delete(key));
    if (resp.ok) {
      if (resp.body !== null) {
        resp.body.cancel();
      }
      return true;
    }
    if (this.strictStatus) {
      throw await datasetErrorFromResponse(resp);
    }
    if (resp.body !== null) {
      resp.body.cancel();
    }
    return false;
  }

  /**
   * query executes a query defined in the YAML file of your datasetd API.
   * If the query takes parameters they field ordering (matching the SQL query)
   * needs to be provided in the fields array. Any data that is needed to execute
   * the query is provided in the kv object.  fields maybe an empty list and
   * kv maybe an empty object for queries that don't need any parameters.
   *
   * @param {string} query_name, the attribute name in the query property of your
   * datasetd YAML configuration.
   * @param {string[]} fields, an ordered list of field names matching the sequence
   * to the query defined in the YAML file. The fields need to match those in kv.
   * @param {object} kv is the map of key and values to POST to the JSON API if
   * the query requires parameters.
   * @returns {object}, usually a list. An empty list means the query found
   * nothing (datasetd answered 200 with `[]`). Without strictStatus a failed
   * query is `undefined` and the cause is only in the datasetd log; with it a
   * failure throws a DatasetError (outcome "not_found" for a query name that is
   * not defined, "invalid" for a bad parameter).
   * @throws {DatasetError} in strict mode, when the query fails
   *
   * @example
   *
   * ```
   *    const ds = new DatasetApiClient(8485, "test.ds");
   *    // NOTE: the backup_object query doesn't take parameters
   *    // so fields and object are empty
   *    const query_name = "backup_objects";
   *    let resp = await ds.query(query_name, [], {});
   * ```
   */
  async query(
    query_name: string,
    fields: string[],
    kv: object,
  ): Promise<object | undefined> {
    let resp: Response;
    if (fields.length > 0) {
      const body = JSON.stringify(kv);
      resp = await this._send(() => this._ds.query(query_name, fields, body));
    } else {
      resp = await this._send(() => this._ds.query(query_name, [], ""));
    }
    if (resp.ok) {
      let results = await resp.json();
      return results;
    }
    if (this.strictStatus) {
      throw await datasetErrorFromResponse(resp);
    }
    if (resp.body !== null) {
      resp.body.cancel();
    }
    return undefined;
  }
}
