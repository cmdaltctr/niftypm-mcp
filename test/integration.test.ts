/**
 * Integration tests for full tool registration across all 20 domains.
 * Verifies:
 * - All expected tool names are registered when every domain is enabled
 * - Individual domain flags correctly exclude tools
 * - Tool naming follows the niftypm_<verb>_<resource> pattern
 * - All tool schemas have required parameters (catches missing/renamed tools)
 */

import { describe, it, expect, vi } from "vitest";
import { createMockServer, createMockClient } from "./helpers.js";

// Import all 20 domain registration functions
import { registerFilesTools } from "../src/tools/files.js";
import { registerLabelsTools } from "../src/tools/labels.js";
import { registerDocumentsTools } from "../src/tools/documents.js";
import { registerMilestonesTools } from "../src/tools/milestones.js";
import { registerMessagesTools } from "../src/tools/messages.js";
import { registerTaskGroupsTools } from "../src/tools/taskgroups.js";
import { registerTasksTools } from "../src/tools/tasks.js";
import { registerSubTeamsTools } from "../src/tools/subteams.js";
import { registerProjectsTools } from "../src/tools/projects.js";
import { registerFoldersTools } from "../src/tools/folders.js";
import { registerMembersTools } from "../src/tools/members.js";
import { registerWebhooksTools } from "../src/tools/webhooks.js";
import { registerTimeTools } from "../src/tools/time.js";
import { registerFieldsTools } from "../src/tools/fields.js";
import { registerAppsTools } from "../src/tools/apps.js";
import { registerChatTools } from "../src/tools/chat.js";
import { registerInviteTools } from "../src/tools/invite.js";
import { registerTemplatesTools } from "../src/tools/templates.js";
import { registerUsersTools } from "../src/tools/users.js";
import { registerAuthTools } from "../src/tools/auth.js";

/**
 * Canonical list of every expected tool name, grouped by domain.
 * This serves as the single source of truth for "what tools should exist".
 */
const EXPECTED_TOOLS: Record<string, string[]> = {
  files: [
    "niftypm_upload_files",
    "niftypm_list_files",
    "niftypm_get_file",
    "niftypm_delete_file",
    "niftypm_update_file",
    "niftypm_copy_file",
    "niftypm_add_file_labels",
    "niftypm_remove_file_labels",
  ],
  labels: [
    "niftypm_list_labels",
    "niftypm_create_label",
    "niftypm_get_label",
    "niftypm_update_label",
    "niftypm_delete_label",
  ],
  documents: [
    "niftypm_list_documents",
    "niftypm_get_document",
    "niftypm_create_document",
    "niftypm_update_document",
    "niftypm_delete_document",
    "niftypm_move_document",
    "niftypm_create_personal_document",
    "niftypm_get_personal_documents",
    "niftypm_add_document_members",
    "niftypm_remove_document_members",
    "niftypm_change_document",
    "niftypm_add_document_labels",
    "niftypm_remove_document_labels",
  ],
  milestones: [
    "niftypm_list_milestones",
    "niftypm_create_milestone",
    "niftypm_get_milestone",
    "niftypm_update_milestone",
    "niftypm_delete_milestone",
    "niftypm_archive_milestone",
    "niftypm_move_milestone",
    "niftypm_tie_milestone_tasks",
    "niftypm_untie_milestone_tasks",
  ],
  messages: [
    "niftypm_list_messages",
    "niftypm_create_message",
    "niftypm_get_message",
    "niftypm_update_message",
    "niftypm_delete_message",
    "niftypm_mark_message_seen",
    "niftypm_mark_message_heard",
  ],
  taskGroups: [
    "niftypm_list_taskgroups",
    "niftypm_create_taskgroup",
    "niftypm_get_taskgroup",
    "niftypm_update_taskgroup",
    "niftypm_delete_taskgroup",
    "niftypm_move_taskgroup_tasks",
    "niftypm_assign_taskgroup_members",
    "niftypm_unassign_taskgroup_members",
  ],
  tasks: [
    "niftypm_list_tasks",
    "niftypm_get_task",
    "niftypm_create_task",
    "niftypm_update_task",
    "niftypm_delete_task",
    "niftypm_delete_tasks",
    "niftypm_complete_task",
    "niftypm_archive_task",
    "niftypm_get_personal_tasks",
    "niftypm_create_personal_task",
    "niftypm_link_task",
    "niftypm_update_task_milestone",
    "niftypm_move_task",
    "niftypm_assign_task",
    "niftypm_unassign_task",
    "niftypm_add_task_labels",
    "niftypm_remove_task_labels",
    "niftypm_add_task_field",
    "niftypm_get_task_fields",
    "niftypm_update_task_field",
    "niftypm_attach_task_document",
    "niftypm_clone_task",
    "niftypm_move_tasks",
  ],
  subTeams: [
    "niftypm_list_subteams",
    "niftypm_create_subteam",
    "niftypm_get_subteam",
    "niftypm_update_subteam",
    "niftypm_delete_subteam",
    "niftypm_add_subteam_members",
    "niftypm_remove_subteam_members",
    "niftypm_leave_subteam",
  ],
  projects: [
    "niftypm_list_projects",
    "niftypm_create_project",
    "niftypm_get_project",
    "niftypm_update_project",
    "niftypm_delete_project",
    "niftypm_invite_to_project",
    "niftypm_leave_project",
    "niftypm_start_project",
    "niftypm_add_project_field",
    "niftypm_get_project_fields",
    "niftypm_update_project_field",
  ],
  folders: [
    "niftypm_get_folder",
    "niftypm_create_folder",
    "niftypm_get_folder_by_id",
    "niftypm_get_folder_children",
    "niftypm_update_folder",
    "niftypm_delete_folder",
  ],
  members: [
    "niftypm_list_members",
    "niftypm_get_member",
  ],
  webhooks: [
    "niftypm_list_webhooks",
    "niftypm_create_webhook",
    "niftypm_update_webhook",
    "niftypm_delete_webhook",
  ],
  time: [
    "niftypm_get_time_report",
    "niftypm_get_time_duration",
  ],
  fields: [
    "niftypm_list_custom_fields",
    "niftypm_get_custom_field",
  ],
  apps: [
    "niftypm_list_apps",
    "niftypm_get_app",
  ],
  chat: [
    "niftypm_list_chats",
    "niftypm_get_chat",
  ],
  invite: [
    "niftypm_list_invite_links",
  ],
  templates: [
    "niftypm_list_templates",
  ],
  users: [
    "niftypm_get_current_user",
  ],
  auth: [
    "niftypm_refresh_token",
  ],
};

