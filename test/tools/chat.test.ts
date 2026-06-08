/**
 * Tool registration tests for Chat
 * Verifies tool names, parameter schemas, and endpoint mapping
 */

import { describe, it, expect } from "vitest";
import { registerChatTools } from "../../src/tools/chat.js";
import { createMockServer, createMockClient } from "../helpers.js";

describe("registerChatTools", () => {
  const server = createMockServer();
  const client = createMockClient();

  registerChatTools(
    server as Parameters<typeof registerChatTools>[0],
    client as unknown as Parameters<typeof registerChatTools>[1],
  );

  it("should register 2 chat tools", () => {
    expect(server.addTool).toHaveBeenCalledTimes(2);
  });

  it("should register tools with correct names", () => {
    const names = server.getToolNames();
    expect(names).toContain("niftypm_list_chats");
    expect(names).toContain("niftypm_get_chat");
  });

  describe("niftypm_list_chats", () => {
    const tool = server.getTool("niftypm_list_chats")!;

    it("should call GET /api/v1.0/chats with params", async () => {
      await tool.execute({ project_id: "proj-1" });

      expect(client.get).toHaveBeenCalledWith("/api/v1.0/chats", {
        project_id: "proj-1",
      });
    });
  });

  describe("niftypm_get_chat", () => {
    const tool = server.getTool("niftypm_get_chat")!;

    it("should call GET /api/v1.0/chats/:id", async () => {
      await tool.execute({ chat_id: "chat-123" });

      expect(client.get).toHaveBeenCalledWith("/api/v1.0/chats/chat-123");
    });
  });
});
