## Context

The NiftyPM MCP server is a thin proxy over NiftyPM's REST API (OpenAPI 3.0.0, 117 operations, single `bearer` security scheme, base URL `https://openapi.niftypm.com`). Each tool in `src/tools/*.ts` wraps one HTTP call via `NiftyPMClient` and returns the JSON response verbatim. There is no local state, no caching, no schema transformation.

A coverage-gap audit (`docs/api/coverage-gap.md`, 2026-06-21) confirmed **116/117 operations are proxied**, but four drift issues mean several tools do not faithfully implement their underlying operation:

| ID | Drift type | Tools affected | User impact |
|---|---|---|---|
| F-1 | 15 missing query params | `niftypm_list_tasks` | Subtask retrieval requires a raw REST bypass |
| F-2 | Upstream API gap | (checklists) | Users expect non-existent checklist tools |
| F-3 | API version drift (v1→v2) | 6 folder tools | Possible calls to deprecated endpoints |
| F-4 | HTTP method drift (POST→PUT) | `move_document`, `attach_task_document` | Latent failure on strict routers |

The existing `niftypm-mcp-remaining-tools` spec already requires "Complete OpenAPI Tool Parity", but that requirement only covers tool *existence*, not tool *fidelity*. This design covers the fidelity fix.

## Goals / Non-Goals

**Goals:**
- Close Issue 1: `niftypm_list_tasks` SHALL accept and forward all 15 spec-defined query parameters, including `include_subtasks`.
- Close Issue 2: checklist tools SHALL be implemented via the undocumented `api.niftypm.com/checklists` endpoint (empirically verified — see `docs/api/checklist-api-discovery.md`).
- Fix F-3 and F-4: folder tools SHALL target `/api/v2.0/folders`; `move_document` and `attach_task_document` SHALL use `PUT`.
- Tighten the parity requirement so future regressions are caught at review time.

**Non-Goals:**
- Implementing checklist tools at the `openapi.niftypm.com` level — that API surface genuinely has no checklist endpoints. The implementation uses `api.niftypm.com` instead.
- Adding new MCP tools for endpoints that are already covered. The 1 uncovered operation (`GET /` health check) SHALL remain intentionally unproxied.
- Refactoring the tool registration pattern (`server.addTool` blocks) or the `NiftyPMClient` interface.
- Local-state modelling of any NiftyPM domain (e.g. a local checklist table). This would violate the thin-proxy architecture and introduce state divergence.

## Decisions

### D1 — Add all 15 missing `list_tasks` params in one schema change
**Choice**: expand `ListTasksSchema` in `src/tools/tasks.ts` to include every spec-defined query parameter as an optional field.
**Rationale**: all 15 params are spec-defined, optional, and string-typed (one is an array: `assignee_ids`; `project_ids` is a comma-separated string). A single additive change is cheaper than three incremental rounds and matches the upstream contract exactly.
**Alternatives considered**:
- *Add only `include_subtasks`*: rejected — closes the immediate user pain but leaves 14 known gaps that will surface as follow-up bugs. The audit already did the discovery work; ship it once.
- *Generate the schema from the OpenAPI spec at build time*: tempting long-term, but out of scope for this change and would require a new code-generation pipeline.

