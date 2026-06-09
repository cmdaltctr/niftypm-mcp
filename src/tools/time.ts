/**
 * NiftyPM Time Tracking Tools
 * MCP tools for managing time tracking in NiftyPM
 */

import { z } from "zod";
import type { NiftyPMClient } from "../client.js";

export function registerTimeTools(server: any, client: NiftyPMClient, disabledTools: string[] = []) {
  // Get time report
  if (!disabledTools.includes("niftypm_get_time_report")) {
  server.addTool({
    name: "niftypm_get_time_report",
    description: "Get time tracking report",
    parameters: z.object({
      project_id: z.string().regex(/^[a-zA-Z0-9_!-]+$/).optional().describe("Filter by project ID"),
      user_id: z.string().regex(/^[a-zA-Z0-9_!-]+$/).optional().describe("Filter by user ID"),
      start_date: z.string().optional().describe("Start date (YYYY-MM-DD)"),
      end_date: z.string().optional().describe("End date (YYYY-MM-DD)"),
    }),
    execute: async (params: any) => {
      const report = await client.get("/api/v1.0/time", params);
      return JSON.stringify(report, null, 2);
    },
  });
  }

  // Get time duration
  if (!disabledTools.includes("niftypm_get_time_duration")) {
  server.addTool({
    name: "niftypm_get_time_duration",
    description: "Get total time duration for tasks or projects",
    parameters: z.object({
      start: z.string().describe("Start date (YYYY-MM-DD) — required"),
      end: z.string().describe("End date (YYYY-MM-DD) — required"),
      project_id: z.string().regex(/^[a-zA-Z0-9_!-]+$/).optional().describe("Filter by project ID"),
      task_id: z.string().regex(/^[a-zA-Z0-9_!-]+$/).optional().describe("Filter by task ID"),
    }),
    execute: async (params: any) => {
      // NiftyPM requires start and end query params on GET /time/duration.
      const duration = await client.get("/api/v1.0/time/duration", params);
      return JSON.stringify(duration, null, 2);
    },
  });
  }
}
