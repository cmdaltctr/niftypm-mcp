/**
 * NiftyPM Milestones Tools
 * MCP tools for managing milestones in NiftyPM
 */

import { z } from "zod";
import type { NiftyPMClient } from "../client.js";

export function registerMilestonesTools(server: any, client: NiftyPMClient) {
  // List milestones
  server.addTool({
    name: "niftypm_list_milestones",
    description: "List milestones in a project",
    parameters: z.object({
      project_id: z.string().regex(/^[a-zA-Z0-9_-]+$/).optional().describe("Filter by project ID"),
      limit: z.number().optional().describe("Number of results to return"),
      offset: z.number().optional().describe("Pagination offset"),
    }),
    execute: async (params: any) => {
      const milestones = await client.get("/api/v1.0/milestones", params);
      return JSON.stringify(milestones, null, 2);
    },
  });

  // Get milestone by ID
  server.addTool({
    name: "niftypm_get_milestone",
    description: "Get a specific milestone by ID",
    parameters: z.object({
      milestone_id: z.string().regex(/^[a-zA-Z0-9_-]+$/).describe("Milestone ID"),
    }),
    execute: async ({ milestone_id }: any) => {
      const milestone = await client.get(`/api/v1.0/milestones/${milestone_id}`);
      return JSON.stringify(milestone, null, 2);
    },
  });

  // Create milestone
  server.addTool({
    name: "niftypm_create_milestone",
    description: "Create a new milestone",
    parameters: z.object({
      name: z.string().describe("Milestone name"),
      project_id: z.string().regex(/^[a-zA-Z0-9_-]+$/).describe("Project ID"),
      due_date: z.string().optional().describe("Due date (ISO 8601 format)"),
      description: z.string().optional().describe("Milestone description"),
    }),
    execute: async (params: any) => {
      const milestone = await client.post("/api/v1.0/milestones", params);
      return JSON.stringify(milestone, null, 2);
    },
  });

  // Update milestone
  server.addTool({
    name: "niftypm_update_milestone",
    description: "Update an existing milestone",
    parameters: z.object({
      milestone_id: z.string().regex(/^[a-zA-Z0-9_-]+$/).describe("Milestone ID"),
      name: z.string().optional().describe("Milestone name"),
      due_date: z.string().optional().describe("Due date (ISO 8601 format)"),
      description: z.string().optional().describe("Milestone description"),
    }),
    execute: async ({ milestone_id, ...params }: any) => {
      const milestone = await client.put(`/api/v1.0/milestones/${milestone_id}`, params);
      return JSON.stringify(milestone, null, 2);
    },
  });

  // Delete milestone
  server.addTool({
    name: "niftypm_delete_milestone",
    description: "Delete a milestone",
    parameters: z.object({
      milestone_id: z.string().regex(/^[a-zA-Z0-9_-]+$/).describe("Milestone ID"),
    }),
    execute: async ({ milestone_id }: any) => {
      const result = await client.delete(`/api/v1.0/milestones/${milestone_id}`);
      return JSON.stringify(result, null, 2);
    },
  });

  // Archive milestone
  server.addTool({
    name: "niftypm_archive_milestone",
    description: "Archive a milestone",
    parameters: z.object({
      milestone_id: z.string().regex(/^[a-zA-Z0-9_-]+$/).describe("Milestone ID"),
    }),
    execute: async ({ milestone_id }: any) => {
      const result = await client.post(`/api/v1.0/milestones/${milestone_id}/archive`);
      return JSON.stringify(result, null, 2);
    },
  });
}
