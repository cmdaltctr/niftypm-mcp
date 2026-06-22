/**
 * Tests for niftypm_list_tasks parameter forwarding (F-1)
 *
 * Verifies that each of the 15 spec-defined query parameters added in F-1
 * is correctly forwarded to client.get("/api/v1.0/tasks", params).
 *
 * Implements spec scenarios:
 *   - "Tool exposes all spec-defined query parameters"
 *   - "List tasks supports subtask inclusion"
 */

import { describe, it, expect } from "vitest";
import { registerTasksTools } from "../../src/tools/tasks.js";
import { createMockServer, createMockClient } from "../helpers.js";

describe("niftypm_list_tasks — parameter forwarding (F-1)", () => {
  const server = createMockServer();
  const client = createMockClient();

  registerTasksTools(server as any, client as any, []);
  const tool = server.getTool("niftypm_list_tasks")!;

  // Helper: call the tool with a single param and verify it reached client.get
  async function expectParamForwarded(param: string, value: any) {
    client.get.mockClear();
    await tool.execute({ [param]: value });
    expect(client.get).toHaveBeenCalledTimes(1);
    const [, forwardedParams] = client.get.mock.calls[0];
    expect(forwardedParams).toHaveProperty(param, value);
  }

  // ── The 15 new params ──────────────────────────────────────────────

  it("forwards include_subtasks", async () => {
    await expectParamForwarded("include_subtasks", "true");
  });

  it("forwards task_id (single-task filter)", async () => {
    await expectParamForwarded("task_id", "n4kd7Mzub2");
  });

  it("forwards meeting_id", async () => {
    await expectParamForwarded("meeting_id", "mtg-123");
  });

  it("forwards completed_by", async () => {
    await expectParamForwarded("completed_by", "k4D7O7fEol");
  });

  it("forwards include_archived", async () => {
    await expectParamForwarded("include_archived", "true");
  });

  it("forwards order", async () => {
    await expectParamForwarded("order", "desc");
  });

  it("forwards sort", async () => {
    await expectParamForwarded("sort", "name");
  });

  it("forwards from (date range start)", async () => {
    await expectParamForwarded("from", "2026-01-01");
  });

  it("forwards to (date range end)", async () => {
    await expectParamForwarded("to", "2026-12-31");
  });

  it("forwards archived_from", async () => {
    await expectParamForwarded("archived_from", "2026-01-01");
  });

  it("forwards archived_to", async () => {
    await expectParamForwarded("archived_to", "2026-12-31");
  });

  it("forwards completed_from", async () => {
    await expectParamForwarded("completed_from", "2026-01-01");
  });

  it("forwards completed_to", async () => {
    await expectParamForwarded("completed_to", "2026-12-31");
  });

  it("forwards project_ids (multi-project filter)", async () => {
    await expectParamForwarded("project_ids", "proj1,proj2");
  });

  it("forwards assignee_ids (array filter)", async () => {
    await expectParamForwarded("assignee_ids", ["user1", "user2"]);
  });

  // ── The critical user scenario ─────────────────────────────────────

  it("forwards include_subtasks + task_id together (the Issue 1 workaround)", async () => {
    client.get.mockClear();
    await tool.execute({ task_id: "n4kd7Mzub2", include_subtasks: "true" });

    expect(client.get).toHaveBeenCalledWith("/api/v1.0/tasks", {
      task_id: "n4kd7Mzub2",
      include_subtasks: "true",
    });
  });

  // ── Existing params still work ─────────────────────────────────────

  it("still forwards original params (project_id, limit, offset)", async () => {
    client.get.mockClear();
    await tool.execute({ project_id: "KJ1kaUGQe8", limit: 50, offset: 10 });

    expect(client.get).toHaveBeenCalledWith("/api/v1.0/tasks", {
      project_id: "KJ1kaUGQe8",
      limit: 50,
      offset: 10,
    });
  });
});
