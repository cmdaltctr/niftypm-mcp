# NiftyPM MCP CLI Guide

The `niftypm-mcp` binary works as both an MCP server and a CLI. When invoked with no arguments, it starts the MCP server. When invoked with a subcommand, it runs that command and exits.

## Quick Start

```bash
# Start MCP server (default)
niftypm-mcp

# Bootstrap a local JSON file from a live project
cd /path/to/your/project
niftypm-mcp init

# Re-sync an existing local JSON from the API
niftypm-mcp sync

# Call any tool directly from the command line
niftypm-mcp niftypm_list_tasks --project_id "abc123"

# Show help
niftypm-mcp help
```

## Subcommands

### `init`

Interactive wizard that creates a local JSON snapshot of a NiftyPM project.

1. Lists all accessible NiftyPM projects.
2. Prompts you to select one.
3. Fetches all entities (labels, task lists, milestones, tasks, members).
4. Transforms them into a structured JSON file.
5. Writes to `niftypm/<project-name>.json` in the current working directory.

```bash
cd /path/to/your/project
niftypm-mcp init
```

If `niftypm/<project-name>.json` already exists, you will be prompted to confirm overwrite.

**Prerequisites:** Valid NiftyPM OAuth credentials (`.env` or `.secrets/`).

### `sync`

Re-syncs an existing local JSON file from the live NiftyPM API.

1. Scans `niftypm/*.json` in the current working directory.
2. If multiple files found, prompts for selection.
3. Reads `meta.niftypm_project_id` from the selected file.
4. Fetches all entities from the live API.
5. Rewrites the file with fresh data (preserves `meta.created`).

```bash
cd /path/to/your/project
niftypm-mcp sync
```

If no `niftypm/` directory or JSON files are found, exits with an error suggesting `niftypm-mcp init`.

### Direct tool invocation

Any registered MCP tool can be called directly from the CLI. The tool name is the first argument, followed by `--key value` pairs.

```bash
# List tasks in a project
niftypm-mcp niftypm_list_tasks --project_id "abc123"

# Create a task
niftypm-mcp niftypm_create_task --name "Fix login bug" --task_group_id "tg1"

# List completed tasks
niftypm-mcp niftypm_list_tasks --project_id "abc123" --completed

# Get a specific task
niftypm-mcp niftypm_get_task --task_id "task123"
```

#### Argument parsing rules

| Pattern | Result | Example |
|---------|--------|---------|
| `--key value` | String | `--name "Fix bug"` → `{ name: "Fix bug" }` |
| `--flag` | Boolean `true` | `--completed` → `{ completed: true }` |
| `--no-flag` | Boolean `false` | `--no-archived` → `{ archived: false }` |
| `--key a --key b` | Array | `--label lab1 --label lab2` → `{ label: ["lab1", "lab2"] }` |

Arguments are validated against the tool's Zod schema before execution. Invalid arguments print an error and exit with code 1.

### `help`

Prints available commands and usage examples.

```bash
niftypm-mcp help
```

## Local Auto-Sync

When the MCP server starts in `stdio` mode, it automatically scans `niftypm/*.json` in the current working directory. If local JSON files are found, the server keeps them in sync after every mutation.

### How it works

1. **Discovery** — On startup, reads `meta.niftypm_project_id` from each `niftypm/*.json` file and builds an in-memory map of `project_id → filepath`.
2. **Interception** — After every successful POST, PUT, or DELETE request, the `onMutation` callback is invoked with the HTTP method, endpoint, request body, and response body.
3. **Classification** — The endpoint URL is matched to an entity type (tasks, task_lists, milestones, labels, project).
4. **Project resolution** — The affected project is determined using a priority chain: response body → request body → local JSON entity ID scan → skip.
5. **Targeted refetch** — Only the affected entity type is re-fetched from the API, not the entire project.
6. **In-place update** — The corresponding section in the local JSON file is replaced with fresh data. `meta.last_synced` is updated. All other sections are preserved.
7. **Atomic write** — The file is written to a temporary file then renamed, preventing corruption from interrupted writes.

### Example workflow

```bash
# 1. Bootstrap a local JSON file
cd /path/to/your/project
niftypm-mcp init
# → Creates niftypm/my-project.json

# 2. Start the MCP server from the same directory
niftypm-mcp
# → Discovers niftypm/my-project.json, enables auto-sync

# 3. AI agent creates a task via MCP tools
# → NiftyPM API: POST /api/v1.0/tasks
# → Auto-sync: refetches tasks for the project
# → Updates niftypm/my-project.json in-place
```

### Key behaviours

- **Silent disable** — If no `niftypm/` directory or JSON files are found, auto-sync is silently disabled. No errors or warnings.
- **Non-blocking** — Sync runs asynchronously and never blocks the tool response or throws errors into the calling context. Errors are logged to stderr.
- **Workers-safe** — Auto-sync is only active in Node.js stdio mode. The Cloudflare Workers entry point (`worker.ts`) does not import or activate local sync.
- **CLI too** — Direct tool invocations via CLI also trigger auto-sync if local JSON files are present.

## Local JSON File Format

The local JSON file mirrors the NiftyPM project state in a structured format. It is produced by `buildProjectJson()` in `src/reverse-sync.ts`, which is a TypeScript port of `scripts/reverse-sync.py`.

```json
{
  "meta": {
    "created": "2024-01-01T00:00:00Z",
    "last_synced": "2024-01-15T12:30:00Z",
    "generated_by": "niftypm-mcp/reverse-sync.ts",
    "project_nice_id": "AIE",
    "niftypm_project_id": "KJ1kaUGQe8",
    "source": "Live NiftyPM API via niftypm-mcp",
    "notes": "Subtask names not yet populated..."
  },
  "project": {
    "name": "My Project",
    "description": "...",
    "portfolio": "...",
    "portfolio_id": "...",
    "repo": "..."
  },
  "labels": [{ "name": "bug", "color": "#ff0000", "id": "..." }],
  "task_lists": [{ "name": "Sprint 1", "id": "...", "order": 1 }],
  "milestones": [{ "name": "MVP", "id": "...", "due": "2024-12-31", "description": "..." }],
  "tasks": [{ "id": "...", "nice_id": "AIE-1", "name": "...", "task_list": "Sprint 1", ... }],
  "_validation_checklist": ["..."]
}
```

This is the same format produced by the `reverse-sync.py` script and used in the JSON-First Planning workflow. See the [Workflow Guide](workflow.md) for more details.

## Related

- [Workflow Guide](workflow.md) — JSON-First Planning and Reverse Sync
- [Configuration Guide](configuration.md) — Setting up credentials and transport
- [Tool Guide](tools.md) — Full list of available MCP tools
