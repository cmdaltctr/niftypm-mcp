/**
 * NiftyPM Folders Tools (v2 API)
 *
 * Migrated from /api/v1.0/folders (never existed on openapi.niftypm.com)
 * to /api/v2.0/folders on 2026-06-22. The v2 API uses different field
 * names than v1: folder_name (not name), parent_folder (not parent_id),
 * and GET /api/v2.0/folders requires project_id + folder_id + limit + offset.
 *
 * MCP-facing argument names stay user-friendly (name, parent_id) and are
 * mapped to the v2 API field names internally.
 */

import { z } from "zod";
import type { NiftyPMClient } from "../client.js";

const idSchema = z.string().regex(/^[a-zA-Z0-9_!-]+$/);

export function registerFoldersTools(server: any, client: NiftyPMClient, disabledTools: string[] = []) {

  // Get folder listing (v2 requires project_id, folder_id, limit, offset)
  if (!disabledTools.includes("niftypm_get_folder")) {
  server.addTool({
    name: "niftypm_get_folder",
    description: "List folders within a project. Defaults to the project root.",
    parameters: z.object({
      project_id: idSchema.describe("Project ID"),
      folder_id: idSchema.optional().describe("Parent folder ID to list children of (omit for project root)"),
      limit: z.number().min(1).max(100).optional().describe("Items per page (default 50)"),
      offset: z.number().min(0).optional().describe("Pagination offset (default 0)"),
    }),
    execute: async (params: any) => {
      const queryParams = {
        project_id: params.project_id,
        folder_id: params.folder_id || params.project_id,
        limit: params.limit ?? 50,
        offset: params.offset ?? 0,
      };
      const folder = await client.get("/api/v2.0/folders", queryParams);
      return JSON.stringify(folder, null, 2);
    },
  });
  }

  // Create folder (v2 uses folder_name, parent_folder — not name, parent_id)
  if (!disabledTools.includes("niftypm_create_folder")) {
  server.addTool({
    name: "niftypm_create_folder",
    description: "Create a new folder",
    parameters: z.object({
      name: z.string().describe("Folder name"),
      project_id: idSchema.describe("Project ID"),
      parent_id: idSchema.optional().describe("Parent folder ID (omit for root level)"),
    }),
    execute: async ({ name, project_id, parent_id }: any) => {
      const body: Record<string, any> = {
        folder_name: name,
        project_id,
        type: "folder",
      };
      if (parent_id) {
        body.parent_folder = parent_id;
      }
      const folder = await client.post("/api/v2.0/folders", body);
      return JSON.stringify(folder, null, 2);
    },
  });
  }

  // Get folder by ID
  if (!disabledTools.includes("niftypm_get_folder_by_id")) {
  server.addTool({
    name: "niftypm_get_folder_by_id",
    description: "Get a specific folder by ID",
    parameters: z.object({
      folder_id: idSchema.describe("Folder ID"),
    }),
    execute: async ({ folder_id }: any) => {
      const folder = await client.get(`/api/v2.0/folders/${folder_id}`);
      return JSON.stringify(folder, null, 2);
    },
  });
  }

  // Get folder children (v2: same listing endpoint with a specific folder_id)
  if (!disabledTools.includes("niftypm_get_folder_children")) {
  server.addTool({
    name: "niftypm_get_folder_children",
    description: "List all children (files and subfolders) of a specific folder",
    parameters: z.object({
      project_id: idSchema.describe("Project ID"),
      folder_id: idSchema.describe("Folder ID to list children of"),
      limit: z.number().min(1).max(100).optional().describe("Items per page (default 50)"),
      offset: z.number().min(0).optional().describe("Pagination offset (default 0)"),
    }),
    execute: async (params: any) => {
      const queryParams = {
        project_id: params.project_id,
        folder_id: params.folder_id,
        limit: params.limit ?? 50,
        offset: params.offset ?? 0,
      };
      const children = await client.get("/api/v2.0/folders", queryParams);
      return JSON.stringify(children, null, 2);
    },
  });
  }

  // Update folder (v2 uses folder_name — not name)
  if (!disabledTools.includes("niftypm_update_folder")) {
  server.addTool({
    name: "niftypm_update_folder",
    description: "Update a folder",
    parameters: z.object({
      folder_id: idSchema.describe("Folder ID"),
      name: z.string().optional().describe("New folder name"),
      description: z.string().optional().describe("Folder description"),
    }),
    execute: async ({ folder_id, name, ...rest }: any) => {
      const body: Record<string, any> = { ...rest };
      if (name) {
        body.folder_name = name;
      }
      const folder = await client.put(`/api/v2.0/folders/${folder_id}`, body);
      return JSON.stringify(folder, null, 2);
    },
  });
  }

  // Delete folder
  if (!disabledTools.includes("niftypm_delete_folder")) {
  server.addTool({
    name: "niftypm_delete_folder",
    description: "Delete a folder",
    parameters: z.object({
      folder_id: idSchema.describe("Folder ID"),
    }),
    execute: async ({ folder_id }: any) => {
      const result = await client.delete(`/api/v2.0/folders/${folder_id}`);
      return JSON.stringify(result, null, 2);
    },
  });
  }
}
