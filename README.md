# NiftyPM MCP Server

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server that exposes the [NiftyPM](https://niftypm.com) project management API as a set of tools for AI assistants (Claude, Cursor, etc.). The server can run locally over `stdio` for desktop MCP clients or be deployed as an HTTP/streamable endpoint on [Cloudflare Workers](https://workers.cloudflare.com) for remote clients.

It ships with 117 tools spanning projects, tasks, documents, webhooks, and all other available NiftyPM API endpoints, all individually toggleable through environment variables so you can expose only what you need.

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running Locally (stdio)](#running-locally-stdio)
- [Running on Cloudflare Workers](#running-on-cloudflare-workers)
- [MCP Client Setup](#mcp-client-setup)
- [Available Tools](#available-tools)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Scripts](#scripts)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- **Full coverage of NiftyPM objects** — 117 tools across 20 domains covering projects, files, documents, labels/tags, milestones, tasks, task groups, messages, subteams, webhooks, and more.
- **Two deployment targets** — `stdio` for local desktop MCP clients and a Cloudflare Workers HTTP transport for remote/hosted use.
- **Granular tool toggles** — turn any of the 20 tool domains on or off without recompiling.
- **OAuth 2.0 bearer auth** — the client sends a `Bearer` access token on every request and the access/refresh token pair is read from the environment.
- **Strongly-typed schemas** — every tool parameter is validated with [Zod](https://zod.dev) before a request is sent.
- **Edge-ready** — the Workers build uses the `nodejs_compat` flag so the SDK runs unmodified on the edge runtime.

---

## Architecture

```
┌────────────────────┐     stdio / HTTP      ┌──────────────────────┐     HTTPS     ┌────────────────────┐
│  MCP client        │ ────────────────────▶ │  niftypm-mcp server  │ ────────────▶ │  openapi.niftypm   │
│  (Claude, Cursor)  │                       │  (FastMCP / Workers) │              │       .com         │
└────────────────────┘                       └──────────────────────┘              └────────────────────┘
                                                       │
                                                       ├─ src/index.ts   → FastMCP, stdio + optional httpStream
                                                       └─ src/worker.ts  → Cloudflare Workers MCP handler
```

| Layer            | File              | Purpose                                                                                  |
| ---------------- | ----------------- | ---------------------------------------------------------------------------------------- |
| Entry (local)    | `src/index.ts`    | Bootstraps FastMCP, registers tools, picks `stdio` or `httpStream` based on `TRANSPORT`. |
| Entry (edge)     | `src/worker.ts`   | Exports a Workers-compatible `fetch` handler that wraps `agents/mcp`.                    |
| Config           | `src/config.ts`   | Loads OAuth credentials and tool toggles from environment variables.                     |
| HTTP client      | `src/client.ts`   | Thin `fetch` wrapper with `Authorization: Bearer …` and JSON encoding.                   |
| Tool modules     | `src/tools/*.ts`  | One file per resource group, each exporting a `register*Tools` function.                 |
| Tool barrel      | `src/tools/index.ts` | Re-exports all `register*Tools` functions for the entry points to consume.            |

---

## Prerequisites

- **Node.js 20+** (for the built-in `fetch` and `Headers` types used by the client).
- **Bun ≥ 1.1** (recommended for local dev — `bun --watch` gives a fast reload loop). npm/pnpm work too.
- **Wrangler CLI** (`npm i -g wrangler`) for the Cloudflare Workers deployment target.
- A **NiftyPM account** with OAuth credentials (client ID/secret) and a valid access/refresh token pair. See the [NiftyPM API docs](https://openapi.niftypm.com) for the OAuth flow used by your workspace.

---

## Installation

```bash
# Clone the repository
git clone https://github.com/<your-org>/niftypm-mcp.git
cd niftypm-mcp

# Install dependencies (bun is used in the lockfile, but npm/pnpm work fine)
bun install
# or
npm install
```

---

## Configuration

All runtime configuration is provided through environment variables.

1. Copy the example env file:

   ```bash
   cp .env.example .env
   ```

2. Fill in your credentials:

   ```dotenv
   NIFTYPM_CLIENT_ID=your_client_id_here
   NIFTYPM_CLIENT_SECRET=your_client_secret_here
   NIFTYPM_ACCESS_TOKEN=your_access_token_here
   NIFTYPM_REFRESH_TOKEN=your_refresh_token_here
   ```

3. (Optional) Disable any tool group you don't want to expose by setting the corresponding `ENABLE_*` flag to `false`. See [Environment Variables](#environment-variables).

> The `validateConfig` step in `src/index.ts` will throw on startup if `NIFTYPM_ACCESS_TOKEN` is missing.

---

## Running Locally (stdio)

`stdio` is the default transport and is what most desktop MCP clients (Claude Desktop, Cursor, etc.) expect.

```bash
# Foreground
bun run start

# Watch mode (auto-reload on change)
bun run dev
```

To switch to an HTTP transport locally (useful for testing the streamable endpoint with a remote client), set `TRANSPORT=http` and optionally `PORT`:

```bash
TRANSPORT=http PORT=8080 bun run start
# → NiftyPM MCP server listening on http://localhost:8080/mcp
```

Build the TypeScript output to `dist/` with `bun run build` if you need to run the compiled `dist/index.js` (this is what `package.json` `bin` points to).

---

## Running on Cloudflare Workers

The Workers build lives in `src/worker.ts` and is wired up via `wrangler.jsonc`.

```bash
# Local Workers dev server
bun run cf:dev

# Deploy to your Cloudflare account
bun run cf:deploy
```

For local development, copy the secrets template and fill in your credentials:

```bash
cp .dev.vars.example .dev.vars
# then edit .dev.vars — Wrangler reads it automatically for `wrangler dev`
```

For production secrets, use:

```bash
wrangler secret put NIFTYPM_ACCESS_TOKEN
wrangler secret put NIFTYPM_REFRESH_TOKEN
wrangler secret put NIFTYPM_CLIENT_ID
wrangler secret put NIFTYPM_CLIENT_SECRET
```

The default `compatibility_flags: ["nodejs_compat"]` in `wrangler.jsonc` is what lets the MCP SDK and `fetch` shim run on Workers.

---

## MCP Client Setup

### Claude Desktop (`claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "niftypm": {
      "command": "bun",
      "args": ["run", "/absolute/path/to/niftypm-mcp/src/index.ts"],
      "env": {
        "NIFTYPM_ACCESS_TOKEN": "your_access_token_here",
        "NIFTYPM_REFRESH_TOKEN": "your_refresh_token_here"
      }
    }
  }
}
```

### OpenCode (`opencode.json`)

The recommended approach is to use file-based secrets to avoid token truncation issues with long JWTs.

**Step 1:** Create the secrets directory and store your tokens:

```bash
mkdir -p .secrets
echo "your_client_id" > .secrets/client_id
echo "your_client_secret" > .secrets/client_secret
echo "your_access_token" > .secrets/access_token
echo "your_refresh_token" > .secrets/refresh_token
```

**Step 2:** Add to your `opencode.json` (typically at `~/.config/opencode/opencode.json`):

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

> **Why `{file:}` instead of inline values?** OpenCode uses `{file:path}` syntax to read secrets from files, avoiding truncation of long JWT tokens that can occur with inline JSON values. The `.secrets/` directory is in `.gitignore` so tokens never commit.

### Cursor / Other stdio Clients

Use the same `command`/`args` pattern as Claude Desktop. For HTTP clients, point them at the deployed Workers URL (e.g. `https://niftypm-mcp.<your-subdomain>.workers.dev`).

---

## Available Tools

All tool names are namespaced with the `niftypm_` prefix. Return values are JSON strings formatted with two-space indentation for readability.

### Files (`ENABLE_FILES`, default on)

| Tool                          | Description                                  |
| ----------------------------- | -------------------------------------------- |
| `niftypm_list_files`          | List files in a project or task.             |
| `niftypm_get_file`            | Get a file by ID.                            |
| `niftypm_delete_file`         | Delete a file.                               |
| `niftypm_copy_file`           | Copy a file to another project.              |

### Labels / Tags (`ENABLE_LABELS`, default on)

| Tool                          | Description                                  |
| ----------------------------- | -------------------------------------------- |
| `niftypm_list_labels`         | List labels, optionally filtered by project. |
| `niftypm_get_label`           | Get a label by ID.                           |
| `niftypm_create_label`        | Create a new label (with optional color).    |
| `niftypm_update_label`        | Update an existing label.                    |
| `niftypm_delete_label`        | Delete a label.                              |

### Documents (`ENABLE_DOCUMENTS`, default on)

| Tool                          | Description                                  |
| ----------------------------- | -------------------------------------------- |
| `niftypm_list_documents`      | List documents in a project.                 |
| `niftypm_get_document`        | Get a document by ID.                        |
| `niftypm_create_document`     | Create a new document in a project.          |
| `niftypm_update_document`     | Update an existing document.                 |
| `niftypm_delete_document`     | Delete a document.                           |
| `niftypm_move_document`       | Move a document to another project.          |

### Milestones (`ENABLE_MILESTONES`, default on)

| Tool                          | Description                                  |
| ----------------------------- | -------------------------------------------- |
| `niftypm_list_milestones`     | List milestones in a project.                |
| `niftypm_get_milestone`       | Get a milestone by ID.                       |
| `niftypm_create_milestone`    | Create a new milestone.                      |
| `niftypm_update_milestone`    | Update an existing milestone.                |
| `niftypm_delete_milestone`    | Delete a milestone.                          |
| `niftypm_archive_milestone`   | Archive a milestone.                         |

### Tasks (`ENABLE_TASKS`, default on)

| Tool                          | Description                                                     |
| ----------------------------- | --------------------------------------------------------------- |
| `niftypm_list_tasks`          | List tasks with project / member / milestone / status filters.  |
| `niftypm_get_task`            | Get a task by ID.                                               |
| `niftypm_create_task`         | Create a task or subtask (parent via `task_id`).                |
| `niftypm_update_task`         | Update an existing task.                                        |
| `niftypm_delete_task`         | Delete a task.                                                  |
| `niftypm_complete_task`       | Mark a task as complete.                                        |
| `niftypm_archive_task`        | Archive a task.                                                 |

### Task Groups (`ENABLE_TASK_GROUPS`, default on)

| Tool                          | Description                                  |
| ----------------------------- | -------------------------------------------- |
| `niftypm_list_taskgroups`     | List task groups (optionally by project).    |
| `niftypm_get_taskgroup`       | Get a task group by ID.                      |
| `niftypm_create_taskgroup`    | Create a new task group in a project.        |
| `niftypm_update_taskgroup`    | Update an existing task group.               |
| `niftypm_delete_taskgroup`    | Delete a task group.                         |

### Messages (`ENABLE_MESSAGES`, default on)

| Tool                          | Description                                  |
| ----------------------------- | -------------------------------------------- |
| `niftypm_list_messages`       | List messages in a chat, task, document, or file.          |
| `niftypm_get_message`         | Get a message by ID.                         |
| `niftypm_create_message`      | Post a new message to a chat.                |
| `niftypm_update_message`      | Edit an existing message.                    |
| `niftypm_delete_message`      | Delete a message.                            |
| `niftypm_mark_message_seen`   | Mark a message as seen.                      |

### Subteams / Portfolios (`ENABLE_SUBTEAMS`, default on)

| Tool                                  | Description                                |
| ------------------------------------- | ------------------------------------------ |
| `niftypm_list_subteams`               | List all subteams/portfolios.              |
| `niftypm_get_subteam`                 | Get a subteam by ID.                       |
| `niftypm_create_subteam`              | Create a new subteam.                      |
| `niftypm_update_subteam`              | Update an existing subteam.                |
| `niftypm_delete_subteam`              | Delete a subteam.                          |

### Projects (`ENABLE_PROJECTS`, default on)

| Tool                          | Description                                  |
| ----------------------------- | -------------------------------------------- |
| `niftypm_list_projects`       | List all projects accessible to the user     |
| `niftypm_create_project`      | Create a new project                         |
| `niftypm_get_project`         | Get a specific project by ID                 |
| `niftypm_update_project`      | Update an existing project                   |
| `niftypm_delete_project`      | Delete a project                             |
| `niftypm_invite_to_project`   | Invite a user to a project                   |
| `niftypm_leave_project`       | Leave a project                              |
| `niftypm_start_project`       | Start a project (change status to active)    |
| `niftypm_add_project_field`   | Add a custom field to a project              |
| `niftypm_get_project_fields`  | Get all custom fields for a project          |
| `niftypm_update_project_field`| Update a custom field value for a project    |

### Folders (`ENABLE_FOLDERS`, default on)

| Tool                          | Description                                  |
| ----------------------------- | -------------------------------------------- |
| `niftypm_get_folder`          | Get the root folder structure                |
| `niftypm_create_folder`       | Create a new folder                          |
| `niftypm_get_folder_by_id`    | Get a specific folder by ID                  |
| `niftypm_get_folder_children` | Get all children of a folder                 |
| `niftypm_update_folder`       | Update a folder                              |
| `niftypm_delete_folder`       | Delete a folder                              |

### Members (`ENABLE_MEMBERS`, default on)

| Tool                          | Description                                  |
| ----------------------------- | -------------------------------------------- |
| `niftypm_list_members`        | List all team members                        |
| `niftypm_get_member`          | Get a specific team member by ID             |

### Webhooks (`ENABLE_WEBHOOKS`, default on)

| Tool                          | Description                                  |
| ----------------------------- | -------------------------------------------- |
| `niftypm_list_webhooks`       | List all webhooks for an app                 |
| `niftypm_create_webhook`      | Create a new webhook                         |
| `niftypm_update_webhook`      | Update an existing webhook                   |
| `niftypm_delete_webhook`      | Delete a webhook                             |

### Time Tracking (`ENABLE_TIME`, default on)

| Tool                          | Description                                  |
| ----------------------------- | -------------------------------------------- |
| `niftypm_get_time_report`     | Get time tracking report                     |
| `niftypm_get_time_duration`   | Get total time duration for tasks/projects   |

### Custom Fields (`ENABLE_FIELDS`, default on)

| Tool                          | Description                                  |
| ----------------------------- | -------------------------------------------- |
| `niftypm_list_custom_fields`  | List all custom fields definitions           |
| `niftypm_get_custom_field`    | Get a specific custom field definition by ID |

### Apps (`ENABLE_APPS`, default on)

| Tool                          | Description                                  |
| ----------------------------- | -------------------------------------------- |
| `niftypm_list_apps`           | List all installed applications              |
| `niftypm_get_app`             | Get a specific app by ID                     |

### Chat (`ENABLE_CHAT`, default on)

| Tool                          | Description                                  |
| ----------------------------- | -------------------------------------------- |
| `niftypm_list_chats`          | List all chat conversations                  |
| `niftypm_get_chat`            | Get a specific chat conversation by ID       |

### Miscellaneous (`ENABLE_INVITE`, `ENABLE_TEMPLATES`, `ENABLE_USERS`, `ENABLE_AUTH`)

| Tool                          | Description                                  |
| ----------------------------- | -------------------------------------------- |
| `niftypm_list_invite_links`   | List all active invite links                 |
| `niftypm_list_templates`      | List all project templates                   |
| `niftypm_get_current_user`    | Get the currently authenticated user profile |
| `niftypm_refresh_token`       | Refresh the authentication token             |

> Tool coverage is driven by `docs/api-openapi-source.yaml` (NiftyPM's published OpenAPI spec). The current set implements all 117 documented operations.

---

## Environment Variables

### Required

| Variable                 | Description                              |
| ------------------------ | ---------------------------------------- |
| `NIFTYPM_ACCESS_TOKEN`   | OAuth 2.0 bearer token. **Required.**    |
| `NIFTYPM_REFRESH_TOKEN`  | OAuth refresh token (reserved for future auto-refresh). |
| `NIFTYPM_CLIENT_ID`      | OAuth client ID.                         |
| `NIFTYPM_CLIENT_SECRET`  | OAuth client secret.                     |

### Optional — Tool Toggles

Each toggle defaults to `true` (enabled). Set to `false` to skip registration of that group on startup.

| Variable               | Controls                  |
| ---------------------- | ------------------------- |
| `ENABLE_FILES`         | Files tools               |
| `ENABLE_LABELS`        | Labels / tags tools       |
| `ENABLE_DOCUMENTS`     | Documents tools           |
| `ENABLE_MILESTONES`    | Milestones tools          |
| `ENABLE_MESSAGES`      | Messages tools            |
| `ENABLE_TASK_GROUPS`   | Task groups tools         |
| `ENABLE_TASKS`         | Tasks tools               |
| `ENABLE_SUBTEAMS`      | Subteams / portfolios tools |
| `ENABLE_PROJECTS`      | Projects tools            |
| `ENABLE_FOLDERS`       | Folders tools             |
| `ENABLE_MEMBERS`       | Members tools             |
| `ENABLE_WEBHOOKS`      | Webhooks tools            |
| `ENABLE_TIME`          | Time tracking tools       |
| `ENABLE_FIELDS`        | Custom fields tools       |
| `ENABLE_APPS`          | Apps tools                |
| `ENABLE_CHAT`          | Chat tools                |
| `ENABLE_INVITE`        | Invite tools              |
| `ENABLE_TEMPLATES`     | Templates tools           |
| `ENABLE_USERS`         | Users tools               |
| `ENABLE_AUTH`          | Auth tools                |

### Optional — Runtime

| Variable   | Default     | Description                                                       |
| ---------- | ----------- | ----------------------------------------------------------------- |
| `TRANSPORT`| `stdio`     | `stdio` (default) or `http` to expose the streamable HTTP endpoint locally. |
| `PORT`     | `8080`      | Port for the local HTTP transport (only used when `TRANSPORT=http`). |

---

## Project Structure

```
niftypm-mcp/
├── src/
│   ├── index.ts              # Local entry: FastMCP + stdio/httpStream
│   ├── worker.ts             # Cloudflare Workers entry (MCP handler)
│   ├── client.ts             # NiftyPM HTTP client (Bearer auth)
│   ├── config.ts             # Env loading + validation
│   └── tools/
│       ├── index.ts          # Barrel export for register*Tools
│       ├── files.ts          # niftypm_*_file[... ]
│       ├── labels.ts         # niftypm_*_label[...]
│       ├── documents.ts      # niftypm_*_document[...]
│       ├── milestones.ts     # niftypm_*_milestone[...]
│       ├── tasks.ts          # niftypm_*_task[...]
│       ├── taskgroups.ts     # niftypm_*_taskgroup[...]
│       ├── messages.ts       # niftypm_*_message[...]
│       ├── subteams.ts       # niftypm_*_subteam[...]
│       ├── projects.ts       # niftypm_*_project[...]
│       ├── folders.ts        # niftypm_*_folder[...]
│       ├── members.ts        # niftypm_*_member[...]
│       ├── webhooks.ts       # niftypm_*_webhook[...]
│       ├── time.ts           # niftypm_*_time[...]
│       ├── fields.ts         # niftypm_*_field[...]
│       ├── apps.ts           # niftypm_*_app[...]
│       ├── chat.ts           # niftypm_*_chat[...]
│       ├── invite.ts         # niftypm_*_invite[...]
│       ├── templates.ts      # niftypm_*_template[...]
│       ├── users.ts          # niftypm_*_user[...]
│       └── auth.ts           # niftypm_*_auth[...]
├── docs/
│   ├── api-openapi-source.json   # NiftyPM OpenAPI spec (source of truth)
│   └── api-openapi-source.yaml
├── dist/                     # tsc output (gitignored)
├── .env.example              # Template for local stdio env
├── .dev.vars.example         # Template for `wrangler dev`
├── wrangler.jsonc            # Cloudflare Workers config
├── tsconfig.json             # TypeScript config (Node16, ES2022)
├── package.json
├── bun.lock
└── LICENSE                   # MIT
```

---

## Scripts

| Script              | Command                | What it does                                                      |
| ------------------- | ---------------------- | ----------------------------------------------------------------- |
| `bun run build`     | `tsc`                  | Type-check and emit JavaScript to `dist/`.                        |
| `bun run start`     | `bun run src/index.ts` | Run the local server (stdio).                                     |
| `bun run dev`       | `bun --watch src/index.ts` | Run with file watch for fast local iteration.                 |
| `bun run cf:dev`    | `wrangler dev`         | Run the Cloudflare Workers build locally.                         |
| `bun run cf:deploy` | `wrangler deploy`      | Deploy to Cloudflare Workers.                                     |

---

## Contributing

Contributions are welcome. A few guidelines:

1. **Add one tool group per file.** Mirror the existing layout in `src/tools/` so registration stays predictable.
2. **Validate with Zod.** Every tool parameter object should be a `z.object({...})` schema — `fastmcp` uses it to generate JSON Schemas for the client.
3. **Keep the client thin.** New endpoints should generally reuse the existing `NiftyPMClient` (`get`/`post`/`put`/`delete`) rather than calling `fetch` directly.
4. **Update the README.** When you add or rename a tool, update the [Available Tools](#available-tools) table.
5. **Run `bun run build` before opening a PR** — `tsc` strict mode is the only static check wired in.

---

## License

This project is licensed under the [MIT License](./LICENSE). © 2026 Dr Muhammad Aizat Md Hawari & NiftyPM MCP Contributors.
