/**
 * Tool registration tests for Custom Fields
 * Verifies tool names, parameter schemas, and endpoint mapping
 */

import { describe, it, expect } from "vitest";
import { registerFieldsTools } from "../../src/tools/fields.js";
import { createMockServer, createMockClient } from "../helpers.js";

describe("registerFieldsTools", () => {
  const server = createMockServer();
  const client = createMockClient();

  registerFieldsTools(
    server as Parameters<typeof registerFieldsTools>[0],
    client as unknown as Parameters<typeof registerFieldsTools>[1],
  );

  it("should register 2 field tools", () => {
    expect(server.addTool).toHaveBeenCalledTimes(2);
  });

  it("should register tools with correct names", () => {
    const names = server.getToolNames();
    expect(names).toContain("niftypm_list_custom_fields");
    expect(names).toContain("niftypm_get_custom_field");
  });

  describe("niftypm_list_custom_fields", () => {
    const tool = server.getTool("niftypm_list_custom_fields")!;

    it("should call GET /api/v1.0/fields with params", async () => {
      await tool.execute({ project_id: "proj-1" });

      expect(client.get).toHaveBeenCalledWith("/api/v1.0/fields", {
        project_id: "proj-1",
      });
    });
  });

  describe("niftypm_get_custom_field", () => {
    const tool = server.getTool("niftypm_get_custom_field")!;

    it("should call GET /api/v1.0/fields/:id", async () => {
      await tool.execute({ field_id: "field-123" });

      expect(client.get).toHaveBeenCalledWith("/api/v1.0/fields/field-123");
    });
  });
});
