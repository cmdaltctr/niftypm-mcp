# NiftyPM MCP Server: v3 Document Reads and Safe Local Mirrors

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server for the [NiftyPM](https://niftypm.com) project management API, with v3 document metadata and Markdown reads.

AI assistants can use projects, tasks, documents and other workspace resources through typed MCP tools. Document lists and writes, mirror sync and most tools retain legacy v1 endpoints. Folder tools use v2. Local mirrors use validated fetches, backups and atomic replacement; automatic sync requires explicit opt-in.

## Highlights

- Local `stdio` server for desktop MCP clients.
- CLI subcommands: `init` (bootstrap local JSON), `sync` (re-sync from API), direct tool invocation.
- Local auto-sync: off by default; only `NIFTYPM_AUTO_SYNC=true` enables mutation-triggered mirror updates.
- Optional HTTP stream transport for local testing.
- Cloudflare Workers entry point for hosted/remote use.
- API-token-first auth: NiftyPM personal access token (`nft_user_…`) as primary, OAuth as fallback.
- Zod-validated tool parameters.
- Per-domain tool toggles through `ENABLE_*` environment variables, plus
  per-tool granularity via `DISABLED_TOOLS`.

## Requirements

- Node.js 20+
- Bun 1.1+
- A NiftyPM **personal access token** (`nft_user_…`) — the recommended credential.
  See [API token setup](#api-token-recommended) below.
- _Optional_ — OAuth credentials (`NIFTYPM_CLIENT_ID`, `NIFTYPM_CLIENT_SECRET`,
  `NIFTYPM_ACCESS_TOKEN`, `NIFTYPM_REFRESH_TOKEN`) as a fallback when no API
  token is set.

## Install

```bash
git clone https://github.com/cmdaltctr/niftypm-mcp.git
cd niftypm-mcp
bun install
```

## Configure

### Configurator UI

The easiest setup path is the static configurator at [`ui/index.html`](ui/index.html):

1. Open `ui/index.html` directly in a browser.
2. Paste your API token (recommended) or OAuth credentials.
3. Switch between **Simple** (domain-level toggles) and **Advanced** (per-tool toggle table) tabs.
4. Click **Download `.env`**.
5. Rename it to `.env`, place it in the project root, and restart your MCP client.

The configurator runs entirely in your browser. It makes no network requests and does not send secrets anywhere.

The **Simple** tab shows 21 domain-level switches (core + extended + checklists). The
**Advanced** tab gives you per-tool control — disable individual tools
within an enabled domain, down to a single unwanted operation. The
generated `.env` is auto-loaded on server start.

### API token (recommended)

The simplest and most stable auth path is a NiftyPM **personal access token** (`nft_user_…`). One token replaces the entire OAuth credential set and never needs a refresh dance.

1. In NiftyPM, open **Settings → MCP & AI assistants → API tokens**.
2. Create a token with **Full access** (or **Custom** with the write actions you need — this MCP creates/updates/deletes across domains, so **Read-only will reject writes**).
3. Set an expiry of up to 365 days. Shorter lifetimes are safer; you can rotate or revoke anytime from the same UI (revocation takes effect within ~1 minute).
4. Put the token in your `.env`:

```dotenv
NIFTYPM_API_TOKEN=nft_user_your_token_here
```

When `NIFTYPM_API_TOKEN` is set, the OAuth credentials below are ignored. On a `401` the server surfaces an actionable error pointing you back to the token-management UI — there is no refresh mechanism for personal tokens, and none is needed.

### Manual `.env` setup

Copy the example env file and fill in your API token (or OAuth credentials as a fallback):

```bash
cp .env.example .env
```

**API token (recommended):**

```dotenv
NIFTYPM_API_TOKEN=nft_user_your_token_here
```

When `NIFTYPM_API_TOKEN` is set, all OAuth variables are ignored.

**OAuth (fallback):**

```dotenv
NIFTYPM_CLIENT_ID=your_client_id_here
NIFTYPM_CLIENT_SECRET=your_client_secret_here
NIFTYPM_ACCESS_TOKEN=your_access_token_here
NIFTYPM_REFRESH_TOKEN=your_refresh_token_here
```

`NIFTYPM_REFRESH_TOKEN` is only needed in OAuth fallback mode for automatic `401` recovery. With an API token, there is no refresh mechanism — on `401` the server surfaces an actionable error pointing you back to the token-management UI.

### How to obtain the OAuth refresh token

Use NiftyPM's OAuth authorisation-code flow:

1. Create or use a NiftyPM OAuth app and note its client ID, client secret, and redirect URI.
2. Open the app's authorisation URL in a browser and approve access.
3. Copy the `code` value from the callback URL sent to your redirect URI.
4. Exchange that code for tokens with `POST https://openapi.niftypm.com/oauth/token`.

Example token exchange:

```bash
curl -X POST https://openapi.niftypm.com/oauth/token \
  -H "Authorization: Basic $(printf '%s:%s' "$NIFTYPM_CLIENT_ID" "$NIFTYPM_CLIENT_SECRET" | base64)" \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "authorization_code",
    "code": "AUTHORIZATION_CODE_FROM_CALLBACK",
    "redirect_uri": "YOUR_REDIRECT_URI"
  }'
```

The response includes both `access_token` and `refresh_token`. Store them as `NIFTYPM_ACCESS_TOKEN` and `NIFTYPM_REFRESH_TOKEN`.

### Manual `.secrets/` option

For OpenCode or local setups, you may store credentials in `.secrets/` files instead of `.env`:

```text
.secrets/api_token        (recommended — primary credential, see below)
.secrets/client_id        (fallback — only used when api_token is absent)
.secrets/client_secret    (fallback)
.secrets/access_token     (fallback)
.secrets/refresh_token    (fallback)
.secrets/team_token       (optional — needed for checklist write operations)
```

### Checklist setup (optional)

Checklist tools use NiftyPM's internal API (`api.niftypm.com`) which requires a **team token** — a separate credential from the OAuth access token. Without it, checklist reads work but writes (create/update/delete) return 401.

To obtain the team token:

1. Log into your NiftyPM workspace in a browser.
2. Open DevTools Console (F12 → Console).
3. Run this one-liner:
   ```javascript
   JSON.parse(decodeURIComponent(document.cookie.match(/nifty_auth=([^;]+)/)[1])).teamToken;
   ```
4. Save the output using one of these methods:

   **Option A — `.secrets/` file** (recommended for local/OpenCode setups):

   ```bash
   echo "PASTE_TOKEN_HERE" > .secrets/team_token
   ```

   **Option B — `.env` or environment variable:**

   ```bash
   # In .env:
   NIFTYPM_TEAM_TOKEN=PASTE_TOKEN_HERE
   ```

The team token has a long expiry (months). If checklist operations start returning 401, repeat the extraction.

The UI configurator remains the easiest path because it generates a complete `.env` by copy-paste and download. See [Configuration and Deployment](docs/guides/configuration.md) for more deployment details.

## Run locally

```bash
bun run start
```

Watch mode:

```bash
bun run dev
```

HTTP stream mode:

```bash
TRANSPORT=http PORT=8080 bun run start
```

## Deploy to Cloudflare Workers

```bash
bun run cf:dev
bun run cf:deploy
```

Worker access is protected by `MCP_AUTH_SECRET`. Store production values with `wrangler secret put`.

```bash
wrangler secret put NIFTYPM_API_TOKEN       # recommended
wrangler secret put MCP_AUTH_SECRET
# OAuth fallback (only if not using an API token):
# wrangler secret put NIFTYPM_CLIENT_ID
# wrangler secret put NIFTYPM_CLIENT_SECRET
# wrangler secret put NIFTYPM_ACCESS_TOKEN
# wrangler secret put NIFTYPM_REFRESH_TOKEN
```

## Tool domains

The server groups tools by NiftyPM resource domain:

- Projects, portfolios/subteams, members
- Task groups, tasks, subtasks, labels, custom fields
- Checklists and checklist items (requires team token — see [Checklist setup](#checklist-setup-optional))
- Documents, files, messages, chat
- Milestones, time tracking, webhooks
- Apps, templates, invite links, current user, auth helpers

For detailed tool names and examples, see [Tool Guide](docs/guides/tools.md).

## Project Planning Workflow

The most effective way to populate complex projects is using a **JSON-first planning workflow**. Instead of making ad-hoc tool calls, define your project structure (milestones, labels, tasks, dependencies) in a JSON file first. This serves as the source of truth, allowing you to validate relationships and ensure tasks have required fields (like story points and real subtasks) before making any API calls to NiftyPM.

For details on executing this four-phase pipeline, see the [Workflow Guide](docs/guides/workflow.md).

## AI Agent Skills

The `SKILLS/` folder contains drop-in agent skill instructions that teach AI coding assistants (Claude Code, OpenCode, Cursor, etc.) how to use this MCP server effectively — including the JSON-first project planning workflow, the four-phase execution pipeline, and NiftyPM best practices.

Copy the `SKILLS/s-niftypm/` folder to the appropriate location for your AI client:

| AI Client       | Destination path                                           |
| --------------- | ---------------------------------------------------------- |
| **Claude Code** | `~/.claude/skills/s-niftypm/`                              |
| **OpenCode**    | `~/.config/opencode/skills/s-niftypm/`                     |
| **Cursor**      | `~/.cursor/rules/` (then wrap `SKILL.md` in a `.mdc` rule) |
| **Other**       | Check your client's docs for a skills/rules directory      |

Example (Claude Code / OpenCode):

```bash
# From inside the cloned repo
cp -r SKILLS/s-niftypm ~/.claude/skills/
# or for OpenCode
cp -r SKILLS/s-niftypm ~/.config/opencode/skills/
```

Once installed, your AI agent will automatically load the `s-niftypm` skill when working with NiftyPM MCP tools and follow the JSON-first planning workflow by default.

## Example tool calls

Read document metadata, with optional related records. Replace placeholder IDs with your resource IDs.

```json
{
  "tool": "niftypm_get_document",
  "arguments": {
    "document_id": "document_id_here",
    "expand": ["project", "author"]
  }
}
```

Read its Markdown body separately:

```json
{
  "tool": "niftypm_get_document_content",
  "arguments": { "document_id": "document_id_here" }
}
```

The content response preserves `format`, `content`, `truncated`, `byteSize` and `lossy`. Check `truncated` for incomplete content and `lossy` for formatting loss. Both read tools require IDs matching `^[0-9A-Za-z_!]+$`; hyphens are rejected.

Create a task:

```json
{
  "tool": "niftypm_create_task",
  "arguments": {
    "name": "Prepare fellowship report",
    "task_group_id": "task_group_id_here",
    "description": "Draft the report outline."
  }
}
```

Create a related subtask by passing the parent task ID as `task_id`:

```json
{
  "tool": "niftypm_create_task",
  "arguments": {
    "name": "Collect reviewer feedback",
    "task_group_id": "task_group_id_here",
    "task_id": "parent_task_id_here"
  }
}
```

## Compatibility

| Operation | API contract |
| --- | --- |
| Document metadata and body reads | `/api/v3/documents/{id}` and `/api/v3/documents/{id}/content` |
| Document lists, writes and other document operations | Legacy `/api/v1.0/docs` routes |
| Mirror collections and most other public tools | Legacy `/api/v1.0` routes |
| Folders | `/api/v2.0/folders` routes |
| Checklists | NiftyPM's internal API |

**Breaking changes:** `niftypm_get_document` returns raw camelCase v3 metadata. Automatic mirror sync now defaults to off.

1. Update callers that expect legacy metadata fields.
2. Use `niftypm_get_document_content` for the document body.
3. Establish one writer per mirror before enabling `NIFTYPM_AUTO_SYNC=true`.

Create, personal-create and update document tools retain optional `z.record` object-content schemas. Supply native JSON objects; strings, arrays and `null` are rejected by those schemas. The version-change tool retains its separate string contract.

Mirror sync keeps legacy top-level tasks and string story estimates. Retained task IDs keep local enrichment, including nested subtasks. New snapshots do not fetch child details.

See [ADR-001](docs/adr/001-v3-document-access-and-safe-mirror-sync.md) for the decision, [TDR-001](docs/tdr/001-legacy-document-read-403.md) for the document diagnosis and [TDR-002](docs/tdr/002-safe-local-mirror-sync.md) for mirror safeguards. The [Migration Guide](docs/guides/migration.md) covers the earlier tool expansion; use this section for these breaking changes.

When upgrading from an earlier version, stop the running server first. Versions before this change ignore `NIFTYPM_AUTO_SYNC`, so an old process can still write mirrors. Restart your MCP client and confirm it runs this version before enabling automatic sync.

## CLI Usage

The `niftypm-mcp` binary supports CLI subcommands in addition to starting the MCP server. This is useful for bootstrapping local project JSON files, re-syncing from the live API, and calling tools directly from the command line.

### `niftypm-mcp init`

Interactive wizard that validates the complete project list, lets you select a project, and fetches its legacy mirror collections. It creates `niftypm/<project-name>.json` in the current working directory through an atomic rename. Existing targets require confirmation and a matching project ID; overwrites also receive an exact backup.

```bash
cd /path/to/your/project
niftypm-mcp init
```

### `niftypm-mcp sync`

Re-syncs a selected local mirror using `meta.niftypm_project_id`. Complete, validated fetches refresh API-owned fields while preserving `meta.created`, custom top-level keys and retained-task enrichment. Each overwrite backs up the original bytes before atomic replacement.

Manual `init` and `sync` work independently of `NIFTYPM_AUTO_SYNC`. A populated collection becoming empty stops the overwrite. After verifying an intentional clear, use `niftypm-mcp sync --allow-empty` or confirmed `niftypm-mcp init --allow-empty`. This boolean flag permits complete, validated empty results only; every other check remains active. New mirrors and already-empty sections accept valid empty results without it.

```bash
cd /path/to/your/project
niftypm-mcp sync
```

### Direct tool invocation

Any registered MCP tool can be called directly from the CLI. Arguments are parsed as `--key value` pairs:

```bash
niftypm-mcp niftypm_get_document --document_id "document_id_here"
niftypm-mcp niftypm_get_document_content --document_id "document_id_here"
niftypm-mcp niftypm_list_tasks --project_id "abc123"
niftypm-mcp niftypm_create_task --name "Fix bug" --task_group_id "abc123"
niftypm-mcp niftypm_list_tasks --project_id "abc123" --completed
```

- Repeated flags produce arrays: `--label lab1 --label lab2`
- Boolean flags: `--completed` (true), `--no-archived` (false)

### Local auto-sync

Automatic sync is **off by default**. Only the exact value `NIFTYPM_AUTO_SYNC=true` enables discovery and mutation-triggered updates in Node stdio, Node HTTP and direct CLI tools. Unset, `false`, `TRUE` and other values keep it disabled. Cloudflare Workers omit local filesystem sync.

After deployment approval, select one server launch mode:

```bash
cd /path/to/your/project
NIFTYPM_AUTO_SYNC=true niftypm-mcp
# Node HTTP alternative
NIFTYPM_AUTO_SYNC=true TRANSPORT=http PORT=8080 niftypm-mcp
```

- Supported successful POST, PUT and DELETE operations trigger scoped refreshes. Supporting reads resolve task references without replacing unrelated sections.
- Duplicate project mirrors disable automatic writes for that project. Conflicting ownership evidence or ambiguous shared-label ownership skips sync.
- Automatic updates cannot clear populated collections. Rejected operations preserve mirror bytes and `meta.last_synced`.
- Each overwrite creates an exact adjacent `project.json.<UUID>.bak`, then renames a unique `.tmp` onto the mirror. Backup failure aborts replacement. Backups require operator-managed retention.
- The shared per-file queue covers reading, fetching and writing within one process. Run **one writer process per mirror**. Stop the server before manual CLI refreshes or edits.
- Server requests return without awaiting mirror work. Direct CLI tools await their pending mirror work before exit. Local failures retain the successful cloud result and produce safe stderr diagnostics.

For an opted-in direct CLI mutation, stop the server writer first. Replace `task_id_here` with your task ID:

```bash
NIFTYPM_AUTO_SYNC=true niftypm-mcp niftypm_update_task --task_id "task_id_here" --name "Updated task name"
```

Atomic rename provides complete-file visibility. Cross-process exclusion and power-loss durability are outside this guarantee. See the [CLI Guide](docs/guides/cli.md#backups-and-writer-limits) for recovery steps and path checks.

## Documentation

- [Documentation Index](docs/guides/index.md)
- [Architecture Decision Records](docs/adr/ADR_README.md)
- [Technical Decision Records](docs/tdr/README.md)
- [CLI Guide](docs/guides/cli.md)
- [Configuration and Deployment](docs/guides/configuration.md)
- [Tool Guide](docs/guides/tools.md)
- [API Coverage](docs/guides/api-coverage.md)
- [Migration Guide](docs/guides/migration.md)
- [Workflow Guide](docs/guides/workflow.md)

## Development

```bash
bun run vitest run
bun run build
```

## Project layout

```text
src/              MCP server, API client, and tool registrations
test/             Vitest tests
docs/guides/      Documentation index, guides and reference docs
docs/adr/         Architecture decisions and index
docs/tdr/         Technical findings and regression evidence
docs/api/         Upstream OpenAPI source files
docs/security/    Security audit notes
```

## Licence

MIT. See [LICENSE](LICENSE).
