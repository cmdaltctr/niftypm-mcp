/**
 * NiftyPM Tasks Tools
 * MCP tools for managing tasks in NiftyPM
 */

import { z } from "zod";
import type { FastMCP } from "fastmcp";
import type { NiftyPMClient } from "../client.js";

export function registerTasksTools(server: FastMCP, client: NiftyPMClient, disabledTools: string[] = []) {
  // List tasks
  const ListTasksSchema = z.object({
    project_id: z.string().regex(/^[a-zA-Z0-9_!-]+$/).optional().describe("Filter by project ID"),
    task_group_id: z.string().regex(/^[a-zA-Z0-9_!-]+$/).optional().describe("Filter by task group/list ID"),
    member_id: z.string().regex(/^[a-zA-Z0-9_!-]+$/).optional().describe("Filter by assigned member ID"),
    milestone_id: z.string().regex(/^[a-zA-Z0-9_!-]+$/).optional().describe("Filter by milestone ID"),
    completed: z.boolean().optional().describe("Filter by completion status"),
    archived: z.boolean().optional().describe("Filter by archived status"),
    limit: z.number().min(1).max(100).optional().describe("Number of results to return"),
    offset: z.number().optional().describe("Pagination offset"),
  });

  if (!disabledTools.includes("niftypm_list_tasks")) {
  server.addTool({
    name: "niftypm_list_tasks",
    description: "List tasks with optional filters (project, member, milestone, status)",
    parameters: ListTasksSchema,
    execute: async (params: z.infer<typeof ListTasksSchema>) => {
      const tasks = await client.get("/api/v1.0/tasks", params);
      return JSON.stringify(tasks, null, 2);
    },
  });
  }

  // Get task by ID
  const GetTaskSchema = z.object({
    task_id: z.string().regex(/^[a-zA-Z0-9_!-]+$/).describe("Task ID"),
  });

  if (!disabledTools.includes("niftypm_get_task")) {
  server.addTool({
    name: "niftypm_get_task",
    description: "Get a specific task by ID",
    parameters: GetTaskSchema,
    execute: async ({ task_id }: z.infer<typeof GetTaskSchema>) => {
      const task = await client.get(`/api/v1.0/tasks/${task_id}`);
      return JSON.stringify(task, null, 2);
    },
  });
  }

  // Create task
  const CreateTaskSchema = z.object({
    name: z.string().describe("Task name"),
    task_group_id: z.string().regex(/^[a-zA-Z0-9_!-]+$/).describe("Task group/list ID (required)"),
    description: z.string().optional().describe("Task description"),
    assignees: z.array(z.string().regex(/^[a-zA-Z0-9_!-]+$/)).optional().describe("Array of member IDs to assign"),
    due_date: z.string().optional().describe("Due date (ISO 8601 format)"),
    start_date: z.string().optional().describe("Start date (ISO 8601 format)"),
    milestone_id: z.string().regex(/^[a-zA-Z0-9_!-]+$/).optional().describe("Milestone ID"),
    labels: z.array(z.string().regex(/^[a-zA-Z0-9_!-]+$/)).optional().describe("Array of label IDs"),
    story_points: z.number().optional().describe("Story points"),
    task_id: z.string().regex(/^[a-zA-Z0-9_!-]+$/).optional().describe("Parent task ID if creating a subtask"),
  });

  if (!disabledTools.includes("niftypm_create_task")) {
  server.addTool({
    name: "niftypm_create_task",
    description: "Create a new task or subtask",
    parameters: CreateTaskSchema,
    execute: async (params: z.infer<typeof CreateTaskSchema>) => {
      const task = await client.post("/api/v1.0/tasks", params);
      return JSON.stringify(task, null, 2);
    },
  });
  }

  // Update task
  const UpdateTaskSchema = z.object({
    task_id: z.string().regex(/^[a-zA-Z0-9_!-]+$/).describe("Task ID"),
    name: z.string().optional().describe("Task name"),
    description: z.string().optional().describe("Task description"),
    due_date: z.string().optional().describe("Due date (ISO 8601 format)"),
    start_date: z.string().optional().describe("Start date (ISO 8601 format)"),
    // NiftyPM UpdateTaskBody fields that drive roadmap/dependency semantics.
    // `dependency` is a single predecessor task ID (true blocking relationship,
    // distinct from the informational link_task tool).
    dependency: z.string().regex(/^[a-zA-Z0-9_!-]+$/).optional().describe("Predecessor task ID this task depends on (blocking dependency)"),
    milestone_id: z.string().regex(/^[a-zA-Z0-9_!-]+$/).optional().describe("Milestone ID"),
    assignees: z.array(z.string().regex(/^[a-zA-Z0-9_!-]+$/)).optional().describe("Array of member IDs to assign"),
    story_points: z.number().optional().describe("Story points"),
  });

  if (!disabledTools.includes("niftypm_update_task")) {
  server.addTool({
    name: "niftypm_update_task",
    description: "Update an existing task",
    parameters: UpdateTaskSchema,
    execute: async ({ task_id, ...params }: z.infer<typeof UpdateTaskSchema>) => {
      const task = await client.put(`/api/v1.0/tasks/${task_id}`, params);
      return JSON.stringify(task, null, 2);
    },
  });
  }

  // Delete task
  const DeleteTaskSchema = z.object({
    task_id: z.string().regex(/^[a-zA-Z0-9_!-]+$/).describe("Task ID"),
  });

  if (!disabledTools.includes("niftypm_delete_task")) {
  server.addTool({
    name: "niftypm_delete_task",
    description: "Delete a task",
    parameters: DeleteTaskSchema,
    execute: async ({ task_id }: z.infer<typeof DeleteTaskSchema>) => {
      const result = await client.delete(`/api/v1.0/tasks/${task_id}`);
      return JSON.stringify(result, null, 2);
    },
  });
  }

  // Delete multiple tasks
  const DeleteTasksSchema = z.object({
    task_ids: z.array(z.string().regex(/^[a-zA-Z0-9_!-]+$/)).min(1).describe("Array of task IDs to delete"),
    project_id: z.string().regex(/^[a-zA-Z0-9_!-]+$/).optional().describe("Project ID"),
  });

  if (!disabledTools.includes("niftypm_delete_tasks")) {
  server.addTool({
    name: "niftypm_delete_tasks",
    description: "Delete multiple tasks",
    parameters: DeleteTasksSchema,
    execute: async (params: z.infer<typeof DeleteTasksSchema>) => {
      const result = await client.delete("/api/v1.0/tasks", { body: params });
      return JSON.stringify(result, null, 2);
    },
  });
  }

  // Complete task
  const CompleteTaskSchema = z.object({
    task_id: z.string().regex(/^[a-zA-Z0-9_!-]+$/).describe("Task ID"),
  });

  if (!disabledTools.includes("niftypm_complete_task")) {
  server.addTool({
    name: "niftypm_complete_task",
    description: "Mark a task as complete",
    parameters: CompleteTaskSchema,
    execute: async ({ task_id }: z.infer<typeof CompleteTaskSchema>) => {
      const result = await client.post(`/api/v1.0/tasks/${task_id}/complete`, { completed: true });
      return JSON.stringify(result, null, 2);
    },
  });
  }

  // Archive task
  const ArchiveTaskSchema = z.object({
    task_id: z.string().regex(/^[a-zA-Z0-9_!-]+$/).describe("Task ID"),
  });

  if (!disabledTools.includes("niftypm_archive_task")) {
  server.addTool({
    name: "niftypm_archive_task",
    description: "Archive a task",
    parameters: ArchiveTaskSchema,
    execute: async ({ task_id }: z.infer<typeof ArchiveTaskSchema>) => {
      const result = await client.post(`/api/v1.0/tasks/${task_id}/archive`, { archived: true });
      return JSON.stringify(result, null, 2);
    },
  });
  }

  // ── Personal tasks ──────────────────────────────────────────────────

  // Get personal tasks
  const GetPersonalTasksSchema = z.object({
    limit: z.number().min(1).max(100).optional().default(25).describe("Number of results to return (default 25)"),
    offset: z.number().min(0).optional().default(0).describe("Pagination offset (default 0)"),
    completed: z.boolean().optional().describe("Filter by completion status"),
  });

  if (!disabledTools.includes("niftypm_get_personal_tasks")) {
  server.addTool({
    name: "niftypm_get_personal_tasks",
    description: "List personal tasks assigned to the current user",
    parameters: GetPersonalTasksSchema,
    execute: async (params: z.infer<typeof GetPersonalTasksSchema>) => {
      // NiftyPM requires the `limit` query param on GET /tasks/personal.
      const tasks = await client.get("/api/v1.0/tasks/personal", params);
      return JSON.stringify(tasks, null, 2);
    },
  });
  }

  // Create personal task
  const CreatePersonalTaskSchema = z.object({
    name: z.string().describe("Task name"),
    description: z.string().optional().describe("Task description"),
    due_date: z.string().optional().describe("Due date (ISO 8601 format)"),
  });

  if (!disabledTools.includes("niftypm_create_personal_task")) {
  server.addTool({
    name: "niftypm_create_personal_task",
    description: "Create a new personal task",
    parameters: CreatePersonalTaskSchema,
    execute: async (params: z.infer<typeof CreatePersonalTaskSchema>) => {
      const task = await client.post("/api/v1.0/tasks/personal", params);
      return JSON.stringify(task, null, 2);
    },
  });
  }

  // ── Task linking ────────────────────────────────────────────────────

  // Link task
  const LinkTaskSchema = z.object({
    task_id: z.string().regex(/^[a-zA-Z0-9_!-]+$/).describe("Task ID"),
    linked_task_id: z.string().regex(/^[a-zA-Z0-9_!-]+$/).describe("ID of the task to link to"),
  });

  if (!disabledTools.includes("niftypm_link_task")) {
  server.addTool({
    name: "niftypm_link_task",
    description: "Link a task to another task",
    parameters: LinkTaskSchema,
    execute: async ({ task_id, linked_task_id }: z.infer<typeof LinkTaskSchema>) => {
      // NiftyPM expects { tasks: [...] } (LinkTaskBody schema), not linked_task_id.
      const result = await client.post(`/api/v1.0/tasks/${task_id}/link_task`, { tasks: [linked_task_id] });
      return JSON.stringify(result, null, 2);
    },
  });
  }

  // Update task milestone
  const UpdateTaskMilestoneSchema = z.object({
    task_id: z.string().regex(/^[a-zA-Z0-9_!-]+$/).describe("Task ID"),
    milestone_id: z.string().regex(/^[a-zA-Z0-9_!-]+$/).optional().describe("Milestone ID (omit to remove)"),
  });

  if (!disabledTools.includes("niftypm_update_task_milestone")) {
  server.addTool({
    name: "niftypm_update_task_milestone",
    description: "Update the milestone for a task",
    parameters: UpdateTaskMilestoneSchema,
    execute: async ({ task_id, ...params }: z.infer<typeof UpdateTaskMilestoneSchema>) => {
      const result = await client.put(`/api/v1.0/tasks/${task_id}/milestone`, params);
      return JSON.stringify(result, null, 2);
    },
  });
  }

  // ── Moving tasks ────────────────────────────────────────────────────

  // Move single task
  const MoveTaskSchema = z.object({
    task_id: z.string().regex(/^[a-zA-Z0-9_!-]+$/).describe("Task ID"),
    target_task_group_id: z.string().regex(/^[a-zA-Z0-9_!-]+$/).describe("Target Task Group ID"),
    position: z.number().optional().describe("Position in the target group (0-based)"),
  });

  if (!disabledTools.includes("niftypm_move_task")) {
  server.addTool({
    name: "niftypm_move_task",
    description: "Move a task to a different task group/list",
    parameters: MoveTaskSchema,
    execute: async ({ task_id, ...params }: z.infer<typeof MoveTaskSchema>) => {
      const result = await client.post(`/api/v1.0/tasks/${task_id}/moveOrder`, params);
      return JSON.stringify(result, null, 2);
    },
  });
  }

  // Move multiple tasks
  const MoveTasksSchema = z.object({
    task_ids: z.array(z.string().regex(/^[a-zA-Z0-9_!-]+$/)).describe("Array of Task IDs to move"),
    target_task_group_id: z.string().regex(/^[a-zA-Z0-9_!-]+$/).describe("Target Task Group ID"),
    position: z.number().optional().describe("Position in the target group (0-based)"),
  });

  if (!disabledTools.includes("niftypm_move_tasks")) {
  server.addTool({
    name: "niftypm_move_tasks",
    description: "Move multiple tasks to a different task group/list",
    parameters: MoveTasksSchema,
    execute: async (params: z.infer<typeof MoveTasksSchema>) => {
      const result = await client.post("/api/v1.0/tasks/move", params);
      return JSON.stringify(result, null, 2);
    },
  });
  }

  // ── Assign / unassign ───────────────────────────────────────────────

  // Assign task
  const AssignTaskSchema = z.object({
    task_id: z.string().regex(/^[a-zA-Z0-9_!-]+$/).describe("Task ID"),
    member_id: z.string().regex(/^[a-zA-Z0-9_!-]+$/).describe("Member ID to assign"),
  });

  if (!disabledTools.includes("niftypm_assign_task")) {
  server.addTool({
    name: "niftypm_assign_task",
    description: "Assign a user to a task",
    parameters: AssignTaskSchema,
    execute: async ({ task_id, ...params }: z.infer<typeof AssignTaskSchema>) => {
      const result = await client.put(`/api/v1.0/tasks/${task_id}/assignees`, params);
      return JSON.stringify(result, null, 2);
    },
  });
  }

  // Unassign task
  const UnassignTaskSchema = z.object({
    task_id: z.string().regex(/^[a-zA-Z0-9_!-]+$/).describe("Task ID"),
    member_id: z.string().regex(/^[a-zA-Z0-9_!-]+$/).describe("Member ID to unassign"),
  });

  if (!disabledTools.includes("niftypm_unassign_task")) {
  server.addTool({
    name: "niftypm_unassign_task",
    description: "Remove a user assignment from a task",
    parameters: UnassignTaskSchema,
    execute: async ({ task_id, ...params }: z.infer<typeof UnassignTaskSchema>) => {
      const result = await client.delete(`/api/v1.0/tasks/${task_id}/assignees`, { body: params });
      return JSON.stringify(result, null, 2);
    },
  });
  }

  // ── Labels on tasks ─────────────────────────────────────────────────

  // Add task labels
  const AddTaskLabelsSchema = z.object({
    task_id: z.string().regex(/^[a-zA-Z0-9_!-]+$/).describe("Task ID"),
    label_ids: z.array(z.string()).describe("Array of Label IDs to add"),
  });

  if (!disabledTools.includes("niftypm_add_task_labels")) {
  server.addTool({
    name: "niftypm_add_task_labels",
    description: "Add labels to a task",
    parameters: AddTaskLabelsSchema,
    execute: async ({ task_id, label_ids }: z.infer<typeof AddTaskLabelsSchema>) => {
      // NiftyPM UpdateLabels schema expects { labels: [...] }, not label_ids.
      const result = await client.put(`/api/v1.0/tasks/${task_id}/labels`, { labels: label_ids });
      return JSON.stringify(result, null, 2);
    },
  });
  }

  // Remove task labels
  const RemoveTaskLabelsSchema = z.object({
    task_id: z.string().regex(/^[a-zA-Z0-9_!-]+$/).describe("Task ID"),
    label_ids: z.array(z.string()).describe("Array of Label IDs to remove"),
  });

  if (!disabledTools.includes("niftypm_remove_task_labels")) {
  server.addTool({
    name: "niftypm_remove_task_labels",
    description: "Remove labels from a task",
    parameters: RemoveTaskLabelsSchema,
    execute: async ({ task_id, label_ids }: z.infer<typeof RemoveTaskLabelsSchema>) => {
      // NiftyPM UpdateLabels schema expects { labels: [...] }, not label_ids.
      const result = await client.delete(`/api/v1.0/tasks/${task_id}/labels`, { body: { labels: label_ids } });
      return JSON.stringify(result, null, 2);
    },
  });
  }

  // ── Custom fields on tasks ──────────────────────────────────────────

  // Add task field
  const AddTaskFieldSchema = z.object({
    task_id: z.string().regex(/^[a-zA-Z0-9_!-]+$/).describe("Task ID"),
    field_id: z.string().regex(/^[a-zA-Z0-9_!-]+$/).describe("Field ID"),
    value: z.any().describe("Field value"),
  });

  if (!disabledTools.includes("niftypm_add_task_field")) {
  server.addTool({
    name: "niftypm_add_task_field",
    description: "Add a custom field value to a task",
    parameters: AddTaskFieldSchema,
    execute: async ({ task_id, ...params }: z.infer<typeof AddTaskFieldSchema>) => {
      const result = await client.post(`/api/v1.0/tasks/${task_id}/fields`, params);
      return JSON.stringify(result, null, 2);
    },
  });
  }

  // Get task fields
  const GetTaskFieldsSchema = z.object({
    task_id: z.string().regex(/^[a-zA-Z0-9_!-]+$/).describe("Task ID"),
  });

  if (!disabledTools.includes("niftypm_get_task_fields")) {
  server.addTool({
    name: "niftypm_get_task_fields",
    description: "Get all custom fields for a task",
    parameters: GetTaskFieldsSchema,
    execute: async ({ task_id }: z.infer<typeof GetTaskFieldsSchema>) => {
      const result = await client.get(`/api/v1.0/tasks/${task_id}/fields`);
      return JSON.stringify(result, null, 2);
    },
  });
  }

  // Update task field
  const UpdateTaskFieldSchema = z.object({
    task_id: z.string().regex(/^[a-zA-Z0-9_!-]+$/).describe("Task ID"),
    field_id: z.string().regex(/^[a-zA-Z0-9_!-]+$/).describe("Field ID"),
    value: z.any().describe("New field value"),
  });

  if (!disabledTools.includes("niftypm_update_task_field")) {
  server.addTool({
    name: "niftypm_update_task_field",
    description: "Update a custom field value for a task",
    parameters: UpdateTaskFieldSchema,
    execute: async ({ task_id, field_id, value }: z.infer<typeof UpdateTaskFieldSchema>) => {
      const result = await client.put(`/api/v1.0/tasks/${task_id}/fields/${field_id}`, { value });
      return JSON.stringify(result, null, 2);
    },
  });
  }

  // ── Documents & cloning ─────────────────────────────────────────────

  // Attach task document
  const AttachTaskDocumentSchema = z.object({
    task_id: z.string().regex(/^[a-zA-Z0-9_!-]+$/).describe("Task ID"),
    document_id: z.string().regex(/^[a-zA-Z0-9_!-]+$/).describe("Document ID to attach"),
  });

  if (!disabledTools.includes("niftypm_attach_task_document")) {
  server.addTool({
    name: "niftypm_attach_task_document",
    description: "Attach a document to a task",
    parameters: AttachTaskDocumentSchema,
    execute: async ({ task_id, ...params }: z.infer<typeof AttachTaskDocumentSchema>) => {
      const result = await client.post(`/api/v1.0/tasks/${task_id}/documents`, params);
      return JSON.stringify(result, null, 2);
    },
  });
  }

  // Clone task
  const CloneTaskSchema = z.object({
    task_id: z.string().regex(/^[a-zA-Z0-9_!-]+$/).describe("Task ID to clone"),
    target_task_group_id: z.string().regex(/^[a-zA-Z0-9_!-]+$/).optional().describe("Target Task Group ID (defaults to current)"),
    name: z.string().optional().describe("New name for the cloned task"),
  });

  if (!disabledTools.includes("niftypm_clone_task")) {
  server.addTool({
    name: "niftypm_clone_task",
    description: "Clone/Copy a task",
    parameters: CloneTaskSchema,
    execute: async ({ task_id, ...params }: z.infer<typeof CloneTaskSchema>) => {
      const result = await client.post(`/api/v1.0/tasks/${task_id}/clone`, params);
      return JSON.stringify(result, null, 2);
    },
  });
  }
}
