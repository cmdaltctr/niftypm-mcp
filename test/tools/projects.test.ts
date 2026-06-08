/**
 * Tool registration tests for Projects
 * Verifies tool names, parameter schemas, and endpoint mapping
 */

import { describe, it, expect } from "vitest";
import { registerProjectsTools } from "../../src/tools/projects.js";
import { createMockServer, createMockClient } from "../helpers.js";

describe("registerProjectsTools", () => {
  const server = createMockServer();
  const client = createMockClient();

  registerProjectsTools(
    server as Parameters<typeof registerProjectsTools>[0],
    client as unknown as Parameters<typeof registerProjectsTools>[1],
  );

  it("should register 11 project tools", () => {
    expect(server.addTool).toHaveBeenCalledTimes(11);
  });

  it("should register tools with correct names", () => {
    const names = server.getToolNames();
    expect(names).toContain("niftypm_list_projects");
    expect(names).toContain("niftypm_create_project");
    expect(names).toContain("niftypm_get_project");
    expect(names).toContain("niftypm_update_project");
    expect(names).toContain("niftypm_delete_project");
    expect(names).toContain("niftypm_invite_to_project");
    expect(names).toContain("niftypm_leave_project");
    expect(names).toContain("niftypm_start_project");
    expect(names).toContain("niftypm_add_project_field");
    expect(names).toContain("niftypm_get_project_fields");
    expect(names).toContain("niftypm_update_project_field");
  });

  describe("niftypm_list_projects", () => {
    const tool = server.getTool("niftypm_list_projects")!;

    it("should call GET /api/v1.0/projects with params", async () => {
      await tool.execute({ page: 1, per_page: 20 });

      expect(client.get).toHaveBeenCalledWith("/api/v1.0/projects", {
        page: 1,
        per_page: 20,
      });
    });
  });

  describe("niftypm_create_project", () => {
    const tool = server.getTool("niftypm_create_project")!;

    it("should call POST /api/v1.0/projects with body", async () => {
      const params = { name: "New Project", description: "A test project" };
      await tool.execute(params);

      expect(client.post).toHaveBeenCalledWith("/api/v1.0/projects", params);
    });
  });

  describe("niftypm_get_project", () => {
    const tool = server.getTool("niftypm_get_project")!;

    it("should call GET /api/v1.0/projects/:id", async () => {
      await tool.execute({ project_id: "proj-123" });

      expect(client.get).toHaveBeenCalledWith("/api/v1.0/projects/proj-123");
    });
  });

  describe("niftypm_update_project", () => {
    const tool = server.getTool("niftypm_update_project")!;

    it("should call PUT /api/v1.0/projects/:id with remaining params", async () => {
      await tool.execute({ project_id: "proj-1", name: "Updated", status: "active" });

      expect(client.put).toHaveBeenCalledWith("/api/v1.0/projects/proj-1", {
        name: "Updated",
        status: "active",
      });
    });
  });

  describe("niftypm_delete_project", () => {
    const tool = server.getTool("niftypm_delete_project")!;

    it("should call DELETE /api/v1.0/projects/:id", async () => {
      await tool.execute({ project_id: "proj-1" });

      expect(client.delete).toHaveBeenCalledWith("/api/v1.0/projects/proj-1");
    });
  });

  describe("niftypm_invite_to_project", () => {
    const tool = server.getTool("niftypm_invite_to_project")!;

    it("should call POST /api/v1.0/projects/:id/invite", async () => {
      await tool.execute({ project_id: "proj-1", user_id: "user-1", role: "member" });

      expect(client.post).toHaveBeenCalledWith("/api/v1.0/projects/proj-1/invite", {
        user_id: "user-1",
        role: "member",
      });
    });
  });

  describe("niftypm_leave_project", () => {
    const tool = server.getTool("niftypm_leave_project")!;

    it("should call POST /api/v1.0/projects/:id/leave", async () => {
      await tool.execute({ project_id: "proj-1" });

      expect(client.post).toHaveBeenCalledWith("/api/v1.0/projects/proj-1/leave", {});
    });
  });

  describe("niftypm_start_project", () => {
    const tool = server.getTool("niftypm_start_project")!;

    it("should call POST /api/v1.0/projects/:id/start", async () => {
      await tool.execute({ project_id: "proj-1" });

      expect(client.post).toHaveBeenCalledWith("/api/v1.0/projects/proj-1/start", {});
    });
  });

  describe("niftypm_add_project_field", () => {
    const tool = server.getTool("niftypm_add_project_field")!;

    it("should call POST /api/v1.0/projects/:id/fields", async () => {
      await tool.execute({ project_id: "proj-1", field_id: "field-1", value: "test" });

      expect(client.post).toHaveBeenCalledWith("/api/v1.0/projects/proj-1/fields", {
        field_id: "field-1",
        value: "test",
      });
    });
  });

  describe("niftypm_get_project_fields", () => {
    const tool = server.getTool("niftypm_get_project_fields")!;

    it("should call GET /api/v1.0/projects/:id/fields", async () => {
      await tool.execute({ project_id: "proj-1" });

      expect(client.get).toHaveBeenCalledWith("/api/v1.0/projects/proj-1/fields");
    });
  });

  describe("niftypm_update_project_field", () => {
    const tool = server.getTool("niftypm_update_project_field")!;

    it("should call PUT /api/v1.0/projects/:id/fields/:fieldId", async () => {
      await tool.execute({ project_id: "proj-1", field_id: "field-1", value: "new-val" });

      expect(client.put).toHaveBeenCalledWith("/api/v1.0/projects/proj-1/fields/field-1", {
        value: "new-val",
      });
    });
  });
});
