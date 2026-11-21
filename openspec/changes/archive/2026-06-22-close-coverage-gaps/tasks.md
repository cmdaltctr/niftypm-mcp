## 1. F-1 — Expand `niftypm_list_tasks` parameters (closes Issue 1)

- [x] 1.1 Audit `test/tools/tasks.test.ts` and `test/regression-api-contract.test.ts` for any hardcoded parameter-list assertions that would break when the schema grows
- [x] 1.2 Add the 15 missing spec-defined query parameters to `ListTasksSchema` in `src/tools/tasks.ts`: `include_subtasks`, `task_id`, `meeting_id`, `completed_by`, `include_archived`, `order`, `sort`, `from`, `to`, `archived_from`, `archived_to`, `completed_from`, `completed_to`, `project_ids` (array), `assignee_ids` (array)
- [x] 1.3 Verify the existing `execute` body already forwards `params` wholesale to `client.get("/api/v1.0/tasks", params)`; if not, adjust to pass the new fields through
- [x] 1.4 Create `test/tools/list-tasks-params.test.ts` asserting that each of the 15 new params is forwarded to the client as a query parameter (implements spec scenario *"Tool exposes all spec-defined query parameters"* and *"List tasks supports subtask inclusion"*)
- [x] 1.5 Run `bun run test` and confirm the tasks suite is green

## 2. F-4 — Correct POST → PUT on `move_document` and `attach_task_document`

- [x] 2.1 In `src/tools/documents.ts`, change `niftypm_move_document` from `client.post("/api/v1.0/docs/{document_id}/move_to_project", ...)` to `client.put(...)`
- [x] 2.2 In `src/tools/tasks.ts`, change `niftypm_attach_task_document` from `client.post("/api/v1.0/tasks/{task_id}/documents", ...)` to `client.put(...)`
- [x] 2.3 Extend `test/regression-api-contract.test.ts` to assert both tools invoke `client.put` (implements spec scenario *"Document and task attachment tools use PUT"*)
- [x] 2.4 Run `bun run test` and confirm green

## 3. F-3 — Migrate folder tools from v1 to v2

- [x] 3.1 Manually smoke-test each of the six folder tools against live `/api/v2.0/folders` endpoints in a staging NiftyPM account (`create`, `get`, `get_by_id`, `get_children`, `update`, `delete`); record any shape differences
- [x] 3.2 If 3.1 surfaces shape differences, raise an open question and split this section into per-tool fixes before proceeding
- [x] 3.3 In `src/tools/folders.ts`, update all six tools' URL templates from `/api/v1.0/folders` to `/api/v2.0/folders`
- [x] 3.4 Align path-param template naming with the spec where cosmetic-only (`{folder_id}` → `{folderId}` in the URL template only; keep `folder_id` as the MCP argument name per design D5)
- [x] 3.5 Create `test/tools/folders-v2.test.ts` asserting every folder tool targets the `/api/v2.0/folders` prefix (implements spec scenarios *"Tool targets the spec-documented API version"* and *"Folder tools target the v2 API"*)
- [x] 3.6 Run `bun run test` and confirm green

## 4. F-2 — Implement checklist tools (closes Issue 2)

- [x] 4.1 Extend `NiftyPMClient` (`src/client.ts`) to support a second API base URL (`api.niftypm.com`) for checklist calls, keeping `openapi.niftypm.com` for all existing tools. Add a `requestInternal(method, path, body?)` method or equivalent that targets `api.niftypm.com` with the `teamToken` auth.
- [x] 4.2 Create `src/tools/checklists.ts` with `registerChecklistsTools()` and register it in `src/index.ts` behind a new `enabledTools.checklists` config flag.
- [x] 4.3 Implement `niftypm_create_checklist` — `POST /checklists` with `{task_id, name}` → returns `{id, name, order, task_id}` (implements spec scenario *"Create a checklist on a task"*)
- [x] 4.4 Implement `niftypm_get_checklist` — `GET /checklists/{id}` → returns `{id, name, items[], createdAt, updatedAt}` (implements spec scenario *"Get a checklist with its items"*)
- [x] 4.5 Implement `niftypm_update_checklist` — `PUT /checklists/{id}` with `{name}` (implements spec scenario *"Update a checklist name"*)
- [x] 4.6 Implement `niftypm_delete_checklist` — `DELETE /checklists/{id}` (implements spec scenario *"Delete a checklist"*)
- [x] 4.7 Implement `niftypm_create_checklist_items` — `POST /checklists/{id}` with body **`[{name}]`** (ARRAY of items — this is critical, single object causes SQL error) (implements spec scenario *"Create checklist item(s)"*)
- [x] 4.8 Implement `niftypm_update_checklist_item` — `PUT /checklists/{cid}/{iid}` with `{name}` (implements spec scenario *"Update a checklist item name"*)
- [x] 4.9 Implement `niftypm_toggle_checklist_item` — `PUT /checklists/{cid}/{iid}` with `{completed: boolean}` (implements spec scenario *"Toggle checklist item completion"*)
- [x] 4.10 Implement `niftypm_delete_checklist_item` — `DELETE /checklists/{cid}/{iid}` (implements spec scenario *"Delete a checklist item"*)
- [x] 4.11 Create `test/tools/checklists.test.ts` covering all 8 tools with mocked `api.niftypm.com` responses, including the array-body edge case for item creation
- [x] 4.12 Add a config entry for `checklists` in `enabledTools` and `disabledTools` in `src/config.ts`, defaulting to enabled
- [x] 4.13 Run `bun run test` and confirm all checklist tests pass

## 5. Verification and wrap-up

- [x] 5.1 Re-run the coverage-gap analysis script against the updated source; confirm coverage remains 116/117 and that F-1/F-3/F-4 no longer appear as drift
- [x] 5.2 Run the full test suite (`bun run test`) end-to-end
- [x] 5.3 Manually walk through every spec scenario in `specs/niftypm-mcp-remaining-tools/spec.md` and confirm each is satisfied by the implementation
- [x] 5.4 Manually walk through every spec scenario in `specs/checklist-tools/spec.md` and confirm each is satisfied by the implementation
- [x] 5.5 Update `docs/api/coverage-gap.md` to mark F-1, F-3, and F-4 as resolved and F-2 as implemented; re-commit
- [ ] 5.6 Open the change for review (or run `/openspec-archive-change` once merged)
