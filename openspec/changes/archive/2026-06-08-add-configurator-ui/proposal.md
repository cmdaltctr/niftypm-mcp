# Proposal: NiftyPM Configurator UI

## Problem Statement

Configuring the NiftyPM MCP server today is a manual, error-prone process. A
user must hand-edit a `.env` file (or create four individual `.secrets/`
files), remember the exact `ENABLE_*` variable names for 20 tool domains, and
get the OAuth credential names right. There is no guided surface for this, and
the README's OAuth guidance is incomplete (it wrongly calls the refresh token
"reserved for future auto-refresh" when automatic 401 recovery is already
implemented in `src/client.ts`).

## Current State

- Configuration is purely manual: edit `.env` or create `.secrets/<name>`
  files by hand.
- The source of truth for tool toggles is `src/config.ts` →
  `enabledTools` (20 booleans), populated from `ENABLE_*` env vars
  (default `true`, disabled only on the literal string `"false"`).
- Credential load order is `process.env[key]` → `.secrets/<name>` → `""`
  (see `src/config.ts:66-70`). The `.secrets/` fallback is the documented
  convention for OpenCode.
- There is no frontend/admin surface of any kind in the repo.
- Tool toggles take effect at startup only — there is no runtime reload, and
  none is wanted (restarting the MCP server is cheap and acceptable).

## Proposed Solution

Ship a single static HTML page (`ui/index.html`) — plain HTML, CSS, and
vanilla JavaScript/TypeScript, no build step and no server — that lets a user:

1. Paste the four OAuth credentials (Client ID, Client Secret, Access Token,
   Refresh Token).
2. Toggle all 20 tool domains on/off with labelled switches (default on).
3. Click **Download `.env`** to generate and download a ready-to-use `.env`
   file.

The user drops the downloaded `.env` into the project root and restarts the
MCP server. No filesystem write from the browser is attempted (browsers
cannot do it); the download-and-place flow is the mechanism.

This relies on the **existing** `loadConfig()` behaviour — `.env` values are
read via `process.env`, which already takes priority over `.secrets/`. No
changes to `src/config.ts` are required.

## Benefits

1. **Zero-friction onboarding** — paste, toggle, download, restart.
2. **No new dependencies** — static HTML/CSS/JS, no framework, no build.
3. **Accessible to non-technical users** — no shell scripts to run (some
   users are wary of executing scripts).
4. **Minimal config change** — reuses the current env → `.secrets` → ""
   fallback order untouched.
5. **Self-documenting** — the 20 toggles surface every tool domain with a
   plain-language label.

## Success Criteria

- `ui/index.html` opens directly in a browser (file:// or any static host)
  with no server and no network calls.
- All four credentials and all 20 `ENABLE_*` toggles are represented.
- The generated `.env` exactly matches the format consumed by
  `loadConfig()` (correct variable names, `true`/`false` string values).
- Toggling a switch off emits `ENABLE_<DOMAIN>=false`; on emits
  `ENABLE_<DOMAIN>=true`.
- No secret values are transmitted anywhere — generation is entirely
  client-side.
- README is updated (deferred to a separate session — see Out of Scope).

## Scope

- **In Scope:** `ui/index.html` (+ optional `ui/styles.css`,
  `ui/configurator.js` or `.ts`), `.env` generation, all 20 toggles, all 4
  credentials, the existing tool-domain → env-var mapping.
- **Out of Scope:**
  - Runtime hot-reload of toggles (restart is acceptable).
  - Writing to the filesystem from the browser.
  - Shell-script generation (decided against — plain `.env` download only).
  - `.secrets/` file generation (the `.env` download is the chosen path).
  - README edits (handled in a separate editing session; tasks captured in
    this change for reference).

## Risks

- **User places `.env` in the wrong directory** — mitigation: the page shows
  a clear "save this file in your project root, then restart" instruction.
- **Stale `.env` overwrites a good one** — mitigation: the page warns the
  user to back up any existing `.env` before replacing it.
- **Secrets in browser memory** — mitigation: everything is client-side, no
  network calls; document that the page should be used locally.
