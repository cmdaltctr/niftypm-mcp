/**
 * NiftyPM Folders Tools
 * MCP tools for managing folders in NiftyPM
 */

import { z } from "zod";
import type { NiftyPMClient } from "../client.js";

export function registerFoldersTools(server: any, client: NiftyPMClient, disabledTools: string[] = []) {
  // Get folder
  if (!disabledTools.includes("niftypm_get_folder")) {
  server.addTool({
    name: "niftypm_get_folder",
    description: "Get the root folder structure",
    parameters: z.object({
      project_id: z.string().regex(/^[a-zA-Z0-9_!-]+$/).optional().describe("Filter by project ID"),
    }),
    execute: async (params: any) => {
      const folder = await client.get("/api/v1.0/folders", params);
      return JSON.stringify(folder, null, 2);
    },
  });
  }

  // Create folder
  if (!disabledTools.includes("niftypm_create_folder")) {
  server.addTool({
    name: "niftypm_create_folder",
    description: "Create a new folder",
    parameters: z.object({
      name: z.string().describe("Folder name"),
      parent_id: z.string().regex(/^[a-zA-Z0-9_!-]+$/).optional().describe("Parent folder ID"),
      project_id: z.string().regex(/^[a-zA-Z0-9_!-]+$/).optional().describe("Project ID"),
    }),
    execute: async (params: any) => {
      const folder = await client.post("/api/v1.0/folders", params);
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
      folder_id: z.string().regex(/^[a-zA-Z0-9_!-]+$/).describe("Folder ID"),
    }),
    execute: async ({ folder_id }: any) => {
      const folder = await client.get(`/api/v1.0/folders/${folder_id}`);
      return JSON.stringify(folder, null, 2);
    },
  });
  }

  // Get folder children
  if (!disabledTools.includes("niftypm_get_folder_children")) {
  server.addTool({
    name: "niftypm_get_folder_children",
    description: "Get all children (files and subfolders) of a folder",
    parameters: z.object({
      folder_id: z.string().regex(/^[a-zA-Z0-9_!-]+$/).describe("Folder ID"),
      page: z.number().optional().describe("Page number"),
      per_page: z.number().optional().describe("Items per page"),
    }),
    execute: async ({ folder_id, ...params }: any) => {
      const children = await client.get(`/api/v1.0/folders/${folder_id}/children`, params);
      return JSON.stringify(children, null, 2);
    },
  });
  }

  // Update folder
  if (!disabledTools.includes("niftypm_update_folder")) {
  server.addTool({
    name: "niftypm_update_folder",
    description: "Update a folder",
    parameters: z.object({
      folder_id: z.string().regex(/^[a-zA-Z0-9_!-]+$/).describe("Folder ID"),
      name: z.string().optional().describe("Folder name"),
      description: z.string().optional().describe("Folder description"),
    }),
    execute: async ({ folder_id, ...params }: any) => {
      const folder = await client.put(`/api/v1.0/folders/${folder_id}`, params);
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
      folder_id: z.string().regex(/^[a-zA-Z0-9_!-]+$/).describe("Folder ID"),
    }),
    execute: async ({ folder_id }: any) => {
      const result = await client.delete(`/api/v1.0/folders/${folder_id}`);
      return JSON.stringify(result, null, 2);
    },
  });
  }
}
