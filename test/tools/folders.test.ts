/**
 * Tool registration tests for Folders
 * Verifies tool names, parameter schemas, and endpoint mapping
 */

import { describe, it, expect } from "vitest";
import { registerFoldersTools } from "../../src/tools/folders.js";
import { createMockServer, createMockClient } from "../helpers.js";

describe("registerFoldersTools", () => {
  const server = createMockServer();
  const client = createMockClient();

  registerFoldersTools(
    server as Parameters<typeof registerFoldersTools>[0],
    client as unknown as Parameters<typeof registerFoldersTools>[1],
  );

  it("should register 6 folder tools", () => {
    expect(server.addTool).toHaveBeenCalledTimes(6);
  });

  it("should register tools with correct names", () => {
    const names = server.getToolNames();
    expect(names).toContain("niftypm_get_folder");
    expect(names).toContain("niftypm_create_folder");
    expect(names).toContain("niftypm_get_folder_by_id");
    expect(names).toContain("niftypm_get_folder_children");
    expect(names).toContain("niftypm_update_folder");
    expect(names).toContain("niftypm_delete_folder");
  });

  describe("niftypm_get_folder", () => {
    const tool = server.getTool("niftypm_get_folder")!;

    it("should call GET /api/v1.0/folders with params", async () => {
      await tool.execute({ project_id: "proj-1" });

      expect(client.get).toHaveBeenCalledWith("/api/v1.0/folders", {
        project_id: "proj-1",
      });
    });
  });

  describe("niftypm_create_folder", () => {
    const tool = server.getTool("niftypm_create_folder")!;

    it("should call POST /api/v1.0/folders with body", async () => {
      const params = { name: "New Folder", project_id: "proj-1" };
      await tool.execute(params);

      expect(client.post).toHaveBeenCalledWith("/api/v1.0/folders", params);
    });
  });

  describe("niftypm_get_folder_by_id", () => {
    const tool = server.getTool("niftypm_get_folder_by_id")!;

    it("should call GET /api/v1.0/folders/:id", async () => {
      await tool.execute({ folder_id: "folder-123" });

      expect(client.get).toHaveBeenCalledWith("/api/v1.0/folders/folder-123");
    });
  });

  describe("niftypm_get_folder_children", () => {
    const tool = server.getTool("niftypm_get_folder_children")!;

    it("should call GET /api/v1.0/folders/:id/children with params", async () => {
      await tool.execute({ folder_id: "folder-1", page: 1, per_page: 20 });

      expect(client.get).toHaveBeenCalledWith("/api/v1.0/folders/folder-1/children", {
        page: 1,
        per_page: 20,
      });
    });
  });

  describe("niftypm_update_folder", () => {
    const tool = server.getTool("niftypm_update_folder")!;

    it("should call PUT /api/v1.0/folders/:id with remaining params", async () => {
      await tool.execute({ folder_id: "folder-1", name: "Updated" });

      expect(client.put).toHaveBeenCalledWith("/api/v1.0/folders/folder-1", {
        name: "Updated",
      });
    });
  });

  describe("niftypm_delete_folder", () => {
    const tool = server.getTool("niftypm_delete_folder")!;

    it("should call DELETE /api/v1.0/folders/:id", async () => {
      await tool.execute({ folder_id: "folder-1" });

      expect(client.delete).toHaveBeenCalledWith("/api/v1.0/folders/folder-1");
    });
  });
});
