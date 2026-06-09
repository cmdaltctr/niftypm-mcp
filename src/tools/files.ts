/**
 * NiftyPM Files Tools
 * MCP tools for managing files in NiftyPM
 */

import { z } from "zod";
import type { NiftyPMClient } from "../client.js";

const base64ToBlob = (content: string, mimeType: string) => {
  const binary = atob(content);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
};

export function registerFilesTools(server: any, client: NiftyPMClient) {
  // Upload files
  server.addTool({
    name: "niftypm_upload_files",
    description: "Upload one or more files",
    parameters: z.object({
      files: z.array(z.object({
        filename: z.string().describe("File name to upload"),
        content_base64: z.string().describe("Base64-encoded file content"),
        mime_type: z.string().optional().default("application/octet-stream").describe("File MIME type"),
      })).min(1).describe("Files to upload"),
      project_id: z.string().regex(/^[a-zA-Z0-9_-]+$/).optional().describe("Project ID"),
      task_id: z.string().regex(/^[a-zA-Z0-9_-]+$/).optional().describe("Task ID"),
      doc_id: z.string().regex(/^[a-zA-Z0-9_-]+$/).optional().describe("Document ID"),
      folder_id: z.string().regex(/^[a-zA-Z0-9_-]+$/).optional().describe("Folder ID"),
      folder_stack: z.array(z.string()).optional().describe("Folder stack"),
    }).refine(
      (params) => params.project_id || params.task_id || params.doc_id,
      "At least one target identifier is required: project_id, task_id, or doc_id"
    ),
    execute: async ({ files, ...params }: any) => {
      const formData = new FormData();
      files.forEach((file: any) => {
        formData.append(
          "files",
          base64ToBlob(file.content_base64, file.mime_type ?? "application/octet-stream"),
          file.filename
        );
      });

      const result = await client.formUpload("/api/v1.0/files", formData, params);
      return JSON.stringify(result, null, 2);
    },
  });

  // List files
  server.addTool({
    name: "niftypm_list_files",
    description: "List files in a project or task",
    parameters: z.object({
      project_id: z.string().regex(/^[a-zA-Z0-9_-]+$/).optional().describe("Filter by project ID"),
      task_id: z.string().regex(/^[a-zA-Z0-9_-]+$/).optional().describe("Filter by task ID"),
      limit: z.number().optional().describe("Number of results to return"),
      offset: z.number().optional().describe("Pagination offset"),
    }),
    execute: async (params: any) => {
      const files = await client.get("/api/v1.0/files", params);
      return JSON.stringify(files, null, 2);
    },
  });

  // Get file by ID
  server.addTool({
    name: "niftypm_get_file",
    description: "Get a specific file by ID",
    parameters: z.object({
      file_id: z.string().regex(/^[a-zA-Z0-9_-]+$/).describe("File ID"),
    }),
    execute: async ({ file_id }: any) => {
      const file = await client.get(`/api/v1.0/files/${file_id}`);
      return JSON.stringify(file, null, 2);
    },
  });

  // Delete file
  server.addTool({
    name: "niftypm_delete_file",
    description: "Delete a file",
    parameters: z.object({
      file_id: z.string().regex(/^[a-zA-Z0-9_-]+$/).describe("File ID"),
    }),
    execute: async ({ file_id }: any) => {
      const result = await client.delete(`/api/v1.0/files/${file_id}`);
      return JSON.stringify(result, null, 2);
    },
  });

  // Update file
  server.addTool({
    name: "niftypm_update_file",
    description: "Update file metadata",
    parameters: z.object({
      file_id: z.string().regex(/^[a-zA-Z0-9_-]+$/).describe("File ID"),
      folder_id: z.string().regex(/^[a-zA-Z0-9_-]+$/).optional().describe("Folder ID"),
      folder_stack: z.array(z.string()).optional().describe("Folder stack"),
      annotations_task_id: z.string().regex(/^[a-zA-Z0-9_-]+$/).optional().describe("Annotations Task ID"),
    }),
    execute: async ({ file_id, ...params }: any) => {
      const result = await client.put(`/api/v1.0/files/${file_id}`, params);
      return JSON.stringify(result, null, 2);
    },
  });

  // Copy file
  server.addTool({
    name: "niftypm_copy_file",
    description: "Copy a file to another location",
    parameters: z.object({
      file_id: z.string().regex(/^[a-zA-Z0-9_-]+$/).describe("File ID"),
      destination_project_id: z.string().regex(/^[a-zA-Z0-9_-]+$/).describe("Destination project ID"),
    }),
    execute: async ({ file_id, ...params }: any) => {
      const result = await client.post(`/api/v1.0/files/${file_id}/copy`, params);
      return JSON.stringify(result, null, 2);
    },
  });

  // Add file labels
  server.addTool({
    name: "niftypm_add_file_labels",
    description: "Add labels to a file",
    parameters: z.object({
      file_id: z.string().regex(/^[a-zA-Z0-9_-]+$/).describe("File ID"),
      labels: z.array(z.string()).min(1).describe("Array of labels to add"),
    }),
    execute: async ({ file_id, labels }: any) => {
      const result = await client.put(`/api/v1.0/files/${file_id}/labels`, { labels });
      return JSON.stringify(result, null, 2);
    },
  });

  // Remove file labels
  server.addTool({
    name: "niftypm_remove_file_labels",
    description: "Remove labels from a file",
    parameters: z.object({
      file_id: z.string().regex(/^[a-zA-Z0-9_-]+$/).describe("File ID"),
      labels: z.array(z.string()).min(1).describe("Array of labels to remove"),
    }),
    execute: async ({ file_id, labels }: any) => {
      const result = await client.delete(`/api/v1.0/files/${file_id}/labels`, { body: { labels } });
      return JSON.stringify(result, null, 2);
    },
  });
}
