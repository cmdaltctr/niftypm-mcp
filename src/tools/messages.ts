/**
 * NiftyPM Messages Tools
 * MCP tools for managing messages in NiftyPM
 */

import { z } from "zod";
import type { FastMCP } from "fastmcp";
import type { NiftyPMClient } from "../client.js";

export function registerMessagesTools(server: FastMCP, client: NiftyPMClient) {
  // List messages
  const ListMessagesSchema = z.object({
    chat_id: z.string().regex(/^[a-zA-Z0-9_-]+$/).optional().describe("Filter by chat ID"),
    task_id: z.string().regex(/^[a-zA-Z0-9_-]+$/).optional().describe("Filter by task ID"),
    file_id: z.string().regex(/^[a-zA-Z0-9_-]+$/).optional().describe("Filter by file ID"),
    doc_id: z.string().regex(/^[a-zA-Z0-9_-]+$/).optional().describe("Filter by document ID"),
    limit: z.number().min(1).max(100).optional().describe("Number of results to return"),
    offset: z.number().optional().describe("Pagination offset"),
  });

  server.addTool({
    name: "niftypm_list_messages",
    description: "List messages in a chat or discussion",
    parameters: ListMessagesSchema,
    execute: async (params: z.infer<typeof ListMessagesSchema>) => {
      const messages = await client.get("/api/v1.0/messages", params);
      return JSON.stringify(messages, null, 2);
    },
  });

  // Get message by ID
  const GetMessageSchema = z.object({
    message_id: z.string().regex(/^[a-zA-Z0-9_-]+$/).describe("Message ID"),
  });

  server.addTool({
    name: "niftypm_get_message",
    description: "Get a specific message by ID",
    parameters: GetMessageSchema,
    execute: async ({ message_id }: z.infer<typeof GetMessageSchema>) => {
      const message = await client.get(`/api/v1.0/messages/${message_id}`);
      return JSON.stringify(message, null, 2);
    },
  });

  // Create message
  const CreateMessageSchema = z.object({
    text: z.string().describe("Message text content"),
    chat_id: z.string().regex(/^[a-zA-Z0-9_-]+$/).describe("Chat ID"),
    type: z.enum(["text", "gif", "document"]).optional().default("text").describe("Message type"),
  });

  server.addTool({
    name: "niftypm_create_message",
    description: "Create a new message in a chat",
    parameters: CreateMessageSchema,
    execute: async (params: z.infer<typeof CreateMessageSchema>) => {
      const message = await client.post("/api/v1.0/messages", params);
      return JSON.stringify(message, null, 2);
    },
  });

  // Update message
  const UpdateMessageSchema = z.object({
    message_id: z.string().regex(/^[a-zA-Z0-9_-]+$/).describe("Message ID"),
    text: z.string().describe("Message text content"),
  });

  server.addTool({
    name: "niftypm_update_message",
    description: "Update an existing message",
    parameters: UpdateMessageSchema,
    execute: async ({ message_id, text }: z.infer<typeof UpdateMessageSchema>) => {
      const message = await client.put(`/api/v1.0/messages/${message_id}`, { text, type: "text" });
      return JSON.stringify(message, null, 2);
    },
  });
  // Delete message
  const DeleteMessageSchema = z.object({
    message_id: z.string().regex(/^[a-zA-Z0-9_-]+$/).describe("Message ID"),
  });

  server.addTool({
    name: "niftypm_delete_message",
    description: "Delete a message",
    parameters: DeleteMessageSchema,
    execute: async ({ message_id }: z.infer<typeof DeleteMessageSchema>) => {
      const result = await client.delete(`/api/v1.0/messages/${message_id}`);
      return JSON.stringify(result, null, 2);
    },
  });

  // Mark message as seen
  const MarkMessageSeenSchema = z.object({
    message_id: z.string().regex(/^[a-zA-Z0-9_-]+$/).describe("Message ID"),
  });

  server.addTool({
    name: "niftypm_mark_message_seen",
    description: "Mark a message as seen",
    parameters: MarkMessageSeenSchema,
    execute: async ({ message_id }: z.infer<typeof MarkMessageSeenSchema>) => {
      const result = await client.post(`/api/v1.0/messages/${message_id}/see`);
      return JSON.stringify(result, null, 2);
    },
  });
}
