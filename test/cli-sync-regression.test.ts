import { afterEach, describe, expect, it, vi } from "vitest";
import { writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tasks, labels, taskgroups, mirrorFixture, LAST_SYNCED } from "./fixtures/sync-regression-fixtures.js";
import { cliHarness, controls, expectRefused, PRIVATE_MARKER, restoreCliTest, turn } from "./fixtures/cli-regression-harness.js";

afterEach(restoreCliTest);

const toolArgs = ["niftypm_update_task", "--task_id", "task1", "--name", "Synthetic update"];

// Keep the HTTP gate independent of production imports so filesystem mocks install first.
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}

function emptyCollections(url: URL) {
  if (url.pathname.endsWith("/tasks")) return { tasks: [], hasMore: false };
  if (["labels", "taskgroups", "milestones"].some((name) => url.pathname.endsWith(`/${name}`))) {
    return { items: [], hasMore: false };
  }
}

describe("public runCli manual sync safeguards", () => {
  it("keeps 48 legacy parents and 53 local children, API fields, custom data and exact backup bytes", async () => {
    const h = cliHarness();
    h.http((url) => {
      if (!url.pathname.endsWith("/tasks")) return;
      const offset = Number(url.searchParams.get("offset") || 0);
      return { tasks: tasks.slice(offset, offset + 24), hasMore: offset === 0 };
    });
    const result = await h.run(["sync"]);
    expect.soft(result).toEqual({ code: 0, escaped: false });
    const data = h.read();
    expect.soft(data.tasks.length).toBe(48);
    expect.soft(data.tasks.reduce((count, task) => count + task.subtasks.length, 0)).toBe(53);
    expect.soft(data.tasks[0]?.name === tasks[0].name).toBe(true);
    expect.soft(data.tasks[0]?.subtask_details).toEqual(mirrorFixture().tasks[0].subtask_details);
    expect.soft(data.tasks[0]?.local_note).toBe("Retain local-only field");
    expect.soft(data.custom_top_level).toEqual({ preserve: true });
    expect.soft(data.meta.created).toBe(mirrorFixture().meta.created);
    expect.soft(data.meta.last_synced !== LAST_SYNCED).toBe(true);
    expect.soft([data.labels.length, data.task_lists.length, data.milestones.length]).toEqual([7, 6, 7]);
    expect.soft(h.backups().some((bytes) => bytes === h.original)).toBe(true);
    expect.soft(controls.renames.includes(h.filepath)).toBe(true);
    expect.soft(h.getCalls().filter(({ url }) => url.pathname.endsWith("/tasks"))
      .map(({ url }) => url.searchParams.get("offset"))).toEqual(["0", "24"]);
    expect.soft(h.getCalls().filter(({ url }) => /\/(labels|members)$/.test(url.pathname))
      .every(({ url }) => !url.searchParams.has("project_id"))).toBe(true);
    expect(h.getCalls().filter(({ url }) => url.pathname.endsWith("/members"))
      .every(({ url }) => url.search === "")).toBe(true);
  });

  it("manual selection updates only one duplicate while automatic writes remain disabled", async () => {
    const h = cliHarness({ autoSync: "true", answers: ["1"] });
    const other = join(h.directory, "zz-duplicate.json");
    writeFileSync(other, h.original);
    const result = await h.run(["sync"]);
    expect.soft(result.code).toBe(0);
    expect.soft(controls.questions.some((question) => question.includes("Select a file"))).toBe(true);
    expect.soft(h.read().tasks.length).toBe(48);
    expect.soft(h.backups().some((bytes) => bytes === h.original)).toBe(true);
    expect.soft(readFileSync(other, "utf-8") === h.original).toBe(true);
    const committed = h.bytes();
    const count = h.getCalls().length;
    await h.run(toolArgs);
    await turn();
    expect.soft(h.getCalls().length).toBe(count);
    expect.soft(h.bytes() === committed).toBe(true);
    expect(readFileSync(other, "utf-8") === h.original).toBe(true);
  });

  it("refuses populated-to-empty results unless --allow-empty is supplied", async () => {
    const h = cliHarness();
    h.http(emptyCollections);
    expectRefused(h, await h.run(["sync"]));
    expect(h.stderr.mock.calls.some((args) => args.some((arg) => String(arg).includes("--allow-empty")))).toBe(true);
  });

  it("--allow-empty commits only validated empties with an exact backup and leaves automatic sync unset", async () => {
    const h = cliHarness();
    h.http(emptyCollections);
    expect.soft((await h.run(["sync", "--allow-empty"])).code).toBe(0);
    const data = h.read();
    expect.soft([data.tasks.length, data.labels.length, data.task_lists.length, data.milestones.length]).toEqual([0, 0, 0, 0]);
    expect.soft(h.backups().some((bytes) => bytes === h.original)).toBe(true);
    expect(process.env.NIFTYPM_AUTO_SYNC).toBeUndefined();
  });

  it.each([
    ["tasks", []], ["labels", []], ["taskgroups", []], ["milestones", []],
    ["tasks", { unexpected: [] }], ["tasks", { tasks: [], hasMore: "false" }],
    ["tasks", { tasks: [] }], ["milestones", { items: [] }],
    ["tasks", { tasks: [{ id: "bad/id" }], hasMore: false }],
    ["tasks", { tasks: [{ ...tasks[0], name: 42 }], hasMore: false }],
    ["tasks", { tasks: [{ ...tasks[0], project_id: "other1" }], hasMore: false }],
    ["tasks", { tasks: [], hasMore: true }],
    ["tasks", { tasks: [tasks[0]], items: [tasks[0]], hasMore: false }],
  ])("rejects unsafe %s response %j even with --allow-empty", async (endpoint, response) => {
    const h = cliHarness();
    h.http((url) => url.pathname.endsWith(`/${endpoint}`) ? response : undefined);
    expectRefused(h, await h.run(["sync", "--allow-empty"]));
  });

  it.each([
    { items: [], has_more: true }, { items: [] }, { items: [], has_more: "false" },
    [{ id: "bad/id" }], { items: [{ id: "" }], has_more: false },
    { items: [], members: [], has_more: false },
  ].map((response) => [response]))("rejects incomplete or invalid members %j without invented continuation", async (response) => {
    const h = cliHarness();
    h.http((url) => url.pathname.endsWith("/members") ? response : undefined);
    expectRefused(h, await h.run(["sync", "--allow-empty"]));
    const calls = h.getCalls().filter(({ url }) => url.pathname.endsWith("/members"));
    expect.soft(calls.length).toBe(1);
    expect(calls.every(({ url }) => url.search === "")).toBe(true);
  });

  it.each(["bare", "published"])("accepts complete %s member records at workspace scope", async (form) => {
    const h = cliHarness();
    h.http((url) => url.pathname.endsWith("/members")
      ? form === "bare" ? [{ id: "member1" }] : { items: [{ id: "member1" }], has_more: false } : undefined);
    expect.soft((await h.run(["sync"])).code).toBe(0);
    expect.soft(h.read().tasks.length).toBe(48);
    expect(h.getCalls().filter(({ url }) => url.pathname.endsWith("/members"))
      .every(({ url }) => url.search === "")).toBe(true);
  });

  it.each(["repeated", "failed"])("rejects a %s later task page without a partial commit", async (fault) => {
    const h = cliHarness();
    h.http((url) => {
      if (!url.pathname.endsWith("/tasks")) return;
      if (!Number(url.searchParams.get("offset"))) return { tasks: tasks.slice(0, 24), hasMore: true };
      return fault === "failed" ? new Response(PRIVATE_MARKER, { status: 503 })
        : { tasks: tasks.slice(0, 24), hasMore: false };
    });
    expectRefused(h, await h.run(["sync", "--allow-empty"]));
    expect(h.getCalls().filter(({ url }) => url.pathname.endsWith("/tasks"))
      .map(({ url }) => url.searchParams.get("offset"))).toEqual(["0", "24"]);
  });

  it("completes optional-flag full label and taskgroup pages using returned-row offsets", async () => {
    const h = cliHarness();
    h.http((url) => {
      const base = url.pathname.endsWith("/labels") ? labels : url.pathname.endsWith("/taskgroups") ? taskgroups : undefined;
      if (!base) return;
      const offset = Number(url.searchParams.get("offset") || 0);
      return { items: offset ? base : Array.from({ length: 100 }, (_, i) => ({ ...base[0], id: `extra${i}` })) };
    });
    expect.soft((await h.run(["sync"])).code).toBe(0);
    expect.soft(h.read().tasks.length).toBe(48);
    for (const endpoint of ["labels", "taskgroups"]) {
      expect.soft(h.getCalls().filter(({ url }) => url.pathname.endsWith(`/${endpoint}`))
        .map(({ url }) => url.searchParams.get("offset"))).toEqual(["0", "100"]);
    }
  });

  it("rejects a project-detail mismatch even with --allow-empty", async () => {
    const h = cliHarness();
    h.http((url) => url.pathname.endsWith("/projects/proj1") ? { id: "other1", name: "Other project" } : undefined);
    expectRefused(h, await h.run(["sync", "--allow-empty"]));
  });

  it.each(["backup", "temp", "rename"] as const)("owns safe exit 1 for a %s failure and preserves exact bytes", async (fault) => {
    const h = cliHarness();
    controls.fault = fault;
    expectRefused(h, await h.run(["sync"]));
    expect.soft(controls.injected).toBe(true);
    expect(h.backups().some((bytes) => bytes === h.original)).toBe(fault !== "backup");
  });

  it("owns a safe fetch-error exit without relying on the index catch", async () => {
    const h = cliHarness();
    h.http(() => { throw new Error(PRIVATE_MARKER); });
    expectRefused(h, await h.run(["sync"]));
  });

  it("uses the existing help command for manual guidance", async () => {
    const h = cliHarness();
    expect.soft((await h.run(["help"])).code).toBe(0);
    const text = h.stderr.mock.calls.flat().map(String).join("\n");
    expect.soft(text.includes("init") && text.includes("sync")).toBe(true);
    expect.soft(text.includes("--allow-empty")).toBe(true);
    expect(h.calls.length).toBe(0);
  });
});

