import { afterEach, describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { mirrorFixture, tasks } from "./fixtures/sync-regression-fixtures.js";
import { syncHarness, restoreSyncTest } from "./fixtures/sync-regression-harness.js";

afterEach(restoreSyncTest);

describe("LocalSync consent and ownership through real HTTP hooks", () => {
  it.each([undefined, "false", "TRUE", "1", "true"])("requires exact NIFTYPM_AUTO_SYNC=true (%s)", async (setting) => {
    const h = syncHarness({ autoSync: setting });
    const discovered = h.sync.discover();
    await h.mutate("/api/v1.0/projects/proj1", {}, "PUT");
    if (setting === "true") {
      expect(h.getCalls()).toHaveLength(1);
      expect(h.read().project.name).toBe("Cloud synthetic project");
    } else {
      expect.soft(discovered.size).toBe(0);
      expect.soft(h.getCalls()).toHaveLength(0);
      expect(h.bytes() === h.original).toBe(true);
    }
  });

  it("duplicate project files disable that project while another project remains usable", async () => {
    const h = syncHarness();
    writeFileSync(join(h.directory, "duplicate.json"), h.original);
    const other = mirrorFixture();
    other.meta.niftypm_project_id = "proj2";
    const otherFile = join(h.directory, "other.json");
    writeFileSync(otherFile, JSON.stringify(other));
    const discovered = h.sync.discover();
    expect.soft(discovered.has("proj1")).toBe(false);
    expect.soft(discovered.get("proj2")).toBe(otherFile);
    await h.mutate("/api/v1.0/projects/proj1", {});
    expect.soft(h.getCalls()).toHaveLength(0);
    expect(h.bytes() === h.original).toBe(true);
  });

  it("rediscovery drops stale project mappings and entity ownership", async () => {
    const h = syncHarness();
    const other = mirrorFixture();
    other.meta.niftypm_project_id = "proj2";
    writeFileSync(h.filepath, JSON.stringify(other));
    const rebound = h.sync.discover();
    expect.soft(rebound.has("proj1")).toBe(false);
    expect(rebound.get("proj2")).toBe(h.filepath);
  });

  it("shared workspace label without project evidence writes neither mirror", async () => {
    const h = syncHarness();
    const second = mirrorFixture();
    second.meta.niftypm_project_id = "proj2";
    writeFileSync(join(h.directory, "other.json"), JSON.stringify(second));
    h.sync.discover();
    h.response({ id: "lab1" });
    await h.mutate("/api/v1.0/labels/lab1", {}, "DELETE");
    expect(h.getCalls()).toHaveLength(0);
    expect(h.bytes() === h.original).toBe(true);
  });

  it("shared label can refresh only the explicitly agreed project", async () => {
    const h = syncHarness();
    const second = mirrorFixture();
    second.meta.niftypm_project_id = "proj2";
    writeFileSync(join(h.directory, "other.json"), JSON.stringify(second));
    h.sync.discover();
    h.response({ id: "lab1", project_id: "proj1" });
    await h.mutate("/api/v1.0/labels/lab1", { project_id: "proj1" });
    expect(h.read().labels).toHaveLength(7);
    expect(h.getCalls().every(({ url }) => !url.searchParams.has("project_id"))).toBe(true);
  });

  it.each([
    ["request versus response", { project_id: "proj2" }, { project_id: "proj1" }],
    ["cached owner versus response", {}, { project_id: "proj2" }],
    ["cached owner versus request", { project_id: "proj2" }, {}],
    ["response fields disagree", {}, { project_id: "proj1", project: "proj2" }],
    ["request fields disagree", { project_id: "proj1", project: "proj2" }, {}],
  ])("conflicting %s stops before fetching or writing", async (_name, request, response) => {
    const h = syncHarness();
    const second = mirrorFixture();
    second.meta.niftypm_project_id = "proj2";
    second.tasks = [];
    second.labels = [];
    second.task_lists = [];
    second.milestones = [];
    writeFileSync(join(h.directory, "other.json"), JSON.stringify(second));
    h.sync.discover();
    h.response(response);
    await h.mutate("/api/v1.0/tasks/task1", request);
    expect.soft(h.getCalls()).toHaveLength(0);
    expect(h.bytes() === h.original).toBe(true);
  });

  it("rechecks the current snapshot project ID after discovery", async () => {
    const h = syncHarness();
    const moved = mirrorFixture();
    moved.meta.niftypm_project_id = "proj2";
    const movedBytes = JSON.stringify(moved, null, 1) + "\n";
    writeFileSync(h.filepath, movedBytes);
    await h.mutate("/api/v1.0/projects/proj1", {});
    expect(h.bytes() === movedBytes).toBe(true);
  });

  it("rejects fetched project metadata with a different ID", async () => {
    const h = syncHarness();
    h.http((url) => url.pathname === "/api/v1.0/projects/proj1" ? { id: "proj2", name: "Foreign synthetic project" } : undefined);
    await h.mutate("/api/v1.0/projects/proj1", {});
    expect(h.bytes() === h.original).toBe(true);
  });

  it("a new task committed through the writer is indexed for the next body-less mutation", async () => {
    const h = syncHarness();
    const added = { ...tasks[0], id: "newTask", nice_id: "SYN-49", name: "New synthetic task" };
    let taskReads = 0;
    h.http((url) => {
      if (url.pathname !== "/api/v1.0/tasks") return;
      taskReads++;
      return { tasks: [...tasks, added], hasMore: false };
    });
    await h.mutate();
    h.response({ id: "newTask" });
    await h.mutate("/api/v1.0/tasks/newTask", {}, "DELETE");
    expect.soft(taskReads).toBe(2);
    expect(h.read().tasks.map((t) => t.id)).toContain("newTask");
  });

  it("deleted task ownership is removed from the index after a successful commit", async () => {
    const h = syncHarness();
    h.http((url) => url.pathname === "/api/v1.0/tasks" ? { tasks: tasks.slice(1), hasMore: false } : undefined);
    await h.mutate("/api/v1.0/tasks/task2");
    const getCount = h.getCalls().length;
    h.response({ id: "task1" });
    await h.mutate("/api/v1.0/tasks/task1", {});
    expect(h.getCalls()).toHaveLength(getCount);
  });

  it("identifies an unsupported mutation safely without echoing its URL", async () => {
    const h = syncHarness();
    const privateValue = "synthetic-private-url-value";
    await h.mutate(`/api/v1.0/docs/doc1?value=${privateValue}`, {});
    const messages = h.stderr.mock.calls.flat().map(String);
    expect(messages.some((message) => message.includes("Unsupported PUT operation skipped"))).toBe(true);
    expect(messages.some((message) => message.includes(privateValue))).toBe(false);
    expect(h.getCalls()).toHaveLength(0);
    expect(h.bytes() === h.original).toBe(true);
  });

  it.each(["/api/v1.0/docs/doc1", "/api/v1.0/tasks/unknownEntity"])("unmapped or unresolvable %s skips without mirror changes", async (endpoint) => {
    const h = syncHarness();
    h.response({ id: "unknownEntity" });
    await h.mutate(endpoint, {});
    expect(h.getCalls()).toHaveLength(0);
    expect(h.bytes() === h.original).toBe(true);
  });
});
