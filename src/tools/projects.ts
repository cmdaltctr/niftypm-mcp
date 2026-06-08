/**
 * NiftyPM Projects Tools
 * MCP tools for managing projects in NiftyPM
 */

import { z } from "zod";
import type { NiftyPMClient } from "../client.js";

export function registerProjectsTools(server: any, client: NiftyPMClient) {
  // List projects
  server.addTool({
    name: "niftypm_list_projects",
    description: "List all projects accessible to the user",
    parameters: z.object({
      page: z.number().optional().describe("Page number"),
      per_page: z.number().optional().describe("Items per page"),
    }),
    execute: async (params: any) => {
      const projects = await client.get("/api/v1.0/projects", params);
      return JSON.stringify(projects, null, 2);
    },
  });

  // Create project
  server.addTool({
    name: "niftypm_create_project",
    description: "Create a new project",
    parameters: z.object({
      name: z.string().describe("Project name"),
      description: z.string().optional().describe("Project description"),
      template_id: z.string().optional().describe("Template ID to use"),
    }),
    execute: async (params: any) => {
      const project = await client.post("/api/v1.0/projects", params);
      return JSON.stringify(project, null, 2);
    },
  });

  // Get project
  server.addTool({
    name: "niftypm_get_project",
    description: "Get a specific project by ID",
    parameters: z.object({
      project_id: z.string().regex(/^[a-zA-Z0-9_-]+$/).describe("Project ID"),
    }),
    execute: async ({ project_id }: any) => {
      const project = await client.get(`/api/v1.0/projects/${project_id}`);
      return JSON.stringify(project, null, 2);
    },
  });

  // Update project
  server.addTool({
    name: "niftypm_update_project",
    description: "Update an existing project",
    parameters: z.object({
      project_id: z.string().regex(/^[a-zA-Z0-9_-]+$/).describe("Project ID"),
      name: z.string().optional().describe("Project name"),
      description: z.string().optional().describe("Project description"),
      status: z.string().optional().describe("Project status"),
    }),
    execute: async ({ project_id, ...params }: any) => {
      const project = await client.put(`/api/v1.0/projects/${project_id}`, params);
      return JSON.stringify(project, null, 2);
    },
  });

  // Delete project
  server.addTool({
    name: "niftypm_delete_project",
    description: "Delete a project",
    parameters: z.object({
      project_id: z.string().regex(/^[a-zA-Z0-9_-]+$/).describe("Project ID"),
    }),
    execute: async ({ project_id }: any) => {
      const result = await client.delete(`/api/v1.0/projects/${project_id}`);
      return JSON.stringify(result, null, 2);
    },
  });

  // Invite to project
  server.addTool({
    name: "niftypm_invite_to_project",
    description: "Invite a user to a project",
    parameters: z.object({
      project_id: z.string().regex(/^[a-zA-Z0-9_-]+$/).describe("Project ID"),
      user_id: z.string().regex(/^[a-zA-Z0-9_-]+$/).describe("User ID to invite"),
      role: z.string().optional().describe("User role (e.g., 'member', 'admin')"),
    }),
    execute: async ({ project_id, ...params }: any) => {
      const result = await client.post(`/api/v1.0/projects/${project_id}/invite`, params);
      return JSON.stringify(result, null, 2);
    },
  });

  // Leave project
  server.addTool({
    name: "niftypm_leave_project",
    description: "Leave a project",
    parameters: z.object({
      project_id: z.string().regex(/^[a-zA-Z0-9_-]+$/).describe("Project ID"),
    }),
    execute: async ({ project_id }: any) => {
      const result = await client.post(`/api/v1.0/projects/${project_id}/leave`, {});
      return JSON.stringify(result, null, 2);
    },
  });

  // Start project
  server.addTool({
    name: "niftypm_start_project",
    description: "Start a project (change status to active)",
    parameters: z.object({
      project_id: z.string().regex(/^[a-zA-Z0-9_-]+$/).describe("Project ID"),
    }),
    execute: async ({ project_id }: any) => {
      const result = await client.post(`/api/v1.0/projects/${project_id}/start`, {});
      return JSON.stringify(result, null, 2);
    },
  });

  // Add project field
  server.addTool({
    name: "niftypm_add_project_field",
    description: "Add a custom field to a project",
    parameters: z.object({
      project_id: z.string().regex(/^[a-zA-Z0-9_-]+$/).describe("Project ID"),
      field_id: z.string().regex(/^[a-zA-Z0-9_-]+$/).describe("Field ID to add"),
      value: z.any().optional().describe("Field value"),
    }),
    execute: async ({ project_id, ...params }: any) => {
      const result = await client.post(`/api/v1.0/projects/${project_id}/fields`, params);
      return JSON.stringify(result, null, 2);
    },
  });

  // Get project fields
  server.addTool({
    name: "niftypm_get_project_fields",
    description: "Get all custom fields for a project",
    parameters: z.object({
      project_id: z.string().regex(/^[a-zA-Z0-9_-]+$/).describe("Project ID"),
    }),
    execute: async ({ project_id }: any) => {
      const result = await client.get(`/api/v1.0/projects/${project_id}/fields`);
      return JSON.stringify(result, null, 2);
    },
  });

  // Update project field
  server.addTool({
    name: "niftypm_update_project_field",
    description: "Update a custom field value for a project",
    parameters: z.object({
      project_id: z.string().regex(/^[a-zA-Z0-9_-]+$/).describe("Project ID"),
      field_id: z.string().regex(/^[a-zA-Z0-9_-]+$/).describe("Field ID"),
      value: z.any().describe("New field value"),
    }),
    execute: async ({ project_id, field_id, value }: any) => {
      const result = await client.put(`/api/v1.0/projects/${project_id}/fields/${field_id}`, { value });
      return JSON.stringify(result, null, 2);
    },
  });
}
