/**
 * CLI entry point — subcommand dispatch, init wizard, sync command,
 * and direct tool invocation.
 *
 * Only used in Node.js stdio mode (src/index.ts dispatches here).
 */

import { z } from "zod";
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { loadConfig, validateConfig } from "./config.js";
import { NiftyPMClient } from "./client.js";
import { LocalSync } from "./local-sync.js";
import { buildProjectJson } from "./reverse-sync.js";
import type { Bundle } from "./reverse-sync.js";
import {
  registerFilesTools,
  registerLabelsTools,
  registerDocumentsTools,
  registerMilestonesTools,
  registerMessagesTools,
  registerTaskGroupsTools,
  registerTasksTools,
  registerSubTeamsTools,
  registerProjectsTools,
  registerFoldersTools,
  registerMembersTools,
  registerWebhooksTools,
  registerTimeTools,
  registerFieldsTools,
  registerAppsTools,
  registerChatTools,
  registerInviteTools,
  registerTemplatesTools,
  registerUsersTools,
  registerAuthTools,
  registerChecklistsTools,
} from "./tools/index.js";

// ── Tool registry shim ──────────────────────────────────────────────

interface ToolDef {
  name: string;
  description?: string;
  parameters: z.ZodTypeAny;
  execute: (args: any) => Promise<string | void>;
}

class ToolRegistry {
  tools = new Map<string, ToolDef>();

  addTool(tool: ToolDef): void {
    this.tools.set(tool.name, tool);
  }
}

function buildRegistry(config: ReturnType<typeof loadConfig>, client: NiftyPMClient): ToolRegistry {
  const reg = new ToolRegistry();
  const dt = config.disabledTools;

  if (config.enabledTools.files) registerFilesTools(reg as any, client, dt);
  if (config.enabledTools.labels) registerLabelsTools(reg as any, client, dt);
  if (config.enabledTools.documents) registerDocumentsTools(reg as any, client, dt);
  if (config.enabledTools.milestones) registerMilestonesTools(reg as any, client, dt);
  if (config.enabledTools.messages) registerMessagesTools(reg as any, client, dt);
  if (config.enabledTools.taskGroups) registerTaskGroupsTools(reg as any, client, dt);
  if (config.enabledTools.tasks) registerTasksTools(reg as any, client, dt);
  if (config.enabledTools.subTeams) registerSubTeamsTools(reg as any, client, dt);
  if (config.enabledTools.projects) registerProjectsTools(reg as any, client, dt);
  if (config.enabledTools.folders) registerFoldersTools(reg as any, client, dt);
  if (config.enabledTools.members) registerMembersTools(reg as any, client, dt);
  if (config.enabledTools.webhooks) registerWebhooksTools(reg as any, client, dt);
  if (config.enabledTools.time) registerTimeTools(reg as any, client, dt);
  if (config.enabledTools.fields) registerFieldsTools(reg as any, client, dt);
  if (config.enabledTools.apps) registerAppsTools(reg as any, client, dt);
  if (config.enabledTools.chat) registerChatTools(reg as any, client, dt);
  if (config.enabledTools.invite) registerInviteTools(reg as any, client, dt);
  if (config.enabledTools.templates) registerTemplatesTools(reg as any, client, dt);
  if (config.enabledTools.users) registerUsersTools(reg as any, client, dt);
  if (config.enabledTools.auth) registerAuthTools(reg as any, client, dt);
  if (config.enabledTools.checklists) registerChecklistsTools(reg as any, client, dt);

  return reg;
}

// ── Argument parser ─────────────────────────────────────────────────

function parseArgs(argv: string[]): Record<string, any> {
  const result: Record<string, any> = {};
  let i = 0;

  while (i < argv.length) {
    const arg = argv[i];

    if (arg.startsWith("--no-")) {
      const key = arg.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      result[key] = false;
      i++;
      continue;
    }

    if (arg.startsWith("--")) {
      const key = arg.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      const next = argv[i + 1];

      if (next === undefined || next.startsWith("--")) {
        // Boolean flag: --flag = true
        result[key] = true;
        i++;
        continue;
      }

      // Check if key already exists (array via repeated flags)
      if (key in result) {
        if (!Array.isArray(result[key])) {
          result[key] = [result[key]];
        }
        result[key].push(next);
      } else {
        result[key] = next;
      }
      i += 2;
      continue;
    }

    i++;
  }

  return result;
}

// ── Interactive helpers ─────────────────────────────────────────────

