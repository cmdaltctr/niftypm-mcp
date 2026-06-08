/**
 * NiftyPM MCP Server Configuration
 * Centralized configuration for API credentials and tool toggles.
 *
 * Credentials are read from environment variables first.
 * When running locally (not on Cloudflare Workers), any empty
 * credential falls back to reading from the .secrets/ directory.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export interface NiftyPMConfig {
  clientId: string;
  clientSecret: string;
  accessToken: string;
  refreshToken: string;
  baseUrl: string;
  enabledTools: {
    files: boolean;
    labels: boolean;
    documents: boolean;
    milestones: boolean;
    messages: boolean;
    taskGroups: boolean;
    tasks: boolean;
    subTeams: boolean;
    // New domains
    projects: boolean;
    folders: boolean;
    members: boolean;
    webhooks: boolean;
    time: boolean;
    fields: boolean;
    apps: boolean;
    chat: boolean;
    invite: boolean;
    templates: boolean;
    users: boolean;
    auth: boolean;
  };
}

/**
 * Read a secret from the .secrets/ directory.
 * Returns an empty string on any failure (missing file,
 * permission error, Workers environment without fs, etc.).
 */
function readSecretFile(name: string): string {
  try {
    // Resolve relative to the project root.
    // __dirname equivalent for ES modules.
    const projectRoot = resolve(
      new URL(".", import.meta.url).pathname,
      "..",
    );
    return readFileSync(resolve(projectRoot, ".secrets", name), "utf-8").trim();
  } catch {
    return "";
  }
}

/**
 * Load a credential, checking env first, then .secrets/ file.
 */
function loadCredential(envKey: string, secretFileName: string): string {
  const envValue = process.env[envKey] || "";
  if (envValue) return envValue;
  return readSecretFile(secretFileName);
}

/**
 * Load configuration from environment variables.
 * Falls back to .secrets/ files for any empty env var
 * (local development convenience).
 */
export function loadConfig(): NiftyPMConfig {
  const clientId = loadCredential("NIFTYPM_CLIENT_ID", "client_id");
  const clientSecret = loadCredential("NIFTYPM_CLIENT_SECRET", "client_secret");
  const accessToken = loadCredential("NIFTYPM_ACCESS_TOKEN", "access_token");
  const refreshToken = loadCredential("NIFTYPM_REFRESH_TOKEN", "refresh_token");

  return {
    clientId,
    clientSecret,
    accessToken,
    refreshToken,
    baseUrl: "https://openapi.niftypm.com",
    enabledTools: {
      files: process.env.ENABLE_FILES !== "false",
      labels: process.env.ENABLE_LABELS !== "false",
      documents: process.env.ENABLE_DOCUMENTS !== "false",
      milestones: process.env.ENABLE_MILESTONES !== "false",
      messages: process.env.ENABLE_MESSAGES !== "false",
      taskGroups: process.env.ENABLE_TASK_GROUPS !== "false",
      tasks: process.env.ENABLE_TASKS !== "false",
      subTeams: process.env.ENABLE_SUBTEAMS !== "false",
      // New domains
      projects: process.env.ENABLE_PROJECTS !== "false",
      folders: process.env.ENABLE_FOLDERS !== "false",
      members: process.env.ENABLE_MEMBERS !== "false",
      webhooks: process.env.ENABLE_WEBHOOKS !== "false",
      time: process.env.ENABLE_TIME !== "false",
      fields: process.env.ENABLE_FIELDS !== "false",
      apps: process.env.ENABLE_APPS !== "false",
      chat: process.env.ENABLE_CHAT !== "false",
      invite: process.env.ENABLE_INVITE !== "false",
      templates: process.env.ENABLE_TEMPLATES !== "false",
      users: process.env.ENABLE_USERS !== "false",
      auth: process.env.ENABLE_AUTH !== "false",
    },
  };
}

/**
 * Validate that required configuration is present
 */
export function validateConfig(config: NiftyPMConfig): void {
  const missing: string[] = [];
  
  if (!config.accessToken) missing.push("NIFTYPM_ACCESS_TOKEN");
  if (!config.clientId) missing.push("NIFTYPM_CLIENT_ID");
  if (!config.clientSecret) missing.push("NIFTYPM_CLIENT_SECRET");
  // Refresh tokens are required at startup so the server can recover
  // from expired access tokens instead of running in degraded mode.
  if (!config.refreshToken) missing.push("NIFTYPM_REFRESH_TOKEN");
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}\n` +
      "Please copy .env.example to .env and fill in your credentials."
    );
  }
}
