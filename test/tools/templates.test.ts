/**
 * Tool registration tests for Templates
 * Verifies tool names, parameter schemas, and endpoint mapping
 */

import { describe, it, expect } from "vitest";
import { registerTemplatesTools } from "../../src/tools/templates.js";
import { createMockServer, createMockClient } from "../helpers.js";

describe("registerTemplatesTools", () => {
  const server = createMockServer();
  const client = createMockClient();

  registerTemplatesTools(
    server as Parameters<typeof registerTemplatesTools>[0],
    client as unknown as Parameters<typeof registerTemplatesTools>[1],
  );

  it("should register 1 template tool", () => {
    expect(server.addTool).toHaveBeenCalledTimes(1);
  });

  it("should register tools with correct names", () => {
    const names = server.getToolNames();
    expect(names).toContain("niftypm_list_templates");
  });

  describe("niftypm_list_templates", () => {
    const tool = server.getTool("niftypm_list_templates")!;

    it("should call GET /api/v1.0/templates", async () => {
      await tool.execute({});

      expect(client.get).toHaveBeenCalledWith("/api/v1.0/templates");
    });
  });
});
