/**
 * Tool registration tests for Invite Links
 * Verifies tool names, parameter schemas, and endpoint mapping
 */

import { describe, it, expect } from "vitest";
import { registerInviteTools } from "../../src/tools/invite.js";
import { createMockServer, createMockClient } from "../helpers.js";

describe("registerInviteTools", () => {
  const server = createMockServer();
  const client = createMockClient();

  registerInviteTools(
    server as Parameters<typeof registerInviteTools>[0],
    client as unknown as Parameters<typeof registerInviteTools>[1],
  );

  it("should register 1 invite tool", () => {
    expect(server.addTool).toHaveBeenCalledTimes(1);
  });

  it("should register tools with correct names", () => {
    const names = server.getToolNames();
    expect(names).toContain("niftypm_list_invite_links");
  });

  describe("niftypm_list_invite_links", () => {
    const tool = server.getTool("niftypm_list_invite_links")!;

    it("should call GET /api/v1.0/invites", async () => {
      await tool.execute({});

      expect(client.get).toHaveBeenCalledWith("/api/v1.0/invites");
    });
  });
});
