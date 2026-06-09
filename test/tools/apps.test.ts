/**
 * Tool registration tests for Apps
 * Verifies tool names, parameter schemas, and endpoint mapping
 */

import { describe, it, expect } from "vitest";
import { registerAppsTools } from "../../src/tools/apps.js";
import { createMockServer, createMockClient } from "../helpers.js";

describe("registerAppsTools", () => {
  const server = createMockServer();
  const client = createMockClient();

  registerAppsTools(
    server as Parameters<typeof registerAppsTools>[0],
    client as unknown as Parameters<typeof registerAppsTools>[1],
  );

  it("should register 2 app tools", () => {
    expect(server.addTool).toHaveBeenCalledTimes(2);
  });

  it("should register tools with correct names", () => {
    const names = server.getToolNames();
    expect(names).toContain("niftypm_list_apps");
    expect(names).toContain("niftypm_get_app");
  });

  describe("niftypm_list_apps", () => {
    const tool = server.getTool("niftypm_list_apps")!;

    it("should call GET /api/v1.0/apps with required limit/offset defaults", async () => {
      // NiftyPM requires limit + offset query params; Zod applies the
      // defaults at runtime, so parse through the schema first (as FastMCP does).
      const parsed = tool.parameters.parse({});
      await tool.execute(parsed);

      expect(client.get).toHaveBeenCalledWith("/api/v1.0/apps", {
        limit: 25,
        offset: 0,
      });
    });
  });

  describe("niftypm_get_app", () => {
    const tool = server.getTool("niftypm_get_app")!;

    it("should call GET /api/v1.0/apps/:id", async () => {
      await tool.execute({ app_id: "app-123" });

      expect(client.get).toHaveBeenCalledWith("/api/v1.0/apps/app-123");
    });
  });
});
