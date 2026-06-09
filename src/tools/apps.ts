/**
 * NiftyPM Apps Tools
 * MCP tools for managing apps in NiftyPM
 */

import { z } from "zod";
import type { NiftyPMClient } from "../client.js";

export function registerAppsTools(server: any, client: NiftyPMClient, disabledTools: string[] = []) {
  // List apps
  if (!disabledTools.includes("niftypm_list_apps")) {
  server.addTool({
    name: "niftypm_list_apps",
    description: "List all installed applications",
    parameters: z.object({
      limit: z.number().min(1).max(100).optional().default(25).describe("Number of results to return (default 25)"),
      offset: z.number().min(0).optional().default(0).describe("Pagination offset (default 0)"),
    }),
    execute: async (params: any) => {
      // NiftyPM requires limit and offset query params on GET /apps.
      const apps = await client.get("/api/v1.0/apps", params);
      return JSON.stringify(apps, null, 2);
    },
  });
  }

  // Get app
  if (!disabledTools.includes("niftypm_get_app")) {
  server.addTool({
    name: "niftypm_get_app",
    description: "Get a specific app by ID",
    parameters: z.object({
      app_id: z.string().regex(/^[a-zA-Z0-9_!-]+$/).describe("App ID"),
    }),
    execute: async ({ app_id }: any) => {
      const app = await client.get(`/api/v1.0/apps/${app_id}`);
      return JSON.stringify(app, null, 2);
    },
  });
  }
}
