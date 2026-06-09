/**
 * NiftyPM Custom Fields Tools
 * MCP tools for managing custom fields in NiftyPM
 */

import { z } from "zod";
import type { NiftyPMClient } from "../client.js";

export function registerFieldsTools(server: any, client: NiftyPMClient, disabledTools: string[] = []) {
  // List custom fields
  if (!disabledTools.includes("niftypm_list_custom_fields")) {
  server.addTool({
    name: "niftypm_list_custom_fields",
    description: "List all custom fields definitions",
    parameters: z.object({
      project_id: z.string().regex(/^[a-zA-Z0-9_!-]+$/).optional().describe("Filter by project ID"),
    }),
    execute: async (params: any) => {
      const fields = await client.get("/api/v1.0/fields", params);
      return JSON.stringify(fields, null, 2);
    },
  });
  }

  // Get custom field
  if (!disabledTools.includes("niftypm_get_custom_field")) {
  server.addTool({
    name: "niftypm_get_custom_field",
    description: "Get a specific custom field definition by ID",
    parameters: z.object({
      field_id: z.string().regex(/^[a-zA-Z0-9_!-]+$/).describe("Field ID"),
    }),
    execute: async ({ field_id }: any) => {
      const field = await client.get(`/api/v1.0/fields/${field_id}`);
      return JSON.stringify(field, null, 2);
    },
  });
  }
}
