/**
 * NiftyPM Documents Tools
 * MCP tools for managing documents in NiftyPM
 */

import { z } from "zod";
import type { NiftyPMClient } from "../client.js";

export function registerDocumentsTools(server: any, client: NiftyPMClient) {
  // List documents
  server.addTool({
    name: "niftypm_list_documents",
    description: "List documents in a project",
    parameters: z.object({
      project_id: z.string().regex(/^[a-zA-Z0-9_-]+$/).optional().describe("Filter by project ID"),
      limit: z.number().optional().describe("Number of results to return"),
      offset: z.number().optional().describe("Pagination offset"),
    }),
    execute: async (params: any) => {
      const documents = await client.get("/api/v1.0/docs", params);
      return JSON.stringify(documents, null, 2);
    },
  });

  // Get document by ID
  server.addTool({
    name: "niftypm_get_document",
    description: "Get a specific document by ID",
    parameters: z.object({
      document_id: z.string().regex(/^[a-zA-Z0-9_-]+$/).describe("Document ID"),
    }),
    execute: async ({ document_id }: any) => {
      const document = await client.get(`/api/v1.0/docs/${document_id}`);
      return JSON.stringify(document, null, 2);
    },
  });

  // Create document
  server.addTool({
    name: "niftypm_create_document",
    description: "Create a new document",
    parameters: z.object({
      title: z.string().describe("Document title"),
      content: z.string().optional().describe("Document content"),
      project_id: z.string().regex(/^[a-zA-Z0-9_-]+$/).describe("Project ID"),
    }),
    execute: async (params: any) => {
      const document = await client.post("/api/v1.0/docs", params);
      return JSON.stringify(document, null, 2);
    },
  });

  // Update document
  server.addTool({
    name: "niftypm_update_document",
    description: "Update an existing document",
    parameters: z.object({
      document_id: z.string().regex(/^[a-zA-Z0-9_-]+$/).describe("Document ID"),
      title: z.string().optional().describe("Document title"),
      content: z.string().optional().describe("Document content"),
    }),
    execute: async ({ document_id, ...params }: any) => {
      const document = await client.put(`/api/v1.0/docs/${document_id}`, params);
      return JSON.stringify(document, null, 2);
    },
  });

  // Delete document
  server.addTool({
    name: "niftypm_delete_document",
    description: "Delete a document",
    parameters: z.object({
      document_id: z.string().regex(/^[a-zA-Z0-9_-]+$/).describe("Document ID"),
    }),
    execute: async ({ document_id }: any) => {
      const result = await client.delete(`/api/v1.0/docs/${document_id}`);
      return JSON.stringify(result, null, 2);
    },
  });

  // Move document
  server.addTool({
    name: "niftypm_move_document",
    description: "Move a document to another project",
    parameters: z.object({
      document_id: z.string().regex(/^[a-zA-Z0-9_-]+$/).describe("Document ID"),
      destination_project_id: z.string().regex(/^[a-zA-Z0-9_-]+$/).describe("Destination project ID"),
    }),
    execute: async ({ document_id, ...params }: any) => {
      const result = await client.post(`/api/v1.0/docs/${document_id}/move_to_project`, params);
      return JSON.stringify(result, null, 2);
    },
  });

  // ── Personal documents ──────────────────────────────────────────────

  // Create personal document
  server.addTool({
    name: "niftypm_create_personal_document",
    description: "Create a new personal document (not tied to a project)",
    parameters: z.object({
      title: z.string().describe("Document title"),
      content: z.string().optional().describe("Document content"),
    }),
    execute: async (params: any) => {
      const document = await client.post("/api/v1.0/docs/personal", params);
      return JSON.stringify(document, null, 2);
    },
  });

  // Get personal documents
  server.addTool({
    name: "niftypm_get_personal_documents",
    description: "List personal documents for the current user",
    parameters: z.object({
      page: z.number().optional().describe("Page number"),
      per_page: z.number().optional().describe("Items per page"),
    }),
    execute: async (params: any) => {
      const documents = await client.get("/api/v1.0/docs/personal", params);
      return JSON.stringify(documents, null, 2);
    },
  });

  // ── Document members ────────────────────────────────────────────────

  // Add document members
  server.addTool({
    name: "niftypm_add_document_members",
    description: "Add members to a document",
    parameters: z.object({
      document_id: z.string().regex(/^[a-zA-Z0-9_-]+$/).describe("Document ID"),
      member_ids: z.array(z.string().regex(/^[a-zA-Z0-9_-]+$/)).describe("Array of Member IDs to add"),
    }),
    execute: async ({ document_id, ...params }: any) => {
      const result = await client.put(`/api/v1.0/docs/${document_id}/members`, params);
      return JSON.stringify(result, null, 2);
    },
  });

  // Remove document members
  server.addTool({
    name: "niftypm_remove_document_members",
    description: "Remove members from a document",
    parameters: z.object({
      document_id: z.string().regex(/^[a-zA-Z0-9_-]+$/).describe("Document ID"),
      member_ids: z.array(z.string().regex(/^[a-zA-Z0-9_-]+$/)).describe("Array of Member IDs to remove"),
    }),
    execute: async ({ document_id, ...params }: any) => {
      const result = await client.delete(`/api/v1.0/docs/${document_id}/members`, { body: params });
      return JSON.stringify(result, null, 2);
    },
  });

  // ── Document versioning ─────────────────────────────────────────────

  // Change document (create new version)
  server.addTool({
    name: "niftypm_change_document",
    description: "Create a new version of a document",
    parameters: z.object({
      document_id: z.string().regex(/^[a-zA-Z0-9_-]+$/).describe("Document ID"),
      content: z.string().describe("New document content"),
      message: z.string().optional().describe("Version change message"),
    }),
    execute: async ({ document_id, ...params }: any) => {
      const result = await client.post(`/api/v1.0/docs/${document_id}/change`, params);
      return JSON.stringify(result, null, 2);
    },
  });

  // ── Document labels ─────────────────────────────────────────────────

  // Add document labels
  server.addTool({
    name: "niftypm_add_document_labels",
    description: "Add labels to a document",
    parameters: z.object({
      document_id: z.string().regex(/^[a-zA-Z0-9_-]+$/).describe("Document ID"),
      label_ids: z.array(z.string().regex(/^[a-zA-Z0-9_-]+$/)).describe("Array of Label IDs to add"),
    }),
    execute: async ({ document_id, ...params }: any) => {
      const result = await client.put(`/api/v1.0/docs/${document_id}/labels`, params);
      return JSON.stringify(result, null, 2);
    },
  });

  // Remove document labels
  server.addTool({
    name: "niftypm_remove_document_labels",
    description: "Remove labels from a document",
    parameters: z.object({
      document_id: z.string().regex(/^[a-zA-Z0-9_-]+$/).describe("Document ID"),
      label_ids: z.array(z.string().regex(/^[a-zA-Z0-9_-]+$/)).describe("Array of Label IDs to remove"),
    }),
    execute: async ({ document_id, ...params }: any) => {
      const result = await client.delete(`/api/v1.0/docs/${document_id}/labels`, { body: params });
      return JSON.stringify(result, null, 2);
    },
  });
}
