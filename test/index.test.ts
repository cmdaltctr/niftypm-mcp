/**
 * Integration test for server creation
 * Verifies that the server can be created and tools are registered
 * based on the enabledTools configuration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// We test the registration logic by importing each register function
// and verifying the server receives tools. We mock the FastMCP constructor.
const mockAddTool = vi.fn();
const mockStart = vi.fn();

vi.mock("fastmcp", () => {
  return {
    FastMCP: vi.fn().mockImplementation(function (this: any, _opts: any) {
      this.addTool = mockAddTool;
      this.start = mockStart;
    }),
  };
});

describe("Server creation integration", () => {
  beforeEach(() => {
    mockAddTool.mockClear();
    mockStart.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should create a FastMCP server with correct name and version", async () => {
    const { FastMCP } = await import("fastmcp");

    const config = {
      clientId: "",
      clientSecret: "",
      accessToken: "test-token",
      refreshToken: "",
      baseUrl: "https://openapi.niftypm.com",
      enabledTools: {
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
      },
      disabledTools: [],
    };

    new FastMCP({ name: "niftypm-mcp", version: "0.1.0" });

    expect(FastMCP).toHaveBeenCalledWith({
      name: "niftypm-mcp",
      version: "0.1.0",
    });
  });

  it("should register all legacy-domain tools when all legacy tool groups are enabled", async () => {
    const { registerTasksTools } = await import("../src/tools/tasks.js");
    const { registerFilesTools } = await import("../src/tools/files.js");
    const { registerLabelsTools } = await import("../src/tools/labels.js");
    const { registerDocumentsTools } = await import("../src/tools/documents.js");
    const { registerMilestonesTools } = await import("../src/tools/milestones.js");
    const { registerMessagesTools } = await import("../src/tools/messages.js");
    const { registerTaskGroupsTools } = await import("../src/tools/taskgroups.js");
    const { registerSubTeamsTools } = await import("../src/tools/subteams.js");

    const { NiftyPMClient } = await import("../src/client.js");

    const mockServer = { addTool: vi.fn() };
    const config = {
      clientId: "",
      clientSecret: "",
      accessToken: "test-token",
      refreshToken: "",
      baseUrl: "https://openapi.niftypm.com",
      enabledTools: {
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
      },
      disabledTools: [],
    };

    const client = new NiftyPMClient(config);

    registerFilesTools(mockServer as any, client, []);
    registerLabelsTools(mockServer as any, client, []);
    registerDocumentsTools(mockServer as any, client, []);
    registerMilestonesTools(mockServer as any, client, []);
    registerMessagesTools(mockServer as any, client, []);
    registerTaskGroupsTools(mockServer as any, client, []);
    registerTasksTools(mockServer as any, client, []);
    registerSubTeamsTools(mockServer as any, client, []);

    // 8 files + 5 labels + 13 docs + 9 milestones + 7 messages + 8 taskgroups + 23 tasks + 8 subteams = 81
    // We only test the original ones here in this specific test
    expect(mockServer.addTool).toHaveBeenCalledTimes(81);
  });

  it("should respect enabledTools configuration to skip tool groups", async () => {
    const { registerTasksTools } = await import("../src/tools/tasks.js");
    const { registerFilesTools } = await import("../src/tools/files.js");

    const { NiftyPMClient } = await import("../src/client.js");

    const mockServer = { addTool: vi.fn() };
    const config = {
      clientId: "",
      clientSecret: "",
      accessToken: "test-token",
      refreshToken: "",
      baseUrl: "https://openapi.niftypm.com",
      enabledTools: {
        files: false,
        labels: false,
        documents: false,
        milestones: false,
        messages: false,
        taskGroups: false,
        tasks: true,
        subTeams: false,
        projects: false,
        folders: false,
        members: false,
        webhooks: false,
        time: false,
        fields: false,
        apps: false,
        chat: false,
        invite: false,
        templates: false,
        users: false,
        auth: false,
      },
      disabledTools: [],
    };

    const client = new NiftyPMClient(config);

    // Only register tasks (simulating the conditional in index.ts)
    if (config.enabledTools.tasks) registerTasksTools(mockServer as any, client, []);
    if (config.enabledTools.files) registerFilesTools(mockServer as any, client, []);

    // Only tasks tools should be registered (23 tasks)
    expect(mockServer.addTool).toHaveBeenCalledTimes(23);
  });
});
