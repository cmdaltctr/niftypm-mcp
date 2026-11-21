# Tasks: Complete Remaining OpenAPI Tool Coverage

## 1. Client multipart support

- [x] 1.1 Add a `formUpload<T>(endpoint, formData, query?)` method to `NiftyPMClient` in `src/client.ts` that sends `multipart/form-data` (do not set `Content-Type` manually — let `fetch`/`FormData` set the boundary), reusing the existing Bearer auth + 401-refresh retry logic
- [x] 1.2 Ensure `formUpload` works in both Node 18+ and Cloudflare Worker runtimes (use native `FormData`/`Blob`, no Node-only APIs)
- [x] 1.3 Add unit tests in `test/client.test.ts` covering a successful multipart upload and a 401-refresh-then-retry path

## 2. Files domain (4 tools) — `src/tools/files.ts`

- [x] 2.1 Implement `niftypm_upload_files` (`POST /api/v1.0/files`, multipart) — accept Base64 file content + filename + MIME type + required target query params (`project_id`, `task_id`, `doc_id`), decode to `Blob`, build `FormData`, call `client.formUpload`; reject when no target identifier is provided
- [x] 2.2 Implement `niftypm_update_file` (`PUT /api/v1.0/files/{file_id}`) with `folder_id`, `folder_stack`, `annotations_task_id` params
- [x] 2.3 Implement `niftypm_add_file_labels` (`PUT /api/v1.0/files/{file_id}/labels`) sending `{ labels: string[] }`
- [x] 2.4 Implement `niftypm_remove_file_labels` (`DELETE /api/v1.0/files/{file_id}/labels`) sending `{ labels: string[] }` via the client's DELETE-with-body option

## 3. Messages domain (1 tool) — `src/tools/messages.ts`

- [x] 3.1 Implement `niftypm_mark_message_heard` (`POST /api/v1.0/messages/{message_id}/hear`)

## 4. Milestones domain (3 tools) — `src/tools/milestones.ts`

- [x] 4.1 Implement `niftypm_move_milestone` (`PUT /api/v1.0/milestones/{milestone_id}/move_to_project`) sending `{ project_id }`
- [x] 4.2 Implement `niftypm_tie_milestone_tasks` (`PUT /api/v1.0/milestones/{milestone_id}/tasks`) — accept `task_ids: string[]`, map to `{ tasks: [...] }` in the body
- [x] 4.3 Implement `niftypm_untie_milestone_tasks` (`DELETE /api/v1.0/milestones/{milestone_id}/tasks`) — accept `task_ids: string[]`, map to `{ tasks: [...] }` via DELETE-with-body

## 5. Subteams domain (3 tools) — `src/tools/subteams.ts`

- [x] 5.1 Implement `niftypm_add_subteam_members` (`PUT /api/v1.0/subteams/{subteam_id}/members`) sending `{ members_ids: string[] }`
- [x] 5.2 Implement `niftypm_remove_subteam_members` (`DELETE /api/v1.0/subteams/{subteam_id}/members`) sending `{ members_ids: string[] }` via DELETE-with-body
- [x] 5.3 Implement `niftypm_leave_subteam` (`POST /api/v1.0/subteams/{subteam_id}/leave`)

## 6. Tasks domain (1 tool) — `src/tools/tasks.ts`

- [x] 6.1 Implement `niftypm_delete_tasks` (`DELETE /api/v1.0/tasks`) — accept `task_ids: string[]` (min 1) and optional `project_id`, send as JSON body; reject empty array with a validation error

## 7. Tests

- [x] 7.1 Add/extend unit tests in `test/tools/files.test.ts` for the 4 new file tools (including upload validation failure)
- [x] 7.2 Add unit tests for `niftypm_mark_message_heard` in `test/tools/messages.test.ts`
- [x] 7.3 Add unit tests for the 3 milestone tools in `test/tools/milestones.test.ts`
- [x] 7.4 Add unit tests for the 3 subteam tools in `test/tools/subteams.test.ts`
- [x] 7.5 Add unit tests for `niftypm_delete_tasks` (including empty-array rejection) in `test/tools/tasks.test.ts`
- [x] 7.6 Run `bun test` (or the project test runner) and confirm coverage stays above the existing threshold

## 8. Documentation

- [x] 8.1 Add the 4 new file tools to the Files table in `docs/guides/tools.md`
- [x] 8.2 Add `niftypm_mark_message_heard` to the Messages table
- [x] 8.3 Add the 3 milestone tools to the Milestones table
- [x] 8.4 Add the 3 subteam tools to the Subteams/portfolios table
- [x] 8.5 Add `niftypm_delete_tasks` to the Tasks table
- [x] 8.6 Update the tool count in `README.md` (104 → 116) if a count is referenced, and add a short `niftypm_upload_files` Base64 usage example to `docs/guides/tools.md`

## 9. Verification

- [x] 9.1 Run `rtk grep -rhoE '"niftypm_[a-z_]+"' src/tools | sort -u | wc -l` and confirm 116 tools registered
- [x] 9.2 Cross-check every authenticated OpenAPI operationId has a corresponding tool (only `AppController_getHello` excluded)
- [x] 9.3 Run the build/typecheck and confirm no new errors are introduced
- [x] 9.4 Run `openspec validate complete-remaining-openapi-tools` and confirm it passes
