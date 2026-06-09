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

  registerFilesTools(server as any, client as any, []);

  it("should register 8 file tools", () => {
    expect(server.addTool).toHaveBeenCalledTimes(8);
  });

  it("should register tools with correct names", () => {
    const names = server.getToolNames();
    expect(names).toContain("niftypm_upload_files");
    expect(names).toContain("niftypm_list_files");
    expect(names).toContain("niftypm_get_file");
    expect(names).toContain("niftypm_delete_file");
    expect(names).toContain("niftypm_update_file");
    expect(names).toContain("niftypm_copy_file");
    expect(names).toContain("niftypm_add_file_labels");
    expect(names).toContain("niftypm_remove_file_labels");
  });

  describe("niftypm_upload_files", () => {
    const tool = server.getTool("niftypm_upload_files")!;

    it("should call multipart upload with form data and query params", async () => {
      await tool.execute({
        files: [{
          filename: "hello.txt",
          content_base64: btoa("hello"),
          mime_type: "text/plain",
        }],
        project_id: "proj-1",
      });

      expect(client.formUpload).toHaveBeenCalledTimes(1);
      const [endpoint, formData, params] = client.formUpload.mock.calls[0];
      expect(endpoint).toBe("/api/v1.0/files");
      expect(formData).toBeInstanceOf(FormData);
      expect(params).toEqual({ project_id: "proj-1" });
    });

    it("should reject upload params without a target identifier", () => {
      expect(() => tool.parameters.parse({
        files: [{
          filename: "hello.txt",
          content_base64: btoa("hello"),
          mime_type: "text/plain",
        }],
      })).toThrow();
    });
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

  describe("niftypm_update_file", () => {
    const tool = server.getTool("niftypm_update_file")!;

    it("should call PUT /api/v1.0/files/:id with metadata", async () => {
      await tool.execute({ file_id: "file-123", folder_id: "folder-456" });

      expect(client.put).toHaveBeenCalledWith("/api/v1.0/files/file-123", {
        folder_id: "folder-456",
      });
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

  describe("niftypm_add_file_labels", () => {
    const tool = server.getTool("niftypm_add_file_labels")!;

    it("should call PUT /api/v1.0/files/:id/labels", async () => {
      await tool.execute({ file_id: "file-123", labels: ["label-1"] });

      expect(client.put).toHaveBeenCalledWith(
        "/api/v1.0/files/file-123/labels",
        { labels: ["label-1"] }
      );
    });
  });

  describe("niftypm_remove_file_labels", () => {
    const tool = server.getTool("niftypm_remove_file_labels")!;

    it("should call DELETE /api/v1.0/files/:id/labels with body", async () => {
      await tool.execute({ file_id: "file-123", labels: ["label-1"] });

      expect(client.delete).toHaveBeenCalledWith(
        "/api/v1.0/files/file-123/labels",
        { body: { labels: ["label-1"] } }
      );
    });
  });
});
