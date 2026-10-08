import { afterEach, describe, expect, it } from "vitest";
import { tasks, labels, taskgroups, milestones, LAST_SYNCED } from "./fixtures/sync-regression-fixtures.js";
import { syncHarness, restoreSyncTest } from "./fixtures/sync-regression-harness.js";

afterEach(restoreSyncTest);

describe("LocalSync complete legacy envelopes", () => {
  it("fetches all task pages, advancing offset by row count until hasMore=false", async () => {
    const h = syncHarness();
    h.http((url) => {
      if (url.pathname !== "/api/v1.0/tasks") return;
      const offset = Number(url.searchParams.get("offset") || 0);
      return { tasks: tasks.slice(offset, offset + 24), hasMore: offset < 24 };
    });
    await h.mutate();
    const reads = h.getCalls().filter(({ url }) => url.pathname === "/api/v1.0/tasks");
    expect.soft(reads.map(({ url }) => Number(url.searchParams.get("offset") || 0))).toEqual([0, 24]);
    expect.soft(reads.every(({ url }) => Number(url.searchParams.get("limit")) > 0)).toBe(true);
    expect(h.read().tasks.map((t) => t.id)).toEqual(tasks.map((t) => t.id));
  });

  it("fetches both milestone variants completely and merges cross-variant duplicate IDs", async () => {
    const h = syncHarness();
    h.http((url) => {
      if (url.pathname !== "/api/v1.0/milestones") return;
      const offset = Number(url.searchParams.get("offset") || 0);
      const rows = url.searchParams.get("is_list") === "true" ? [milestones[0], milestones[6]] : milestones.slice(0, 6);
      return { items: rows.slice(offset, offset + 2), hasMore: offset + 2 < rows.length };
    });
    await h.mutate("/api/v1.0/milestones/mile1");
    expect.soft(h.read().milestones.map((m) => m.id).sort()).toEqual(milestones.map((m) => m.id).sort());
    const regular = h.getCalls().filter(({ url }) => url.pathname.endsWith("/milestones") && url.searchParams.get("is_list") !== "true");
    expect(regular.map(({ url }) => Number(url.searchParams.get("offset") || 0))).toEqual([0, 2, 4]);
  });

  it.each(["labels", "taskgroups"] as const)("%s optional hasMore supports short-page completion", async (endpoint) => {
    const h = syncHarness();
    const rows = endpoint === "labels" ? labels : taskgroups;
    h.http((url) => url.pathname === `/api/v1.0/${endpoint}` ? { items: rows } : undefined);
    await h.mutate(`/api/v1.0/${endpoint}/${rows[0].id}`);
    expect(h.read()[endpoint === "labels" ? "labels" : "task_lists"].map((r) => r.id)).toEqual(rows.map((r) => r.id));
  });

  it.each(["labels", "taskgroups"] as const)("%s missing optional flag fetches another page when the first page is full", async (endpoint) => {
    const h = syncHarness();
    let limitSeen = 0;
    const rows = endpoint === "labels" ? labels : taskgroups;
    h.http((url) => {
      if (url.pathname !== `/api/v1.0/${endpoint}`) return;
      const limit = Number(url.searchParams.get("limit") || 100);
      limitSeen = limit;
      const offset = Number(url.searchParams.get("offset") || 0);
      if (offset > 0) return { items: [] };
      const padding = Array.from({ length: Math.max(0, limit - rows.length) }, (_, i) => ({
        id: `extra${i + 1}`, name: `Synthetic extra ${i + 1}`, color: "#000000", order: i + 20, project_id: "proj1",
      }));
      return { items: [...rows, ...padding] };
    });
    await h.mutate(`/api/v1.0/${endpoint}/${rows[0].id}`);
    const reads = h.getCalls().filter(({ url }) => url.pathname === `/api/v1.0/${endpoint}`);
    expect.soft(reads.map(({ url }) => Number(url.searchParams.get("offset") || 0))).toEqual([0, limitSeen]);
    expect(h.read()[endpoint === "labels" ? "labels" : "task_lists"].length).toBeGreaterThan(0);
  });

  const invalidTasks: [string, unknown][] = [
    ["bare API array", tasks], ["unknown wrapper", { data: tasks, hasMore: false }],
    ["missing required hasMore", { tasks }], ["string hasMore", { tasks, hasMore: "false" }],
    ["null hasMore", { tasks, hasMore: null }], ["non-array tasks", { tasks: {}, hasMore: false }],
    ["missing ID", { tasks: [{ name: "Synthetic invalid task" }], hasMore: false }],
    ["numeric ID", { tasks: [{ ...tasks[0], id: 1 }], hasMore: false }],
    ["empty ID", { tasks: [{ ...tasks[0], id: "" }], hasMore: false }],
    ["invalid consumed name", { tasks: [{ ...tasks[0], name: 123 }], hasMore: false }],
    ["invalid consumed labels", { tasks: [{ ...tasks[0], labels: "lab1" }], hasMore: false }],
    ["foreign project record", { tasks: [{ ...tasks[0], project_id: "proj2" }], hasMore: false }],
    ["conflicting ownership fields", { tasks: [{ ...tasks[0], project: "proj2" }], hasMore: false }],
    ["duplicate IDs within a page", { tasks: [tasks[0], tasks[0]], hasMore: false }],
    ["empty page claiming more", { tasks: [], hasMore: true }],
  ];
  it.each(invalidTasks)("rejects %s without changing bytes or timestamp", async (_name, response) => {
    const h = syncHarness();
    h.http((url) => url.pathname === "/api/v1.0/tasks" ? response : undefined);
    await h.mutate();
    expect.soft(h.bytes() === h.original).toBe(true);
    expect(h.read().meta.last_synced === LAST_SYNCED).toBe(true);
  });

  it.each([
    ["labels", { hasMore: 0 }, labels],
    ["taskgroups", { hasMore: "false" }, taskgroups],
    ["milestones", {}, milestones],
    ["milestones", { hasMore: "false" }, milestones],
  ] as const)("rejects invalid %s pagination contract %j", async (endpoint, flags, rows) => {
    const h = syncHarness();
    h.http((url) => url.pathname === `/api/v1.0/${endpoint}` ? { items: rows, ...flags } : undefined);
    await h.mutate(`/api/v1.0/${endpoint}/${rows[0].id}`);
    expect(h.bytes() === h.original).toBe(true);
  });

  it.each(["labels", "taskgroups", "milestones"] as const)("rejects bare %s arrays", async (endpoint) => {
    const h = syncHarness();
    const rows = endpoint === "labels" ? labels : endpoint === "taskgroups" ? taskgroups : milestones;
    h.http((url) => url.pathname === `/api/v1.0/${endpoint}` ? rows : undefined);
    await h.mutate(`/api/v1.0/${endpoint}/${rows[0].id}`);
    expect(h.bytes() === h.original).toBe(true);
  });

  it.each(["repeated IDs", "HTTP failure", "empty continuation"])("rejects a later task page with %s", async (fault) => {
    const h = syncHarness();
    let laterPageSeen = false;
    h.http((url) => {
      if (url.pathname !== "/api/v1.0/tasks") return;
      if (Number(url.searchParams.get("offset") || 0) === 0) return { tasks: tasks.slice(0, 24), hasMore: true };
      laterPageSeen = true;
      if (fault === "HTTP failure") return new Response(null, { status: 503, statusText: "Synthetic unavailable" });
      return { tasks: fault === "repeated IDs" ? tasks.slice(0, 24) : [], hasMore: true };
    });
    await h.mutate();
    expect.soft(laterPageSeen).toBe(true);
    expect.soft(h.bytes() === h.original).toBe(true);
    expect(h.read().meta.last_synced === LAST_SYNCED).toBe(true);
  });

  it("rejects a malformed supporting collection before committing tasks", async () => {
    const h = syncHarness();
    h.http((url) => url.pathname === "/api/v1.0/labels" ? { items: [{ id: 7 }], hasMore: false } : undefined);
    await h.mutate();
    expect(h.bytes() === h.original).toBe(true);
  });
});