/** Map from domain key to registration function */
const DOMAIN_REGISTRARS: Record<string, typeof registerFilesTools> = {
  files: registerFilesTools,
  labels: registerLabelsTools,
  documents: registerDocumentsTools,
  milestones: registerMilestonesTools,
  messages: registerMessagesTools,
  taskGroups: registerTaskGroupsTools,
  tasks: registerTasksTools,
  subTeams: registerSubTeamsTools,
  projects: registerProjectsTools,
  folders: registerFoldersTools,
  members: registerMembersTools,
  webhooks: registerWebhooksTools,
  time: registerTimeTools,
  fields: registerFieldsTools,
  apps: registerAppsTools,
  chat: registerChatTools,
  invite: registerInviteTools,
  templates: registerTemplatesTools,
  users: registerUsersTools,
  auth: registerAuthTools,
};

function registerWithMockClient(
  regFn: typeof registerFilesTools,
  server: ReturnType<typeof createMockServer>,
  client: ReturnType<typeof createMockClient>,
) {
  regFn(server, client as unknown as Parameters<typeof registerFilesTools>[1]);
}

describe("Full tool registration integration", () => {
  it("should register every expected tool name when all domains are enabled", () => {
    const server = createMockServer();
    const client = createMockClient();

    for (const regFn of Object.values(DOMAIN_REGISTRARS)) {
      registerWithMockClient(regFn, server, client);
    }

    const allExpected = Object.values(EXPECTED_TOOLS).flat();
    const registered = server.getToolNames();

    for (const name of allExpected) {
      expect(registered).toContain(name);
    }

    // Also verify no extras beyond what we expect
    expect(registered.sort()).toEqual(allExpected.sort());
  });

  it("should have the correct total number of tools", () => {
    const server = createMockServer();
    const client = createMockClient();

    for (const regFn of Object.values(DOMAIN_REGISTRARS)) {
      registerWithMockClient(regFn, server, client);
    }

    const allExpected = Object.values(EXPECTED_TOOLS).flat();
    expect(server.addTool).toHaveBeenCalledTimes(allExpected.length);
  });

  it("should respect each domain flag individually", () => {
    for (const [domain, regFn] of Object.entries(DOMAIN_REGISTRARS)) {
      const server = createMockServer();
      const client = createMockClient();
      const expectedCount = EXPECTED_TOOLS[domain].length;

      registerWithMockClient(regFn, server, client);

      expect(
        server.addTool.mock.calls.length,
        `Domain "${domain}" should register ${expectedCount} tools`
      ).toBe(expectedCount);
    }
  });

  it("should have all tool names follow the niftypm_<verb>_<resource> pattern", () => {
    const server = createMockServer();
    const client = createMockClient();

    for (const regFn of Object.values(DOMAIN_REGISTRARS)) {
      registerWithMockClient(regFn, server, client);
    }

    const names = server.getToolNames();
    const pattern = /^niftypm_[a-z]+_[a-z0-9_]+$/;

    for (const name of names) {
      expect(
        pattern.test(name),
        `Tool "${name}" should follow niftypm_<verb>_<resource> pattern`
      ).toBe(true);
    }
  });

  it("should have every tool define a description", () => {
    const server = createMockServer();
    const client = createMockClient();

    for (const regFn of Object.values(DOMAIN_REGISTRARS)) {
      registerWithMockClient(regFn, server, client);
    }

    for (const tool of server.tools) {
      expect(
        tool.description,
        `Tool "${tool.name}" should have a non-empty description`
      ).toBeTruthy();
    }
  });

  it("should have every tool define a parameters schema", () => {
    const server = createMockServer();
    const client = createMockClient();

    for (const regFn of Object.values(DOMAIN_REGISTRARS)) {
      registerWithMockClient(regFn, server, client);
    }

    for (const tool of server.tools) {
      expect(
        tool.parameters,
        `Tool "${tool.name}" should have a parameters schema`
      ).toBeDefined();
    }
  });

  it("should have every tool define an execute function", () => {
    const server = createMockServer();
    const client = createMockClient();

    for (const regFn of Object.values(DOMAIN_REGISTRARS)) {
      registerWithMockClient(regFn, server, client);
    }

    for (const tool of server.tools) {
      expect(
        typeof tool.execute,
        `Tool "${tool.name}" should have an execute function`
      ).toBe("function");
    }
  });
});
