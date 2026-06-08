# NiftyPM MCP Server

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server for the [NiftyPM](https://niftypm.com) project management API.

It lets AI assistants use NiftyPM projects, tasks, documents, files, milestones, messages, labels, portfolios, webhooks, time tracking, custom fields, and related workspace resources through typed MCP tools.

## Highlights

- Local `stdio` server for desktop MCP clients.
- Optional HTTP stream transport for local testing.
- Cloudflare Workers entry point for hosted/remote use.
- OAuth bearer-token API client with in-memory token refresh on `401`.
- Zod-validated tool parameters.
- Per-domain tool toggles through `ENABLE_*` environment variables.

## Requirements

- Node.js 20+
- Bun 1.1+
- NiftyPM OAuth credentials:
  - `NIFTYPM_CLIENT_ID`
  - `NIFTYPM_CLIENT_SECRET`
  - `NIFTYPM_ACCESS_TOKEN`
  - `NIFTYPM_REFRESH_TOKEN`

## Install
```bash
git clone https://github.com/cmdaltctr/niftypm-mcp.git
cd niftypm-mcp
bun install
```

## Configure

Copy the example env file and fill in your OAuth credentials:

```bash
cp .env.example .env
```

```dotenv
NIFTYPM_CLIENT_ID=your_client_id_here
NIFTYPM_CLIENT_SECRET=your_client_secret_here
NIFTYPM_ACCESS_TOKEN=your_access_token_here
NIFTYPM_REFRESH_TOKEN=your_refresh_token_here
```

For OpenCode/local work, file-based secrets are recommended to avoid token truncation. See [Configuration and Deployment](docs/guides/configuration.md).

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

## Tool domains

The server groups tools by NiftyPM resource domain:

- Projects, portfolios/subteams, members
- Task groups, tasks, subtasks, labels, custom fields
- Documents, files, messages, chat
- Milestones, time tracking, webhooks
- Apps, templates, invite links, current user, auth helpers

For detailed tool names and examples, see [Tool Guide](docs/guides/tools.md).
## Example tool calls

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
## Documentation

- [Configuration and Deployment](docs/guides/configuration.md)
- [Tool Guide](docs/guides/tools.md)
- [API Coverage](docs/guides/api-coverage.md)
- [Migration Guide](docs/guides/migration.md)

## Development

```bash
bun run vitest run
bun run build
```

## Project layout

```text
src/              MCP server, API client, and tool registrations
test/             Vitest tests
docs/guides/      User-facing guides and reference docs
docs/api/         Upstream OpenAPI source files
docs/security/    Security audit notes
```

## Licence

MIT. See [LICENSE](LICENSE).
