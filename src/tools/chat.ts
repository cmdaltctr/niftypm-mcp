/**
 * NiftyPM Chat Tools
 * MCP tools for managing chats in NiftyPM
 */

import { z } from "zod";
import type { NiftyPMClient } from "../client.js";

export function registerChatTools(server: any, client: NiftyPMClient, disabledTools: string[] = []) {
  // List chats
  if (!disabledTools.includes("niftypm_list_chats")) {
  server.addTool({
    name: "niftypm_list_chats",
    description: "List all chat conversations",
    parameters: z.object({
      project_id: z.string().regex(/^[a-zA-Z0-9_-]+$/).optional().describe("Filter by project ID"),
    }),
    execute: async (params: any) => {
      const chats = await client.get("/api/v1.0/chats", params);
      return JSON.stringify(chats, null, 2);
    },
  });
  }

  // Get chat
  if (!disabledTools.includes("niftypm_get_chat")) {
  server.addTool({
    name: "niftypm_get_chat",
    description: "Get a specific chat conversation by ID",
    parameters: z.object({
      chat_id: z.string().regex(/^[a-zA-Z0-9_-]+$/).describe("Chat ID"),
    }),
    execute: async ({ chat_id }: any) => {
      const chat = await client.get(`/api/v1.0/chats/${chat_id}`);
      return JSON.stringify(chat, null, 2);
    },
  });
  }
}
