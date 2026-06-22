/**
 * Tool registration tests for Task Groups
 * Verifies tool names, parameter schemas, and endpoint mapping
 */

import { describe, it, expect } from "vitest";
import { registerTaskGroupsTools } from "../../src/tools/taskgroups.js";
import { createMockServer, createMockClient } from "../helpers.js";

describe("registerTaskGroupsTools", () => {
  const server = createMockServer();
  const client = createMockClient();

  registerTaskGroupsTools(server as any, client as any, []);

  it("should register 8 task group tools", () => {
    expect(server.addTool).toHaveBeenCalledTimes(8);
  });

  it("should register tools with correct names", () => {
    const names = server.getToolNames();
    expect(names).toContain("niftypm_list_taskgroups");
    expect(names).toContain("niftypm_get_taskgroup");
    expect(names).toContain("niftypm_create_taskgroup");
    expect(names).toContain("niftypm_update_taskgroup");
    expect(names).toContain("niftypm_delete_taskgroup");
  });

  describe("niftypm_list_taskgroups", () => {
    const tool = server.getTool("niftypm_list_taskgroups")!;

    it("should call GET /api/v1.0/taskgroups with params", async () => {
      await tool.execute({ project_id: "proj-1" });

      expect(client.get).toHaveBeenCalledWith("/api/v1.0/taskgroups", {
        project_id: "proj-1",
        archived: false,
      });
    });
  });

  describe("niftypm_get_taskgroup", () => {
    const tool = server.getTool("niftypm_get_taskgroup")!;

    it("should call GET /api/v1.0/taskgroups/:id", async () => {
      await tool.execute({ taskgroup_id: "tg-123" });

      expect(client.get).toHaveBeenCalledWith("/api/v1.0/taskgroups/tg-123");
    });
  });

  describe("niftypm_create_taskgroup", () => {
    const tool = server.getTool("niftypm_create_taskgroup")!;

    it("should call POST /api/v1.0/taskgroups with body", async () => {
      const params = { name: "To Do", project_id: "proj-1" };
      await tool.execute(params);

      expect(client.post).toHaveBeenCalledWith("/api/v1.0/taskgroups", params);
    });
  });

  describe("niftypm_update_taskgroup", () => {
    const tool = server.getTool("niftypm_update_taskgroup")!;

    it("should call PUT /api/v1.0/taskgroups/:id with remaining params", async () => {
      await tool.execute({ taskgroup_id: "tg-1", name: "In Progress" });

      expect(client.put).toHaveBeenCalledWith("/api/v1.0/taskgroups/tg-1", {
        name: "In Progress",
      });
    });
  });

  describe("niftypm_delete_taskgroup", () => {
    const tool = server.getTool("niftypm_delete_taskgroup")!;

    it("should call DELETE /api/v1.0/taskgroups/:id", async () => {
      await tool.execute({ taskgroup_id: "tg-1" });

      expect(client.delete).toHaveBeenCalledWith("/api/v1.0/taskgroups/tg-1");
    });
  });
});
