/**
 * Regression tests for API contract bug fixes.
 *
 * Each describe block locks in a corrected API contract so that
 * a future regression (e.g. reverting to the old request shape)
 * will cause a test failure.
 *
 * Covers:
 *   1. niftypm_link_task — body must be { tasks: [...] } not { linked_task_id, link_type }
 *   2. Label add/remove — body must use key "labels" not "label_ids"
 *   3. niftypm_list_labels — Zod defaults for limit/offset are applied at runtime
 *   4. ID regex — allows "!" in IDs (widened from original character class)
 */

import { describe, it, expect } from "vitest";
import { registerTasksTools } from "../src/tools/tasks.js";
import { registerLabelsTools } from "../src/tools/labels.js";
import { registerDocumentsTools } from "../src/tools/documents.js";
import { registerAppsTools } from "../src/tools/apps.js";
import { registerTemplatesTools } from "../src/tools/templates.js";
import { registerTimeTools } from "../src/tools/time.js";
import { createMockServer, createMockClient } from "./helpers.js";

// ---------------------------------------------------------------------------
// 1. niftypm_link_task — LinkTaskBody schema: { tasks: string[] }
// ---------------------------------------------------------------------------

describe("Bug fix: niftypm_link_task body shape", () => {
  const server = createMockServer();
  const client = createMockClient();
  registerTasksTools(server as any, client as any, []);

  const tool = server.getTool("niftypm_link_task")!;

  it("should POST to /api/v1.0/tasks/:id/link_task with { tasks: [linked_id] }", async () => {
    await tool.execute({ task_id: "task-42", linked_task_id: "task-99" });

    expect(client.post).toHaveBeenCalledWith(
      "/api/v1.0/tasks/task-42/link_task",
      { tasks: ["task-99"] },
    );
  });

  it("should NOT send the old { linked_task_id, link_type } body shape", async () => {
    await tool.execute({ task_id: "task-42", linked_task_id: "task-99" });

    const callArgs = client.post.mock.calls.at(-1)!;
    const body = callArgs[1] as Record<string, unknown>;

    // Regression guard: the old shape used linked_task_id and link_type
    expect(body).not.toHaveProperty("linked_task_id");
    expect(body).not.toHaveProperty("link_type");
  });

  it("should NOT include link_type in the Zod schema", () => {
    const parsed = tool.parameters.safeParse({
      task_id: "t1",
      linked_task_id: "t2",
      link_type: "blocks",
    });

    // link_type was removed from the schema — extra keys are stripped
    // by Zod object schema (default "strip" mode)
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).not.toHaveProperty("link_type");
    }
  });
});

// ---------------------------------------------------------------------------
// 2. Label add/remove — body key must be "labels", not "label_ids"
// ---------------------------------------------------------------------------

describe("Bug fix: label update body uses 'labels' key", () => {
  // -- Task labels ----------------------------------------------------------

  describe("task labels", () => {
    const server = createMockServer();
    const client = createMockClient();
    registerTasksTools(server as any, client as any, []);

    it("niftypm_add_task_labels sends { labels: [...] } via PUT", async () => {
      const tool = server.getTool("niftypm_add_task_labels")!;
      await tool.execute({ task_id: "t1", label_ids: ["l1", "l2"] });

      expect(client.put).toHaveBeenCalledWith(
        "/api/v1.0/tasks/t1/labels",
        { labels: ["l1", "l2"] },
      );
    });

    it("niftypm_remove_task_labels sends { body: { labels: [...] } } via DELETE", async () => {
      const tool = server.getTool("niftypm_remove_task_labels")!;
      await tool.execute({ task_id: "t1", label_ids: ["l3"] });

      expect(client.delete).toHaveBeenCalledWith(
        "/api/v1.0/tasks/t1/labels",
        { body: { labels: ["l3"] } },
      );
    });

    it("add body does NOT contain 'label_ids' key", async () => {
      const tool = server.getTool("niftypm_add_task_labels")!;
      await tool.execute({ task_id: "t1", label_ids: ["l1"] });

      const body = (client.put.mock.calls.at(-1) as any[])[1] as Record<string, unknown>;
      expect(body).not.toHaveProperty("label_ids");
    });

    it("remove body does NOT contain 'label_ids' key", async () => {
      const tool = server.getTool("niftypm_remove_task_labels")!;
      await tool.execute({ task_id: "t1", label_ids: ["l3"] });

      const body = (client.delete.mock.calls.at(-1) as any[])[1] as { body: Record<string, unknown> };
      expect(body.body).not.toHaveProperty("label_ids");
    });
  });

  // -- Document labels ------------------------------------------------------

  describe("document labels", () => {
    const server = createMockServer();
    const client = createMockClient();
    registerDocumentsTools(server as any, client as any, []);

    it("niftypm_add_document_labels sends { labels: [...] } via PUT", async () => {
      const tool = server.getTool("niftypm_add_document_labels")!;
      await tool.execute({ document_id: "d1", label_ids: ["l1"] });

      expect(client.put).toHaveBeenCalledWith(
        "/api/v1.0/docs/d1/labels",
        { labels: ["l1"] },
      );
    });

    it("niftypm_remove_document_labels sends { body: { labels: [...] } } via DELETE", async () => {
      const tool = server.getTool("niftypm_remove_document_labels")!;
      await tool.execute({ document_id: "d1", label_ids: ["l1"] });

      expect(client.delete).toHaveBeenCalledWith(
        "/api/v1.0/docs/d1/labels",
        { body: { labels: ["l1"] } },
      );
    });

    it("remove document body does NOT contain 'label_ids' key", async () => {
      const tool = server.getTool("niftypm_remove_document_labels")!;
      await tool.execute({ document_id: "d1", label_ids: ["l1"] });

      const body = (client.delete.mock.calls.at(-1) as any[])[1] as { body: Record<string, unknown> };
      expect(body.body).not.toHaveProperty("label_ids");
    });
  });
});

