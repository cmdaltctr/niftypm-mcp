import { afterEach, describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import { labels, tasks, taskgroups, milestones, mirrorFixture, LAST_SYNCED } from "./fixtures/sync-regression-fixtures.js";
import { syncHarness, restoreSyncTest } from "./fixtures/sync-regression-harness.js";

afterEach(restoreSyncTest);

describe("production legacy LocalSync regression", () => {
  it("real cloud mutation and captured hook retain the populated 48/7/6/7 mirror", async () => {
    const h = syncHarness();
    const before = h.read();
    const result = await h.mutate();
    const after = h.read();
    // Counts and a boolean only: retain the old clobber evidence without mirror text.
    console.info("Synthetic clobber evidence", {
      counts: [after.tasks.length, after.labels.length, after.task_lists.length, after.milestones.length],
      timestampAdvanced: after.meta.last_synced !== LAST_SYNCED,
    });
    expect(result).toEqual({ id: "task1", project_id: "proj1" });
    expect(h.captured).toHaveLength(1);
    expect.soft(after.tasks).toHaveLength(48);
    expect.soft(after.labels).toHaveLength(7);
    expect.soft(after.task_lists).toHaveLength(6);
    expect.soft(after.milestones).toHaveLength(7);
    expect.soft(after.meta.created).toBe(before.meta.created);
    expect.soft(after.custom_top_level).toEqual(before.custom_top_level);
    expect(h.getCalls().every(({ url }) => !url.pathname.startsWith("/api/v3/"))).toBe(true);
    expect(h.getCalls().find(({ url }) => url.pathname === "/api/v1.0/tasks")?.url.searchParams.get("project_id")).toBe("proj1");
  });

  it("task-only refresh keeps 53 nested children, local fields and every unrelated section", async () => {
    const h = syncHarness();
    const before = h.read();
    expect(before.tasks.reduce((sum, t) => sum + t.subtasks.length, 0)).toBe(53);
    await h.mutate();
    const after = h.read();
    expect.soft(after.tasks).toHaveLength(48);
    expect.soft(after.tasks.map((t) => t.id)).toEqual(tasks.map((t) => t.id));
    expect.soft(after.tasks[0]?.name).toBe("Cloud synthetic task 1");
    expect.soft(after.tasks[0]?.story_points).toBe(3);
    expect.soft(after.tasks[1]?.dependency).toBe("SYN-1");
    expect.soft(after.tasks[0]?.task_list).toBe("Synthetic list 1");
    expect.soft(after.tasks[0]?.milestone).toBe("Synthetic milestone 1");
    expect.soft(after.tasks[0]?.labels).toEqual(["Synthetic label 1"]);
    expect.soft(after.tasks[0]?.due_date).toBe("2030-05-06");
    expect.soft(after.tasks.map((t) => t.subtasks)).toEqual(before.tasks.map((t) => t.subtasks));
    expect.soft(after.tasks.map((t) => t.subtask_details)).toEqual(before.tasks.map((t) => t.subtask_details));
    expect.soft(after.tasks[0]?.local_note).toBe(before.tasks[0].local_note);
    for (const key of ["labels", "task_lists", "milestones", "project", "_validation_checklist", "custom_top_level"] as const) {
      expect.soft(after[key]).toEqual(before[key]);
    }
    expect(after.meta.created).toBe(before.meta.created);
    expect(after.meta.last_synced).not.toBe(LAST_SYNCED);
  });

  it("label-only refresh uses local IDs, renames, removes absent IDs and leaves tasks untouched", async () => {
    const h = syncHarness();
    const before = h.read();
    const workspace = [
      { ...labels[0], name: "Renamed synthetic label", color: "#abcdef" },
      ...labels.slice(1, 6), { id: "workspaceOnly", name: "Unrelated synthetic label", color: "#000000" },
    ];
    h.http((url) => url.pathname === "/api/v1.0/labels" ? { items: workspace, hasMore: false } : undefined);
    await h.mutate("/api/v1.0/labels/lab1");
    const after = h.read();
    expect.soft(after.labels.map((l) => l.id)).toEqual(labels.slice(0, 6).map((l) => l.id));
    expect.soft(after.labels[0]?.name).toBe("Renamed synthetic label");
    expect.soft(after.labels[0]?.color).toBe("#abcdef");
    expect.soft(after.tasks).toEqual(before.tasks);
    expect.soft(after.task_lists).toEqual(before.task_lists);
    expect(h.getCalls()).toHaveLength(1);
    expect(h.getCalls()[0].url.searchParams.has("project_id")).toBe(false);
  });

  it("preserves legacy string estimates without coercing their values", async () => {
    const h = syncHarness();
    h.http((url) => url.pathname === "/api/v1.0/tasks"
      ? { tasks: tasks.map((task) => ({ ...task, story_points: "3" })), hasMore: false } : undefined);
    await h.mutate();
    expect(h.read().tasks[0].story_points).toBe("3");
  });

  it("task reference labels use workspace scope without replacing local reference sections", async () => {
    const h = syncHarness();
    await h.mutate();
    const labelReads = h.getCalls().filter(({ url }) => url.pathname === "/api/v1.0/labels");
    expect(labelReads.length).toBeGreaterThan(0);
    expect(labelReads.every(({ url }) => !url.searchParams.has("project_id"))).toBe(true);
  });

  it.each(["tasks", "labels", "task_lists", "milestones"] as const)("refuses populated-to-empty %s with exact original bytes and timestamp", async (entity) => {
    const h = syncHarness();
    const endpoints = { tasks: "tasks", labels: "labels", task_lists: "taskgroups", milestones: "milestones" };
    const path = `/api/v1.0/${endpoints[entity]}`;
    h.http((url) => url.pathname === path ? { [entity === "tasks" ? "tasks" : "items"]: [], hasMore: false } : undefined);
    await h.mutate(`${path}/unknown1`);
    expect.soft(h.bytes() === h.original).toBe(true);
    expect(h.read().meta.last_synced === LAST_SYNCED).toBe(true);
  });

  it("already-empty sections accept validated empty responses", async () => {
    const h = syncHarness();
    const empty = mirrorFixture();
    empty.tasks = [];
    writeFileSync(h.filepath, JSON.stringify(empty));
    h.http((url) => url.pathname === "/api/v1.0/tasks" ? { tasks: [], hasMore: false } : undefined);
    await h.mutate();
    expect.soft(h.read().tasks).toEqual([]);
    expect.soft(h.read().labels).toEqual(empty.labels);
    expect(h.read().meta.last_synced).not.toBe(LAST_SYNCED);
  });

  it.each([
    ["taskgroups", "task_lists", taskgroups],
    ["milestones", "milestones", milestones],
  ] as const)("%s refresh changes only its owned section", async (endpoint, section, records) => {
    const h = syncHarness();
    const before = h.read();
    h.http((url) => {
      if (url.pathname !== `/api/v1.0/${endpoint}`) return;
      return { items: url.searchParams.get("is_list") === "true" ? [] : records.map((r) => ({ ...r, name: "Updated synthetic reference" })), hasMore: false };
    });
    await h.mutate(`/api/v1.0/${endpoint}/${records[0].id}`);
    const after = h.read();
    expect.soft(after[section]).toHaveLength(records.length);
    expect.soft(after[section][0]?.name).toBe("Updated synthetic reference");
    expect(after.tasks).toEqual(before.tasks);
    expect(after.project).toEqual(before.project);
    expect(after._validation_checklist).toEqual(before._validation_checklist);
  });
});
