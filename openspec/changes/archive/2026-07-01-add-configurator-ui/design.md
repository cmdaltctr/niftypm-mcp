## Context

The NiftyPM MCP server has 20 tool domains, each exposing between 1 and 22
tools (approximately 104 total). Currently, tool enablement is domain-level:
toggling `ENABLE_DOCUMENTS=false` removes all 13 document tools. There is no
per-tool granularity.

The configurator UI is a static HTML page (`ui/index.html`) that runs
entirely in the browser with no server. It generates a `.env` file that the
user places in the project root. The existing spec covers credential capture
and 20 domain-level toggles; this change adds an Advanced tab with per-tool
controls and corresponding server-side support.

**Key constraints:**
- No server for the UI. All logic runs in-browser via JavaScript.
- No build step. The UI must work opened directly via `file://`.
- `loadConfig()` load order: `process.env` → `.secrets/` → `""`.
- Tool registration is startup-time only. A server restart is required for
  config changes to take effect.
- 20 `register*Tools()` functions in `src/tools/*.ts`, each calling
  `server.addTool()` for every tool in that domain.

## Goals / Non-Goals

**Goals:**
- Two-tab UI: Simple (domain toggles) and Advanced (per-tool table).
- Simple and Advanced tabs share state — toggling a domain OFF in Simple
  greys out that domain's tools in Advanced.
- Advanced tab lets users disable individual tools within an enabled domain.
- `.env` output includes human-readable category comments and a
  `DISABLED_TOOLS` section.
- Server-side support for `DISABLED_TOOLS` env var — per-tool gating in all
  20 `register*Tools()` functions.
- `script.js` serves as the dynamic engine: holds the tool inventory, manages
  state, renders the DOM, and generates the `.env` output.

**Non-Goals:**
- Runtime hot-reload of tool toggles (restart is acceptable).
- Browser filesystem writes (user downloads and places the file manually).
- Shell-script generation.
- `.secrets/` file generation from the UI.
- Automatic sync of the tool inventory from the server at runtime (Phase 2
  enhancement — hardcoded inventory is sufficient for v1).

## Decisions

### Decision 1: Two-tier state model

The UI holds a single shared state object:

```js
state = {
  domains: { files: { enabled: true }, documents: { enabled: true }, ... },
  disabledTools: new Set()  // e.g., "niftypm_update_document"
}
```

**Rationale:** A single source of truth avoids synchronisation bugs between
tabs. The Simple tab reads/writes `domains[id].enabled`. The Advanced tab
reads `domains[id].enabled` AND `disabledTools`. Both tabs render from the
same state.

**Alternatives considered:**
- Separate state per tab → rejected (synchronisation nightmare).
- Storing per-tool state as a flat `tools: { name: boolean }` map → rejected
  (does not reflect the domain hierarchy, makes "disable all in domain"
  harder).

### Decision 2: `DISABLED_TOOLS` as comma-separated env var

The server reads `process.env.DISABLED_TOOLS`, splits on comma, and produces
`config.disabledTools: string[]` (default `[]`).

**Rationale:** Comma-separated strings are the simplest format that works
across all platforms and env-file loaders. JSON in an env var is fragile
(escaping, quoting). A simple split is trivial to parse and trivially
reversible for debugging.

**Alternatives considered:**
- Individual `DISABLE_<TOOL>=true` env vars → rejected (explosion of env
  vars, pollutes `.env` for 104 tools).
- JSON array in env → rejected (escaping issues in `.env` files).
- Separate config file → rejected (adds complexity to `loadConfig()`,
  diverges from env-var pattern).

### Decision 3: `script.js` as dynamic rendering engine

The UI consists of three files:

```
ui/
  index.html    ← skeleton: contains only #simple-tab-content, #advanced-tab-content, credential form, download button
  styles.css    ← visual layer: toggle switches, dimming, tab styling
  script.js     ← engine: TOOL_DOMAINS inventory, state management, DOM rendering, .env generation
```

**Rationale:** Keeping HTML minimal and JS doing the rendering means the
inventory (100+ tools) lives in one place as a data structure, not duplicated
across HTML markup. Changes to the tool list only touch `script.js`.

### Decision 4: `.env` comment format

The generated `.env` uses section headers:

```dotenv
# NiftyPM OAuth Credentials
...

# ─── Tool Configuration ───────────────────────────────

# Core (projects, tasks, docs)
ENABLE_FILES=true
...

# Extended (workspace & integration)
ENABLE_PROJECTS=true
...

# ─── Per-tool overrides ───────────────────────────────
# Only applies to domains that are enabled.
#
# Disabled: niftypm_update_document (Documents), niftypm_delete_document (Documents)
DISABLED_TOOLS=niftypm_update_document,niftypm_delete_document
```

**Rationale:** Section comments make the `.env` readable by a human opening
it in an editor. The per-tool comment explains which domain each disabled
tool belongs to. The `DISABLED_TOOLS` line is the single parseable line; the
comment above is for human reference only.

**Alternatives considered:**
- Flat list without comments → rejected (hard to read with 20+ lines).
- One `DISABLED_TOOLS` line per domain → rejected (env files typically don't
  support duplicate keys; the last one wins).

### Decision 5: Per-tool gating in `register*Tools()` with early skip

Each `register*Tools()` function pattern:

```ts
export function registerDocumentsTools(
  server: any,
  client: NiftyPMClient,
  disabledTools: string[] = []
) {
  const tools = [
    { name: "niftypm_list_documents", fn: registerListDocuments },
    { name: "niftypm_get_document", fn: registerGetDocument },
    // ...
  ];
  for (const tool of tools) {
    if (disabledTools.includes(tool.name)) continue;
    tool.fn(server, client);
  }
}
```

**Rationale:** Refactoring 20 files is mechanical. Restructuring each to use
a loop with a skip check makes the pattern uniform and easily auditable.

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| Tool inventory in `script.js` goes stale when tools are added/removed in the server | The inventory is a manual mapping; document in CONTRIBUTING.md that adding a tool requires updating `script.js`. Future: Phase 2 adds a `niftypm_list_tool_inventory` tool the UI can optionally call. |
| 20-files refactor is error-prone — one missed file means a tool stays enabled | The refactor is mechanical and auditable via grep: every `server.addTool(` call must be inside a guard loop. Tests verify. |
| `DISABLED_TOOLS` grows long with many overrides (env var length limits) | The var contains tool names (~30 chars each). Even disabling 50 tools is ~1,500 chars, well within env-var limits. |
| User misunderstands the two-tab model and expects Advanced toggles even when domain is OFF | UI shows dimmed rows and disabled toggles; guidance text explains the relationship. |
