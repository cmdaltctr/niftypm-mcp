/**
 * NiftyPM Members Tools
 * MCP tools for managing team members in NiftyPM
 */

import { z } from "zod";
import type { NiftyPMClient } from "../client.js";

export function registerMembersTools(server: any, client: NiftyPMClient, disabledTools: string[] = []) {
  // List members
  if (!disabledTools.includes("niftypm_list_members")) {
  server.addTool({
    name: "niftypm_list_members",
    description: "List all team members",
    parameters: z.object({
      project_id: z.string().regex(/^[a-zA-Z0-9_!-]+$/).optional().describe("Filter by project ID"),
    }),
    execute: async (params: any) => {
      const members = await client.get("/api/v1.0/members", params);
      return JSON.stringify(members, null, 2);
    },
  });
  }

  // Get member
  if (!disabledTools.includes("niftypm_get_member")) {
  server.addTool({
    name: "niftypm_get_member",
    description: "Get a specific team member by ID",
    parameters: z.object({
      member_id: z.string().regex(/^[a-zA-Z0-9_!-]+$/).describe("Member ID"),
    }),
    execute: async ({ member_id }: any) => {
      const member = await client.get(`/api/v1.0/members/${member_id}`);
      return JSON.stringify(member, null, 2);
    },
  });
  }
}
