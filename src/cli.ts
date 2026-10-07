/**
 * CLI entry point — subcommand dispatch, init wizard, sync command,
 * and direct tool invocation.
 *
 * Only used in Node.js stdio mode (src/index.ts dispatches here).
 */

import { z } from "zod";
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { loadConfig, validateConfig } from "./config.js";
import { NiftyPMClient } from "./client.js";
import { LocalSync } from "./local-sync.js";
import { buildProjectJson } from "./reverse-sync.js";
import type { BundleProject } from "./reverse-sync.js";
import { fetchCollection, fetchProject, fetchBundle, mergeTasks, SyncError, syncFailure } from "./sync-data.js";
import { readMirror, withMirror, writeMirror } from "./mirror-file.js";
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

async function refreshMirror(client: NiftyPMClient, filepath: string, allowEmpty: boolean, selected?: BundleProject): Promise<void> {
  await withMirror(filepath, async () => {
    const previous = readMirror(filepath, selected?.id);
    if (!previous && !selected) throw new SyncError('No local mirror found. Run "niftypm-mcp init" first.');
    const project = selected ?? await fetchProject(client, previous!.data.meta.niftypm_project_id!);
    const fresh = buildProjectJson(await fetchBundle(client, project));
    const result = previous ? {
      ...previous.data, ...fresh,
      meta: { ...previous.data.meta, ...fresh.meta, created: previous.data.meta.created },
      project: {
        ...previous.data.project, ...fresh.project,
        portfolio: project.portfolio ?? previous.data.project.portfolio,
        portfolio_id: project.portfolio_id ?? previous.data.project.portfolio_id,
        repo: project.repo ?? previous.data.project.repo,
      },
      tasks: mergeTasks(previous.data.tasks, fresh.tasks),
    } : fresh;
    writeMirror(filepath, result, previous, allowEmpty);
    console.error(`SYNCED ${filepath}: ${result.tasks.length} tasks, ${result.labels.length} labels, ${result.milestones.length} milestones, ${result.task_lists.length} task lists`);
  });
}

async function cmdInit(client: NiftyPMClient, allowEmpty: boolean): Promise<void> {
  const projects = await fetchCollection<BundleProject>(client, "projects");
  if (!projects.length) throw new SyncError("No accessible NiftyPM projects found.");
  console.error("\nAvailable NiftyPM projects:\n");
  projects.forEach((p, i) => console.error(`  ${i + 1}. ${p.name || "Unnamed"} (id: ${p.id})`));
  const idx = Number(await prompt(`\nSelect a project (1-${projects.length}): `)) - 1;
  if (!Number.isInteger(idx) || idx < 0 || idx >= projects.length) throw new SyncError("Invalid project selection.");
  const project = projects[idx];
  const directory = join(process.cwd(), "niftypm");
  const slug = (project.name || "project").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "project";
  const filepath = join(directory, `${slug}.json`);
  if (existsSync(filepath)) {
    const confirm = await prompt(`File ${filepath} already exists. Overwrite? (y/N): `);
    if (confirm.toLowerCase() !== "y") { console.error("Aborted."); return; }
  }
  mkdirSync(directory, { recursive: true });
  await refreshMirror(client, filepath, allowEmpty, project);
}

// ── Sync command ────────────────────────────────────────────────────

async function cmdSync(client: NiftyPMClient, allowEmpty: boolean): Promise<void> {
  const directory = join(process.cwd(), "niftypm");
  if (!existsSync(directory)) throw new SyncError('No niftypm/ directory found. Run "niftypm-mcp init" first.');
  const files = readdirSync(directory).filter((file) => file.endsWith(".json"));
  if (!files.length) throw new SyncError('No JSON files found. Run "niftypm-mcp init" first.');
  let idx = 0;
  if (files.length > 1) {
    console.error("\nMultiple local JSON files found:\n");
    files.forEach((file, i) => console.error(`  ${i + 1}. ${file}`));
    idx = Number(await prompt(`\nSelect a file (1-${files.length}): `)) - 1;
  }
  if (!Number.isInteger(idx) || idx < 0 || idx >= files.length) throw new SyncError("Invalid file selection.");
  await refreshMirror(client, join(directory, files[idx]), allowEmpty);
}

// ── Main CLI dispatch ───────────────────────────────────────────────

export async function runCli(): Promise<void> {
  const subcommand = process.argv[2];

  if (!subcommand) {
    return; // No subcommand — caller starts MCP server
  }

  // Built-in subcommands
  if (subcommand === "init" || subcommand === "sync") {
    let failed = false;
    try {
      const config = loadConfig();
      validateConfig(config);
      const flags = z.object({ allowEmpty: z.boolean().default(false) }).strict().safeParse(parseArgs(process.argv.slice(3)));
      if (!flags.success) throw new SyncError("Invalid manual sync flags. Use --allow-empty only for an intentional validated clear.");
      const client = new NiftyPMClient(config);
      if (subcommand === "init") await cmdInit(client, flags.data.allowEmpty);
      else await cmdSync(client, flags.data.allowEmpty);
    } catch (error) {
      failed = true;
      console.error(syncFailure(error));
      console.error('Check project access, file permissions and credentials in .env or .secrets/ before retrying.');
    }
    process.exit(failed ? 1 : 0);
  }

  // Help / version
  if (subcommand === "--help" || subcommand === "-h" || subcommand === "help") {
    console.error(`niftypm-mcp — NiftyPM MCP server and CLI

Usage:
  niftypm-mcp                    Start MCP server (stdio)
  niftypm-mcp init               Interactive: select project, create local JSON
  niftypm-mcp sync               Re-sync existing local JSON from live API
  niftypm-mcp sync --allow-empty Permit a validated intentional empty overwrite
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

  await localSync.drain();
  process.exit(0);
}