### D2 — Implement checklist tools via the undocumented `api.niftypm.com` endpoint
**Choice**: add a new `src/tools/checklists.ts` with 7 tools (create/get/update/delete checklist, create/update-toggle/delete item) targeting `api.niftypm.com/checklists`. Extend `NiftyPMClient` to support a second base URL.
**Rationale**: empirical testing on 2026-06-22 proved the API exists and works (see `docs/api/checklist-api-discovery.md`). The web app uses `api.niftypm.com` for ALL its calls — the public `openapi.niftypm.com` spec is an incomplete subset. Full CRUD verified: create checklist (201), get with items (200), update name (200), delete (200), create items as array body (201), update item name (200), toggle completion (200), delete item (200).
**Alternatives considered**:
- *Document as a limitation and use subtasks workaround*: rejected — the API exists and works. Documenting a fake limitation would mislead users.
- *Wait for NiftyPM to document the endpoint officially*: rejected — the endpoint is already live and stable; undocumented ≠ unavailable.
- *Migrate the entire MCP server to `api.niftypm.com`*: tempting (it's the real API) but too large a scope change for this proposal. Deferred to a follow-up.

### D3 — Migrate folder tools to `/api/v2.0/folders`
**Choice**: update all six folder tools (`create`, `get`, `get_by_id`, `get_children`, `update`, `delete`) to call `/api/v2.0/folders/...` and align path-param naming (`{folder_id}` → `{folderId}`) with the spec.
**Rationale**: the OpenAPI spec documents only v2 paths for folders; v1 is undocumented and may be deprecated or removed without notice. Aligning with the documented contract is the only defensible long-term target.
**Alternatives considered**:
- *Leave tools on v1*: rejected — undocumented endpoints are a latent outage risk.
- *Support both v1 and v2 via a config flag*: rejected — adds complexity for no user benefit; v2 is the canonical path.

### D4 — Correct POST → PUT on `move_document` and `attach_task_document`
**Choice**: switch both tools' `client.post(...)` call to `client.put(...)`.
**Rationale**: the spec mandates `PUT` for both operations. Some API routers are verb-strict and would return `404`/`405` to a `POST`; even permissive routers may tighten this without notice.
**Alternatives considered**:
- *Leave as POST if it currently works*: rejected — "works today" is not a contract, and the spec is explicit.

### D5 — F-1 ships first; F-3 last
**Choice**: implementation order is F-1 → F-4 → F-2 → F-3.
**Rationale**: F-1 is purely additive and highest-value (closes Issue 1); F-4 is a two-line method fix; F-2 adds new tools and the dual-base-URL client change (medium complexity, closes Issue 2); F-3 carries the only real regression risk and benefits from everything else being merged first.

## Risks / Trade-offs

- **[F-3] Folder v2 endpoints may have different request/response shapes than v1** → *Mitigation*: smoke-test each of the six folder tools against the live NiftyPM API before merge. If v2 shapes differ, raise an `open question` and roll the folder migration back to a follow-up change; F-1/F-4/F-2 still ship independently.
- **[F-1] New params may surface upstream validation quirks** (date formats for `from`/`to`, allowed values for `sort`/`order`) → *Mitigation*: pass params through verbatim (no transformation); the upstream API's own validation is the source of truth. The spec marks all 15 as optional strings (or arrays of strings), so type risk is minimal.
- **[F-1] Existing tests that assert the exact param set passed to the client may break** → *Mitigation*: audit `test/tools/` and `test/regression-api-contract.test.ts` for hardcoded param lists before changing the schema; update assertions to check forwarded params individually rather than by deep-equal on the whole object.
- **[F-2] Documentation may need to be updated again if NiftyPM ships a checklist API** → accepted; the limitation note is explicitly framed as "as of spec version 1.0" so a future removal is straightforward.

## Migration Plan

Each finding is independently shippable. Recommended PR sequence:

1. **PR 1 — F-1 (list_tasks params)**: additive schema change + new `list-tasks-params.test.ts`. Lowest risk, highest user value. Ship first.
2. **PR 2 — F-4 (method fixes)**: two one-line method corrections + contract-test assertions. Ship second.
3. **PR 3 — F-3 (folders v2)**: requires live smoke test. Ship only after the six folder tools have been manually exercised against the v2 endpoints in a staging account. If any tool breaks, split this PR into per-tool fixes or defer.
4. **PR 4 — F-2 (docs)**: README + tools guide updates. Ships independently of the code PRs.

**Rollback**: every PR is reversible by revert. No data migrations, no schema migrations, no config changes. F-3 rollback simply restores the `/api/v1.0/folders` path prefix.

## Open Questions

- **Are there other tools with method/version drift beyond F-3 and F-4?** The coverage-gap audit was disambiguated manually; a CI guard that re-runs the analysis on every change to `src/tools/` would prevent future drift. Out of scope for this change but recommended as a follow-up.
- **Does NiftyPM have a public roadmap entry for a checklist API?** Not investigated. If the answer is yes, the F-2 documentation should link to it.
- **Should the path-param name change in F-3 (`{folder_id}` → `{folderId}`) also be reflected in the Zod schema field names?** No — the schema field names are the MCP-facing argument names; only the URL template substitution changes. Keep `folder_id` as the MCP argument for consistency with other tools.
