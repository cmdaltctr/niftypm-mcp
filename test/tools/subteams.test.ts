/**
 * Tool registration tests for SubTeams
 * Verifies tool names, parameter schemas, and endpoint mapping
 */

import { describe, it, expect } from "vitest";
import { registerSubTeamsTools } from "../../src/tools/subteams.js";
import { createMockServer, createMockClient } from "../helpers.js";

describe("registerSubTeamsTools", () => {
  const server = createMockServer();
  const client = createMockClient();

  registerSubTeamsTools(server as any, client as any, []);

  it("should register 8 subteam tools", () => {
    expect(server.addTool).toHaveBeenCalledTimes(8);
  });

  it("should register tools with correct names", () => {
    const names = server.getToolNames();
    expect(names).toContain("niftypm_list_subteams");
    expect(names).toContain("niftypm_get_subteam");
    expect(names).toContain("niftypm_create_subteam");
    expect(names).toContain("niftypm_update_subteam");
    expect(names).toContain("niftypm_delete_subteam");
    expect(names).toContain("niftypm_add_subteam_members");
    expect(names).toContain("niftypm_remove_subteam_members");
    expect(names).toContain("niftypm_leave_subteam");
  });

  describe("niftypm_list_subteams", () => {
    const tool = server.getTool("niftypm_list_subteams")!;

    it("should call GET /api/v1.0/subteams with params", async () => {
      await tool.execute({ limit: 10, offset: 0 });

      expect(client.get).toHaveBeenCalledWith("/api/v1.0/subteams", {
        limit: 10,
        offset: 0,
      });
    });
  });

  describe("niftypm_get_subteam", () => {
    const tool = server.getTool("niftypm_get_subteam")!;

    it("should call GET /api/v1.0/subteams/:id", async () => {
      await tool.execute({ subteam_id: "st-123" });

      expect(client.get).toHaveBeenCalledWith("/api/v1.0/subteams/st-123");
    });
  });

  describe("niftypm_create_subteam", () => {
    const tool = server.getTool("niftypm_create_subteam")!;

    it("should call POST /api/v1.0/subteams with body", async () => {
      const params = { name: "Engineering", description: "Eng team" };
      await tool.execute(params);

      expect(client.post).toHaveBeenCalledWith("/api/v1.0/subteams", params);
    });
  });

  describe("niftypm_update_subteam", () => {
    const tool = server.getTool("niftypm_update_subteam")!;

    it("should call PUT /api/v1.0/subteams/:id with remaining params", async () => {
      await tool.execute({ subteam_id: "st-1", name: "Updated Team" });

      expect(client.put).toHaveBeenCalledWith("/api/v1.0/subteams/st-1", {
        name: "Updated Team",
      });
    });
  });

  describe("niftypm_delete_subteam", () => {
    const tool = server.getTool("niftypm_delete_subteam")!;

    it("should call DELETE /api/v1.0/subteams/:id", async () => {
      await tool.execute({ subteam_id: "st-1" });

      expect(client.delete).toHaveBeenCalledWith("/api/v1.0/subteams/st-1");
    });
  });

  describe("niftypm_add_subteam_members", () => {
    const tool = server.getTool("niftypm_add_subteam_members")!;

    it("should call PUT /api/v1.0/subteams/:id/members", async () => {
      await tool.execute({ subteam_id: "st-1", members_ids: ["member-1"] });

      expect(client.put).toHaveBeenCalledWith(
        "/api/v1.0/subteams/st-1/members",
        { members_ids: ["member-1"] }
      );
    });
  });

  describe("niftypm_remove_subteam_members", () => {
    const tool = server.getTool("niftypm_remove_subteam_members")!;

    it("should call DELETE /api/v1.0/subteams/:id/members with body", async () => {
      await tool.execute({ subteam_id: "st-1", members_ids: ["member-1"] });

      expect(client.delete).toHaveBeenCalledWith(
        "/api/v1.0/subteams/st-1/members",
        { body: { members_ids: ["member-1"] } }
      );
    });
  });

  describe("niftypm_leave_subteam", () => {
    const tool = server.getTool("niftypm_leave_subteam")!;

    it("should call POST /api/v1.0/subteams/:id/leave", async () => {
      await tool.execute({ subteam_id: "st-1" });

      expect(client.post).toHaveBeenCalledWith("/api/v1.0/subteams/st-1/leave");
    });
  });
});
