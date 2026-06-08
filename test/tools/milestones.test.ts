/**
 * Tool registration tests for Milestones
 * Verifies tool names, parameter schemas, and endpoint mapping
 */

import { describe, it, expect } from "vitest";
import { registerMilestonesTools } from "../../src/tools/milestones.js";
import { createMockServer, createMockClient } from "../helpers.js";

describe("registerMilestonesTools", () => {
  const server = createMockServer();
  const client = createMockClient();

  registerMilestonesTools(server as any, client as any);

  it("should register 6 milestone tools", () => {
    expect(server.addTool).toHaveBeenCalledTimes(6);
  });

  it("should register tools with correct names", () => {
    const names = server.getToolNames();
    expect(names).toContain("niftypm_list_milestones");
    expect(names).toContain("niftypm_get_milestone");
    expect(names).toContain("niftypm_create_milestone");
    expect(names).toContain("niftypm_update_milestone");
    expect(names).toContain("niftypm_delete_milestone");
    expect(names).toContain("niftypm_archive_milestone");
  });

  describe("niftypm_list_milestones", () => {
    const tool = server.getTool("niftypm_list_milestones")!;

    it("should call GET /api/v1.0/milestones with params", async () => {
      await tool.execute({ project_id: "proj-1" });

      expect(client.get).toHaveBeenCalledWith("/api/v1.0/milestones", {
        project_id: "proj-1",
      });
    });
  });

  describe("niftypm_get_milestone", () => {
    const tool = server.getTool("niftypm_get_milestone")!;

    it("should call GET /api/v1.0/milestones/:id", async () => {
      await tool.execute({ milestone_id: "ms-123" });

      expect(client.get).toHaveBeenCalledWith("/api/v1.0/milestones/ms-123");
    });
  });

  describe("niftypm_create_milestone", () => {
    const tool = server.getTool("niftypm_create_milestone")!;

    it("should call POST /api/v1.0/milestones with body", async () => {
      const params = {
        name: "Sprint 1",
        project_id: "proj-1",
        due_date: "2025-01-31",
      };
      await tool.execute(params);

      expect(client.post).toHaveBeenCalledWith("/api/v1.0/milestones", params);
    });
  });

  describe("niftypm_update_milestone", () => {
    const tool = server.getTool("niftypm_update_milestone")!;

    it("should call PUT /api/v1.0/milestones/:id with remaining params", async () => {
      await tool.execute({ milestone_id: "ms-1", name: "Updated Sprint" });

      expect(client.put).toHaveBeenCalledWith("/api/v1.0/milestones/ms-1", {
        name: "Updated Sprint",
      });
    });
  });

  describe("niftypm_delete_milestone", () => {
    const tool = server.getTool("niftypm_delete_milestone")!;

    it("should call DELETE /api/v1.0/milestones/:id", async () => {
      await tool.execute({ milestone_id: "ms-1" });

      expect(client.delete).toHaveBeenCalledWith("/api/v1.0/milestones/ms-1");
    });
  });

  describe("niftypm_archive_milestone", () => {
    const tool = server.getTool("niftypm_archive_milestone")!;

    it("should call POST /api/v1.0/milestones/:id/archive", async () => {
      await tool.execute({ milestone_id: "ms-1" });

      expect(client.post).toHaveBeenCalledWith(
        "/api/v1.0/milestones/ms-1/archive"
      );
    });
  });
});
