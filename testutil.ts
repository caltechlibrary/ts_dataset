/**
 * testutil.ts starts a real datasetd for the tests that need one, so the
 * client and server status modes can be exercised together without anyone
 * starting a server by hand. It needs `dataset` and `datasetd` 2.5.2 or later
 * on the PATH (or named in the DATASET and DATASETD environment variables), and
 * the permissions --allow-net --allow-run --allow-read --allow-write
 * --allow-env.
 */

/** TestServer is a running datasetd on a throwaway collection. */
export interface TestServer {
  /** port is the port datasetd listens on, on localhost. */
  port: number;
  /** collection is the collection name used in API paths. */
  collection: string;
  /** dir is the scratch directory holding the collection and the settings. */
  dir: string;
  /** stop stops datasetd and removes the scratch directory. */
  stop: () => Promise<void>;
}

/** freePort asks the operating system for a port nothing is listening on.
 *
 * @returns {number} a port number
 * @example
 * const port = freePort();
 */
export function freePort(): number {
  const listener = Deno.listen({ hostname: "127.0.0.1", port: 0 });
  const port = (listener.addr as Deno.NetAddr).port;
  listener.close();
  return port;
}

/** startDatasetd creates a SQLite collection called test.ds with one named
 * query set, writes a settings file and starts datasetd on a free port, waiting
 * until it answers.
 *
 * @param strict {boolean} true to run datasetd with `strict_status: true`
 * @returns {Promise<TestServer>} the running server; call stop() when done
 * @example
 * const srv = await startDatasetd(true);
 * try {
 *   const ds = new Dataset(srv.port, srv.collection, { strictStatus: true });
 * } finally {
 *   await srv.stop();
 * }
 */
export async function startDatasetd(strict: boolean): Promise<TestServer> {
  const datasetBin = Deno.env.get("DATASET") ?? "dataset";
  const datasetdBin = Deno.env.get("DATASETD") ?? "datasetd";
  const dir = await Deno.makeTempDir({ prefix: "ts_dataset_" });
  const collection = "test.ds";
  const init = await new Deno.Command(datasetBin, {
    args: ["init", collection, "sqlite://collection.db"],
    cwd: dir,
    stdout: "null",
    stderr: "piped",
  }).output();
  if (!init.success) {
    throw new Error(
      `dataset init failed: ${new TextDecoder().decode(init.stderr)}`,
    );
  }
  const port = freePort();
  const yaml = [
    `host: localhost:${port}`,
    strict ? "strict_status: true" : "strict_status: false",
    "collections:",
    `  - dataset: ${collection}`,
    "    keys: true",
    "    create: true",
    "    read: true",
    "    update: true",
    "    delete: true",
    "    query:",
    "      list_item: select src from test",
    "      by_key: select src from test where _key = ?",
    "",
  ].join("\n");
  await Deno.writeTextFile(`${dir}/settings.yaml`, yaml);
  const child = new Deno.Command(datasetdBin, {
    args: ["settings.yaml"],
    cwd: dir,
    stdout: "null",
    stderr: "null",
  }).spawn();
  let ready = false;
  for (let i = 0; i < 100 && !ready; i++) {
    try {
      const resp = await fetch(`http://localhost:${port}/api/version`);
      await resp.body?.cancel();
      ready = resp.ok;
    } catch (_err) {
      // not listening yet
    }
    if (!ready) await new Promise((r) => setTimeout(r, 50));
  }
  const stop = async () => {
    try {
      child.kill("SIGTERM");
    } catch (_err) {
      // already gone
    }
    await child.status;
    await Deno.remove(dir, { recursive: true });
  };
  if (!ready) {
    await stop();
    throw new Error(`datasetd did not start on port ${port}`);
  }
  return { port, collection, dir, stop };
}
