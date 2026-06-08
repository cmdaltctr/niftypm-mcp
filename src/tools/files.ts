/**
 * NiftyPM Files Tools
 * MCP tools for managing files in NiftyPM
 */

import { z } from "zod";
import type { NiftyPMClient } from "../client.js";

export function registerFilesTools(server: any, client: NiftyPMClient) {
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
}
