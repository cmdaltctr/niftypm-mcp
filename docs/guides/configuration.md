# Configuration and Deployment

This guide contains setup details that are intentionally kept out of the lean README.

## Environment variables

Required OAuth credentials:

| Variable | Purpose |
| --- | --- |
| `NIFTYPM_CLIENT_ID` | OAuth client ID. |
| `NIFTYPM_CLIENT_SECRET` | OAuth client secret. |
| `NIFTYPM_ACCESS_TOKEN` | Bearer token used for NiftyPM API requests. |
| `NIFTYPM_REFRESH_TOKEN` | Refresh token used for auto-refresh and manual refresh. |

Optional transport variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `TRANSPORT` | `stdio` | Set to `http` to run a local HTTP stream transport. |
| `PORT` | `8080` | Local HTTP port when `TRANSPORT=http`. |
| `MCP_AUTH_SECRET` | unset | Required by the Cloudflare Workers entry point. |

## Tool toggles
Each domain can be disabled by setting its flag to `false`:

```dotenv
ENABLE_FILES=false
ENABLE_LABELS=false
ENABLE_DOCUMENTS=false
ENABLE_MILESTONES=false
ENABLE_MESSAGES=false
ENABLE_TASK_GROUPS=false
ENABLE_TASKS=false
ENABLE_SUBTEAMS=false
ENABLE_PROJECTS=false
ENABLE_FOLDERS=false
ENABLE_MEMBERS=false
ENABLE_WEBHOOKS=false
ENABLE_TIME=false
ENABLE_FIELDS=false
ENABLE_APPS=false
ENABLE_CHAT=false
ENABLE_INVITE=false
ENABLE_TEMPLATES=false
ENABLE_USERS=false
ENABLE_AUTH=false
```

## Local stdio

```bash
bun run start
```

For watch mode:
```bash
bun run dev
```

## Local HTTP stream

```bash
TRANSPORT=http PORT=8080 bun run start
```

## Cloudflare Workers

```bash
bun run cf:dev
bun run cf:deploy
```

For production Workers secrets:

```bash
wrangler secret put NIFTYPM_ACCESS_TOKEN
wrangler secret put NIFTYPM_REFRESH_TOKEN
wrangler secret put NIFTYPM_CLIENT_ID
wrangler secret put NIFTYPM_CLIENT_SECRET
wrangler secret put MCP_AUTH_SECRET
```

## Claude Desktop example

```json
{
  "mcpServers": {
    "niftypm": {
      "command": "bun",
      "args": ["run", "/absolute/path/to/niftypm-mcp/src/index.ts"],
      "env": {
        "NIFTYPM_CLIENT_ID": "your_client_id_here",
        "NIFTYPM_CLIENT_SECRET": "your_client_secret_here",
        "NIFTYPM_ACCESS_TOKEN": "your_access_token_here",
        "NIFTYPM_REFRESH_TOKEN": "your_refresh_token_here"
      }
    }
  }
}
```

## OpenCode file-secret example

```json
{
  "mcp": {
    "niftypm": {
      "type": "local",
      "command": ["bun", "run", "/absolute/path/to/niftypm-mcp/src/index.ts"],
      "environment": {
        "NIFTYPM_CLIENT_ID": "{file:/absolute/path/to/niftypm-mcp/.secrets/client_id}",
        "NIFTYPM_CLIENT_SECRET": "{file:/absolute/path/to/niftypm-mcp/.secrets/client_secret}",
        "NIFTYPM_ACCESS_TOKEN": "{file:/absolute/path/to/niftypm-mcp/.secrets/access_token}",
        "NIFTYPM_REFRESH_TOKEN": "{file:/absolute/path/to/niftypm-mcp/.secrets/refresh_token}"
      },
      "enabled": true
    }
  }
}
```
