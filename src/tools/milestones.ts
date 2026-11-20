/**
 * NiftyPM Milestones Tools
 * MCP tools for managing milestones in NiftyPM
 */

import { z } from "zod";
import type { NiftyPMClient } from "../client.js";

const DATE_NOTE = "The roadmap shows a milestone only when both start_date and end_date are set.";

/**
 * Map the tool date params to the API fields `start` and `end`.
 * NiftyPM ignores `due_date`, so it is an alias for `end` and is never forwarded.
 * If both `end_date` and `due_date` are given, `end_date` wins.
 */
function withMilestoneDates({ start_date, end_date, due_date, ...rest }: any) {
  const body: Record<string, unknown> = { ...rest };
  if (start_date !== undefined) body.start = start_date;
  const end = end_date ?? due_date;
  if (end !== undefined) body.end = end;
  return body;
}

export function registerMilestonesTools(server: any, client: NiftyPMClient, disabledTools: string[] = []) {
  // List milestones
  if (!disabledTools.includes("niftypm_list_milestones")) {
  server.addTool({
    name: "niftypm_list_milestones",
    description: "List milestones in a project",
    parameters: z.object({
      project_id: z.string().regex(/^[a-zA-Z0-9_!-]+$/).describe("Filter by project ID"),
      limit: z.number().optional().describe("Number of results to return"),
      offset: z.number().optional().describe("Pagination offset"),
      sort: z.enum(["ascending", "descending"]).optional().describe("Sort order, default is descending"),
      is_list: z.string().optional().describe("List Flag (pass 'true' to discover list-type milestones)"),
    }),
    execute: async (params: any) => {
      const milestones = await client.get("/api/v1.0/milestones", params);
      return JSON.stringify(milestones, null, 2);
    },
  });
  }

  // Get milestone by ID
  if (!disabledTools.includes("niftypm_get_milestone")) {
  server.addTool({
    name: "niftypm_get_milestone",
    description: "Get a specific milestone by ID",
    parameters: z.object({
      milestone_id: z.string().regex(/^[a-zA-Z0-9_!-]+$/).describe("Milestone ID"),
    }),
    execute: async ({ milestone_id }: any) => {
      const milestone = await client.get(`/api/v1.0/milestones/${milestone_id}`);
      return JSON.stringify(milestone, null, 2);
    },
  });
  }

  // Create milestone
  if (!disabledTools.includes("niftypm_create_milestone")) {
  server.addTool({
    name: "niftypm_create_milestone",
    description: `Create a new milestone. ${DATE_NOTE}`,
    parameters: z.object({
      name: z.string().describe("Milestone name"),
      project_id: z.string().regex(/^[a-zA-Z0-9_!-]+$/).describe("Project ID"),
      start_date: z.string().optional().describe("Start date (ISO 8601 format), sent to the API as start"),
      end_date: z.string().optional().describe("End date (ISO 8601 format), sent to the API as end"),
      due_date: z.string().optional().describe("Deprecated alias for end_date. Ignored when end_date is set"),
      description: z.string().optional().describe("Milestone description"),
    }),
    execute: async (params: any) => {
      const milestone = await client.post("/api/v1.0/milestones", withMilestoneDates(params));
      return JSON.stringify(milestone, null, 2);
    },
  });
  }

  // Update milestone
  if (!disabledTools.includes("niftypm_update_milestone")) {
  server.addTool({
    name: "niftypm_update_milestone",
    description: `Update an existing milestone. ${DATE_NOTE}`,
    parameters: z.object({
      milestone_id: z.string().regex(/^[a-zA-Z0-9_!-]+$/).describe("Milestone ID"),
      name: z.string().optional().describe("Milestone name"),
      start_date: z.string().optional().describe("Start date (ISO 8601 format), sent to the API as start"),
      end_date: z.string().optional().describe("End date (ISO 8601 format), sent to the API as end"),
      due_date: z.string().optional().describe("Deprecated alias for end_date. Ignored when end_date is set"),
      description: z.string().optional().describe("Milestone description"),
    }),
    execute: async ({ milestone_id, ...params }: any) => {
      const milestone = await client.put(`/api/v1.0/milestones/${milestone_id}`, withMilestoneDates(params));
      return JSON.stringify(milestone, null, 2);
    },
  });
  }

  // Delete milestone
  if (!disabledTools.includes("niftypm_delete_milestone")) {
  server.addTool({
    name: "niftypm_delete_milestone",
    description: "Delete a milestone",
    parameters: z.object({
      milestone_id: z.string().regex(/^[a-zA-Z0-9_!-]+$/).describe("Milestone ID"),
    }),
    execute: async ({ milestone_id }: any) => {
      const result = await client.delete(`/api/v1.0/milestones/${milestone_id}`);
      return JSON.stringify(result, null, 2);
    },
  });
  }

  // Archive milestone
  if (!disabledTools.includes("niftypm_archive_milestone")) {
  server.addTool({
    name: "niftypm_archive_milestone",
    description: "Archive a milestone",
    parameters: z.object({
      milestone_id: z.string().regex(/^[a-zA-Z0-9_!-]+$/).describe("Milestone ID"),
    }),
    execute: async ({ milestone_id }: any) => {
      const result = await client.post(`/api/v1.0/milestones/${milestone_id}/archive`);
      return JSON.stringify(result, null, 2);
    },
  });
  }

  // Move milestone to project
  if (!disabledTools.includes("niftypm_move_milestone")) {
  server.addTool({
    name: "niftypm_move_milestone",
    description: "Move a milestone to another project",
    parameters: z.object({
      milestone_id: z.string().regex(/^[a-zA-Z0-9_!-]+$/).describe("Milestone ID"),
      project_id: z.string().regex(/^[a-zA-Z0-9_!-]+$/).describe("Target project ID"),
    }),
    execute: async ({ milestone_id, project_id }: any) => {
      const result = await client.put(`/api/v1.0/milestones/${milestone_id}/move_to_project`, { project_id });
      return JSON.stringify(result, null, 2);
    },
  });
  }

  // Tie tasks to milestone
  if (!disabledTools.includes("niftypm_tie_milestone_tasks")) {
  server.addTool({
    name: "niftypm_tie_milestone_tasks",
    description: "Tie tasks to a milestone",
    parameters: z.object({
      milestone_id: z.string().regex(/^[a-zA-Z0-9_!-]+$/).describe("Milestone ID"),
      task_ids: z.array(z.string().regex(/^[a-zA-Z0-9_!-]+$/)).min(1).describe("Array of task IDs to tie"),
    }),
    execute: async ({ milestone_id, task_ids }: any) => {
      const result = await client.put(`/api/v1.0/milestones/${milestone_id}/tasks`, { tasks: task_ids });
      return JSON.stringify(result, null, 2);
    },
  });
  }

  // Untie tasks from milestone
  if (!disabledTools.includes("niftypm_untie_milestone_tasks")) {
  server.addTool({
    name: "niftypm_untie_milestone_tasks",
    description: "Untie tasks from a milestone",
    parameters: z.object({
      milestone_id: z.string().regex(/^[a-zA-Z0-9_!-]+$/).describe("Milestone ID"),
      task_ids: z.array(z.string().regex(/^[a-zA-Z0-9_!-]+$/)).min(1).describe("Array of task IDs to untie"),
    }),
    execute: async ({ milestone_id, task_ids }: any) => {
      const result = await client.delete(`/api/v1.0/milestones/${milestone_id}/tasks`, { body: { tasks: task_ids } });
      return JSON.stringify(result, null, 2);
    },
  });
  }
}
