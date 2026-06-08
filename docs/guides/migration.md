# Migration Guide

This guide helps existing users move from the earlier NiftyPM MCP setup to the expanded server.

## Summary

The expanded server keeps the original tools and adds more NiftyPM domains. Existing clients should continue working without breaking changes, provided the required OAuth credentials are still configured.

## What changed

- More tool domains are available, including projects, folders, members, webhooks, time tracking, fields, apps, chat, invite links, templates, users, and auth helpers.
- Domain-level feature flags are available through `ENABLE_*` environment variables.
- Access tokens can be refreshed automatically in memory when API calls return `401`.
- Local development can use `.secrets/` file fallbacks for OAuth credentials.

## Required action

Existing users should review their environment variables and ensure these values exist:

```dotenv
NIFTYPM_CLIENT_ID=your_client_id_here
NIFTYPM_CLIENT_SECRET=your_client_secret_here
NIFTYPM_ACCESS_TOKEN=your_access_token_here
NIFTYPM_REFRESH_TOKEN=your_refresh_token_here
```
If a domain should not be exposed to your MCP client, disable it explicitly:

```dotenv
ENABLE_WEBHOOKS=false
ENABLE_TIME=false
ENABLE_APPS=false
```

All domain flags default to enabled unless set to `false`.

## Local OpenCode setup

For OpenCode, file-based secrets are recommended because OAuth/JWT strings can be long:

```bash
mkdir -p .secrets
printf '%s' 'your_client_id' > .secrets/client_id
printf '%s' 'your_client_secret' > .secrets/client_secret
printf '%s' 'your_access_token' > .secrets/access_token
printf '%s' 'your_refresh_token' > .secrets/refresh_token
chmod 700 .secrets
chmod 600 .secrets/*
```

Then reference those files in the MCP configuration using OpenCode's `{file:/path}` syntax.

## Breaking changes
No deliberate breaking changes are expected:

- Existing tool names remain available.
- Existing local `stdio` usage remains the default.
- Cloudflare Workers deployment still uses `wrangler` and `MCP_AUTH_SECRET`.

## Recommended checks after upgrading

```bash
bun install
bun run vitest run
bun run build
```

Then test a harmless read-only tool, such as:

```json
{
  "tool": "niftypm_get_current_user",
  "arguments": {}
}
```

For a write-path smoke test, create a temporary personal task and delete it afterwards.
