/**
 * NiftyPM Labels/Tags Tools
 * MCP tools for managing labels in NiftyPM
 */

import { z } from "zod";
import type { NiftyPMClient } from "../client.js";

export function registerLabelsTools(server: any, client: NiftyPMClient, disabledTools: string[] = []) {
  // List labels
  if (!disabledTools.includes("niftypm_list_labels")) {
  server.addTool({
    name: "niftypm_list_labels",
    description: "List all labels/tags",
    parameters: z.object({
      project_id: z.string().regex(/^[a-zA-Z0-9_!-]+$/).optional().describe("Filter by project ID"),
      limit: z.number().min(1).max(100).optional().default(25).describe("Number of results to return (1-100, default 25)"),
      offset: z.number().min(0).optional().default(0).describe("Pagination offset (default 0)"),
      // Spec types `type` as a free integer; 0/1 are the known label-type values.
      type: z.union([z.literal(0), z.literal(1)]).optional().describe("Label type filter (0 or 1)"),
    }),
    execute: async (params: any) => {
      // NiftyPM requires limit and offset query params on GET /labels.
      const labels = await client.get("/api/v1.0/labels", params);
      return JSON.stringify(labels, null, 2);
    },
  });
  }

  // Get label by ID
  if (!disabledTools.includes("niftypm_get_label")) {
  server.addTool({
    name: "niftypm_get_label",
    description: "Get a specific label by ID",
    parameters: z.object({
      label_id: z.string().regex(/^[a-zA-Z0-9_!-]+$/).describe("Label ID"),
    }),
    execute: async ({ label_id }: any) => {
      const label = await client.get(`/api/v1.0/labels/${label_id}`);
      return JSON.stringify(label, null, 2);
    },
  });
  }

  // Create label
  if (!disabledTools.includes("niftypm_create_label")) {
  server.addTool({
    name: "niftypm_create_label",
    description: "Create a new label/tag",
    parameters: z.object({
      name: z.string().describe("Label name"),
      color: z.string().optional().describe("Label color (hex format)"),
      project_id: z.string().regex(/^[a-zA-Z0-9_!-]+$/).optional().describe("Project ID to associate with"),
    }),
    execute: async (params: any) => {
      const label = await client.post("/api/v1.0/labels", params);
      return JSON.stringify(label, null, 2);
    },
  });
  }

  // Update label
  if (!disabledTools.includes("niftypm_update_label")) {
  server.addTool({
    name: "niftypm_update_label",
    description: "Update an existing label",
    parameters: z.object({
      label_id: z.string().regex(/^[a-zA-Z0-9_!-]+$/).describe("Label ID"),
      name: z.string().optional().describe("Label name"),
      color: z.string().optional().describe("Label color (hex format)"),
    }),
    execute: async ({ label_id, ...params }: any) => {
      const label = await client.put(`/api/v1.0/labels/${label_id}`, params);
      return JSON.stringify(label, null, 2);
    },
  });
  }

  // Delete label
  if (!disabledTools.includes("niftypm_delete_label")) {
  server.addTool({
    name: "niftypm_delete_label",
    description: "Delete a label",
    parameters: z.object({
      label_id: z.string().regex(/^[a-zA-Z0-9_!-]+$/).describe("Label ID"),
    }),
    execute: async ({ label_id }: any) => {
      const result = await client.delete(`/api/v1.0/labels/${label_id}`);
      return JSON.stringify(result, null, 2);
    },
  });
  }
}
