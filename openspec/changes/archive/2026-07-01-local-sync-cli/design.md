## Context

The `niftypm-mcp` server currently has a single entry point (`src/index.ts`) that starts an MCP server over stdio or HTTP. All API calls flow through `NiftyPMClient.request()` — a single chokepoint in `src/client.ts:94-144`. The `bin` field in `package.json` points to `dist/index.js`.

The s-niftypm skill defines a JSON project plan format (produced by `reverse-sync.py`) that serves as the local source-of-truth. These files live per-project, e.g. `llamaindex-rag-mcp/niftypm/llamaindex-rag-mcp.json`. The skill has Rule 5 (JSON-first planning) and Rule 5b (manual reverse-sync), but no mechanism for automatic sync on mutations.

There is no CLI framework — the binary just starts the server. No subcommand parsing exists.

## Goals / Non-Goals

**Goals:**
- Add CLI subcommand dispatch to the existing `niftypm-mcp` binary (no new binary)
- `init` command: interactive project selection → fetch all entities → write local JSON
- `sync` command: manual full re-sync of existing local JSON
- Direct tool invocation: `niftypm-mcp <tool-name> --key value` → JSON output to stdout
- Auto-sync: after every successful mutation via MCP or CLI, update the affected section in the local JSON file
- Zero new dependencies — use `process.argv` parsing and existing Zod schemas
- Cloudflare Workers entry point (`worker.ts`) remains unchanged

**Non-Goals:**
- Replacing `reverse-sync.py` — the Python script remains for skill-based workflows; the TS port is a parallel implementation
- Syncing entities not in the JSON schema (documents, files, messages, webhooks, etc.) — only tasks, task_lists, milestones, labels, and project metadata are synced
- Multi-project sync in a single directory — one JSON file per project, auto-discovered
- Real-time push notifications or webhooks to external systems
- Git auto-commit of synced JSON files

## Decisions

### D1: Single binary with argv dispatch (not separate CLI binary)

**Choice**: Keep one `bin` entry in `package.json`. Check `process.argv[2]` at startup — if it matches a subcommand or tool name, run CLI mode; otherwise start the MCP server.

**Alternatives considered**:
- Separate `niftypm` bin entry → rejected: adds complexity to package.json, users would need to know two commands
- `commander`/`yargs` dependency → rejected: unnecessary for our needs, `process.argv` + Zod validation is sufficient

### D2: Auto-discovery via cwd (not env var)

**Choice**: The server scans `process.cwd()/niftypm/*.json` at startup, reads `meta.niftypm_project_id` from each file, and builds a `project_id → filepath` map. No env var needed.

**Rationale**: MCP clients (Cursor, Windsurf, Claude Code) start the server with `cwd` set to the project root. The `niftypm/` directory naturally lives there. This is the same convention as `.env` and `.secrets/`.

**Alternatives considered**:
- `NIFTYPM_LOCAL_SYNC_DIR` env var → rejected: extra configuration step, users would need to set it per-project
- Hardcoded path → rejected: each project has its own `niftypm/` directory

### D3: Targeted refetch (not full reverse-sync on every mutation)

**Choice**: After a mutation, determine the entity type from the endpoint URL, refetch only that entity type for the affected project, and update only that section in the JSON.

**Endpoint → entity mapping**:
| URL pattern | JSON section | Refetch call |
|---|---|---|
| `/api/v1.0/tasks*` | `tasks` | `GET /tasks?project_id=X` |
| `/api/v1.0/taskgroups*` | `task_lists` | `GET /taskgroups?project_id=X` |
| `/api/v1.0/milestones*` | `milestones` | `GET /milestones?project_id=X` + `GET /milestones?project_id=X&is_list=true` |
| `/api/v1.0/labels*` | `labels` | `GET /labels?project_id=X` |
| `/api/v1.0/projects/{id}` | `project` | `GET /projects/{id}` |

**Alternatives considered**:
- Full 6-call reverse-sync on every mutation → rejected: too many API calls for a single task update
- JSONL audit log only → rejected: user explicitly wants entity-mirror format matching `reverse-sync.py` output

### D4: Project ID resolution chain

**Choice**: Determine which project was affected by a mutation using this priority chain:
1. **Response body** — look for `project` or `project_id` field (works for most create/update responses)
2. **Request body** — look for `project_id` field (works for taskgroup/milestone/label creates)
3. **Local JSON scan** — search existing JSON files for the entity ID extracted from the URL path (works for updates/deletes where we know the entity ID)
4. **Skip silently** — if project can't be determined, log to stderr and continue

### D5: Non-blocking async sync

**Choice**: The `onMutation` callback fires asynchronously after the tool response is returned to the MCP client. The sync runs in the background — it never blocks the tool response and never throws into the calling context.

**Rationale**: The user's primary action (the tool call) must complete immediately. The sync is a best-effort background operation. Failures log to stderr but don't affect the tool result.

### D6: CLI arg parsing with Zod

**Choice**: Parse `--key value` pairs from `process.argv` into a plain object, then validate against the tool's Zod schema. Arrays use repeated flags (`--labels id1 --labels id2`). Booleans use `--flag` or `--no-flag`.

**Alternatives considered**:
- JSON string arg (`--args '{"name":"..."}'`) → rejected: poor UX, not pipe-friendly
- Positional args → rejected: tool schemas have too many optional fields for positional mapping

### D7: TypeScript reverse-sync port

**Choice**: Port the transform logic from `reverse-sync.py` to a TypeScript module (`src/reverse-sync.ts`) that is shared by `init`, `sync`, and auto-sync. Same output schema, same field mappings.

**Rationale**: The Python script is a standalone tool used by the skill workflow. The TS port is needed for the server's auto-sync and CLI commands. Both produce the same JSON format. Maintaining both is acceptable — the Python script is stable and rarely changes.

## Risks / Trade-offs

- **[Extra API calls on every mutation]** → Mitigated: targeted refetch (1-2 calls) is minimal overhead. Only fires for POST/PUT/DELETE, not GETs. Disabled entirely if no `niftypm/*.json` files found in cwd.
- ** [Race conditions on JSON file]** → Mitigated: use synchronous file writes (`writeFileSync`) for the JSON update to avoid interleaved writes. The MCP server is single-threaded (stdio), so concurrent mutations are serialised.
- **[Project ID resolution failure]** → Mitigated: skip silently with stderr log. The mutation still succeeds on the API; only the local sync is skipped. User can run `niftypm-mcp sync` manually to catch up.
- **[CLI arg parsing edge cases]** → Mitigated: Zod validation catches type errors. Unknown args are ignored. If validation fails, print the Zod error and exit(1).
- **[Local JSON drift if sync fails repeatedly]** → Mitigated: `meta.last_synced` timestamp lets agents detect staleness. `niftypm-mcp sync` does a full re-sync as a recovery path.
- **[Workers incompatibility]** → Mitigated: local sync code is only imported in `index.ts`, never in `worker.ts`. The `onMutation` callback is optional — `undefined` in Workers mode.
