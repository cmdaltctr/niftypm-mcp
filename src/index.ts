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
  registerChecklistsTools,
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
  registerFilesTools(server, client, config.disabledTools);
}
if (config.enabledTools.labels) {
  registerLabelsTools(server, client, config.disabledTools);
}
if (config.enabledTools.documents) {
  registerDocumentsTools(server, client, config.disabledTools);
}
if (config.enabledTools.milestones) {
  registerMilestonesTools(server, client, config.disabledTools);
}
if (config.enabledTools.messages) {
  registerMessagesTools(server, client, config.disabledTools);
}
if (config.enabledTools.taskGroups) {
  registerTaskGroupsTools(server, client, config.disabledTools);
}
if (config.enabledTools.tasks) {
  registerTasksTools(server, client, config.disabledTools);
}
if (config.enabledTools.subTeams) {
  registerSubTeamsTools(server, client, config.disabledTools);
}
// New domains
if (config.enabledTools.projects) {
  registerProjectsTools(server, client, config.disabledTools);
}
if (config.enabledTools.folders) {
  registerFoldersTools(server, client, config.disabledTools);
}
if (config.enabledTools.members) {
  registerMembersTools(server, client, config.disabledTools);
}
if (config.enabledTools.webhooks) {
  registerWebhooksTools(server, client, config.disabledTools);
}
if (config.enabledTools.time) {
  registerTimeTools(server, client, config.disabledTools);
}
if (config.enabledTools.fields) {
  registerFieldsTools(server, client, config.disabledTools);
}
if (config.enabledTools.apps) {
  registerAppsTools(server, client, config.disabledTools);
}
if (config.enabledTools.chat) {
  registerChatTools(server, client, config.disabledTools);
}
if (config.enabledTools.invite) {
  registerInviteTools(server, client, config.disabledTools);
}
if (config.enabledTools.templates) {
  registerTemplatesTools(server, client, config.disabledTools);
}
if (config.enabledTools.users) {
  registerUsersTools(server, client, config.disabledTools);
}
if (config.enabledTools.auth) {
  registerAuthTools(server, client, config.disabledTools);
}
if (config.enabledTools.checklists) {
  if (!config.teamToken) {
    console.error(
      "Warning: Checklist tools are enabled but NIFTYPM_TEAM_TOKEN is not set.\n" +
      "Checklist read operations will work, but writes (create/update/delete) will fail with 401.\n" +
      "To obtain a team token: log into your NiftyPM workspace in a browser, open DevTools console, and run:\n" +
      '  JSON.parse(decodeURIComponent(document.cookie.match(/nifty_auth=([^;]+)/)[1])).teamToken\n' +
      "Save the output to .secrets/team_token or set NIFTYPM_TEAM_TOKEN env var."
    );
  }
  registerChecklistsTools(server, client, config.disabledTools);
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
