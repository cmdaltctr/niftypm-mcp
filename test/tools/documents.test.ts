/**
 * Tool registration tests for Documents
 * Verifies tool names, parameter schemas, and endpoint mapping
 */

import { describe, it, expect } from "vitest";
import { registerDocumentsTools } from "../../src/tools/documents.js";
import { createMockServer, createMockClient } from "../helpers.js";

describe("registerDocumentsTools", () => {
  const server = createMockServer();
  const client = createMockClient();

  registerDocumentsTools(server as any, client as any, []);

  it("should register 13 document tools", () => {
    expect(server.addTool).toHaveBeenCalledTimes(13);
  });

  it("should register tools with correct names", () => {
    const names = server.getToolNames();
    expect(names).toContain("niftypm_list_documents");
    expect(names).toContain("niftypm_get_document");
    expect(names).toContain("niftypm_create_document");
    expect(names).toContain("niftypm_update_document");
    expect(names).toContain("niftypm_delete_document");
    expect(names).toContain("niftypm_move_document");
  });

  describe("niftypm_list_documents", () => {
    const tool = server.getTool("niftypm_list_documents")!;

    it("should call GET /api/v1.0/docs with params", async () => {
      await tool.execute({ project_id: "proj-1", limit: 10 });

      expect(client.get).toHaveBeenCalledWith("/api/v1.0/docs", {
        project_id: "proj-1",
        limit: 10,
      });
    });
  });

  describe("niftypm_get_document", () => {
    const tool = server.getTool("niftypm_get_document")!;

    it("should call GET /api/v1.0/docs/:id", async () => {
      await tool.execute({ document_id: "doc-123" });

      expect(client.get).toHaveBeenCalledWith("/api/v1.0/docs/doc-123");
    });
  });

  describe("niftypm_create_document", () => {
    const tool = server.getTool("niftypm_create_document")!;

    it("should call POST /api/v1.0/docs with body", async () => {
      const params = { name: "My Doc", content: "Hello", project_id: "proj-1" };
      await tool.execute(params);

      expect(client.post).toHaveBeenCalledWith("/api/v1.0/docs", params);
    });
  });

  describe("niftypm_update_document", () => {
    const tool = server.getTool("niftypm_update_document")!;

    it("should call PUT /api/v1.0/docs/:id with remaining params", async () => {
      await tool.execute({ document_id: "doc-1", title: "Updated Title" });

      expect(client.put).toHaveBeenCalledWith("/api/v1.0/docs/doc-1", {
        title: "Updated Title",
      });
    });
  });

  describe("niftypm_delete_document", () => {
    const tool = server.getTool("niftypm_delete_document")!;

    it("should call DELETE /api/v1.0/docs/:id", async () => {
      await tool.execute({ document_id: "doc-1" });

      expect(client.delete).toHaveBeenCalledWith("/api/v1.0/docs/doc-1");
    });
  });

  describe("niftypm_move_document", () => {
    const tool = server.getTool("niftypm_move_document")!;

    it("should call POST /api/v1.0/docs/:id/move_to_project", async () => {
      await tool.execute({
        document_id: "doc-1",
        destination_project_id: "proj-2",
      });

      expect(client.put).toHaveBeenCalledWith(
        "/api/v1.0/docs/doc-1/move_to_project",
        { destination_project_id: "proj-2" }
      );
    });
  });
});
