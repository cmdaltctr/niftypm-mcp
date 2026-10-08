import { vi } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NiftyPMClient, type MutationEntry } from "../../src/client.js";
import { LocalSync } from "../../src/local-sync.js";
import { collectionResponse, mirrorFixture } from "./sync-regression-fixtures.js";

export type HttpOverride = (url: URL, init: RequestInit) => unknown | Promise<unknown>;

/** Construct the real client with entirely synthetic settings. */
export function realClient(): NiftyPMClient {
  return new NiftyPMClient({
    clientId: "synthetic", clientSecret: "synthetic", accessToken: "synthetic", refreshToken: "",
    teamToken: "", baseUrl: "https://synthetic.invalid", internalBaseUrl: "https://internal.synthetic.invalid",
    enabledTools: {} as any, disabledTools: [],
  });
}

/** Deferred HTTP gates let tests interleave production operations deterministically. */
export function deferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

/** Use real discovery, client mutations and the returned LocalSync callback promise. */
export function syncHarness(options: { autoSync?: string } = { autoSync: "true" }) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "nifty-synthetic-regression-")));
  const directory = join(root, "niftypm");
  mkdirSync(directory);
  const filepath = join(directory, "project.json");
  const original = JSON.stringify(mirrorFixture(), null, 3) + "\n\n";
  writeFileSync(filepath, original);
  vi.spyOn(process, "cwd").mockReturnValue(root);
  vi.stubEnv("NIFTYPM_AUTO_SYNC", options.autoSync);
  const stderr = vi.spyOn(console, "error").mockImplementation(() => {});
  const calls: { url: URL; method: string }[] = [];
  let override: HttpOverride | undefined;
  let mutationResult: unknown = { id: "task1", project_id: "proj1" };
  vi.stubGlobal("fetch", vi.fn(async (input: string | URL, init: RequestInit = {}) => {
    const url = new URL(String(input));
    const method = init.method || "GET";
    calls.push({ url, method });
    const value = method === "GET"
      ? (await override?.(url, init)) ?? collectionResponse(url)
      : mutationResult;
    return value instanceof Response ? value : Response.json(value);
  }));
  const client = realClient();
  const sync = new LocalSync(client);
  sync.discover();
  const captured: Promise<void>[] = [];
  const entries: MutationEntry[] = [];
  client.onMutation = (entry) => {
    entries.push(entry);
    const promise = sync.onMutation(entry);
    captured.push(promise);
    return promise;
  };
  return {
    root, directory, filepath, original, client, sync, calls, stderr, captured, entries,
    read: () => JSON.parse(readFileSync(filepath, "utf-8")) as typeof import("./sync-regression-fixtures.js").syntheticMirror,
    bytes: () => readFileSync(filepath, "utf-8"),
    http: (handler: HttpOverride) => { override = handler; },
    response: (value: unknown) => { mutationResult = value; },
    getCalls: () => calls.filter((call) => call.method === "GET"),
    async mutate(endpoint = "/api/v1.0/tasks/task1", body: unknown = { project_id: "proj1" }, method = "PUT") {
      const start = captured.length;
      const result = await client.request(endpoint, { method, body: JSON.stringify(body) });
      await Promise.all(captured.slice(start));
      return result;
    },
  };
}

export function restoreSyncTest() {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
}
