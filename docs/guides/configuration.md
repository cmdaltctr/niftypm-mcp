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
