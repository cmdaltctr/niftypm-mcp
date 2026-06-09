/**
 * Unit tests for Config module
 * Verifies environment variable loading, defaults, and validation.
 *
 * The config module falls back to .secrets/ files when env vars
 * are empty (local dev convenience).  Tests mock the file-system
 * read so the fallback always returns empty strings.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { loadConfig, validateConfig } from "../src/config.js";
import type { NiftyPMConfig } from "../src/config.js";

const allToolsEnabled: NiftyPMConfig["enabledTools"] = {
  files: true,
  labels: true,
  documents: true,
  milestones: true,
  messages: true,
  taskGroups: true,
  tasks: true,
  subTeams: true,
  projects: true,
  folders: true,
  members: true,
  webhooks: true,
  time: true,
  fields: true,
  apps: true,
  chat: true,
  invite: true,
  templates: true,
  users: true,
  auth: true,
};

function createConfig(overrides: Partial<NiftyPMConfig> = {}): NiftyPMConfig {
  return {
    clientId: "valid-client",
    clientSecret: "valid-secret",
    accessToken: "valid-token",
    refreshToken: "valid-refresh",
    baseUrl: "https://openapi.niftypm.com",
    enabledTools: allToolsEnabled,
    disabledTools: [],
    ...overrides,
  };
}

// Force readFileSync to throw so the .secrets/ fallback always
// returns empty strings.  vi.mock hoists, so this intercepts
// the import before config.ts resolves it.
vi.mock("node:fs", () => ({
  readFileSync: vi.fn().mockImplementation(() => {
    throw new Error("ENOENT: mock — .secrets/ files do not exist in tests");
  }),
}));

describe("loadConfig", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should read environment variables correctly", () => {
    process.env.NIFTYPM_CLIENT_ID = "my-client-id";
    process.env.NIFTYPM_CLIENT_SECRET = "my-client-secret";
    process.env.NIFTYPM_ACCESS_TOKEN = "my-access-token";
    process.env.NIFTYPM_REFRESH_TOKEN = "my-refresh-token";

    const config = loadConfig();

    expect(config.clientId).toBe("my-client-id");
    expect(config.clientSecret).toBe("my-client-secret");
    expect(config.accessToken).toBe("my-access-token");
    expect(config.refreshToken).toBe("my-refresh-token");
  });

  it("should default to empty strings when env vars are not set and .secrets/ files are absent", () => {
    delete process.env.NIFTYPM_CLIENT_ID;
    delete process.env.NIFTYPM_CLIENT_SECRET;
    delete process.env.NIFTYPM_ACCESS_TOKEN;
    delete process.env.NIFTYPM_REFRESH_TOKEN;

    const config = loadConfig();

    expect(config.clientId).toBe("");
    expect(config.clientSecret).toBe("");
    expect(config.accessToken).toBe("");
    expect(config.refreshToken).toBe("");
  });

  it("should set the correct base URL", () => {
    const config = loadConfig();
    expect(config.baseUrl).toBe("https://openapi.niftypm.com");
  });

  it("should default all enabledTools to true", () => {
    delete process.env.ENABLE_FILES;
    delete process.env.ENABLE_LABELS;
    delete process.env.ENABLE_DOCUMENTS;
    delete process.env.ENABLE_MILESTONES;
    delete process.env.ENABLE_MESSAGES;
    delete process.env.ENABLE_TASK_GROUPS;
    delete process.env.ENABLE_TASKS;
    delete process.env.ENABLE_SUBTEAMS;

    const config = loadConfig();

    expect(config.enabledTools.files).toBe(true);
    expect(config.enabledTools.labels).toBe(true);
    expect(config.enabledTools.documents).toBe(true);
    expect(config.enabledTools.milestones).toBe(true);
    expect(config.enabledTools.messages).toBe(true);
    expect(config.enabledTools.taskGroups).toBe(true);
    expect(config.enabledTools.tasks).toBe(true);
    expect(config.enabledTools.subTeams).toBe(true);
    expect(Object.values(config.enabledTools)).toEqual(
      Array(Object.keys(config.enabledTools).length).fill(true)
    );
  });

  it("should disable a tool when its env var is 'false'", () => {
    process.env.ENABLE_FILES = "false";
    process.env.ENABLE_TASKS = "false";

    const config = loadConfig();

    expect(config.enabledTools.files).toBe(false);
    expect(config.enabledTools.tasks).toBe(false);
    expect(config.enabledTools.labels).toBe(true);
  });

  it("should keep tool enabled when env var is 'true'", () => {
    process.env.ENABLE_FILES = "true";

    const config = loadConfig();

    expect(config.enabledTools.files).toBe(true);
  });
});

describe("validateConfig", () => {
  it("should not throw when all required fields are present", () => {
    const config = createConfig();

    expect(() => validateConfig(config)).not.toThrow();
  });

  it("should throw when required fields are missing", () => {
    const config = createConfig({
      clientId: "",
      clientSecret: "",
      accessToken: "",
      refreshToken: "",
    });

    expect(() => validateConfig(config)).toThrow(
      "Missing required environment variables: NIFTYPM_ACCESS_TOKEN, NIFTYPM_CLIENT_ID, NIFTYPM_CLIENT_SECRET, NIFTYPM_REFRESH_TOKEN"
    );
  });

  it("should include guidance in error message", () => {
    const config = createConfig({
      clientSecret: "",
      accessToken: "",
      refreshToken: "",
    });

    expect(() => validateConfig(config)).toThrow(
      "Please copy .env.example to .env and fill in your credentials"
    );
  });

  it("should default disabledTools to empty array when DISABLED_TOOLS is not set", () => {
    delete process.env.DISABLED_TOOLS;
    const config = loadConfig();
    expect(config.disabledTools).toEqual([]);
  });

  it("should parse DISABLED_TOOLS as comma-separated list", () => {
    process.env.DISABLED_TOOLS = "niftypm_delete_document,niftypm_archive_task";
    const config = loadConfig();
    expect(config.disabledTools).toEqual([
      "niftypm_delete_document",
      "niftypm_archive_task",
    ]);
  });

  it("should trim whitespace from DISABLED_TOOLS entries", () => {
    process.env.DISABLED_TOOLS = " niftypm_delete_document , niftypm_archive_task ";
    const config = loadConfig();
    expect(config.disabledTools).toEqual([
      "niftypm_delete_document",
      "niftypm_archive_task",
    ]);
  });

  it("should return empty array for empty DISABLED_TOOLS string", () => {
    process.env.DISABLED_TOOLS = "";
    const config = loadConfig();
    expect(config.disabledTools).toEqual([]);
  });

  it("should return empty array for DISABLED_TOOLS with only whitespace", () => {
    process.env.DISABLED_TOOLS = "   ";
    const config = loadConfig();
    expect(config.disabledTools).toEqual([]);
  });
});
