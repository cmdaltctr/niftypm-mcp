/** Exercise the document-domain switch through the actual Node server bootstrap. */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const server = vi.hoisted(() => ({ names: [] as string[], start: vi.fn() }));
vi.mock("fastmcp", () => ({
  FastMCP: class {
    addTool(tool: { name: string }) { server.names.push(tool.name); }
    start = server.start;
  },
}));

const originalArgv = process.argv;
beforeEach(() => {
  vi.resetModules();
  server.names.length = 0;
  server.start.mockClear();
  process.argv = ["node", "src/index.ts"];
  vi.stubEnv("NIFTYPM_API_TOKEN", "synthetic-domain-credential");
  vi.stubEnv("NIFTYPM_AUTO_SYNC", "false");
  vi.stubEnv("ENABLE_CHECKLISTS", "false");
  vi.stubEnv("DISABLED_TOOLS", "");
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  process.argv = originalArgv;
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("document domain in Node transports", () => {
  it.each([
    { enabled: "false", transport: "stdio" }, { enabled: "true", transport: "stdio" },
    { enabled: "false", transport: "http" }, { enabled: "true", transport: "http" },
  ])("honours ENABLE_DOCUMENTS=$enabled in $transport", async ({ enabled, transport }) => {
    vi.stubEnv("ENABLE_DOCUMENTS", enabled);
    vi.stubEnv("TRANSPORT", transport);
    const http = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Unexpected HTTP"));
    await import("../src/index.js");
    expect(server.names.includes("niftypm_get_document")).toBe(enabled === "true");
    expect(server.names.includes("niftypm_get_document_content")).toBe(enabled === "true");
    expect(server.start).toHaveBeenCalledTimes(1);
    expect(http).not.toHaveBeenCalled();
  });
});
