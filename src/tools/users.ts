/**
 * NiftyPM Users Tools
 * MCP tools for managing users in NiftyPM
 */

import { z } from "zod";
import type { NiftyPMClient } from "../client.js";

export function registerUsersTools(server: any, client: NiftyPMClient) {
  // Get current user
  server.addTool({
    name: "niftypm_get_current_user",
    description: "Get the currently authenticated user profile",
    parameters: z.object({}),
    execute: async () => {
      const user = await client.get("/api/v1.0/users/me");
      return JSON.stringify(user, null, 2);
    },
  });
}
