# Design: NiftyPM Configurator UI

## Context & Constraints

- **No server.** The configurator must be a static page openable via
  `file://` or any static host. Browsers cannot write to the filesystem, so
  the output mechanism is a file **download** the user places manually.
- **No build step, no framework.** Plain HTML + CSS + vanilla JS/TS. Keeps
  the artefact dependency-free and reviewable.
- **Reuse existing config loading.** `loadConfig()` already reads `.env` via
  `process.env` with priority over `.secrets/`. The generated `.env` works
  with zero code changes to `src/config.ts`.
- **Restart-based.** Toggles take effect on next server start. No runtime
  reload is in scope.

## Source-of-Truth Mapping

The UI must mirror `src/config.ts` exactly. The 20 tool domains and their
env-var names:

| UI label (domain)      | `enabledTools` key | Env var              |
| ---------------------- | ------------------ | -------------------- |
| Files                  | `files`            | `ENABLE_FILES`       |
| Labels / Tags          | `labels`           | `ENABLE_LABELS`      |
| Documents              | `documents`        | `ENABLE_DOCUMENTS`   |
| Milestones             | `milestones`       | `ENABLE_MILESTONES`  |
| Messages               | `messages`         | `ENABLE_MESSAGES`    |
| Task Groups            | `taskGroups`       | `ENABLE_TASK_GROUPS` |
| Tasks                  | `tasks`            | `ENABLE_TASKS`       |
| Subteams / Portfolios  | `subTeams`         | `ENABLE_SUBTEAMS`    |
| Projects               | `projects`         | `ENABLE_PROJECTS`    |
| Folders                | `folders`          | `ENABLE_FOLDERS`     |
| Members                | `members`          | `ENABLE_MEMBERS`     |
| Webhooks               | `webhooks`         | `ENABLE_WEBHOOKS`    |
| Time Tracking          | `time`             | `ENABLE_TIME`        |
| Custom Fields          | `fields`           | `ENABLE_FIELDS`      |
| Apps                   | `apps`             | `ENABLE_APPS`        |
| Chat                   | `chat`             | `ENABLE_CHAT`        |
| Invite                 | `invite`           | `ENABLE_INVITE`      |
| Templates              | `templates`        | `ENABLE_TEMPLATES`   |
| Users                  | `users`            | `ENABLE_USERS`       |
| Auth                   | `auth`             | `ENABLE_AUTH`        |

> **Note the irregular mappings:** `taskGroups` → `ENABLE_TASK_GROUPS` (with
> underscore) and `subTeams` → `ENABLE_SUBTEAMS` (no underscore). The UI must
> hardcode this table, not derive env names by naive case conversion.

## Credentials

Four text inputs, all required for a working config:

| UI field        | Env var                 |
| --------------- | ----------------------- |
| Client ID       | `NIFTYPM_CLIENT_ID`     |
| Client Secret   | `NIFTYPM_CLIENT_SECRET` |
| Access Token    | `NIFTYPM_ACCESS_TOKEN`  |
| Refresh Token   | `NIFTYPM_REFRESH_TOKEN` |

Secret-style fields (Client Secret, Access Token, Refresh Token) should use
`type="password"` with a show/hide toggle for usability.

## Generated `.env` Format

Output must match `.env.example` exactly — header comments, credential block,
then the 20 toggles. Example:

```dotenv
# NiftyPM OAuth Credentials
NIFTYPM_CLIENT_ID=<value>
NIFTYPM_CLIENT_SECRET=<value>
NIFTYPM_ACCESS_TOKEN=<value>
NIFTYPM_REFRESH_TOKEN=<value>

# Tool Configuration (set to "false" to disable)
ENABLE_FILES=true
ENABLE_LABELS=true
...
ENABLE_AUTH=true
```

Toggle ON → `ENABLE_<DOMAIN>=true`; OFF → `ENABLE_<DOMAIN>=false`.

## Download Mechanism

Use a `Blob` + object URL + synthetic anchor click:

```js
const blob = new Blob([envText], { type: "text/plain" });
const url = URL.createObjectURL(blob);
const a = document.createElement("a");
a.href = url;
a.download = ".env";
a.click();
URL.revokeObjectURL(url);
```

No network request is ever made. All generation is synchronous and local.

## File Layout

```
ui/
  index.html        # markup + form + toggles
  styles.css        # styling (optional; can inline)
  configurator.js   # generation + download logic (vanilla JS)
```

A single self-contained `index.html` with inline `<style>` and `<script>` is
also acceptable and arguably simpler to distribute. Decision: **single
self-contained `index.html`** for portability, unless it grows past ~300
lines, in which case split out `configurator.js`.

## UX Safeguards

- Header note: "This page runs entirely in your browser. No data is sent
  anywhere."
- Near the download button: "Save this file as `.env` in your project root,
  then restart the MCP server. Back up any existing `.env` first."
- Validation: warn (not block) if any credential field is empty before
  download.

## README Updates (Deferred — captured for the separate editing session)

1. Fix `NIFTYPM_REFRESH_TOKEN` description: it is **not** "reserved for future
   auto-refresh". Automatic 401 recovery is implemented in
   `src/client.ts:33-86`. New wording: "OAuth refresh token for automatic 401
   recovery. Required for stable connections — without it, every token expiry
   forces manual re-authorisation."
2. Add a brief "How to obtain the refresh token" note: the
   `authorization_code` grant against `https://openapi.niftypm.com/oauth/token`
   returns both `access_token` and `refresh_token` (per the OpenAPI spec at
   `docs/api/api-openapi-source.json:82-90`). Store both.
3. Document that users can create their own `.secrets/` directory with the
   four files (`client_id`, `client_secret`, `access_token`, `refresh_token`),
   but note the **easiest path is the UI configurator** which generates a
   `.env` by copy-paste.

## Open Questions

- None blocking. Single-file vs split-file is a build-time judgement call left
  to the implementer per the 300-line threshold above.
