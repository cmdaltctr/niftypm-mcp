import { afterEach, describe, expect, it, vi } from "vitest";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { cliHarness, controls, restoreCliTest, turn } from "./fixtures/cli-regression-harness.js";

const bootstrap = vi.hoisted(() => ({
  tools: new Map<string, { execute: (args: any) => Promise<string> }>(),
  starts: [] as any[],
}));

// Replace only the external server transport. Registration and tool execution remain real.
vi.mock("fastmcp", () => ({
  FastMCP: class {
    addTool(tool: { name: string; execute: (args: any) => Promise<string> }) {
      bootstrap.tools.set(tool.name, tool);
    }
    start(options: unknown) { bootstrap.starts.push(options); return Promise.resolve(); }
  },
}));

afterEach(restoreCliTest);

async function start(transport: string) {
  bootstrap.tools.clear();
  bootstrap.starts = [];
  vi.stubEnv("TRANSPORT", transport);
  vi.stubEnv("PORT", "18080");
  process.argv = ["node", "synthetic-server"];
  vi.resetModules();
  await import("../src/index.js");
}

describe("real Node entrypoint automatic-sync consent", () => {
  for (const transport of ["stdio", "http"]) {
    it.each([undefined, "false", "true"])(`${transport} with opt-in %s gates mutation-triggered GETs and writes`, async (autoSync) => {
      const h = cliHarness({ autoSync });
      await start(transport);
      expect.soft(bootstrap.starts.length).toBe(1);
      expect.soft(bootstrap.starts[0].transportType).toBe(transport === "http" ? "httpStream" : "stdio");
      expect.soft(h.calls.length).toBe(0);
      const result = await bootstrap.tools.get("niftypm_update_task")!.execute({ task_id: "task1", name: "Synthetic update" });
      expect.soft(JSON.parse(result).cloud === "ok").toBe(true);
      if (autoSync === "true") {
        await vi.waitFor(() => expect(h.bytes() !== h.original).toBe(true));
        expect.soft(h.getCalls().length > 0).toBe(true);
        expect.soft(h.read().tasks.length).toBe(48);
        expect.soft(h.read().tasks.reduce((count, task) => count + task.subtasks.length, 0)).toBe(53);
        expect(h.backups().some((bytes) => bytes === h.original)).toBe(true);
      } else {
        await turn();
        expect.soft(h.getCalls().length).toBe(0);
        expect.soft(controls.writes.length).toBe(0);
        expect(h.bytes() === h.original).toBe(true);
      }
    });

    it(`${transport} disables automatic writes for duplicate project mirrors`, async () => {
      const h = cliHarness({ autoSync: "true" });
      writeFileSync(join(h.directory, "duplicate.json"), h.original);
      controls.writes = [];
      await start(transport);
      await bootstrap.tools.get("niftypm_update_task")!.execute({ task_id: "task1", name: "Synthetic update" });
      await turn();
      expect.soft(h.getCalls().length).toBe(0);
      expect.soft(controls.writes.length).toBe(0);
      expect.soft(h.bytes() === h.original).toBe(true);
      expect(h.stderr.mock.calls.length > 0).toBe(true);
    });
  }
});
