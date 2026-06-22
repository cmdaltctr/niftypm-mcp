/**
 * NiftyPM Checklist Tools
 *
 * Full checklist CRUD via the undocumented NiftyPM internal API
 * at api.niftypm.com/checklists. These endpoints are NOT in the
 * public OpenAPI spec but were verified empirically on 2026-06-22.
 * See docs/api/checklist-api-discovery.md for the full reference.
 */

import { z } from "zod";
import type { FastMCP } from "fastmcp";
import type { NiftyPMClient } from "../client.js";

const idSchema = z.string().regex(/^[a-zA-Z0-9_!-]+$/);

export function registerChecklistsTools(server: FastMCP, client: NiftyPMClient, disabledTools: string[] = []) {

  // ── Checklist CRUD ─────────────────────────────────────────────────

  // Create checklist
  const CreateChecklistSchema = z.object({
    task_id: idSchema.describe("Internal task ID to attach the checklist to"),
    name: z.string().describe("Checklist name"),
  });

  if (!disabledTools.includes("niftypm_create_checklist")) {
    server.addTool({
      name: "niftypm_create_checklist",
      description: "Create a new checklist on a task",
      parameters: CreateChecklistSchema,
      execute: async (params: z.infer<typeof CreateChecklistSchema>) => {
        const result = await client.internalPost("/checklists", params);
        return JSON.stringify(result, null, 2);
      },
    });
  }

  // Get checklist (with items)
  const GetChecklistSchema = z.object({
    checklist_id: idSchema.describe("Checklist ID"),
  });

  if (!disabledTools.includes("niftypm_get_checklist")) {
    server.addTool({
      name: "niftypm_get_checklist",
      description: "Get a checklist by ID, including its items",
      parameters: GetChecklistSchema,
      execute: async ({ checklist_id }: z.infer<typeof GetChecklistSchema>) => {
        const result = await client.internalGet(`/checklists/${checklist_id}`);
        return JSON.stringify(result, null, 2);
      },
    });
  }

  // Update checklist name
  const UpdateChecklistSchema = z.object({
    checklist_id: idSchema.describe("Checklist ID"),
    name: z.string().describe("New checklist name"),
  });

  if (!disabledTools.includes("niftypm_update_checklist")) {
    server.addTool({
      name: "niftypm_update_checklist",
      description: "Rename a checklist",
      parameters: UpdateChecklistSchema,
      execute: async ({ checklist_id, name }: z.infer<typeof UpdateChecklistSchema>) => {
        const result = await client.internalPut(`/checklists/${checklist_id}`, { name });
        return JSON.stringify(result, null, 2);
      },
    });
  }

  // Delete checklist
  const DeleteChecklistSchema = z.object({
    checklist_id: idSchema.describe("Checklist ID"),
  });

  if (!disabledTools.includes("niftypm_delete_checklist")) {
    server.addTool({
      name: "niftypm_delete_checklist",
      description: "Delete a checklist and all its items",
      parameters: DeleteChecklistSchema,
      execute: async ({ checklist_id }: z.infer<typeof DeleteChecklistSchema>) => {
        const result = await client.internalDelete(`/checklists/${checklist_id}`);
        return JSON.stringify(result, null, 2);
      },
    });
  }

  // ── Checklist Item CRUD ────────────────────────────────────────────

  // Create checklist item(s) — body MUST be an array
  const CreateChecklistItemsSchema = z.object({
    checklist_id: idSchema.describe("Checklist ID to add items to"),
    names: z.array(z.string()).min(1).describe("Array of item names to create"),
  });

  if (!disabledTools.includes("niftypm_create_checklist_items")) {
    server.addTool({
      name: "niftypm_create_checklist_items",
      description: "Add one or more items to a checklist. The API requires an array body — this tool handles that automatically from the names array.",
      parameters: CreateChecklistItemsSchema,
      execute: async ({ checklist_id, names }: z.infer<typeof CreateChecklistItemsSchema>) => {
        // CRITICAL: the API expects a JSON array [{name: "..."}, ...], not a single object.
        const items = names.map(name => ({ name }));
        const result = await client.internalPost(`/checklists/${checklist_id}`, items);
        return JSON.stringify(result, null, 2);
      },
    });
  }

  // Update checklist item (rename)
  const UpdateChecklistItemSchema = z.object({
    checklist_id: idSchema.describe("Checklist ID"),
    item_id: idSchema.describe("Checklist item ID"),
    name: z.string().describe("New item name"),
  });

  if (!disabledTools.includes("niftypm_update_checklist_item")) {
    server.addTool({
      name: "niftypm_update_checklist_item",
      description: "Rename a checklist item",
      parameters: UpdateChecklistItemSchema,
      execute: async ({ checklist_id, item_id, name }: z.infer<typeof UpdateChecklistItemSchema>) => {
        const result = await client.internalPut(`/checklists/${checklist_id}/${item_id}`, { name });
        return JSON.stringify(result, null, 2);
      },
    });
  }

  // Toggle checklist item completion
  const ToggleChecklistItemSchema = z.object({
    checklist_id: idSchema.describe("Checklist ID"),
    item_id: idSchema.describe("Checklist item ID"),
    completed: z.boolean().describe("Set true to mark complete, false to uncomplete"),
  });

  if (!disabledTools.includes("niftypm_toggle_checklist_item")) {
    server.addTool({
      name: "niftypm_toggle_checklist_item",
      description: "Toggle the completion status of a checklist item",
      parameters: ToggleChecklistItemSchema,
      execute: async ({ checklist_id, item_id, completed }: z.infer<typeof ToggleChecklistItemSchema>) => {
        const result = await client.internalPut(`/checklists/${checklist_id}/${item_id}`, { completed });
        return JSON.stringify(result, null, 2);
      },
    });
  }

  // Delete checklist item
  const DeleteChecklistItemSchema = z.object({
    checklist_id: idSchema.describe("Checklist ID"),
    item_id: idSchema.describe("Checklist item ID to delete"),
  });

  if (!disabledTools.includes("niftypm_delete_checklist_item")) {
    server.addTool({
      name: "niftypm_delete_checklist_item",
      description: "Delete a single checklist item",
      parameters: DeleteChecklistItemSchema,
      execute: async ({ checklist_id, item_id }: z.infer<typeof DeleteChecklistItemSchema>) => {
        const result = await client.internalDelete(`/checklists/${checklist_id}/${item_id}`);
        return JSON.stringify(result, null, 2);
      },
    });
  }
}
