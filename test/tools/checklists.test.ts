/**
 * Tests for Checklist Tools (F-2)
 *
 * Verifies tool registration, endpoint mapping, and the critical
 * array-body edge case for item creation.
 *
 * Implements spec scenarios from specs/checklist-tools/spec.md.
 */

import { describe, it, expect } from "vitest";
import { registerChecklistsTools } from "../../src/tools/checklists.js";
import { createMockServer, createMockClient } from "../helpers.js";

describe("registerChecklistsTools", () => {
  const server = createMockServer();
  const client = createMockClient();

  registerChecklistsTools(server as any, client as any, []);

  it("should register 8 checklist tools", () => {
    expect(server.addTool).toHaveBeenCalledTimes(8);
  });

  it("should register tools with correct names", () => {
    const names = server.getToolNames();
    expect(names).toContain("niftypm_create_checklist");
    expect(names).toContain("niftypm_get_checklist");
    expect(names).toContain("niftypm_update_checklist");
    expect(names).toContain("niftypm_delete_checklist");
    expect(names).toContain("niftypm_create_checklist_items");
    expect(names).toContain("niftypm_update_checklist_item");
    expect(names).toContain("niftypm_toggle_checklist_item");
    expect(names).toContain("niftypm_delete_checklist_item");
  });

  // ── Checklist CRUD ─────────────────────────────────────────────────

  describe("niftypm_create_checklist", () => {
    const tool = server.getTool("niftypm_create_checklist")!;

    it("should call internal POST /checklists with {task_id, name}", async () => {
      await tool.execute({ task_id: "n4kd7Mzub2", name: "My Checklist" });

      expect(client.internalPost).toHaveBeenCalledWith("/checklists", {
        task_id: "n4kd7Mzub2",
        name: "My Checklist",
      });
    });
  });

  describe("niftypm_get_checklist", () => {
    const tool = server.getTool("niftypm_get_checklist")!;

    it("should call internal GET /checklists/:id", async () => {
      await tool.execute({ checklist_id: "clk-123" });

      expect(client.internalGet).toHaveBeenCalledWith("/checklists/clk-123");
    });
  });

  describe("niftypm_update_checklist", () => {
    const tool = server.getTool("niftypm_update_checklist")!;

    it("should call internal PUT /checklists/:id with {name}", async () => {
      await tool.execute({ checklist_id: "clk-123", name: "Renamed" });

      expect(client.internalPut).toHaveBeenCalledWith("/checklists/clk-123", {
        name: "Renamed",
      });
    });
  });

  describe("niftypm_delete_checklist", () => {
    const tool = server.getTool("niftypm_delete_checklist")!;

    it("should call internal DELETE /checklists/:id", async () => {
      await tool.execute({ checklist_id: "clk-123" });

      expect(client.internalDelete).toHaveBeenCalledWith("/checklists/clk-123");
    });
  });

  // ── Checklist Item CRUD ────────────────────────────────────────────

  describe("niftypm_create_checklist_items", () => {
    const tool = server.getTool("niftypm_create_checklist_items")!;

    it("should call internal POST /checklists/:id with ARRAY body [{name}]", async () => {
      await tool.execute({
        checklist_id: "clk-123",
        names: ["First item", "Second item"],
      });

      // CRITICAL: body must be an array of objects, not a single object
      expect(client.internalPost).toHaveBeenCalledWith("/checklists/clk-123", [
        { name: "First item" },
        { name: "Second item" },
      ]);
    });

    it("should handle single item correctly (still as array)", async () => {
      await tool.execute({
        checklist_id: "clk-123",
        names: ["Only item"],
      });

      expect(client.internalPost).toHaveBeenCalledWith("/checklists/clk-123", [
        { name: "Only item" },
      ]);
    });

    it("should reject empty names array", () => {
      expect(() =>
        tool.parameters.parse({ checklist_id: "clk-123", names: [] })
      ).toThrow();
    });
  });

  describe("niftypm_update_checklist_item", () => {
    const tool = server.getTool("niftypm_update_checklist_item")!;

    it("should call internal PUT /checklists/:cid/:iid with {name}", async () => {
      await tool.execute({
        checklist_id: "clk-123",
        item_id: "itm-456",
        name: "Renamed item",
      });

      expect(client.internalPut).toHaveBeenCalledWith(
        "/checklists/clk-123/itm-456",
        { name: "Renamed item" }
      );
    });
  });

  describe("niftypm_toggle_checklist_item", () => {
    const tool = server.getTool("niftypm_toggle_checklist_item")!;

    it("should call internal PUT /checklists/:cid/:iid with {completed: true}", async () => {
      await tool.execute({
        checklist_id: "clk-123",
        item_id: "itm-456",
        completed: true,
      });

      expect(client.internalPut).toHaveBeenCalledWith(
        "/checklists/clk-123/itm-456",
        { completed: true }
      );
    });

    it("should handle uncomplete (completed: false)", async () => {
      await tool.execute({
        checklist_id: "clk-123",
        item_id: "itm-456",
        completed: false,
      });

      expect(client.internalPut).toHaveBeenCalledWith(
        "/checklists/clk-123/itm-456",
        { completed: false }
      );
    });
  });

  describe("niftypm_delete_checklist_item", () => {
    const tool = server.getTool("niftypm_delete_checklist_item")!;

    it("should call internal DELETE /checklists/:cid/:iid", async () => {
      await tool.execute({
        checklist_id: "clk-123",
        item_id: "itm-456",
      });

      expect(client.internalDelete).toHaveBeenCalledWith(
        "/checklists/clk-123/itm-456"
      );
    });
  });

  // ── Routing: all calls go to internal API, not the public API ──────

  describe("API routing (spec: Dual API Base URL Support)", () => {
    it("should NEVER call the public client methods for checklist operations", async () => {
      client.get.mockClear();
      client.post.mockClear();
      client.put.mockClear();
      client.delete.mockClear();
      client.internalPost.mockClear();

      // Execute a checklist operation
      const tool = server.getTool("niftypm_create_checklist")!;
      await tool.execute({ task_id: "t1", name: "test" });

      expect(client.post).not.toHaveBeenCalled();
      expect(client.get).not.toHaveBeenCalled();
      expect(client.internalPost).toHaveBeenCalledTimes(1);
    });
  });
});
