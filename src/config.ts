/**
 * NiftyPM MCP Server Configuration
 * Centralized configuration for API credentials and tool toggles.
 *
 * Credentials are read from environment variables first.
 * When running locally (not on Cloudflare Workers), any empty
 * credential falls back to reading from the .secrets/ directory.
 *
 * A .env file in the project root is also auto-loaded into
 * process.env (when present) so users can drop in a downloaded
 * .env without needing to source it in the shell.
 */

import { readFileSync, existsSync } from "node:fs";
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
  disabledTools: string[];
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
 * Load a .env file from the project root into process.env.
 * Parses KEY=VALUE lines (ignoring comments and blanks) and
 * only sets vars that are not already set in the environment —
 * real env vars (e.g. from MCP client config) take precedence.
 * No-op if the file is missing (e.g. on Cloudflare Workers).
 */
function loadEnvFile(): void {
  const envPath = resolve(
    new URL(".", import.meta.url).pathname,
    "..",
    ".env",
  );
  if (!existsSync(envPath)) return;

  const content = readFileSync(envPath, "utf-8");
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    // Strip surrounding quotes if present
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

/**
 * Parse the DISABLED_TOOLS env var into a clean string array.
 * Splits on comma, trims whitespace from each entry, and filters
 * out empty strings so that trailing commas don't produce phantom
 * entries. Returns [] when the env var is absent or empty.
 */
function parseDisabledTools(): string[] {
  const raw = process.env.DISABLED_TOOLS || "";
  if (!raw.trim()) return [];
  return raw.split(",").map((s) => s.trim()).filter((s) => s.length > 0);
}

/**
 * Load configuration from environment variables.
 * Falls back to .secrets/ files for any empty env var
 * (local development convenience).
 */
export function loadConfig(): NiftyPMConfig {
  // Auto-load a .env file from the project root, if present.
  // Existing process.env values are preserved (real env wins).
  loadEnvFile();

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
    disabledTools: parseDisabledTools(),
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
