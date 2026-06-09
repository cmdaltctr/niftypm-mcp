/**
 * NiftyPM Templates Tools
 * MCP tools for managing templates in NiftyPM
 */

import { z } from "zod";
import type { NiftyPMClient } from "../client.js";

export function registerTemplatesTools(server: any, client: NiftyPMClient, disabledTools: string[] = []) {
  // List templates
  if (!disabledTools.includes("niftypm_list_templates")) {
  server.addTool({
    name: "niftypm_list_templates",
    description: "List all project templates",
    parameters: z.object({
      // Spec types `type` as a free integer; 0–3 are the known template-type values.
      type: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]).describe("Template type (required): 0, 1, 2 or 3"),
      limit: z.number().min(1).max(100).optional().default(25).describe("Number of results to return (default 25)"),
      offset: z.number().min(0).optional().default(0).describe("Pagination offset (default 0)"),
    }),
    execute: async (params: any) => {
      // NiftyPM requires the `type` query param on GET /templates.
      const templates = await client.get("/api/v1.0/templates", params);
      return JSON.stringify(templates, null, 2);
    },
  });
  }
}
