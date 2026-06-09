/**
 * NiftyPM Webhooks Tools
 * MCP tools for managing webhooks in NiftyPM
 */

import { z } from "zod";
import type { NiftyPMClient } from "../client.js";

/** Sensitive keys stripped from webhook API responses. */
const SENSITIVE_KEYS = ["secret", "api_key", "client_secret"];

/** Redact sensitive fields from a webhook object or array. */
function redactWebhookSecrets<T>(data: T): T {
  if (Array.isArray(data)) {
    return data.map((w) => {
      const safe: Record<string, unknown> = { ...w };
      for (const key of SENSITIVE_KEYS) delete safe[key];
      return safe;
    }) as T;
  }
  if (data && typeof data === "object") {
    const safe: Record<string, unknown> = { ...(data as object) };
    for (const key of SENSITIVE_KEYS) delete safe[key];
    return safe as T;
  }
  return data;
}

/** Block private / loopback / link-local / metadata hostnames (SSRF). */
function isPublicHostname(hostname: string): boolean {
  // IPv6 loopback / private ranges
  if (/^\[?(::1|fc|fd|fe80)\b/.test(hostname)) return false;
  // IPv4 private / reserved ranges
  if (
    /^(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|0\.0\.0\.0|metadata\.google\.internal)/.test(
      hostname
    )
  )
    return false;
  return true;
}

const WebhookUrlSchema = z
  .string()
  .url()
  .refine(
    (url) => {
      try {
        return isPublicHostname(new URL(url).hostname);
      } catch {
        return false;
      }
    },
    { message: "Webhook URL must target a public, non-internal host" }
  );

export function registerWebhooksTools(server: any, client: NiftyPMClient, disabledTools: string[] = []) {
  // List webhooks
  if (!disabledTools.includes("niftypm_list_webhooks")) {
  server.addTool({
    name: "niftypm_list_webhooks",
    description: "List all webhooks for an app",
    parameters: z.object({
      app_id: z.string().regex(/^[a-zA-Z0-9_!-]+$/).describe("App ID"),
    }),
    execute: async ({ app_id }: any) => {
      const webhooks = await client.get(`/api/v1.0/webhooks/${app_id}`);
      return JSON.stringify(redactWebhookSecrets(webhooks), null, 2);
    },
  });
  }

  // Create webhook
  if (!disabledTools.includes("niftypm_create_webhook")) {
  server.addTool({
    name: "niftypm_create_webhook",
    description: "Create a new webhook",
    parameters: z.object({
      url: WebhookUrlSchema.describe("Webhook callback URL"),
      event: z.string().describe("Event type to subscribe to"),
      app_id: z.string().regex(/^[a-zA-Z0-9_!-]+$/).optional().describe("App ID"),
      secret: z.string().optional().describe("Webhook secret for signature verification"),
    }),
    execute: async (params: any) => {
      const webhook = await client.post("/api/v1.0/webhooks", params);
      return JSON.stringify(redactWebhookSecrets(webhook), null, 2);
    },
  });
  }

  // Update webhook
  if (!disabledTools.includes("niftypm_update_webhook")) {
  server.addTool({
    name: "niftypm_update_webhook",
    description: "Update an existing webhook",
    parameters: z.object({
      webhook_id: z.string().regex(/^[a-zA-Z0-9_!-]+$/).describe("Webhook ID"),
      url: WebhookUrlSchema.optional().describe("Webhook callback URL"),
      event: z.string().optional().describe("Event type"),
      active: z.boolean().optional().describe("Whether the webhook is active"),
    }),
    execute: async ({ webhook_id, ...params }: any) => {
      const webhook = await client.put(`/api/v1.0/webhooks/${webhook_id}`, params);
      return JSON.stringify(redactWebhookSecrets(webhook), null, 2);
    },
  });
  }

  // Delete webhook
  if (!disabledTools.includes("niftypm_delete_webhook")) {
  server.addTool({
    name: "niftypm_delete_webhook",
    description: "Delete a webhook",
    parameters: z.object({
      webhook_id: z.string().regex(/^[a-zA-Z0-9_!-]+$/).describe("Webhook ID"),
    }),
    execute: async ({ webhook_id }: any) => {
      const result = await client.delete(`/api/v1.0/webhooks/${webhook_id}`);
      return JSON.stringify(result, null, 2);
    },
  });
  }
}
