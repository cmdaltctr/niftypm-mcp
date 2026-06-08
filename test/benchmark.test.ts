/**
 * Performance benchmarks for tool registration and schema creation.
 * Measures overhead of registering all 20 domains deterministically
 * without requiring live NiftyPM API credentials.
 *
 * Run: bun test test/benchmark.test.ts
 */

import { describe, it, expect } from "vitest";
import { createMockServer, createMockClient } from "./helpers.js";

import { registerFilesTools } from "../src/tools/files.js";
import { registerLabelsTools } from "../src/tools/labels.js";
import { registerDocumentsTools } from "../src/tools/documents.js";
import { registerMilestonesTools } from "../src/tools/milestones.js";
import { registerMessagesTools } from "../src/tools/messages.js";
import { registerTaskGroupsTools } from "../src/tools/taskgroups.js";
import { registerTasksTools } from "../src/tools/tasks.js";
import { registerSubTeamsTools } from "../src/tools/subteams.js";
import { registerProjectsTools } from "../src/tools/projects.js";
import { registerFoldersTools } from "../src/tools/folders.js";
import { registerMembersTools } from "../src/tools/members.js";
import { registerWebhooksTools } from "../src/tools/webhooks.js";
import { registerTimeTools } from "../src/tools/time.js";
import { registerFieldsTools } from "../src/tools/fields.js";
import { registerAppsTools } from "../src/tools/apps.js";
import { registerChatTools } from "../src/tools/chat.js";
import { registerInviteTools } from "../src/tools/invite.js";
import { registerTemplatesTools } from "../src/tools/templates.js";
import { registerUsersTools } from "../src/tools/users.js";
import { registerAuthTools } from "../src/tools/auth.js";

const ALL_REGISTRARS = [
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
];

describe("Performance benchmarks", () => {
  it("should register all 20 domains in under 500ms", () => {
    const client = createMockClient();

    const start = performance.now();

    const server = createMockServer();
    for (const regFn of ALL_REGISTRARS) {
      regFn(server, client);
    }

    const elapsed = performance.now() - start;

    // Tool registration is pure synchronous schema construction + mock addTool.
    // Should be well under 500ms even on slow CI runners.
    expect(elapsed).toBeLessThan(500);

    // Sanity: all 20 domains registered at least one tool
    const toolCount = server.addTool.mock.calls.length;
    expect(toolCount).toBeGreaterThan(80);
  });

  it("should register a single domain in under 50ms", () => {
    const client = createMockClient();

    for (const regFn of ALL_REGISTRARS) {
      const start = performance.now();
      const server = createMockServer();
      regFn(server, client);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(50);
    }
  });

  it("should handle 100 repeated full registrations without degradation", () => {
    const client = createMockClient();
    const timings: number[] = [];

    for (let i = 0; i < 100; i++) {
      const start = performance.now();
      const server = createMockServer();
      for (const regFn of ALL_REGISTRARS) {
        regFn(server, client);
      }
      timings.push(performance.now() - start);
    }

    const avgTime = timings.reduce((a, b) => a + b, 0) / timings.length;
    const maxTime = Math.max(...timings);

    // Average registration of all domains should be fast
    expect(avgTime).toBeLessThan(100);
    // No single iteration should be egregiously slow (no memory leak / degradation)
    expect(maxTime).toBeLessThan(500);
  });
});
