import { afterEach, describe, expect, it, vi } from "vitest";
import type { MutationEntry } from "../src/client.js";
import { deferred, realClient, restoreSyncTest } from "./fixtures/sync-regression-harness.js";

afterEach(restoreSyncTest);

const turn = () => new Promise<void>((resolve) => setImmediate(resolve));
const PRIVATE_MARKER = "synthetic-private-hook-value";

function http(status = 200) {
  vi.stubGlobal("fetch", vi.fn(async () => status === 204
    ? new Response(null, { status: 204 })
    : Response.json({ id: "task1", project_id: "proj1" })));
  const stderr = vi.spyOn(console, "error").mockImplementation(() => {});
  const stdout = vi.spyOn(console, "log").mockImplementation(() => {});
  const info = vi.spyOn(console, "info").mockImplementation(() => {});
  const leaks = () => [stderr, stdout, info].some((spy) => spy.mock.calls.some((args) =>
    args.some((arg) => String(arg).includes(PRIVATE_MARKER))));
  return { stderr, stdout, info, leaks };
}

describe("real NiftyPMClient mutation callback containment", () => {
  it.each([200, 204])("GET is silent for successful HTTP %s", async (status) => {
    http(status);
    const client = realClient();
    const entries: MutationEntry[] = [];
    client.onMutation = (entry) => { entries.push(entry); };
    await client.get("/api/v1.0/tasks");
    expect(entries).toEqual([]);
  });

  it.each(["HEAD", "PATCH", "OPTIONS"])("%s is outside POST/PUT/DELETE notification", async (method) => {
    http();
    const client = realClient();
    const entries: MutationEntry[] = [];
    client.onMutation = (entry) => { entries.push(entry); };
    await client.request("/api/v1.0/tasks/task1", { method });
    expect(entries).toHaveLength(0);
  });

  it.each([
    ["POST", 200], ["PUT", 200], ["DELETE", 200],
    ["POST", 204], ["PUT", 204], ["DELETE", 204],
  ] as const)("%s HTTP %s forwards parsed bodies once and returns before the hook completes", async (method, status) => {
    http(status);
    const client = realClient();
    const gate = deferred();
    const entries: MutationEntry[] = [];
    client.onMutation = (entry) => { entries.push(entry); return gate.promise; };
    let cloudReturned = false;
    const request = client.request("/api/v1.0/tasks/task1", {
      method, body: JSON.stringify({ project_id: "proj1", name: "Synthetic request" }),
    }).then((result) => { cloudReturned = true; return result; });
    await turn();
    const returnedBeforeHook = cloudReturned;
    gate.resolve();
    const result = await request;
    expect(returnedBeforeHook).toBe(true);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      method, endpoint: "/api/v1.0/tasks/task1", requestBody: { project_id: "proj1", name: "Synthetic request" },
    });
    expect(entries[0].responseBody).toEqual(status === 204 ? undefined : { id: "task1", project_id: "proj1" });
    expect(result).toEqual(status === 204 ? {} : { id: "task1", project_id: "proj1" });
  });

  it.each([200, 204])("synchronous throws on HTTP %s preserve cloud results and log no private error values", async (status) => {
    const { stderr, stdout, info, leaks } = http(status);
    const client = realClient();
    client.onMutation = () => { throw new Error(PRIVATE_MARKER); };
    const result = await client.put("/api/v1.0/tasks/task1", { project_id: "proj1" });
    expect(result).toEqual(status === 204 ? {} : { id: "task1", project_id: "proj1" });
    expect.soft(stderr.mock.calls.length > 0).toBe(true);
    expect.soft(stdout.mock.calls.length + info.mock.calls.length === 0).toBe(true);
    expect(leaks()).toBe(false);
  });

  it.each([
    ["POST", 200], ["PUT", 200], ["DELETE", 200],
    ["POST", 204], ["PUT", 204], ["DELETE", 204],
  ] as const)("%s HTTP %s handles async hook rejection with a fixed safe diagnostic", async (method, status) => {
    const { stderr, stdout, info, leaks } = http(status);
    const client = realClient();
    let reject!: (reason: unknown) => void;
    const hook = new Promise<void>((_resolve, fail) => { reject = fail; });
    // The test observes the rejected returned hook first. Broken production code must not crash Vitest.
    const observed = hook.catch(() => {});
    let returnedHook: Promise<void> | undefined;
    client.onMutation = () => { returnedHook = hook; return hook; };
    let unhandled = false;
    const listener = () => { unhandled = true; };
    process.on("unhandledRejection", listener);
    try {
      const result = await client.request("/api/v1.0/tasks/task1", {
        method, body: JSON.stringify({ project_id: "proj1" }),
      });
      expect(returnedHook === hook).toBe(true);
      reject(new Error(PRIVATE_MARKER));
      await observed;
      await turn();
      expect(result).toEqual(status === 204 ? {} : { id: "task1", project_id: "proj1" });
      expect.soft(unhandled).toBe(false);
      // Production containment must produce a diagnostic even though the test also observes the rejection.
      expect.soft(stderr.mock.calls.length > 0).toBe(true);
      expect.soft(stdout.mock.calls.length + info.mock.calls.length === 0).toBe(true);
      expect(leaks()).toBe(false);
    } finally {
      process.removeListener("unhandledRejection", listener);
    }
  });
});
