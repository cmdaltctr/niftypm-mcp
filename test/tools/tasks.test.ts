/**
 * Tool registration tests for Tasks
 * Verifies tool names, parameter schemas, and endpoint mapping
 */

import { describe, it, expect, vi } from "vitest";
import { registerTasksTools } from "../../src/tools/tasks.js";
import { createMockServer, createMockClient } from "../helpers.js";

describe("registerTasksTools", () => {
  const server = createMockServer();
  const client = createMockClient();

  registerTasksTools(server as any, client as any);

  it("should register 22 task tools", () => {
    expect(server.addTool).toHaveBeenCalledTimes(22);
  });

  it("should register tools with correct names", () => {
    const names = server.getToolNames();
    expect(names).toContain("niftypm_list_tasks");
    expect(names).toContain("niftypm_get_task");
    expect(names).toContain("niftypm_create_task");
    expect(names).toContain("niftypm_update_task");
    expect(names).toContain("niftypm_delete_task");
    expect(names).toContain("niftypm_complete_task");
    expect(names).toContain("niftypm_archive_task");
  });

  describe("niftypm_list_tasks", () => {
    const tool = server.getTool("niftypm_list_tasks")!;

    it("should call GET /api/v1.0/tasks with params", async () => {
      await tool.execute({ project_id: "proj-1", limit: 10 });

      expect(client.get).toHaveBeenCalledWith("/api/v1.0/tasks", {
        project_id: "proj-1",
        limit: 10,
      });
    });

    it("should return JSON string", async () => {
      client.get.mockResolvedValueOnce([{ id: "t1", name: "Task 1" }]);

      const result = await tool.execute({});
      expect(result).toBe(JSON.stringify([{ id: "t1", name: "Task 1" }], null, 2));
    });
  });

  describe("niftypm_get_task", () => {
    const tool = server.getTool("niftypm_get_task")!;

    it("should call GET /api/v1.0/tasks/:id", async () => {
      await tool.execute({ task_id: "task-123" });

      expect(client.get).toHaveBeenCalledWith("/api/v1.0/tasks/task-123");
    });
  });

  describe("niftypm_create_task", () => {
    const tool = server.getTool("niftypm_create_task")!;

    it("should call POST /api/v1.0/tasks with body", async () => {
      const params = {
        name: "New Task",
        task_group_id: "tg-1",
        assignees: ["user-1"],
      };
      await tool.execute(params);

      expect(client.post).toHaveBeenCalledWith("/api/v1.0/tasks", params);
    });
  });

  describe("niftypm_update_task", () => {
    const tool = server.getTool("niftypm_update_task")!;

    it("should call PUT /api/v1.0/tasks/:id with remaining params", async () => {
      await tool.execute({ task_id: "task-1", name: "Updated" });

      expect(client.put).toHaveBeenCalledWith("/api/v1.0/tasks/task-1", {
        name: "Updated",
      });
    });
  });

  describe("niftypm_delete_task", () => {
    const tool = server.getTool("niftypm_delete_task")!;

    it("should call DELETE /api/v1.0/tasks/:id", async () => {
      await tool.execute({ task_id: "task-1" });

      expect(client.delete).toHaveBeenCalledWith("/api/v1.0/tasks/task-1");
    });
  });

  describe("niftypm_complete_task", () => {
    const tool = server.getTool("niftypm_complete_task")!;

    it("should call POST /api/v1.0/tasks/:id/complete", async () => {
      await tool.execute({ task_id: "task-1" });

      expect(client.post).toHaveBeenCalledWith(
        "/api/v1.0/tasks/task-1/complete",
        { completed: true }
      );
    });
  });

  describe("niftypm_archive_task", () => {
    const tool = server.getTool("niftypm_archive_task")!;

    it("should call POST /api/v1.0/tasks/:id/archive", async () => {
      await tool.execute({ task_id: "task-1" });

      expect(client.post).toHaveBeenCalledWith(
        "/api/v1.0/tasks/task-1/archive",
        { archived: true }
      );
    });
  });
});
