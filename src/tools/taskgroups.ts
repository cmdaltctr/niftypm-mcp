/**
 * NiftyPM Task Groups Tools
 * MCP tools for managing task groups (lists) in NiftyPM
 */

import { z } from "zod";
import type { NiftyPMClient } from "../client.js";

export function registerTaskGroupsTools(server: any, client: NiftyPMClient, disabledTools: string[] = []) {
  // List task groups
  if (!disabledTools.includes("niftypm_list_taskgroups")) {
  server.addTool({
    name: "niftypm_list_taskgroups",
    description: "List all task groups",
    parameters: z.object({
      project_id: z.string().regex(/^[a-zA-Z0-9_-]+$/).optional().describe("Filter by project ID"),
    }),
    execute: async (params: any) => {
      const groups = await client.get("/api/v1.0/taskgroups", params);
      return JSON.stringify(groups, null, 2);
    },
  });
  }

  // Get task group by ID
  if (!disabledTools.includes("niftypm_get_taskgroup")) {
  server.addTool({
    name: "niftypm_get_taskgroup",
    description: "Get a specific task group by ID",
    parameters: z.object({
      taskgroup_id: z.string().regex(/^[a-zA-Z0-9_-]+$/).describe("Task group ID"),
    }),
    execute: async ({ taskgroup_id }: any) => {
      const group = await client.get(`/api/v1.0/taskgroups/${taskgroup_id}`);
      return JSON.stringify(group, null, 2);
    },
  });
  }

  // Create task group
  if (!disabledTools.includes("niftypm_create_taskgroup")) {
  server.addTool({
    name: "niftypm_create_taskgroup",
    description: "Create a new task group",
    parameters: z.object({
      name: z.string().describe("Task group name"),
      project_id: z.string().regex(/^[a-zA-Z0-9_-]+$/).describe("Project ID"),
    }),
    execute: async (params: any) => {
      const group = await client.post("/api/v1.0/taskgroups", params);
      return JSON.stringify(group, null, 2);
    },
  });
  }

  // Update task group
  if (!disabledTools.includes("niftypm_update_taskgroup")) {
  server.addTool({
    name: "niftypm_update_taskgroup",
    description: "Update an existing task group",
    parameters: z.object({
      taskgroup_id: z.string().regex(/^[a-zA-Z0-9_-]+$/).describe("Task group ID"),
      name: z.string().optional().describe("Task group name"),
    }),
    execute: async ({ taskgroup_id, ...params }: any) => {
      const group = await client.put(`/api/v1.0/taskgroups/${taskgroup_id}`, params);
      return JSON.stringify(group, null, 2);
    },
  });
  }

  // Delete task group
  if (!disabledTools.includes("niftypm_delete_taskgroup")) {
  server.addTool({
    name: "niftypm_delete_taskgroup",
    description: "Delete a task group",
    parameters: z.object({
      taskgroup_id: z.string().regex(/^[a-zA-Z0-9_-]+$/).describe("Task group ID"),
    }),
    execute: async ({ taskgroup_id }: any) => {
      const result = await client.delete(`/api/v1.0/taskgroups/${taskgroup_id}`);
      return JSON.stringify(result, null, 2);
    },
  });
  }

  // ── Task group task management ──────────────────────────────────────

  // Move taskgroup tasks
  if (!disabledTools.includes("niftypm_move_taskgroup_tasks")) {
  server.addTool({
    name: "niftypm_move_taskgroup_tasks",
    description: "Move all tasks from one task group to another",
    parameters: z.object({
      taskgroup_id: z.string().regex(/^[a-zA-Z0-9_-]+$/).describe("Source Task Group ID"),
      target_taskgroup_id: z.string().regex(/^[a-zA-Z0-9_-]+$/).describe("Target Task Group ID"),
    }),
    execute: async ({ taskgroup_id, ...params }: any) => {
      const result = await client.post(`/api/v1.0/taskgroups/${taskgroup_id}/move`, params);
      return JSON.stringify(result, null, 2);
    },
  });
  }

  // ── Task group member assignment ────────────────────────────────────

  // Assign taskgroup members
  if (!disabledTools.includes("niftypm_assign_taskgroup_members")) {
  server.addTool({
    name: "niftypm_assign_taskgroup_members",
    description: "Set the assignees for all tasks in a task group",
    parameters: z.object({
      taskgroup_id: z.string().regex(/^[a-zA-Z0-9_-]+$/).describe("Task Group ID"),
      member_ids: z.array(z.string().regex(/^[a-zA-Z0-9_-]+$/)).describe("Array of Member IDs to assign"),
    }),
    execute: async ({ taskgroup_id, ...params }: any) => {
      const result = await client.put(`/api/v1.0/taskgroups/${taskgroup_id}/assignees`, params);
      return JSON.stringify(result, null, 2);
    },
  });
  }

  // Unassign taskgroup members
  if (!disabledTools.includes("niftypm_unassign_taskgroup_members")) {
  server.addTool({
    name: "niftypm_unassign_taskgroup_members",
    description: "Remove members from all tasks in a task group",
    parameters: z.object({
      taskgroup_id: z.string().regex(/^[a-zA-Z0-9_-]+$/).describe("Task Group ID"),
      member_ids: z.array(z.string().regex(/^[a-zA-Z0-9_-]+$/)).describe("Array of Member IDs to remove"),
    }),
    execute: async ({ taskgroup_id, ...params }: any) => {
      const result = await client.delete(`/api/v1.0/taskgroups/${taskgroup_id}/assignees`, { body: params });
      return JSON.stringify(result, null, 2);
    },
  });
  }
}
