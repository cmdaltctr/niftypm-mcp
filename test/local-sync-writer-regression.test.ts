import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { LocalSync } from "../src/local-sync.js";
import { syncHarness, restoreSyncTest, deferred } from "./fixtures/sync-regression-harness.js";

const disk = vi.hoisted(() => ({
  target: "", fault: "" as "" | "backup" | "temp" | "rename", injected: false,
  reads: [] as string[], writes: [] as { path: string; flag: unknown }[], renames: [] as string[],
}));

// Only selected filesystem faults are simulated. Every successful operation reaches the real filesystem.
vi.mock("node:fs", async (importOriginal) => {
  const fs = await importOriginal<typeof import("node:fs")>();
  return {
    ...fs,
    readFileSync: (...args: any[]) => {
      disk.reads.push(String(args[0]));
      return (fs.readFileSync as any)(...args);
    },
    writeFileSync: (...args: any[]) => {
      const path = String(args[0]);
      const flag = typeof args[2] === "object" ? args[2]?.flag : undefined;
      disk.writes.push({ path, flag });
      const adjacent = disk.target && dirname(path) === dirname(disk.target) && path !== disk.target;
      const backup = path.endsWith(".bak");
      if (adjacent && ((disk.fault === "backup" && backup) || (disk.fault === "temp" && !backup))) {
        disk.injected = true;
        throw new Error("Synthetic filesystem write failure");
      }
      return (fs.writeFileSync as any)(...args);
    },
    renameSync: (...args: any[]) => {
      disk.renames.push(String(args[0]));
      if (disk.fault === "rename" && String(args[1]) === disk.target) {
        disk.injected = true;
        throw new Error("Synthetic filesystem rename failure");
      }
      return (fs.renameSync as any)(...args);
    },
  };
});

afterEach(() => {
  disk.target = "";
  disk.fault = "";
  disk.injected = false;
  disk.reads = [];
  disk.writes = [];
  disk.renames = [];
  restoreSyncTest();
});

function backups(directory: string): string[] {
  return readdirSync(directory).filter((name) => name.endsWith(".bak"));
}

const nextTurn = () => new Promise<void>((resolve) => setImmediate(resolve));

describe("real LocalSync backed-up atomic writer", () => {
  it("keeps exact original bytes in exclusive unique backups and uses exclusive unique adjacent temp files", async () => {
    const h = syncHarness();
    disk.target = h.filepath;
    disk.writes = [];
    await h.mutate("/api/v1.0/projects/proj1", {});
    const firstCommit = h.bytes();
    await h.mutate("/api/v1.0/projects/proj1", {});
    const names = backups(h.directory);
    expect.soft(names).toHaveLength(2);
    const saved = names.map((name) => readFileSync(join(h.directory, name), "utf-8"));
    expect.soft(saved.includes(h.original)).toBe(true);
    expect.soft(saved.includes(firstCommit)).toBe(true);
    expect.soft(new Set(disk.renames).size).toBe(2);
    expect.soft(disk.renames.every((path) => dirname(path) === h.directory && path !== h.filepath)).toBe(true);
    expect.soft(disk.writes.length).toBe(4);
    expect.soft(disk.writes.every((write) => write.flag === "wx")).toBe(true);
    expect(h.sync.discover().get("proj1")).toBe(h.filepath);
  });

  it.each(["backup", "temp", "rename"] as const)("%s failure leaves exact mirror bytes and timestamp, retaining available backups", async (fault) => {
    const h = syncHarness();
    disk.target = h.filepath;
    disk.fault = fault;
    await h.mutate("/api/v1.0/projects/proj1", {});
    expect.soft(disk.injected).toBe(true);
    expect.soft(h.bytes() === h.original).toBe(true);
    expect.soft(h.read().meta.last_synced).toBe("2020-01-02T03:04:05Z");
    const names = backups(h.directory);
    if (fault === "backup") {
      expect(names).toHaveLength(0);
    } else {
      expect.soft(names).toHaveLength(1);
      expect(names.some((name) => readFileSync(join(h.directory, name), "utf-8") === h.original)).toBe(true);
    }
  });

  it("serialises read and fetch as well as write so concurrent section updates both survive", async () => {
    const h = syncHarness();
    const entered = deferred();
    const release = deferred();
    h.http(async (url) => {
      if (url.pathname !== "/api/v1.0/projects/proj1") return;
      entered.resolve();
      await release.promise;
      return { id: "proj1", name: "Queued synthetic project" };
    });
    disk.reads = [];
    const first = h.mutate("/api/v1.0/projects/proj1", {});
    await entered.promise;
    const readsAtFirstFetch = disk.reads.filter((path) => path === h.filepath).length;
    const second = h.mutate("/api/v1.0/taskgroups/group1");
    await nextTurn();
    const fetchedBeforeRelease = h.getCalls().some(({ url }) => url.pathname.endsWith("/taskgroups"));
    const readsBeforeRelease = disk.reads.filter((path) => path === h.filepath).length;
    release.resolve();
    await Promise.all([first, second]);
    expect.soft(fetchedBeforeRelease).toBe(false);
    expect.soft(readsBeforeRelease).toBe(readsAtFirstFetch);
    expect.soft(h.read().project.name).toBe("Queued synthetic project");
    expect(h.read().task_lists).toHaveLength(6);
  });

  it("shares the per-file queue between LocalSync instances", async () => {
    const h = syncHarness();
    const secondSync = new LocalSync(h.client);
    secondSync.discover();
    const entered = deferred();
    const release = deferred();
    h.http(async (url) => {
      if (url.pathname !== "/api/v1.0/projects/proj1") return;
      entered.resolve();
      await release.promise;
      return { id: "proj1", name: "Shared queue synthetic project" };
    });
    const first = h.sync.syncEntity("proj1", "project", h.filepath);
    await entered.promise;
    const second = secondSync.syncEntity("proj1", "task_lists", h.filepath);
    // Attach immediately so a rejected test operation cannot escape the harness.
    const settled = Promise.allSettled([first, second]);
    await nextTurn();
    const earlyFetch = h.getCalls().some(({ url }) => url.pathname.endsWith("/taskgroups"));
    release.resolve();
    await settled;
    expect.soft(earlyFetch).toBe(false);
    expect.soft(h.read().project.name).toBe("Shared queue synthetic project");
    expect(h.read().task_lists).toHaveLength(6);
  });

  it("a rejected operation releases the queue for a later valid update", async () => {
    const h = syncHarness();
    const entered = deferred();
    const release = deferred();
    h.http(async (url) => {
      if (url.pathname !== "/api/v1.0/tasks") return;
      entered.resolve();
      await release.promise;
      return { tasks: [], hasMore: true };
    });
    const rejected = h.mutate();
    await entered.promise;
    const recovered = h.mutate("/api/v1.0/projects/proj1", {});
    await nextTurn();
    const earlyFetch = h.getCalls().some(({ url }) => url.pathname.endsWith("/projects/proj1"));
    release.resolve();
    await Promise.all([rejected, recovered]);
    expect.soft(earlyFetch).toBe(false);
    expect.soft(h.read().tasks).toHaveLength(48);
    expect(h.read().project.name).toBe("Cloud synthetic project");
  });
});