function prompt(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// ── Init command ────────────────────────────────────────────────────

async function cmdInit(client: NiftyPMClient): Promise<void> {
  const projects = await client.get<any[]>("/api/v1.0/projects");
  if (!Array.isArray(projects) || projects.length === 0) {
    console.error("No accessible NiftyPM projects found.");
    process.exit(1);
  }

  console.error("\nAvailable NiftyPM projects:\n");
  projects.forEach((p, i) => {
    console.error(`  ${i + 1}. ${p.name || "Unnamed"} (nice_id: ${p.nice_id || "—"}, id: ${p.id})`);
  });

  const answer = await prompt(`\nSelect a project (1-${projects.length}): `);
  const idx = parseInt(answer, 10) - 1;
  if (isNaN(idx) || idx < 0 || idx >= projects.length) {
    console.error("Invalid selection.");
    process.exit(1);
  }

  const project = projects[idx];
  const projectId = project.id;

  console.error(`\nFetching data for "${project.name}"...`);

  const [labels, taskgroups, milestonesRegular, milestonesList, tasks, members] = await Promise.all(
    [
      client.get("/api/v1.0/labels", { project_id: projectId }),
      client.get("/api/v1.0/taskgroups", { project_id: projectId }),
      client.get("/api/v1.0/milestones", { project_id: projectId }),
      client.get("/api/v1.0/milestones", { project_id: projectId, is_list: "true" }),
      client.get("/api/v1.0/tasks", { project_id: projectId }),
      client.get("/api/v1.0/members", { project_id: projectId }),
    ],
  );

  // Merge milestones and deduplicate by id
  const allMilestones = [
    ...(Array.isArray(milestonesRegular) ? milestonesRegular : []),
    ...(Array.isArray(milestonesList) ? milestonesList : []),
  ];
  const seenMs = new Set<string>();
  const dedupedMilestones = allMilestones.filter((ms: any) => {
    if (!ms?.id || seenMs.has(ms.id)) return false;
    seenMs.add(ms.id);
    return true;
  });

  const bundle: Bundle = {
    project: { ...project, portfolio: project.portfolio || "", portfolio_id: project.portfolio_id },
    labels: Array.isArray(labels) ? labels : [],
    taskgroups: Array.isArray(taskgroups) ? taskgroups : [],
    milestones: dedupedMilestones,
    tasks: Array.isArray(tasks) ? tasks : [],
    members: Array.isArray(members) ? members : [],
  };

  const result = buildProjectJson(bundle);

  const niftypmDir = join(process.cwd(), "niftypm");
  if (!existsSync(niftypmDir)) {
    mkdirSync(niftypmDir, { recursive: true });
  }

  const slug = (project.name || "project")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const filepath = join(niftypmDir, `${slug}.json`);

  if (existsSync(filepath)) {
    const confirm = await prompt(`File ${filepath} already exists. Overwrite? (y/N): `);
    if (confirm.toLowerCase() !== "y") {
      console.error("Aborted.");
      process.exit(0);
    }
  }

  writeFileSync(filepath, JSON.stringify(result, null, 2) + "\n", "utf-8");

  const completed = result.tasks.filter((t) => t.completed).length;
  console.error(
    `\nWROTE ${filepath}\n  ${result.tasks.length} tasks (${completed} completed),\n  ${result.labels.length} labels,\n  ${result.milestones.length} milestones,\n  ${result.task_lists.length} task lists`,
  );
}

// ── Sync command ────────────────────────────────────────────────────

async function cmdSync(client: NiftyPMClient): Promise<void> {
  const niftypmDir = join(process.cwd(), "niftypm");
  if (!existsSync(niftypmDir)) {
    console.error('No niftypm/ directory found. Run "niftypm-mcp init" first.');
    process.exit(1);
  }

  const files = readdirSync(niftypmDir).filter((f) => f.endsWith(".json"));
  if (files.length === 0) {
    console.error('No JSON files in niftypm/. Run "niftypm-mcp init" first.');
    process.exit(1);
  }

  let filepath: string;
  if (files.length === 1) {
    filepath = join(niftypmDir, files[0]);
  } else {
    console.error("\nMultiple local JSON files found:\n");
    files.forEach((f, i) => console.error(`  ${i + 1}. ${f}`));
    const answer = await prompt(`\nSelect a file (1-${files.length}): `);
    const idx = parseInt(answer, 10) - 1;
    if (isNaN(idx) || idx < 0 || idx >= files.length) {
      console.error("Invalid selection.");
      process.exit(1);
    }
    filepath = join(niftypmDir, files[idx]);
  }

  const data = JSON.parse(readFileSync(filepath, "utf-8"));
  const projectId = data?.meta?.niftypm_project_id;
  if (!projectId) {
    console.error(`No meta.niftypm_project_id found in ${filepath}`);
    process.exit(1);
  }

  console.error(`\nRe-syncing project ${projectId} from live API...`);

  const [project, labels, taskgroups, milestonesRegular, milestonesList, tasks, members] =
    await Promise.all([
      client.get(`/api/v1.0/projects/${projectId}`),
      client.get("/api/v1.0/labels", { project_id: projectId }),
      client.get("/api/v1.0/taskgroups", { project_id: projectId }),
      client.get("/api/v1.0/milestones", { project_id: projectId }),
      client.get("/api/v1.0/milestones", { project_id: projectId, is_list: "true" }),
      client.get("/api/v1.0/tasks", { project_id: projectId }),
      client.get("/api/v1.0/members", { project_id: projectId }),
    ]);

  const allMilestones = [
    ...(Array.isArray(milestonesRegular) ? milestonesRegular : []),
    ...(Array.isArray(milestonesList) ? milestonesList : []),
  ];
  const seenMs = new Set<string>();
  const dedupedMilestones = allMilestones.filter((ms: any) => {
    if (!ms?.id || seenMs.has(ms.id)) return false;
    seenMs.add(ms.id);
    return true;
  });

  const bundle: Bundle = {
    project: project as any,
    labels: Array.isArray(labels) ? labels : [],
    taskgroups: Array.isArray(taskgroups) ? taskgroups : [],
    milestones: dedupedMilestones,
    tasks: Array.isArray(tasks) ? tasks : [],
    members: Array.isArray(members) ? members : [],
  };

  // Preserve original created timestamp
  const result = buildProjectJson(bundle);
  result.meta.created = data.meta?.created || result.meta.created;

  writeFileSync(filepath, JSON.stringify(result, null, 2) + "\n", "utf-8");

  const completed = result.tasks.filter((t) => t.completed).length;
  console.error(
    `\nSYNCED ${filepath}\n  ${result.tasks.length} tasks (${completed} completed),\n  ${result.labels.length} labels,\n  ${result.milestones.length} milestones,\n  ${result.task_lists.length} task lists`,
  );
}

// ── Main CLI dispatch ───────────────────────────────────────────────

export async function runCli(): Promise<void> {
  const subcommand = process.argv[2];

  if (!subcommand) {
    return; // No subcommand — caller starts MCP server
  }

  // Built-in subcommands
  if (subcommand === "init" || subcommand === "sync") {
    const config = loadConfig();
    try {
      validateConfig(config);
    } catch (err) {
      console.error(`Configuration error: ${(err as Error).message}`);
      console.error('See README "Configure" section for .env and .secrets/ setup.');
      process.exit(1);
    }

    const client = new NiftyPMClient(config);

    // Wire local sync for mutations during CLI operations
    const localSync = new LocalSync(client);
    localSync.discover();
    client.onMutation = localSync.onMutation;

    if (subcommand === "init") {
      await cmdInit(client);
    } else {
      await cmdSync(client);
    }
    process.exit(0);
  }

  // Help / version
  if (subcommand === "--help" || subcommand === "-h" || subcommand === "help") {
    console.error(`niftypm-mcp — NiftyPM MCP server and CLI

Usage:
  niftypm-mcp                    Start MCP server (stdio)
  niftypm-mcp init               Interactive: select project, create local JSON
  niftypm-mcp sync               Re-sync existing local JSON from live API
  niftypm-mcp <tool-name> [args] Call any MCP tool directly

Examples:
  niftypm-mcp init
  niftypm-mcp sync
  niftypm-mcp niftypm_list_projects
  niftypm-mcp niftypm_create_task --name "Fix bug" --task_group_id "abc123"
  niftypm-mcp niftypm_list_tasks --project_id "abc123" --completed
`);
    process.exit(0);
  }

  // Tool invocation
  const config = loadConfig();
  try {
    validateConfig(config);
  } catch (err) {
    console.error(`Configuration error: ${(err as Error).message}`);
    process.exit(1);
  }

  const client = new NiftyPMClient(config);
  const registry = buildRegistry(config, client);

  // Wire local sync
  const localSync = new LocalSync(client);
  localSync.discover();
  client.onMutation = localSync.onMutation;

  const toolName = subcommand;
  const tool = registry.tools.get(toolName);

  if (!tool) {
    console.error(`Unknown command or tool: "${toolName}"`);
    console.error('Run "niftypm-mcp help" for available commands.');
    process.exit(1);
  }

  const rawArgs = parseArgs(process.argv.slice(3));

  // Validate against Zod schema
  const parsed = tool.parameters.safeParse(rawArgs);
  if (!parsed.success) {
    console.error(`Invalid arguments for ${toolName}:`);
    console.error(parsed.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n"));
    process.exit(1);
  }

  // Execute
  const result = await tool.execute(parsed.data);
  if (typeof result === "string") {
    console.log(result);
  } else if (result !== undefined) {
    console.log(JSON.stringify(result, null, 2));
  }

  process.exit(0);
}
