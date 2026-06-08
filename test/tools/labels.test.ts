/**
 * Tool registration tests for Labels
 * Verifies tool names, parameter schemas, and endpoint mapping
 */

import { describe, it, expect } from "vitest";
import { registerLabelsTools } from "../../src/tools/labels.js";
import { createMockServer, createMockClient } from "../helpers.js";

describe("registerLabelsTools", () => {
  const server = createMockServer();
  const client = createMockClient();

  registerLabelsTools(server as any, client as any);

  it("should register 5 label tools", () => {
    expect(server.addTool).toHaveBeenCalledTimes(5);
  });

  it("should register tools with correct names", () => {
    const names = server.getToolNames();
    expect(names).toContain("niftypm_list_labels");
    expect(names).toContain("niftypm_get_label");
    expect(names).toContain("niftypm_create_label");
    expect(names).toContain("niftypm_update_label");
    expect(names).toContain("niftypm_delete_label");
  });

  describe("niftypm_list_labels", () => {
    const tool = server.getTool("niftypm_list_labels")!;

    it("should call GET /api/v1.0/labels with params", async () => {
      await tool.execute({ project_id: "proj-1" });

      expect(client.get).toHaveBeenCalledWith("/api/v1.0/labels", {
        project_id: "proj-1",
      });
    });
  });

  describe("niftypm_get_label", () => {
    const tool = server.getTool("niftypm_get_label")!;

    it("should call GET /api/v1.0/labels/:id", async () => {
      await tool.execute({ label_id: "label-123" });

      expect(client.get).toHaveBeenCalledWith("/api/v1.0/labels/label-123");
    });
  });

  describe("niftypm_create_label", () => {
    const tool = server.getTool("niftypm_create_label")!;

    it("should call POST /api/v1.0/labels with body", async () => {
      const params = { name: "Bug", color: "#ff0000", project_id: "proj-1" };
      await tool.execute(params);

      expect(client.post).toHaveBeenCalledWith("/api/v1.0/labels", params);
    });
  });

  describe("niftypm_update_label", () => {
    const tool = server.getTool("niftypm_update_label")!;

    it("should call PUT /api/v1.0/labels/:id with remaining params", async () => {
      await tool.execute({ label_id: "label-1", name: "Updated" });

      expect(client.put).toHaveBeenCalledWith("/api/v1.0/labels/label-1", {
        name: "Updated",
      });
    });
  });

  describe("niftypm_delete_label", () => {
    const tool = server.getTool("niftypm_delete_label")!;

    it("should call DELETE /api/v1.0/labels/:id", async () => {
      await tool.execute({ label_id: "label-1" });

      expect(client.delete).toHaveBeenCalledWith("/api/v1.0/labels/label-1");
    });
  });
});
