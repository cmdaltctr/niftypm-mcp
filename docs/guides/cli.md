# NiftyPM MCP CLI Guide

The `niftypm-mcp` binary starts a Node MCP server with no arguments. A subcommand runs the CLI and exits. Use configured credentials before running these examples. Local mirrors are read from `niftypm/` in the current working directory.

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

1. Reads the complete, validated project list.
2. Prompts you to select a project.
3. Fetches complete legacy collections for the snapshot.
4. Transforms the data into a local mirror.
5. Creates `niftypm/<project-name>.json` through an atomic rename.

The selected list record supplies project metadata without an additional project-detail request.

```bash
cd /path/to/your/project
niftypm-mcp init
```

An existing target requires overwrite confirmation. The selected project must match its `meta.niftypm_project_id`. Confirmation leaves the validation and empty-result checks active.

**Prerequisites:** A valid `NIFTYPM_API_TOKEN`, or the complete OAuth credential set. See the [Configuration Guide](configuration.md). Node loads `.env` from the installed project's root; credential fallback uses its `.secrets/` directory. The shell environment takes precedence.

### `sync`

Re-syncs an existing local JSON file from the live NiftyPM API.

1. Scans `niftypm/*.json` in the current working directory.
2. Prompts for a file when several files exist.
3. Reads the selected mirror's project ID.
4. Validates project metadata and fetches every collection page.
5. Backs up the original file before replacing it atomically.

Full refreshes preserve `meta.created`, custom top-level keys and local enrichment for retained task IDs. Refreshed API-owned task fields take precedence. Nested `subtasks` and local-only fields such as `subtask_details` survive. The derived validation checklist can be regenerated.

```bash
cd /path/to/your/project
niftypm-mcp sync
```

If no `niftypm/` directory or JSON files are found, exits with an error suggesting `niftypm-mcp init`.

### Intentional empty overwrites

Manual `init` and `sync` work independently of automatic-sync consent. A populated `tasks`, `labels`, `task_lists` or `milestones` section becoming empty stops the entire overwrite.

After verifying the intended clear, use a boolean flag:

```bash
niftypm-mcp sync --allow-empty
# An existing init target still requires overwrite confirmation
niftypm-mcp init --allow-empty
```

`--allow-empty` permits only complete, validated empty results during manual overwrites. Malformed responses, foreign-project data and failed pagination still stop the write. Multi-page results must pass every check. `--allow-empty true` supplies a string and is rejected. Automatic sync still requires its separate opt-in. New mirrors and already-empty sections accept valid empty collections without the flag.

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
| `--key value` | String | `--name "Fix bug"`: `{ name: "Fix bug" }` |
| `--flag` | Boolean `true` | `--completed`: `{ completed: true }` |
| `--no-flag` | Boolean `false` | `--no-archived`: `{ archived: false }` |
| `--key a --key b` | Array | `--assignees member1 --assignees member2`: `{ assignees: ["member1", "member2"] }` |

Arguments are validated against the tool's Zod schema before execution. Invalid arguments print an error and exit with code 1. Values remain strings; numeric and object parameters are not converted. Hyphenated argument names become camelCase; use the schema's underscore names shown in the examples.

### `help`

Prints usage guidance to stderr. Use `help`; root binary dispatch for `--help` and `-h` remains unchanged.

```bash
niftypm-mcp help
```

## Local Auto-Sync

Automatic sync is **off by default**. Only the exact value `NIFTYPM_AUTO_SYNC=true` enables discovery and mutation-triggered mirror updates. Unset, `false`, `TRUE` and other values keep it disabled. Finding a mirror alone gives no consent.

The opt-in applies to Node stdio, Node HTTP and direct CLI tool invocations. Cloudflare Workers do not activate local mirror sync; `.dev.vars` cannot enable mirror filesystem writes.

### How it works

1. With consent, discovery validates `niftypm/*.json` and binds each project to one file.
2. Successful POST, PUT and DELETE requests notify the mutation callback; GET requests do not.
3. Supported legacy endpoints identify tasks, task lists, milestones, labels or project metadata.
4. Agreeing request, response and cached ownership evidence selects the project; conflicts or ambiguous ownership skip sync.
5. The per-file queue covers reading, fetching, validation and writing.
6. Complete validated fetches prepare only the affected section, with supporting reads for task references.
7. A backup and atomic rename commit the update and `meta.last_synced`.

Task updates preserve supporting sections and the existing checklist. Label-only refresh matches existing mirror label IDs against workspace records. It updates names and colours, removes missing IDs and applies the empty-result guard. Task label names refresh during a task or full sync.

### Example workflow

After deployment approval and confirmation of one writer per mirror:

```bash
cd /path/to/your/project
niftypm-mcp init

# Choose one launch mode; do not run these together
NIFTYPM_AUTO_SYNC=true niftypm-mcp
# Node HTTP alternative, bound to loopback
NIFTYPM_AUTO_SYNC=true TRANSPORT=http PORT=8080 niftypm-mcp
```

For a direct CLI write, stop the server writer first. Use a real task ID:

