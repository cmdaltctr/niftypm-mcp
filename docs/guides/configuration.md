# Configuration and Deployment

This guide contains setup details that are intentionally kept out of the lean README.

## Environment variables

Required OAuth credentials:

| Variable | Purpose |
| --- | --- |
| `NIFTYPM_CLIENT_ID` | OAuth client ID. |
| `NIFTYPM_CLIENT_SECRET` | OAuth client secret. |
| `NIFTYPM_ACCESS_TOKEN` | Bearer token used for NiftyPM API requests. |
| `NIFTYPM_REFRESH_TOKEN` | OAuth refresh token for automatic `401` recovery. Required for stable connections. |

## How to get the refresh token

The refresh token comes from NiftyPM's **OAuth 2.0 authorisation-code flow**. It is not an API key and it is not the same as the access token.

The sequence is:

1. **Create a NiftyPM app**

   NiftyPM gives you:

   - `Client ID`
   - `Client Secret`
   - `Authorize URL`
   - `Redirect URL`

2. **Open the Authorize URL**

   Example:

   ```text
   https://nifty.pm/authorize?response_type=code&client_id=CLIENT_ID_HERE&redirect_uri=https://127.0.0.1/callback&scope=project%20task%20file
   ```

3. **NiftyPM redirects you back with a temporary `code`**

   Example:

   ```text
   https://127.0.0.1/callback?code=EXAMPLE_AUTH_CODE_FROM_NIFTYPM_CALLBACK
   ```

4. **Exchange that code for tokens**

   Call NiftyPM's token endpoint:

   ```bash
   curl -X POST "https://openapi.niftypm.com/oauth/token" \
     -H "Content-Type: application/json" \
     -H "Authorization: Basic base64(CLIENT_ID:CLIENT_SECRET)" \
     -d '{
       "grant_type": "authorization_code",
       "code": "AUTH_CODE_FROM_REDIRECT",
       "redirect_uri": "https://127.0.0.1/callback"
     }'
   ```

   In a real shell, replace `base64(CLIENT_ID:CLIENT_SECRET)` with the Base64-encoded `CLIENT_ID:CLIENT_SECRET` pair, for example:

   ```bash
   printf '%s:%s' "$NIFTYPM_CLIENT_ID" "$NIFTYPM_CLIENT_SECRET" | base64
   ```

5. **Store the returned tokens**

   NiftyPM returns:

   - `access_token`
   - `refresh_token`
   - `token_type`
   - `expires_in`
   - `scope`

   Store `access_token` as `NIFTYPM_ACCESS_TOKEN` and `refresh_token` as `NIFTYPM_REFRESH_TOKEN`.

Conceptually:

```text
Client ID + Client Secret identify the app.
Authorization code proves the user approved the app.
Refresh token lets the app keep getting new access tokens later.
Access token is what actually authorises API calls.
```

Optional transport variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `TRANSPORT` | `stdio` | Set to `http` to run a local HTTP stream transport. |
| `PORT` | `8080` | Local HTTP port when `TRANSPORT=http`. |
| `MCP_AUTH_SECRET` | unset | Required by the Cloudflare Workers entry point. |

## UI Configurator

The project ships a static HTML configurator at `ui/index.html`. It is the
easiest way to generate a `.env` file without editing anything by hand.

**How to use:**
1. Open `ui/index.html` in a browser (works via `file://` — no server needed).
2. Paste your OAuth credentials in the form.
3. Switch between the **Simple** and **Advanced** tabs to configure tools.

**Simple tab** — 20 domain-level ON/OFF switches, grouped into Core
(projects, tasks, docs) and Extended (workspace and integration). Turning a
domain OFF disables every tool in that domain.

**Advanced tab** — a full per-tool toggle table with ~116 tools across all 20
domains, each with a name, human-readable description, and individual toggle.
When a domain is OFF in Simple, the Advanced tab dims that domain's section.
Per-tool overrides you set in Advanced are preserved even when you briefly
disable and re-enable the domain.

**Downloads:** the button saves a `.env` file. Your browser may download it
as `env.txt` — rename it to `.env` and place it in the project root.

**Security:** the page makes no network requests. Credentials never leave
your machine.

## Per-tool disabling (`DISABLED_TOOLS`)

In addition to domain-level `ENABLE_*` toggles, you can disable individual
tools without disabling their entire domain. This is useful when you want
most tools in a category but need to remove a few high-risk or noisy ones.

On the UI's **Advanced** tab, toggle individual tool rows. When you download,
the generated `.env` includes a `DISABLED_TOOLS` line:

```dotenv
# Per-tool overrides
DISABLED_TOOLS=niftypm_delete_document,niftypm_update_document
```

You can also set this variable manually:

```dotenv
DISABLED_TOOLS=niftypm_delete_document,niftypm_archive_task
```

Tools listed here are skipped during registration even when their domain's
`ENABLE_*` flag is `true`. The domain-level gate takes precedence — if a
domain is disabled, none of its tools register regardless of
`DISABLED_TOOLS`.

## `.env` auto-loading

The server automatically loads a `.env` file from the project root at
startup. Credential lines that are empty fall through to `.secrets/` files,
so you can keep credentials in `.secrets/` and toggles in `.env`:

```
Client config (env)  →  .env file  →  .secrets/ files  →  ""
  (highest priority)                                  (fallback)
```

Real environment variables from your MCP client config always take
precedence over values in `.env`. No special flag or `--env-file` option is
needed — dropping a `.env` in the project root just works.

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
