## Why

Every NiftyPM MCP mutation (create/update/delete) hits the live API and returns — the local project JSON (the source-of-truth per s-niftypm Rule 5/5b) is left stale until someone manually runs `reverse-sync.py`. There is also no CLI interface: the `niftypm-mcp` binary only starts the MCP server, so developers cannot run one-off tool calls or initialise a local project JSON from the command line. We need both: a CLI for direct tool access + `init`, and automatic local JSON sync on every mutation so the offline copy is always current.

## What Changes

- **CLI subcommand dispatch** — `niftypm-mcp` with no args starts the MCP server (unchanged). With a subcommand, it runs as a CLI tool.
- **`niftypm-mcp init`** — interactive wizard: lists NiftyPM projects, user selects one, fetches all entities, writes `niftypm/<project-name>.json` to `process.cwd()`.
- **`niftypm-mcp sync`** — manual full re-sync of an existing local JSON from the live API.
- **`niftypm-mcp <tool-name> [args]`** — call any registered MCP tool directly from the CLI with `--key value` args. Output is JSON to stdout (pipeable).
- **Auto-sync on mutation** — when running as MCP server, the server auto-discovers `niftypm/*.json` files relative to `cwd`, reads `meta.niftypm_project_id` from each, and after every successful POST/PUT/DELETE refetches the affected entity type and updates the corresponding JSON section in-place. Also updates `meta.last_synced`.
- **TypeScript reverse-sync** — port `reverse-sync.py` transform logic to TypeScript so `init`, `sync`, and auto-sync share the same code path.
- **Mutation hook in client** — `NiftyPMClient` gains an optional `onMutation` callback fired after successful mutations. Wired in the Node.js entry points (stdio server, HTTP server and direct CLI tool calls), never in Cloudflare Workers.

## Capabilities

### New Capabilities
- `cli-interface`: Subcommand dispatch, `init` wizard, `sync` command, and direct tool invocation from the command line.
- `local-sync`: Auto-discovery of local project JSON files, mutation interception, targeted entity refetch, and in-place JSON section updates.

### Modified Capabilities
<!-- No existing spec-level requirements are changing. The client and config changes are implementation details, not spec-level behaviour changes. -->

## Impact

- **New files**: `src/cli.ts`, `src/local-sync.ts`, `src/reverse-sync.ts`
- **Modified files**: `src/index.ts` (subcommand dispatch + auto-sync wiring), `src/client.ts` (onMutation callback), `src/config.ts` (no new config — auto-discovery is cwd-relative)
- **No new dependencies** — uses `process.argv` parsing and existing Zod schemas for CLI arg validation
- **Cloudflare Workers** — unaffected; local sync and CLI are Node.js-only features, `worker.ts` unchanged
- **Existing `reverse-sync.py`** — remains as-is; the TypeScript port is a parallel implementation sharing the same output schema
- **s-niftypm skill** — will need a Rule 5c update documenting the auto-sync behaviour (separate follow-up)
