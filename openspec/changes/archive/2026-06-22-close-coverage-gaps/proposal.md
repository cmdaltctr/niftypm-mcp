## Why

The MCP server proxies 116/117 NiftyPM OpenAPI operations, but several tools do not **faithfully** proxy their underlying operations. A coverage-gap audit (`docs/api/coverage-gap.md`, 2026-06-21) surfaced four concrete drift issues:

- `niftypm_list_tasks` omits 15 spec-defined query parameters — including `include_subtasks` and `task_id`, which forces users to bypass the MCP server and call the REST API directly to retrieve subtasks.
- `niftypm_move_document` and `niftypm_attach_task_document` send `POST` where the spec requires `PUT`.
- All six folder tools call deprecated `/api/v1.0/folders` endpoints while the spec documents `/api/v2.0/folders`.
- Users repeatedly expect checklist tools (`create_checklist`, `update_checklist_item`) that the upstream NiftyPM REST API does not expose at all — zero mentions across the 272 KB OpenAPI document.

These are being reported as bugs ("the MCP tool can't do X"), and the param gap in particular has already forced a manual REST workaround. Fixing them now closes the two user-reported issues and prevents future drift.

## What Changes

- **F-1 — Expand `niftypm_list_tasks` parameters**: add 15 spec-defined query params (`include_subtasks`, `task_id`, `meeting_id`, `completed_by`, `include_archived`, `order`, `sort`, `from`, `to`, `archived_from`, `archived_to`, `completed_from`, `completed_to`, `project_ids`, `assignee_ids`). Purely additive — no breaking change. **Closes Issue 1.**
- **F-2 — Implement checklist tools**: the NiftyPM web app uses an **undocumented API** at `api.niftypm.com/checklists` that supports full checklist and checklist-item CRUD. This was verified empirically on 2026-06-22 by creating, reading, updating, completing, and deleting checklists and items against the live API using the authenticated `teamToken` (see `docs/api/checklist-api-discovery.md` for the complete API reference). The public OpenAPI spec at `openapi.niftypm.com` has zero checklist mentions, but the web app's internal API fully supports them. **Closes Issue 2.**
- **F-3 — Migrate folder tools to v2**: update all six folder tools from `/api/v1.0/folders` to `/api/v2.0/folders`, aligning path-param naming (`{folder_id}` → `{folderId}`).
- **F-4 — Correct HTTP methods**: change `niftypm_move_document` and `niftypm_attach_task_document` from `POST` to `PUT` to match the spec.

No **BREAKING** changes: all modifications are additive (new params) or corrective (method/version alignment on existing tools).

## Capabilities

### New Capabilities

- `checklist-tools`: Full checklist management via the undocumented `api.niftypm.com/checklists` endpoint. Covers creating checklists on tasks, adding/updating/completing/deleting checklist items, and reading checklists with their items. The API reference was discovered empirically (see `docs/api/checklist-api-discovery.md`).

### Modified Capabilities

- `niftypm-mcp-remaining-tools`: The existing "Complete OpenAPI Tool Parity" requirement is tightened. The current requirement only mandates tool *existence* per endpoint; it must also require that each tool faithfully proxies its operation — exposing all spec-defined query parameters, using the spec-defined HTTP method, and targeting the spec-documented API version. This covers F-1, F-3, and F-4.

## Impact

- **Code**:
  - `src/tools/tasks.ts` — `ListTasksSchema` gains 15 fields; `niftypm_attach_task_document` switches `client.post` → `client.put`.
  - `src/tools/documents.ts` — `niftypm_move_document` switches `client.post` → `client.put`.
  - `src/tools/folders.ts` — all six tools update path prefix `/api/v1.0/folders` → `/api/v2.0/folders` and align path-param names.
  - **`src/tools/checklists.ts`** (NEW) — checklist and checklist-item CRUD tools targeting `api.niftypm.com/checklists`.
  - **`src/client.ts`** — the `NiftyPMClient` must support a second API base URL (`api.niftypm.com`) for checklist calls, since it differs from the current `openapi.niftypm.com` base. This is the most significant architectural change in this proposal.
- **Tests** (`test/tools/` and `test/regression-api-contract.test.ts`):
  - New: `list-tasks-params.test.ts` — verify each new param is forwarded to the client.
  - New: `folders-v2.test.ts` — verify all folder tools target `/api/v2.0/folders`.
  - Extend: existing contract tests to assert `move_document` and `attach_task_document` use `PUT`.
- **Documentation**:
  - `README.md` — new "Upstream API limitations" section (F-2).
  - `docs/guides/tools.md` (or `docs/guides/workflow.md`) — checklist workaround callout.
  - `docs/api/coverage-gap.md` — already written; this change implements its recommended fix order.
- **Dependencies**: none — every target endpoint/method/version is already in the OpenAPI spec; no new upstream capability is required.
- **Risk**: F-3 (folder v1→v2) is the only item that could regress if NiftyPM's v2 endpoints have different request/response shapes than v1. A live API smoke test is recommended before merge (see `design.md`).