```bash
NIFTYPM_AUTO_SYNC=true niftypm-mcp niftypm_update_task --task_id "task123" --name "Fix login bug"
```

### Key behaviours

- Missing mirror files leave automatic sync inactive silently. Invalid mirrors are skipped with safe diagnostics.
- Duplicate project IDs disable automatic writes for that project. Manual `sync` can explicitly select one duplicate file; only that file changes. Automatic writes remain disabled for the duplicate binding.
- Shared workspace labels need explicit, agreeing project evidence when several mirrors own the same label ID. Ambiguous mutations skip sync.
- Unsupported endpoints and internal-API mutations skip local sync.
- Mirror failures produce safe stderr diagnostics while retaining the successful cloud result. A direct CLI call keeps exit code 0.
- Server requests return without awaiting background sync. Opted-in CLI calls print the cloud result, then await pending mirror work before exit.

## Backups and Writer Limits

Every overwrite creates an adjacent `project.json.<UUID>.bak` containing the exact previous bytes before replacement. Backup creation uses exclusive creation; failure aborts the overwrite. The replacement uses a unique adjacent `project.json.<UUID>.tmp`, also created exclusively, then renamed onto the mirror. Initial creation uses the temporary-file path without a backup.

Rejected fetches or writes leave the original mirror and timestamp unchanged. Failed replacements retain recovery files. Discovery excludes writer `.bak` and `.tmp` files. Backups are never deleted automatically; manage retention after inspecting them.

Run **one writer process per mirror**. The queue serialises only writers using the shared module within one process. Stop the server before manual CLI refreshes. External editors and other processes can race with the writer. Atomic rename provides complete-file visibility; power-loss durability is not guaranteed.

## Troubleshooting and Rollout

1. Stop old writers before relying on `NIFTYPM_AUTO_SYNC=false`; the old implementation ignores the opt-in flag.
2. Inspect any backup before requesting approval to restore it.
3. Check project access, credentials and file permissions after a manual error; `init` and `sync` exit with code 1.
4. Verify complete API results before using `--allow-empty` for an intentional clear.
5. Select a duplicate mirror explicitly with manual `sync`, or resolve duplicate bindings before restarting automatic sync.
6. Obtain deployment or launch-path approval before switching the MCP entry or reloading Pi.
7. Verify the approved entry loads the patched checkout before enabling automatic sync.

This change leaves operator mirrors, the main checkout and Pi MCP configuration untouched. Reloading the existing main-based entry alone keeps the old implementation.

## Local JSON File Format

`buildProjectJson()` in `src/reverse-sync.ts` creates the mirror structure below. This illustrative empty mirror contains no operator data.

```json
{
  "meta": {
    "created": "2024-01-01T00:00:00Z",
    "last_synced": "2024-01-15T12:30:00Z",
    "generated_by": "niftypm-mcp/reverse-sync.ts",
    "project_nice_id": "SYN",
    "niftypm_project_id": "abc123",
    "source": "Live NiftyPM API via niftypm-mcp",
    "notes": "New snapshots leave subtasks empty; overwrites retain local enrichment."
  },
  "project": {
    "name": "My Project",
    "description": "",
    "portfolio": ""
  },
  "labels": [],
  "task_lists": [],
  "milestones": [],
  "tasks": [],
  "_validation_checklist": []
}
```

Mirrors keep legacy `/api/v1.0/tasks` top-level semantics. The regression fixture retains 48 parent tasks and 53 nested local children. A v3 flat task collection would mix those into 101 records. New snapshots do not fetch child details. Legacy string story estimates remain strings; finite numbers and null estimates are also accepted.

Labels and members are fetched at workspace scope without a project filter. Full snapshots select labels referenced by project tasks.

Collection reads validate endpoint-specific wrappers:

| Collection | Accepted response | Completion |
| --- | --- | --- |
| Tasks | `{ tasks, hasMore }` | Required boolean `hasMore` |
| Projects | `{ projects, hasMore }` or `{ items, hasMore }` | Required boolean `hasMore` |
| Milestones | `{ items, hasMore }` | Required boolean `hasMore`; both variants fetched |
| Labels, task groups | `{ items }`, optionally with `hasMore` | Boolean flag if present; otherwise a short page |
| Members | Bare unpaginated array or `{ items, has_more: false }` | Sole bare-array exception; continuation is unsupported |

Other bare API arrays, mixed collection keys and invalid records are rejected. Paginated reads use limit 100 and advance offset by returned row count. Repeated IDs, failed later pages or empty pages claiming more results reject the whole update.

See the [Workflow Guide](workflow.md) for the JSON planning workflow.

## Related

- [Workflow Guide](workflow.md): JSON planning and reverse sync
- [Configuration Guide](configuration.md): credentials and transport
- [Tool Guide](tools.md): available MCP tools
- [TDR-002](../tdr/002-safe-local-mirror-sync.md): mirror clobbering diagnosis and regression evidence
- [TDR-001](../tdr/001-legacy-document-read-403.md): the separate v3 document-read fix
