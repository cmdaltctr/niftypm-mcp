/**
 * NiftyPM Auth Tools
 * MCP tools for authentication in NiftyPM
 */

import { z } from "zod";
import type { NiftyPMClient } from "../client.js";

export function registerAuthTools(server: any, client: NiftyPMClient, disabledTools: string[] = []) {
  // Refresh token
  if (!disabledTools.includes("niftypm_refresh_token")) {
  server.addTool({
    name: "niftypm_refresh_token",
    description: "Refresh the authentication token",
    parameters: z.object({
      refresh_token: z.string().describe("The refresh token to exchange"),
    }),
    execute: async ({ refresh_token }: any) => {
      // User-initiated token exchange: use the caller-supplied refresh
      // token and return a redacted response. This intentionally does
      // not mutate the client's in-memory tokens; automatic 401 recovery
      // is handled by NiftyPMClient.refreshAccessToken().
      const result = await client.request("/oauth/token", {
        method: "POST",
        headers: {
          "Authorization": client.getBasicAuthHeader(),
        },
        body: JSON.stringify({
          grant_type: "refresh_token",
          refresh_token,
        }),
      });
      // Redact sensitive tokens from output to prevent leakage via
      // LLM platform logs or cached tool responses.
      const safe: Record<string, unknown> = { ...(result as Record<string, unknown>) };
      delete safe.access_token;
      delete safe.refresh_token;
      return JSON.stringify(safe, null, 2);
    },
  });
  }
}
