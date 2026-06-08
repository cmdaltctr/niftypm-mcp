/**
 * Tool registration tests for Users
 * Verifies tool names, parameter schemas, and endpoint mapping
 */

import { describe, it, expect } from "vitest";
import { registerUsersTools } from "../../src/tools/users.js";
import { createMockServer, createMockClient } from "../helpers.js";

describe("registerUsersTools", () => {
  const server = createMockServer();
  const client = createMockClient();

  registerUsersTools(
    server as Parameters<typeof registerUsersTools>[0],
    client as unknown as Parameters<typeof registerUsersTools>[1],
  );

  it("should register 1 user tool", () => {
    expect(server.addTool).toHaveBeenCalledTimes(1);
  });

  it("should register tools with correct names", () => {
    const names = server.getToolNames();
    expect(names).toContain("niftypm_get_current_user");
  });

  describe("niftypm_get_current_user", () => {
    const tool = server.getTool("niftypm_get_current_user")!;

    it("should call GET /api/v1.0/users/me", async () => {
      await tool.execute({});

      expect(client.get).toHaveBeenCalledWith("/api/v1.0/users/me");
    });
  });
});
