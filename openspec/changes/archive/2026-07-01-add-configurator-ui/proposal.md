## Why

The existing configurator UI spec covers domain-level tool toggles (20 on/off switches), but domain toggles are all-or-nothing — disabling Documents removes all 13 document tools. Users need granular control to disable specific tools within an enabled domain (e.g., keep document listing but disable document deletion). The server currently has no mechanism for per-tool disabling either. This change introduces a two-tier toggle model (Simple + Advanced tabs), adds `DISABLED_TOOLS` server-side support, and generates human-readable `.env` output with comment headers per category.

## What Changes

- **UI: Simple tab** — 20 domain-level toggles grouped by category (Core / Extended). Toggling a domain OFF disables all tools in that domain.
- **UI: Advanced tab** — per-tool toggle table with tool name, description, and individual on/off switch per tool (~117 tools across 20 domains). Category toggle dims all tools when OFF; re-enabling a category restores per-tool overrides. Simple and Advanced tabs share state.
- **UI: `.env` output** — generates human-readable `.env` with `# ─── Core ───` and `# ─── Extended ───` section comments, plus `# ─── Per-tool overrides ───` with per-domain comment headers.
- **UI: script.js engine** — acts as the dynamic brain of the static HTML page: holds the full tool inventory as a data structure, manages shared state between tabs, renders DOM dynamically, and generates the `.env` file.
- **Server: `DISABLED_TOOLS` env var** — new config field `disabledTools: string[]` in `src/config.ts`, populated from `process.env.DISABLED_TOOLS` (comma-separated tool names). **BREAKING**: none — the field defaults to an empty array, so existing configs work unchanged.
- **Server: per-tool registration gate** — each of the 20 `register*Tools()` functions in `src/tools/*.ts` checks `disabledTools` before calling `server.addTool()`. Tools whose names appear in the list are skipped.

## Capabilities

### New Capabilities

- `configurator-ui-advanced`: Advanced tab with per-tool toggle table, shared state with Simple tab, domain-category grouping, row dimming for disabled tools, and dynamic DOM rendering via script.js.
- `server-disabled-tools`: Server-side `DISABLED_TOOLS` env var support in `src/config.ts` and per-tool gating in all 20 `register*Tools()` functions.

### Modified Capabilities

- `configurator-ui`: Extended to include grouped category comments in `.env` output, section headers for per-tool overrides, and the two-tab Simple/Advanced architecture. The original domain-toggle-only design is now the Simple tab within a broader UI.

## Impact

- **New files**: `ui/index.html`, `ui/styles.css`, `ui/script.js` (three static frontend files, no build step).
- **Modified files**: `src/config.ts` (new `disabledTools` field + env parsing), all 20 `src/tools/*.ts` files (per-tool skip logic in `register*Tools()`), `src/index.ts` (pass `disabledTools` to registration calls), `src/worker.ts` (same as index.ts).
- **No new dependencies, no API changes, no database changes**.
