/** Keep filesystem helpers inside the explicitly selected mirror directory. */
import { afterEach, describe, expect, it } from "vitest";
import { writeFileSync, readFileSync, symlinkSync } from "node:fs";
import { join } from "node:path";
import { readMirror } from "../src/mirror-file.js";
import { syncHarness, restoreSyncTest } from "./fixtures/sync-regression-harness.js";

afterEach(restoreSyncTest);

describe("mirror path boundaries", () => {
  it.each(["absolute", "parent traversal"])("rejects %s outside the mirror directory before API access", async (form) => {
    const h = syncHarness();
    const outside = join(h.root, "outside.json");
    writeFileSync(outside, h.original);
    const path = form === "absolute" ? outside : `${h.directory}/../outside.json`;
    await expect(h.sync.syncEntity("proj1", "project", path)).rejects.toThrow();
    expect(readFileSync(outside, "utf8") === h.original).toBe(true);
    expect(h.getCalls()).toHaveLength(0);
  });

  it("rejects a mirror symlink leading outside the selected directory", () => {
    const h = syncHarness();
    const outside = join(h.root, "outside.json");
    writeFileSync(outside, h.original);
    const linked = join(h.directory, "escape.json");
    symlinkSync(outside, linked);
    expect(() => readMirror(linked)).toThrow();
    expect(readFileSync(outside, "utf8") === h.original).toBe(true);
  });

  it("rejects a non-mirror filename even if it contains valid mirror JSON", () => {
    const h = syncHarness();
    const path = join(h.directory, "secret.txt");
    writeFileSync(path, h.original);
    expect(() => readMirror(path)).toThrow();
  });
});
