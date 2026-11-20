## 1. Scaffold

- [x] 1.1 Create `ui/` directory at project root.
- [x] 1.2 Create `ui/index.html` with skeleton markup (tab containers, credential form, download button, placement guidance).
- [x] 1.3 Create `ui/styles.css` with layout, tab styling, toggle switch visuals, dimming for disabled rows.
- [x] 1.4 Create `ui/script.js` with empty `TOOL_DOMAINS` array, state object, and placeholder render functions.

## 2. Tool inventory in script.js

- [x] 2.1 Extract the full tool inventory from `src/tools/*.ts` — every `server.addTool()` call and its description — and populate `TOOL_DOMAINS` in `script.js` with all 20 domains and their tools.
- [x] 2.2 For each tool, include a human-readable `description` field derived from the tool's Zod schema description or the README's tool tables.
- [x] 2.3 Verify the inventory count matches the current server: approximately 104 tools across 20 domains.

## 3. Shared state model

- [x] 3.1 Define `state.domains` object with 20 keys (matching `TOOL_DOMAINS[id].id`), each `{ enabled: true }` by default.
- [x] 3.2 Define `state.disabledTools` as a `Set<string>` (or array), initially empty.
- [x] 3.3 Implement `updateDomain(domainId, enabled)` that updates `state.domains[domainId].enabled` and triggers re-render of both tabs.
- [x] 3.4 Implement `toggleTool(toolName)` that adds/removes from `state.disabledTools` and triggers re-render of both tabs.

## 4. Simple tab rendering

- [x] 4.1 Implement `renderSimpleTab()` that populates `#simple-tab-content` with 20 domain toggle rows, grouped under Core and Extended labels.
- [x] 4.2 Each row shows the domain label, a toggle switch reflecting `state.domains[id].enabled`, and (optionally) a tool count like "(13 tools)".
- [x] 4.3 Toggle click calls `updateDomain()`.

## 5. Advanced tab rendering

- [x] 5.1 Implement `renderAdvancedTab()` that populates `#advanced-tab-content` with a table grouped by domain.
- [x] 5.2 Each domain section has a category header row with the domain name and a master toggle.
- [x] 5.3 Each tool row has three columns: tool name, description, and individual toggle switch.
- [x] 5.4 When a domain is disabled (`state.domains[id].enabled === false`), the entire domain section is dimmed (`opacity: 0.4`) and individual toggles are non-interactive.
- [x] 5.5 When a domain is enabled but a tool is in `state.disabledTools`, that specific row is dimmed and its toggle shows OFF.

## 6. Tab switching

- [x] 6.1 Implement `switchTab(tabName)` that shows `#simple-tab-content` or `#advanced-tab-content` and updates the active tab button styling.
- [x] 6.2 Each tab switch triggers a re-render of both views (to ensure state consistency).

## 7. `.env` generation

- [x] 7.1 Implement `generateEnvFile()` that produces the complete `.env` string.
- [x] 7.2 Output starts with `# NiftyPM OAuth Credentials` header and the four `NIFTYPM_*=` lines.
- [x] 7.3 Output includes `# ─── Tool Configuration ───` section with `# Core` and `# Extended` subsection comments.
- [x] 7.4 Each domain toggle emits `ENABLE_<KEY>=true` or `false`, grouped in the correct subsection.
- [x] 7.5 If `state.disabledTools` is non-empty, output includes `# ─── Per-tool overrides ───` section with a comment listing disabled tools and their domains, followed by `DISABLED_TOOLS=<comma-separated list>`.
- [x] 7.6 Implement download via `Blob` + `URL.createObjectURL` + synthetic anchor click, filename `.env`.

## 8. UX safeguards

- [x] 8.1 Show a non-blocking warning if any credential field is empty at download time.
- [x] 8.2 Display placement guidance near the download button: "Save as `.env` in your project root. Back up any existing `.env` first. Restart your MCP server for changes to take effect."
- [x] 8.3 Show a header note: "This page runs entirely in your browser. No data is sent anywhere."
- [x] 8.4 Confirm the page works opened via `file://` with no server in at least two browsers.

## 9. Server: `disabledTools` config field

- [x] 9.1 Add `disabledTools: string[]` to the `NiftyPMConfig` interface in `src/config.ts`.
- [x] 9.2 In `loadConfig()`, parse `DISABLED_TOOLS` env var: split on comma, trim whitespace from each entry, default to `[]` when absent or empty.
- [x] 9.3 Update `test/config.test.ts` with test cases for `DISABLED_TOOLS` parsing (comma-separated, whitespace trimming, absent, empty).

## 10. Server: per-tool registration gate

- [x] 10.1 Refactor `registerFilesTools()` to accept `disabledTools: string[]` and skip tools whose names appear in the list.
- [x] 10.2 Refactor `registerLabelsTools()` — same pattern.
- [x] 10.3 Refactor `registerDocumentsTools()` — same pattern.
- [x] 10.4 Refactor `registerMilestonesTools()` — same pattern.
- [x] 10.5 Refactor `registerMessagesTools()` — same pattern.
- [x] 10.6 Refactor `registerTaskGroupsTools()` — same pattern.
- [x] 10.7 Refactor `registerTasksTools()` — same pattern.
- [x] 10.8 Refactor `registerSubTeamsTools()` — same pattern.
- [x] 10.9 Refactor `registerProjectsTools()` — same pattern.
- [x] 10.10 Refactor `registerFoldersTools()` — same pattern.
- [x] 10.11 Refactor `registerMembersTools()` — same pattern.
- [x] 10.12 Refactor `registerWebhooksTools()` — same pattern.
- [x] 10.13 Refactor `registerTimeTools()` — same pattern.
- [x] 10.14 Refactor `registerFieldsTools()` — same pattern.
- [x] 10.15 Refactor `registerAppsTools()` — same pattern.
- [x] 10.16 Refactor `registerChatTools()` — same pattern.
- [x] 10.17 Refactor `registerInviteTools()` — same pattern.
- [x] 10.18 Refactor `registerTemplatesTools()` — same pattern.
- [x] 10.19 Refactor `registerUsersTools()` — same pattern.
- [x] 10.20 Refactor `registerAuthTools()` — same pattern.

## 11. Server: entry points update

- [x] 11.1 In `src/index.ts`, pass `config.disabledTools` to every `register*Tools()` call.
- [x] 11.2 In `src/worker.ts`, pass `config.disabledTools` to every `register*Tools()` call.
- [x] 11.3 Guard against missing `disabledTools` by defaulting to `[]` at each call site.

## 12. Verification

- [x] 12.1 Open `ui/index.html` via `file://`, fill demo credentials, toggle a few domains and individual tools, download `.env`, and diff against expectation.
- [x] 12.2 Verify `ENABLE_TASK_GROUPS` and `ENABLE_SUBTEAMS` emit correctly (irregular names).
- [x] 12.3 Verify `.env` comment sections appear correctly (Core, Extended, Per-tool overrides).
- [x] 12.4 Run `bun run vitest run` — all existing tests pass.
- [x] 12.5 Run `bun run build` — TypeScript compiles without errors.
- [x] 12.6 Manually test: set `DISABLED_TOOLS=niftypm_delete_document`, start server, confirm `niftypm_delete_document` is not in the tool list but other document tools are.
- [x] 12.7 Manually test: set `ENABLE_DOCUMENTS=false` with a `DISABLED_TOOLS` value, confirm the domain toggle takes precedence (no document tools registered at all).
