/**
 * Tool registration tests for Webhooks
 * Verifies tool names, parameter schemas, endpoint mapping,
 * and sensitive-data redaction.
 */

import { describe, it, expect } from "vitest";
import { registerWebhooksTools } from "../../src/tools/webhooks.js";
import { createMockServer, createMockClient } from "../helpers.js";

describe("registerWebhooksTools", () => {
  const server = createMockServer();
  const client = createMockClient();

  registerWebhooksTools(
    server as Parameters<typeof registerWebhooksTools>[0],
    client as unknown as Parameters<typeof registerWebhooksTools>[1],
  );

  it("should register 4 webhook tools", () => {
    expect(server.addTool).toHaveBeenCalledTimes(4);
  });

  it("should register tools with correct names", () => {
    const names = server.getToolNames();
    expect(names).toContain("niftypm_list_webhooks");
    expect(names).toContain("niftypm_create_webhook");
    expect(names).toContain("niftypm_update_webhook");
    expect(names).toContain("niftypm_delete_webhook");
  });

  describe("niftypm_list_webhooks", () => {
    const tool = server.getTool("niftypm_list_webhooks")!;

    it("should call GET /api/v1.0/webhooks/:app_id", async () => {
      await tool.execute({ app_id: "app-1" });

      expect(client.get).toHaveBeenCalledWith("/api/v1.0/webhooks/app-1");
    });

    it("should redact secret fields from response", async () => {
      client.get.mockResolvedValueOnce([
        { id: "wh-1", secret: "super-secret", url: "https://example.com" },
      ]);

      const result = await tool.execute({ app_id: "app-1" });
      const parsed = JSON.parse(result);

      expect(parsed[0].secret).toBeUndefined();
      expect(parsed[0].url).toBe("https://example.com");
    });
  });

  describe("niftypm_create_webhook", () => {
    const tool = server.getTool("niftypm_create_webhook")!;

    it("should call POST /api/v1.0/webhooks with body", async () => {
      const params = {
        url: "https://example.com/webhook",
        event: "task.completed",
        app_id: "app-1",
      };
      await tool.execute(params);

      expect(client.post).toHaveBeenCalledWith("/api/v1.0/webhooks", params);
    });

    it("should redact secret from create response", async () => {
      client.post.mockResolvedValueOnce({
        id: "wh-2",
        secret: "should-be-redacted",
        url: "https://example.com/hook",
      });

      const result = await tool.execute({
        url: "https://example.com/hook",
        event: "task.created",
      });
      const parsed = JSON.parse(result);

      expect(parsed.secret).toBeUndefined();
    });
  });

  describe("niftypm_update_webhook", () => {
    const tool = server.getTool("niftypm_update_webhook")!;

    it("should call PUT /api/v1.0/webhooks/:id with remaining params", async () => {
      await tool.execute({
        webhook_id: "wh-1",
        url: "https://example.com/new",
        active: false,
      });

      expect(client.put).toHaveBeenCalledWith("/api/v1.0/webhooks/wh-1", {
        url: "https://example.com/new",
        active: false,
      });
    });
  });

  describe("niftypm_delete_webhook", () => {
    const tool = server.getTool("niftypm_delete_webhook")!;

    it("should call DELETE /api/v1.0/webhooks/:id", async () => {
      await tool.execute({ webhook_id: "wh-1" });

      expect(client.delete).toHaveBeenCalledWith("/api/v1.0/webhooks/wh-1");
    });
  });
});
