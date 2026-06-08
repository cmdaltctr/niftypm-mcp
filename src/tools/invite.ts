/**
 * NiftyPM Invite Tools
 * MCP tools for managing invite links in NiftyPM
 */

import { z } from "zod";
import type { NiftyPMClient } from "../client.js";

export function registerInviteTools(server: any, client: NiftyPMClient) {
  // List invite links
  server.addTool({
    name: "niftypm_list_invite_links",
    description: "List all active invite links",
    parameters: z.object({}),
    execute: async () => {
      const invites = await client.get("/api/v1.0/invites");
      return JSON.stringify(invites, null, 2);
    },
  });
}
