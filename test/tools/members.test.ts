/**
 * Tool registration tests for Members
 * Verifies tool names, parameter schemas, and endpoint mapping
 */

import { describe, it, expect } from "vitest";
import { registerMembersTools } from "../../src/tools/members.js";
import { createMockServer, createMockClient } from "../helpers.js";

describe("registerMembersTools", () => {
  const server = createMockServer();
  const client = createMockClient();

  registerMembersTools(
    server as Parameters<typeof registerMembersTools>[0],
    client as unknown as Parameters<typeof registerMembersTools>[1],
  );

  it("should register 2 member tools", () => {
    expect(server.addTool).toHaveBeenCalledTimes(2);
  });

  it("should register tools with correct names", () => {
    const names = server.getToolNames();
    expect(names).toContain("niftypm_list_members");
    expect(names).toContain("niftypm_get_member");
  });

  describe("niftypm_list_members", () => {
    const tool = server.getTool("niftypm_list_members")!;

    it("should call GET /api/v1.0/members with params", async () => {
      await tool.execute({ project_id: "proj-1" });

      expect(client.get).toHaveBeenCalledWith("/api/v1.0/members", {
        project_id: "proj-1",
      });
    });
  });

  describe("niftypm_get_member", () => {
    const tool = server.getTool("niftypm_get_member")!;

    it("should call GET /api/v1.0/members/:id", async () => {
      await tool.execute({ member_id: "member-123" });

      expect(client.get).toHaveBeenCalledWith("/api/v1.0/members/member-123");
    });
  });
});
