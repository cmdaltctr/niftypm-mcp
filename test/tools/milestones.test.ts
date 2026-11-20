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

  registerMilestonesTools(server as any, client as any, []);

  it("should register 9 milestone tools", () => {
    expect(server.addTool).toHaveBeenCalledTimes(9);
  });

  it("should register tools with correct names", () => {
    const names = server.getToolNames();
    expect(names).toContain("niftypm_list_milestones");
    expect(names).toContain("niftypm_get_milestone");
    expect(names).toContain("niftypm_create_milestone");
    expect(names).toContain("niftypm_update_milestone");
    expect(names).toContain("niftypm_delete_milestone");
    expect(names).toContain("niftypm_archive_milestone");
    expect(names).toContain("niftypm_move_milestone");
    expect(names).toContain("niftypm_tie_milestone_tasks");
    expect(names).toContain("niftypm_untie_milestone_tasks");
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
      const params = { name: "Sprint 1", project_id: "proj-1" };
      await tool.execute(params);

      expect(client.post).toHaveBeenCalledWith("/api/v1.0/milestones", params);
    });

    it("should send start_date and end_date as start and end", async () => {
      client.post.mockClear();
      await tool.execute({
        name: "Sprint 1",
        project_id: "proj-1",
        start_date: "2025-01-01",
        end_date: "2025-01-31",
      });

      expect(client.post).toHaveBeenCalledWith("/api/v1.0/milestones", {
        name: "Sprint 1",
        project_id: "proj-1",
        start: "2025-01-01",
        end: "2025-01-31",
      });
    });

    it("should map due_date to end and never forward due_date", async () => {
      client.post.mockClear();
      await tool.execute({ name: "Sprint 1", project_id: "proj-1", due_date: "2025-01-31" });

      expect(client.post).toHaveBeenCalledWith("/api/v1.0/milestones", {
        name: "Sprint 1",
        project_id: "proj-1",
        end: "2025-01-31",
      });
    });

    it("should let end_date win over due_date", async () => {
      client.post.mockClear();
      await tool.execute({
        name: "Sprint 1",
        project_id: "proj-1",
        due_date: "2025-02-15",
        end_date: "2025-01-31",
      });

      const body = client.post.mock.calls[0][1];
      expect(body.end).toBe("2025-01-31");
      expect(body).not.toHaveProperty("due_date");
      expect(body).not.toHaveProperty("end_date");
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

    it("should send start_date and end_date as start and end", async () => {
      client.put.mockClear();
      await tool.execute({
        milestone_id: "ms-1",
        start_date: "2025-01-01",
        end_date: "2025-01-31",
      });

      expect(client.put).toHaveBeenCalledWith("/api/v1.0/milestones/ms-1", {
        start: "2025-01-01",
        end: "2025-01-31",
      });
    });

    it("should map due_date to end and never forward due_date", async () => {
      client.put.mockClear();
      await tool.execute({ milestone_id: "ms-1", due_date: "2025-01-31" });

      expect(client.put).toHaveBeenCalledWith("/api/v1.0/milestones/ms-1", {
        end: "2025-01-31",
      });
    });

    it("should let end_date win over due_date", async () => {
      client.put.mockClear();
      await tool.execute({
        milestone_id: "ms-1",
        due_date: "2025-02-15",
        end_date: "2025-01-31",
      });

      const body = client.put.mock.calls[0][1];
      expect(body.end).toBe("2025-01-31");
      expect(body).not.toHaveProperty("due_date");
      expect(body).not.toHaveProperty("end_date");
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

  describe("niftypm_move_milestone", () => {
    const tool = server.getTool("niftypm_move_milestone")!;

    it("should call PUT /api/v1.0/milestones/:id/move_to_project", async () => {
      await tool.execute({ milestone_id: "ms-1", project_id: "proj-2" });

      expect(client.put).toHaveBeenCalledWith(
        "/api/v1.0/milestones/ms-1/move_to_project",
        { project_id: "proj-2" }
      );
    });
  });

  describe("niftypm_tie_milestone_tasks", () => {
    const tool = server.getTool("niftypm_tie_milestone_tasks")!;

    it("should call PUT /api/v1.0/milestones/:id/tasks with tasks", async () => {
      await tool.execute({ milestone_id: "ms-1", task_ids: ["task-1"] });

      expect(client.put).toHaveBeenCalledWith(
        "/api/v1.0/milestones/ms-1/tasks",
        { tasks: ["task-1"] }
      );
    });
  });

  describe("niftypm_untie_milestone_tasks", () => {
    const tool = server.getTool("niftypm_untie_milestone_tasks")!;

    it("should call DELETE /api/v1.0/milestones/:id/tasks with tasks", async () => {
      await tool.execute({ milestone_id: "ms-1", task_ids: ["task-1"] });

      expect(client.delete).toHaveBeenCalledWith(
        "/api/v1.0/milestones/ms-1/tasks",
        { body: { tasks: ["task-1"] } }
      );
    });
  });
});
