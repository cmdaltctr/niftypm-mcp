/**
 * Tool registration tests for Messages
 * Verifies tool names, parameter schemas, and endpoint mapping
 */

import { describe, it, expect } from "vitest";
import { registerMessagesTools } from "../../src/tools/messages.js";
import { createMockServer, createMockClient } from "../helpers.js";

describe("registerMessagesTools", () => {
  const server = createMockServer();
  const client = createMockClient();

  registerMessagesTools(server as any, client as any);

  it("should register 7 message tools", () => {
    expect(server.addTool).toHaveBeenCalledTimes(7);
  });

  it("should register tools with correct names", () => {
    const names = server.getToolNames();
    expect(names).toContain("niftypm_list_messages");
    expect(names).toContain("niftypm_get_message");
    expect(names).toContain("niftypm_create_message");
    expect(names).toContain("niftypm_update_message");
    expect(names).toContain("niftypm_delete_message");
    expect(names).toContain("niftypm_mark_message_seen");
    expect(names).toContain("niftypm_mark_message_heard");
  });

  describe("niftypm_list_messages", () => {
    const tool = server.getTool("niftypm_list_messages")!;

    it("should call GET /api/v1.0/messages with params", async () => {
      await tool.execute({ chat_id: "chat-1", limit: 50 });

      expect(client.get).toHaveBeenCalledWith("/api/v1.0/messages", {
        chat_id: "chat-1",
        limit: 50,
      });
    });
  });

  describe("niftypm_get_message", () => {
    const tool = server.getTool("niftypm_get_message")!;

    it("should call GET /api/v1.0/messages/:id", async () => {
      await tool.execute({ message_id: "msg-123" });

      expect(client.get).toHaveBeenCalledWith("/api/v1.0/messages/msg-123");
    });
  });

  describe("niftypm_create_message", () => {
    const tool = server.getTool("niftypm_create_message")!;

    it("should call POST /api/v1.0/messages with body", async () => {
      const params = { text: "Hello world", chat_id: "chat-1", type: "text" };
      await tool.execute(params);

      expect(client.post).toHaveBeenCalledWith("/api/v1.0/messages", params);
    });
  });

  describe("niftypm_update_message", () => {
    const tool = server.getTool("niftypm_update_message")!;

    it("should call PUT /api/v1.0/messages/:id with text and type", async () => {
      await tool.execute({ message_id: "msg-1", text: "Updated text" });

      expect(client.put).toHaveBeenCalledWith("/api/v1.0/messages/msg-1", {
        text: "Updated text",
        type: "text",
      });
    });
  });

  describe("niftypm_delete_message", () => {
    const tool = server.getTool("niftypm_delete_message")!;

    it("should call DELETE /api/v1.0/messages/:id", async () => {
      await tool.execute({ message_id: "msg-1" });

      expect(client.delete).toHaveBeenCalledWith("/api/v1.0/messages/msg-1");
    });
  });

  describe("niftypm_mark_message_seen", () => {
    const tool = server.getTool("niftypm_mark_message_seen")!;

    it("should call POST /api/v1.0/messages/:id/see", async () => {
      await tool.execute({ message_id: "msg-1" });

      expect(client.post).toHaveBeenCalledWith(
        "/api/v1.0/messages/msg-1/see"
      );
    });
  });

  describe("niftypm_mark_message_heard", () => {
    const tool = server.getTool("niftypm_mark_message_heard")!;

    it("should call POST /api/v1.0/messages/:id/hear", async () => {
      await tool.execute({ message_id: "msg-1" });

      expect(client.post).toHaveBeenCalledWith(
        "/api/v1.0/messages/msg-1/hear"
      );
    });
  });
});
