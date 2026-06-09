# NiftyPM MCP Server

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server for the [NiftyPM](https://niftypm.com) project management API.

It lets AI assistants use NiftyPM projects, tasks, documents, files, milestones, messages, labels, portfolios, webhooks, time tracking, custom fields, and related workspace resources through typed MCP tools.

## Highlights

- Local `stdio` server for desktop MCP clients.
- Optional HTTP stream transport for local testing.
- Cloudflare Workers entry point for hosted/remote use.
- OAuth bearer-token API client with in-memory token refresh on `401`.
- Zod-validated tool parameters.
- Per-domain tool toggles through `ENABLE_*` environment variables, plus
  per-tool granularity via `DISABLED_TOOLS`.

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

### Configurator UI

The easiest setup path is the static configurator at [`ui/index.html`](ui/index.html):

1. Open `ui/index.html` directly in a browser.
2. Paste your OAuth credentials.
3. Switch between **Simple** (domain-level toggles) and **Advanced** (per-tool toggle table) tabs.
4. Click **Download `.env`**.
5. Rename it to `.env`, place it in the project root, and restart your MCP client.

The configurator runs entirely in your browser. It makes no network requests and does not send secrets anywhere.

The **Simple** tab shows 20 domain-level switches (core + extended). The
**Advanced** tab gives you per-tool control — disable individual tools
within an enabled domain, down to a single unwanted operation. The
generated `.env` is auto-loaded on server start.

### Manual `.env` setup

You can also copy the example env file and fill in your OAuth credentials by hand:

```bash
cp .env.example .env
```

```dotenv
NIFTYPM_CLIENT_ID=your_client_id_here
NIFTYPM_CLIENT_SECRET=your_client_secret_here
NIFTYPM_ACCESS_TOKEN=your_access_token_here
NIFTYPM_REFRESH_TOKEN=your_refresh_token_here
```

`NIFTYPM_REFRESH_TOKEN` is the OAuth refresh token for automatic `401` recovery. It is required for stable connections — without it, every access-token expiry forces manual re-authorisation.

### How to obtain the refresh token

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
.secrets/client_id
.secrets/client_secret
.secrets/access_token
.secrets/refresh_token
```

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
