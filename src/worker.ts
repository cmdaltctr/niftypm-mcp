/**
 * Cloudflare Workers Entry Point for NiftyPM MCP Server
 * 
 * This file provides the Workers-compatible export for edge deployment.
 * For local stdio deployment, use src/index.ts instead.
 */

import { createMcpHandler } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { loadConfig } from "./config.js";
import { NiftyPMClient } from "./client.js";
import {
  registerFilesTools,
  registerLabelsTools,
  registerDocumentsTools,
  registerMilestonesTools,
  registerMessagesTools,
  registerTaskGroupsTools,
  registerTasksTools,
  registerSubTeamsTools,
} from "./tools/index.js";
import {
  registerProjectsTools,
  registerFoldersTools,
  registerMembersTools,
  registerWebhooksTools,
  registerTimeTools,
  registerFieldsTools,
  registerAppsTools,
  registerChatTools,
  registerInviteTools,
  registerTemplatesTools,
  registerUsersTools,
  registerAuthTools,
} from "./tools/index.js";

function createServer() {
  const config = loadConfig();
  const client = new NiftyPMClient(config);
  
  const server = new McpServer({ 
    name: "niftypm-mcp", 
    version: "0.1.0" 
  });

  // Register tools based on configuration
  if (config.enabledTools.files) {
    registerFilesTools(server as any, client, config.disabledTools);
  }
  if (config.enabledTools.labels) {
    registerLabelsTools(server as any, client, config.disabledTools);
  }
  if (config.enabledTools.documents) {
    registerDocumentsTools(server as any, client, config.disabledTools);
  }
  if (config.enabledTools.milestones) {
    registerMilestonesTools(server as any, client, config.disabledTools);
  }
  if (config.enabledTools.messages) {
    registerMessagesTools(server as any, client, config.disabledTools);
  }
  if (config.enabledTools.taskGroups) {
    registerTaskGroupsTools(server as any, client, config.disabledTools);
  }
  if (config.enabledTools.tasks) {
    registerTasksTools(server as any, client, config.disabledTools);
  }
  if (config.enabledTools.subTeams) {
    registerSubTeamsTools(server as any, client, config.disabledTools);
  }
  if (config.enabledTools.projects) {
    registerProjectsTools(server as any, client, config.disabledTools);
  }
  if (config.enabledTools.folders) {
    registerFoldersTools(server as any, client, config.disabledTools);
  }
  if (config.enabledTools.members) {
    registerMembersTools(server as any, client, config.disabledTools);
  }
  if (config.enabledTools.webhooks) {
    registerWebhooksTools(server as any, client, config.disabledTools);
  }
  if (config.enabledTools.time) {
    registerTimeTools(server as any, client, config.disabledTools);
  }
  if (config.enabledTools.fields) {
    registerFieldsTools(server as any, client, config.disabledTools);
  }
  if (config.enabledTools.apps) {
    registerAppsTools(server as any, client, config.disabledTools);
  }
  if (config.enabledTools.chat) {
    registerChatTools(server as any, client, config.disabledTools);
  }
  if (config.enabledTools.invite) {
    registerInviteTools(server as any, client, config.disabledTools);
  }
  if (config.enabledTools.templates) {
    registerTemplatesTools(server as any, client, config.disabledTools);
  }
  if (config.enabledTools.users) {
    registerUsersTools(server as any, client, config.disabledTools);
  }
  if (config.enabledTools.auth) {
    registerAuthTools(server as any, client, config.disabledTools);
  }

  return server;
}

/**
 * Constant-time string comparison to prevent timing attacks.
 * Both inputs are padded to the same length so that the XOR loop
 * always runs the same number of iterations — no early return on
 * length mismatch, which would leak the secret's length as a
 * timing oracle.  Different-length inputs fail because the
 * zero-padding bytes will XOR against real data, producing a
 * non-zero result.
 */
function timingSafeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);
  const maxLen = Math.max(aBytes.length, bBytes.length);

  // Pad to equal length so the loop always iterates the same count.
  const aPadded = new Uint8Array(maxLen);
  const bPadded = new Uint8Array(maxLen);
  aPadded.set(aBytes);
  bPadded.set(bBytes);

  let result = 0;
  for (let i = 0; i < maxLen; i++) {
    result |= aPadded[i] ^ bPadded[i];
  }
  return result === 0;
}

export default {
  fetch: (request: Request, env: any, ctx: any) => {
    const authHeader = request.headers.get("X-MCP-Auth") || "";
    const secret = env.MCP_AUTH_SECRET || "";
    
    if (!secret || !timingSafeEqual(authHeader, secret)) {
      return new Response("Unauthorized", { status: 401 });
    }
    return createMcpHandler(createServer())(request, env, ctx);
  },
};
