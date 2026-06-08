/**
 * Tool registration tests for Files
 * Verifies tool names, parameter schemas, and endpoint mapping
 */

import { describe, it, expect } from "vitest";
import { registerFilesTools } from "../../src/tools/files.js";
import { createMockServer, createMockClient } from "../helpers.js";

describe("registerFilesTools", () => {
  const server = createMockServer();
  const client = createMockClient();

  registerFilesTools(server as any, client as any);

  it("should register 4 file tools", () => {
    expect(server.addTool).toHaveBeenCalledTimes(4);
  });

  it("should register tools with correct names", () => {
    const names = server.getToolNames();
    expect(names).toContain("niftypm_list_files");
    expect(names).toContain("niftypm_get_file");
    expect(names).toContain("niftypm_delete_file");
    expect(names).toContain("niftypm_copy_file");
  });

  describe("niftypm_list_files", () => {
    const tool = server.getTool("niftypm_list_files")!;

    it("should call GET /api/v1.0/files with params", async () => {
      await tool.execute({ project_id: "proj-1", limit: 20 });

      expect(client.get).toHaveBeenCalledWith("/api/v1.0/files", {
        project_id: "proj-1",
        limit: 20,
      });
    });
  });

  describe("niftypm_get_file", () => {
    const tool = server.getTool("niftypm_get_file")!;

    it("should call GET /api/v1.0/files/:id", async () => {
      await tool.execute({ file_id: "file-123" });

      expect(client.get).toHaveBeenCalledWith("/api/v1.0/files/file-123");
    });
  });

  describe("niftypm_delete_file", () => {
    const tool = server.getTool("niftypm_delete_file")!;

    it("should call DELETE /api/v1.0/files/:id", async () => {
      await tool.execute({ file_id: "file-123" });

      expect(client.delete).toHaveBeenCalledWith("/api/v1.0/files/file-123");
    });
  });

  describe("niftypm_copy_file", () => {
    const tool = server.getTool("niftypm_copy_file")!;

    it("should call POST /api/v1.0/files/:id/copy with destination", async () => {
      await tool.execute({
        file_id: "file-123",
        destination_project_id: "proj-456",
      });

      expect(client.post).toHaveBeenCalledWith(
        "/api/v1.0/files/file-123/copy",
        { destination_project_id: "proj-456" }
      );
    });
  });
});