// ---------------------------------------------------------------------------
// 3. niftypm_list_labels — default pagination via Zod defaults
// ---------------------------------------------------------------------------

describe("Bug fix: niftypm_list_labels default pagination", () => {
  const server = createMockServer();
  const client = createMockClient();
  registerLabelsTools(server as any, client as any, []);

  const tool = server.getTool("niftypm_list_labels")!;

  // At runtime, FastMCP parses tool arguments through the Zod schema before
  // passing them to execute(). This means Zod defaults (limit: 25, offset: 0)
  // are applied automatically. To faithfully reproduce that in the test, we
  // parse raw input through tool.parameters.parse() first, then call execute
  // with the parsed result. Calling tool.execute({}) directly would bypass
  // Zod and miss the defaults — which is NOT how the tool behaves in production.

  it("applies Zod defaults: limit=25, offset=0 when no pagination is specified", async () => {
    const parsed = tool.parameters.parse({ project_id: "p1" });
    await tool.execute(parsed);

    expect(client.get).toHaveBeenCalledWith("/api/v1.0/labels", {
      project_id: "p1",
      limit: 25,
      offset: 0,
    });
  });

  it("applies Zod defaults even when called with empty input", async () => {
    const parsed = tool.parameters.parse({});
    await tool.execute(parsed);

    expect(client.get).toHaveBeenCalledWith("/api/v1.0/labels", {
      limit: 25,
      offset: 0,
    });
  });

  it("allows explicit override of defaults", async () => {
    const parsed = tool.parameters.parse({ project_id: "p1", limit: 10, offset: 50 });
    await tool.execute(parsed);

    expect(client.get).toHaveBeenCalledWith("/api/v1.0/labels", {
      project_id: "p1",
      limit: 10,
      offset: 50,
    });
  });
});

// ---------------------------------------------------------------------------
// 4. ID regex widening — allows "!" in IDs
// ---------------------------------------------------------------------------

describe("Bug fix: ID regex allows exclamation mark", () => {
  const server = createMockServer();
  const client = createMockClient();
  registerTasksTools(server as any, client as any, []);

  const getTask = server.getTool("niftypm_get_task")!;

  it("accepts an ID containing '!'", () => {
    const result = getTask.parameters.safeParse({ task_id: "abc!def" });
    expect(result.success).toBe(true);
  });

  it("rejects an ID containing a space", () => {
    const result = getTask.parameters.safeParse({ task_id: "has space" });
    expect(result.success).toBe(false);
  });

  it("rejects an ID containing a dot", () => {
    const result = getTask.parameters.safeParse({ task_id: "bad.id" });
    expect(result.success).toBe(false);
  });

  it("accepts a standard alphanumeric-hyphen ID", () => {
    const result = getTask.parameters.safeParse({ task_id: "abc-123_XYZ" });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 5. Mandatory query params on other list endpoints
//
// The same bug class as niftypm_list_labels: the NiftyPM API marks certain
// query params as required, but the tools previously omitted them (or used
// the wrong names), causing the API to reject the request. At runtime FastMCP
// parses arguments through the Zod schema, so we parse before calling execute
// to faithfully reproduce the defaults the tool sends in production.
// ---------------------------------------------------------------------------

describe("Bug fix: mandatory query params on list endpoints", () => {
  it("niftypm_list_apps sends required limit + offset defaults", async () => {
    const server = createMockServer();
    const client = createMockClient();
    registerAppsTools(server as any, client as any, []);
    const tool = server.getTool("niftypm_list_apps")!;

    const parsed = tool.parameters.parse({});
    await tool.execute(parsed);

    expect(client.get).toHaveBeenCalledWith("/api/v1.0/apps", {
      limit: 25,
      offset: 0,
    });
  });

  it("niftypm_list_templates requires `type` and sends pagination defaults", async () => {
    const server = createMockServer();
    const client = createMockClient();
    registerTemplatesTools(server as any, client as any, []);
    const tool = server.getTool("niftypm_list_templates")!;

    // `type` is mandatory — omitting it must fail schema validation.
    expect(tool.parameters.safeParse({}).success).toBe(false);

    const parsed = tool.parameters.parse({ type: 1 });
    await tool.execute(parsed);

    expect(client.get).toHaveBeenCalledWith("/api/v1.0/templates", {
      type: 1,
      limit: 25,
      offset: 0,
    });
  });

  it("niftypm_get_personal_tasks sends limit/offset (not page/per_page)", async () => {
    const server = createMockServer();
    const client = createMockClient();
    registerTasksTools(server as any, client as any, []);
    const tool = server.getTool("niftypm_get_personal_tasks")!;

    const parsed = tool.parameters.parse({});
    await tool.execute(parsed);

    const params = (client.get.mock.calls.at(-1) as any[])[1] as Record<string, unknown>;
    expect(params).toMatchObject({ limit: 25, offset: 0 });
    // Regression guard: old code used page/per_page, which the API ignores.
    expect(params).not.toHaveProperty("page");
    expect(params).not.toHaveProperty("per_page");
  });

  it("niftypm_get_time_duration requires `start` and `end`", () => {
    const server = createMockServer();
    const client = createMockClient();
    registerTimeTools(server as any, client as any, []);
    const tool = server.getTool("niftypm_get_time_duration")!;

    // start + end are mandatory — omitting them must fail schema validation.
    expect(tool.parameters.safeParse({ project_id: "p1" }).success).toBe(false);
    expect(
      tool.parameters.safeParse({ start: "2026-01-01", end: "2026-01-31" }).success,
    ).toBe(true);
  });
});