describe("public runCli direct-tool automatic lifecycle", () => {
  it.each([undefined, "false"])("with automatic sync %s prints cloud success without mirror GETs or writes", async (autoSync) => {
    const h = cliHarness({ autoSync });
    expect.soft((await h.run(toolArgs)).code).toBe(0);
    await turn();
    expect.soft(h.stdout.mock.calls.some((args) => args.some((arg) => String(arg).includes('"cloud": "ok"')))).toBe(true);
    expect.soft(h.getCalls().length).toBe(0);
    expect.soft(controls.writes.length).toBe(0);
    expect(h.bytes() === h.original).toBe(true);
  });

  it.each([false, true])("prints cloud output, drains pending mirrors, then exits 0 (mirror failure: %s)", async (fails) => {
    const h = cliHarness({ autoSync: "true" });
    const gate = deferred();
    h.http(async (url, method) => {
      if (method !== "GET" || !url.pathname.endsWith("/tasks")) return;
      await gate.promise;
      if (fails) throw new Error(PRIVATE_MARKER);
      return { tasks, hasMore: false };
    });
    const invocation = h.run(toolArgs);
    await vi.waitFor(() => expect(h.stdout.mock.calls.length > 0).toBe(true));
    const exitedBeforeMirror = h.exitCodes.length > 0;
    const bytesBeforeRelease = h.bytes();
    gate.resolve();
    const result = await invocation;
    await vi.waitFor(() => expect(fails ? h.stderr.mock.calls.length > 0 : h.bytes() !== h.original).toBe(true));
    expect.soft(exitedBeforeMirror).toBe(false);
    expect.soft(bytesBeforeRelease === h.original).toBe(true);
    expect.soft(result).toEqual({ code: 0, escaped: false });
    expect.soft(h.exitCodes).toEqual([0]);
    expect.soft(h.safe()).toBe(true);
    if (fails) expect(h.bytes() === h.original).toBe(true);
    else expect(h.read().tasks.reduce((count, task) => count + task.subtasks.length, 0)).toBe(53);
  });
});
