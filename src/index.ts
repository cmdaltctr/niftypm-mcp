#!/usr/bin/env node

/**
 * NiftyPM MCP Server
 *
 * MCP server providing tools for the NiftyPM project management API.
 * Supports both local stdio and Cloudflare Workers deployment.
 */

import { FastMCP } from "fastmcp";
import { loadConfig, validateConfig } from "./config.js";
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

const config = loadConfig();
validateConfig(config);


const client = new NiftyPMClient(config);

const server = new FastMCP({
  name: "niftypm-mcp",
  version: "0.1.0",
});

// Register tools based on configuration
if (config.enabledTools.files) {
  registerFilesTools(server, client);
}
if (config.enabledTools.labels) {
  registerLabelsTools(server, client);
}
if (config.enabledTools.documents) {
  registerDocumentsTools(server, client);
}
if (config.enabledTools.milestones) {
  registerMilestonesTools(server, client);
}
if (config.enabledTools.messages) {
  registerMessagesTools(server, client);
}
if (config.enabledTools.taskGroups) {
  registerTaskGroupsTools(server, client);
}
if (config.enabledTools.tasks) {
  registerTasksTools(server, client);
}
if (config.enabledTools.subTeams) {
  registerSubTeamsTools(server, client);
}
// New domains
if (config.enabledTools.projects) {
  registerProjectsTools(server, client);
}
if (config.enabledTools.folders) {
  registerFoldersTools(server, client);
}
if (config.enabledTools.members) {
  registerMembersTools(server, client);
}
if (config.enabledTools.webhooks) {
  registerWebhooksTools(server, client);
}
if (config.enabledTools.time) {
  registerTimeTools(server, client);
}
if (config.enabledTools.fields) {
  registerFieldsTools(server, client);
}
if (config.enabledTools.apps) {
  registerAppsTools(server, client);
}
if (config.enabledTools.chat) {
  registerChatTools(server, client);
}
if (config.enabledTools.invite) {
  registerInviteTools(server, client);
}
if (config.enabledTools.templates) {
  registerTemplatesTools(server, client);
}
if (config.enabledTools.users) {
  registerUsersTools(server, client);
}
if (config.enabledTools.auth) {
  registerAuthTools(server, client);
}

// Determine transport from environment
const transport = process.env.TRANSPORT || "stdio";

if (transport === "http") {
  const port = parseInt(process.env.PORT || "8080", 10);
  server.start({
    transportType: "httpStream",
    httpStream: { host: "127.0.0.1", port, endpoint: "/mcp" },
  });
  console.error(`NiftyPM MCP server listening on http://localhost:${port}/mcp`);
} else {
  server.start({ transportType: "stdio" });
}
