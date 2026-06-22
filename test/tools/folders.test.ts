/**
 * Tests for Folders Tools (v2 API — F-3)
 *
 * Verifies that folder tools target /api/v2.0/folders and use the
 * correct v2 field names (folder_name, parent_folder) internally,
 * while exposing user-friendly names (name, parent_id) to MCP clients.
 */

import { describe, it, expect } from "vitest";
import { registerFoldersTools } from "../../src/tools/folders.js";
import { createMockServer, createMockClient } from "../helpers.js";

describe("registerFoldersTools (v2 API)", () => {
  const server = createMockServer();
  const client = createMockClient();

  registerFoldersTools(server as any, client as any, []);

  it("should register 6 folder tools", () => {
    expect(server.addTool).toHaveBeenCalledTimes(6);
  });

  // ── niftypm_get_folder (listing) ───────────────────────────────────

  describe("niftypm_get_folder", () => {
    const tool = server.getTool("niftypm_get_folder")!;

    it("should call GET /api/v2.0/folders with required v2 params", async () => {
      await tool.execute({ project_id: "proj-1" });

      expect(client.get).toHaveBeenCalledWith("/api/v2.0/folders", {
        project_id: "proj-1",
        folder_id: "proj-1",
        limit: 50,
        offset: 0,
      });
    });

    it("should accept folder_id for non-root listing", async () => {
      await tool.execute({ project_id: "proj-1", folder_id: "folder-abc" });

      expect(client.get).toHaveBeenCalledWith("/api/v2.0/folders", {
        project_id: "proj-1",
        folder_id: "folder-abc",
        limit: 50,
        offset: 0,
      });
    });
  });

  // ── niftypm_create_folder ──────────────────────────────────────────

  describe("niftypm_create_folder", () => {
    const tool = server.getTool("niftypm_create_folder")!;

    it("should call POST /api/v2.0/folders with folder_name (not name)", async () => {
      await tool.execute({ name: "My Folder", project_id: "proj-1" });

      expect(client.post).toHaveBeenCalledWith("/api/v2.0/folders", {
        folder_name: "My Folder",
        project_id: "proj-1",
        type: "folder",
      });
    });

    it("should map parent_id to parent_folder in v2 body", async () => {
      await tool.execute({ name: "Sub Folder", project_id: "proj-1", parent_id: "folder-parent" });

      expect(client.post).toHaveBeenCalledWith("/api/v2.0/folders", {
        folder_name: "Sub Folder",
        project_id: "proj-1",
        type: "folder",
        parent_folder: "folder-parent",
      });
    });
  });

  // ── niftypm_get_folder_by_id ───────────────────────────────────────

  describe("niftypm_get_folder_by_id", () => {
    const tool = server.getTool("niftypm_get_folder_by_id")!;

    it("should call GET /api/v2.0/folders/:id", async () => {
      await tool.execute({ folder_id: "folder-123" });

      expect(client.get).toHaveBeenCalledWith("/api/v2.0/folders/folder-123");
    });
  });

  // ── niftypm_get_folder_children ────────────────────────────────────

  describe("niftypm_get_folder_children", () => {
    const tool = server.getTool("niftypm_get_folder_children")!;

    it("should call GET /api/v2.0/folders with folder_id for children listing", async () => {
      await tool.execute({ project_id: "proj-1", folder_id: "folder-abc" });

      expect(client.get).toHaveBeenCalledWith("/api/v2.0/folders", {
        project_id: "proj-1",
        folder_id: "folder-abc",
        limit: 50,
        offset: 0,
      });
    });
  });

  // ── niftypm_update_folder ──────────────────────────────────────────

  describe("niftypm_update_folder", () => {
    const tool = server.getTool("niftypm_update_folder")!;

    it("should call PUT /api/v2.0/folders/:id with folder_name (not name)", async () => {
      await tool.execute({ folder_id: "folder-1", name: "New Name" });

      expect(client.put).toHaveBeenCalledWith("/api/v2.0/folders/folder-1", {
        folder_name: "New Name",
      });
    });
  });

  // ── niftypm_delete_folder ──────────────────────────────────────────

  describe("niftypm_delete_folder", () => {
    const tool = server.getTool("niftypm_delete_folder")!;

    it("should call DELETE /api/v2.0/folders/:id", async () => {
      await tool.execute({ folder_id: "folder-1" });

      expect(client.delete).toHaveBeenCalledWith("/api/v2.0/folders/folder-1");
    });
  });
});
