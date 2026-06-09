/**
 * NiftyPM SubTeams Tools (Portfolios)
 * MCP tools for managing subteams/portfolios in NiftyPM
 */

import { z } from "zod";
import type { NiftyPMClient } from "../client.js";

export function registerSubTeamsTools(server: any, client: NiftyPMClient, disabledTools: string[] = []) {
  // List subteams
  if (!disabledTools.includes("niftypm_list_subteams")) {
  server.addTool({
    name: "niftypm_list_subteams",
    description: "List all subteams/portfolios",
    parameters: z.object({
      limit: z.number().optional().describe("Number of results to return"),
      offset: z.number().optional().describe("Pagination offset"),
    }),
    execute: async (params: any) => {
      const subteams = await client.get("/api/v1.0/subteams", params);
      return JSON.stringify(subteams, null, 2);
    },
  });
  }

  // Get subteam by ID
  if (!disabledTools.includes("niftypm_get_subteam")) {
  server.addTool({
    name: "niftypm_get_subteam",
    description: "Get a specific subteam/portfolio by ID",
    parameters: z.object({
      subteam_id: z.string().regex(/^[a-zA-Z0-9_!-]+$/).describe("Subteam ID"),
    }),
    execute: async ({ subteam_id }: any) => {
      const subteam = await client.get(`/api/v1.0/subteams/${subteam_id}`);
      return JSON.stringify(subteam, null, 2);
    },
  });
  }

  // Create subteam
  if (!disabledTools.includes("niftypm_create_subteam")) {
  server.addTool({
    name: "niftypm_create_subteam",
    description: "Create a new subteam/portfolio",
    parameters: z.object({
      name: z.string().describe("Subteam name"),
      description: z.string().optional().describe("Subteam description"),
    }),
    execute: async (params: any) => {
      const subteam = await client.post("/api/v1.0/subteams", params);
      return JSON.stringify(subteam, null, 2);
    },
  });
  }

  // Update subteam
  if (!disabledTools.includes("niftypm_update_subteam")) {
  server.addTool({
    name: "niftypm_update_subteam",
    description: "Update an existing subteam/portfolio",
    parameters: z.object({
      subteam_id: z.string().regex(/^[a-zA-Z0-9_!-]+$/).describe("Subteam ID"),
      name: z.string().optional().describe("Subteam name"),
      description: z.string().optional().describe("Subteam description"),
    }),
    execute: async ({ subteam_id, ...params }: any) => {
      const subteam = await client.put(`/api/v1.0/subteams/${subteam_id}`, params);
      return JSON.stringify(subteam, null, 2);
    },
  });
  }

  // Delete subteam
  if (!disabledTools.includes("niftypm_delete_subteam")) {
  server.addTool({
    name: "niftypm_delete_subteam",
    description: "Delete a subteam/portfolio",
    parameters: z.object({
      subteam_id: z.string().regex(/^[a-zA-Z0-9_!-]+$/).describe("Subteam ID"),
    }),
    execute: async ({ subteam_id }: any) => {
      const result = await client.delete(`/api/v1.0/subteams/${subteam_id}`);
      return JSON.stringify(result, null, 2);
    },
  });
  }

  // Add subteam members
  if (!disabledTools.includes("niftypm_add_subteam_members")) {
  server.addTool({
    name: "niftypm_add_subteam_members",
    description: "Add members to a subteam/portfolio",
    parameters: z.object({
      subteam_id: z.string().regex(/^[a-zA-Z0-9_!-]+$/).describe("Subteam ID"),
      members_ids: z.array(z.string().regex(/^[a-zA-Z0-9_!-]+$/)).min(1).describe("Array of member IDs to add"),
    }),
    execute: async ({ subteam_id, members_ids }: any) => {
      const result = await client.put(`/api/v1.0/subteams/${subteam_id}/members`, { members_ids });
      return JSON.stringify(result, null, 2);
    },
  });
  }

  // Remove subteam members
  if (!disabledTools.includes("niftypm_remove_subteam_members")) {
  server.addTool({
    name: "niftypm_remove_subteam_members",
    description: "Remove members from a subteam/portfolio",
    parameters: z.object({
      subteam_id: z.string().regex(/^[a-zA-Z0-9_!-]+$/).describe("Subteam ID"),
      members_ids: z.array(z.string().regex(/^[a-zA-Z0-9_!-]+$/)).min(1).describe("Array of member IDs to remove"),
    }),
    execute: async ({ subteam_id, members_ids }: any) => {
      const result = await client.delete(`/api/v1.0/subteams/${subteam_id}/members`, { body: { members_ids } });
      return JSON.stringify(result, null, 2);
    },
  });
  }

  // Leave subteam
  if (!disabledTools.includes("niftypm_leave_subteam")) {
  server.addTool({
    name: "niftypm_leave_subteam",
    description: "Leave a subteam/portfolio",
    parameters: z.object({
      subteam_id: z.string().regex(/^[a-zA-Z0-9_!-]+$/).describe("Subteam ID"),
    }),
    execute: async ({ subteam_id }: any) => {
      const result = await client.post(`/api/v1.0/subteams/${subteam_id}/leave`);
      return JSON.stringify(result, null, 2);
    },
  });
  }
}
