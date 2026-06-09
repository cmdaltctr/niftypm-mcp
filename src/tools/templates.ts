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
    parameters: z.object({}),
    execute: async () => {
      const templates = await client.get("/api/v1.0/templates");
      return JSON.stringify(templates, null, 2);
    },
  });
  }
}
