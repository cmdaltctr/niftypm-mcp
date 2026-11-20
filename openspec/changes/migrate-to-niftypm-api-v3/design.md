## Context

See `proposal.md` for the reasons. This section records the current state and the research evidence.

### Current state (main at `41b38ed`, release 2.0.0)

- `src/client.ts` sends every request to `https://openapi.niftypm.com` (`config.baseUrl`). Checklist tools use `internalGet`, `internalPost`, `internalPut` and `internalDelete`, which send to `https://api.niftypm.com` with the team token (`.secrets/team_token`, 90-day life).
- The client has `get`, `post`, `put`, `delete` and `formUpload`. It has no `patch`. It hides error bodies and shows only the status text. It does not handle `429` on `main`. The open branch `fix/rate-limit-retry-after` adds a `Retry-After` message without a retry.
- 125 tools in 21 files under `src/tools/`. Each tool makes one request today.
- Two tools already use v3 (ADR-001): `niftypm_get_document` and `niftypm_get_document_content`. They return upstream camelCase fields unchanged.
- `src/sync-data.ts` reads v1.0 `tasks`, `labels`, `taskgroups`, `milestones` (two calls, one with `is_list=true`), `members` and `projects/{id}` with `limit` and `offset`. `src/local-sync.ts` matches only `/api/v1.0/...` paths and only `POST`, `PUT` and `DELETE`.
- ADR-001 found that the v3 task list returns subtasks next to parents (101 rows: 48 parents and 53 subtasks). The mirror keeps legacy top-level semantics.

### Research evidence (20 November 2026)

- v3 OpenAPI description, version 0.154.0: https://developers.niftypm.com/docs/api/v3/0.154.0/nifty-v3-openapi.json (SHA-256 `08804f8ce2bcee9b3d657f176e8c864b0af7b8171828a1e3dce51870312afe7e`). 150 paths, 238 operations.
- Resource renames and resources without a v3 counterpart: https://developers.niftypm.com/docs/getting-started#migrating-from-v1
- v1.0 sunset on 1 September 2027: https://developers.niftypm.com/docs/versioning
- Rate limits: https://developers.niftypm.com/docs/rate-limits
- Error codes, including `rate_limited`, `stale_write`, `idempotency_key_reuse` and `idempotency_in_progress`: https://developers.niftypm.com/docs/errors
- Checklists: https://developers.niftypm.com/docs/api/v3/checklist and https://developers.niftypm.com/docs/api/v3/checklistitem
- Two read-only calls with the existing API token, on 20 November 2026: `GET /api/v3/checklists?limit=1` and `GET /api/v3/checklist-items?limit=1`. Both returned `200` with the envelope keys `data`, `hasMore`, `limit`, `nextCursor` and `total`. Item rows have `checklistId`, `completed`, `name` and `order`. No write was sent, so the `checklists:write` and `checklist-items:write` scopes are not yet proven for this token.

## Goals / Non-Goals

**Goals:**

- Every tool with a v3 counterpart calls v3 before the cut-over date.
- Agents and skills call the same tool names with the same input names.
- The team token and the private API host are not needed.
- The local mirror files keep their format.

**Non-Goals:**

- New tools for v3-only resources (goals, check-ins, reminders, roles, favourites and others).
- Restore tools for soft-deleted records.
- Pacing requests from the `X-RateLimit-Remaining` header.
- Removal of the 23 tools that stay on v1.0 or v2.0. A follow-up change decides their future before 1 September 2027.

## Decisions

### Decision 1: One v3 request layer in the client

Add v3 support inside `NiftyPMClient`, beside the current methods:

- `v3Get`, `v3Post`, `v3Patch`, `v3Delete` and `v3List`. They build `/api/v3/...` paths.
- `v3List` reads one page and returns `{ data, hasMore, nextCursor }`. A helper `v3ListAll` follows `nextCursor` until `hasMore` is false. Only sync code and multi-call tools use `v3ListAll`. It refuses an empty page that claims more rows and refuses repeated IDs, as the current sync code does.
- Errors: parse the RFC 7807 body. Build the message from `status`, `code` and `title`, plus `detail` cut to 300 characters. If the body is not valid problem-details JSON, use the status text only, as today.
- `PATCH` triggers the mutation callback, the same as `PUT`.

Alternative considered: a separate `NiftyPMV3Client` class. Rejected, because both versions share the token, the `401` handling and the mutation callback, and the two-version period is short.

### Decision 2: Keep v1.0 only where v3 has no counterpart

The legacy methods stay for the 23 tools listed under "No v3 counterpart" below. Each such tool gets the sentence "Uses the legacy v1.0 API, which stops on 1 September 2027." at the end of its description, so that agents can see the risk.

### Decision 3: Keep tool input names, map them inside each domain

Agents, skills and the `SKILLS/` folder call tools with snake_case inputs such as `task_group_id`, `milestone_id` and `story_points`. Renaming them would break those callers for no gain to the user.

Each domain file gets one small mapping function from tool input to the v3 body or query. Common mappings:

| Tool input | v3 field |
| --- | --- |
| `project_id` | `projectId` (body) or `projectId` / `projectId[eq]` (query) |
| `task_group_id` | `statusId` |
| `milestone_id` | `listId` |
| `task_id` (on create, parent) | `parentTaskId` |
| `dependency` | `dependencyId` (one predecessor) |
| `story_points` | `storyPoints` (number) |
| `due_date`, `start_date` | `dueAt`, `startAt` |
| `labels`, `assignees` (on create) | `labels`, `assignees` (seed the set) |
| `completed`, `archived` | `completed`, `archived` |
| `subteam_id` | portfolio `id` |
| `field_id` + value | `customFields` entry `{ customFieldId, value }` |

A tool input that has no v3 field (for example `meeting_id` or `include_subtasks` on `niftypm_list_tasks`) causes a clear error. It is not dropped without notice. The build task for each domain lists these inputs from the v3 spec.

Alternative considered: rename the inputs to camelCase. Rejected, as above.

### Decision 4: Return the v3 record shape

Migrated tools return the v3 records as NiftyPM sends them (camelCase). List tools return `{ data, hasMore, nextCursor }`. ADR-001 set this precedent for documents.

Alternative considered: map each response back to snake_case. Rejected as the default: it needs a reverse map for every resource, it hides new v3 fields, and it must change each time NiftyPM adds a field. This is a breaking change for callers that read response keys, so the release is a major version (3.0.0). See open question 1.

### Decision 5: Cursor replaces offset on list tools

v3 has no offset. List tools keep `limit` (1 to 200, v3 default 50) and gain an optional `cursor`. A non-zero `offset` returns an error that names `cursor`.

### Decision 6: Idempotency keys on every v3 create

The client sends `Idempotency-Key: <random UUID>` on every v3 `POST`. The key is made once per tool-level request. If `fetch` fails with no HTTP response, or v3 answers `500`, `502`, `503` or `504`, the client sends the same request once more with the same key. NiftyPM then returns the first result for up to 10 minutes and does not make a duplicate. `idempotency_in_progress` and `idempotency_key_reuse` errors go to the user through Decision 1. Bun and Workers both have `crypto.randomUUID()`.

### Decision 7: Report `429` with the wait, do not retry

v3 blocks for 10 to 60 minutes after a limit. A retry inside one tool call does not help and holds the MCP client. The client returns an error with the wait from `Retry-After` (or body `retryAfter`). This matches the open fix on `fix/rate-limit-retry-after`, which merges first.

Limits to plan for, per token:

| Method | v1.0 | v3 |
| --- | --- | --- |
| `GET` | 1,000 per 5 minutes | 3,000 per 5 minutes |
| `POST` | 50 per minute | 200 per minute (500 and 200 buckets) |
| `PUT` / `PATCH` | 50 per minute | 100 per minute (100 and 200 buckets) |
| `DELETE` | 10 per minute | 200 per 10 minutes, plus 200 per 10 minutes per IP |

The rate-limit page also says "200 `PATCH` per minute" in its prose. Its table gives a first bucket of 100. Plan for 100.

Multi-call tools (bulk delete, move many tasks, tie tasks to a list, create several checklist items) stop at the first `429`. They report which items finished and which did not (spec requirement "Multi-call tools report each item").

### Decision 8: Checklists move to v3, the team token goes

v3 has `/checklists` and `/checklist-items` with create, read, update, delete and list (evidence above). The existing API token reads both. The plan:

1. Move the 8 checklist tools to v3 behind the same tool names.
2. Run the operator-approved write check (task 13.3) on a scratch task.
3. When the check passes, remove `internalBaseUrl`, the `internal*` methods, `NIFTYPM_TEAM_TOKEN` and the `team_token` secret file loading.

If the write check fails with `403`, the token lacks a write scope. The fix is a new token with the scope, not a return to the private API.

`niftypm_create_checklist_items` sends one `POST` per item, because v3 creates one item per request. `niftypm_get_checklist` makes two reads (checklist, then items filtered by `checklistId[eq]`).

### Decision 9: Local mirror keeps its format

- `fetchCollection` moves to `v3ListAll` with `limit=200` and cursor paging. The `members` bare-array exception goes, because v3 members are paginated.
- Collections: `tasks` to `/tasks?projectId=`, `taskgroups` to `/statuses?projectId=`, the two milestone calls to one `/lists?projectId=` call (it returns both `isMilestone` true and false), `labels` to `/labels`, `members` to `/members`, project to `/projects/{id}`.
- A mapping step converts v3 rows to the mirror's existing keys (for example `parentTaskId` to the subtask structure, `listId` to `milestone`, `statusId` to `task_group`). Tasks with a `parentTaskId` go under their parent, so the top-level task list keeps the legacy semantics (ADR-001).
- `storyPoints` is a number on v3. Existing mirrors may hold legacy string estimates. The merge keeps a string only when the fresh value is null.
- `src/local-sync.ts` matches `/api/v3/(tasks|statuses|lists|labels|projects)` paths and the `PATCH` method, plus the v3 action paths (`/tasks/{id}/labels`, `/tasks/{id}/assignees`, and their `/remove` forms).
- All safety rules from ADR-001 stay: consent through `NIFTYPM_AUTO_SYNC=true`, per-file queue, path checks, refusal of empty or malformed pages.

### Decision 10: Rollout order

1. Merge `fix/rate-limit-retry-after`.
2. Client layer (Decision 1, 6, 7) with tests.
3. Checklists, because this removes the 90-day token dependency.
4. Read tools, domain by domain.
5. Write tools, domain by domain.
6. Local mirror and mutation interception.
7. Legacy-only tool descriptions, docs, ADR-002, baseline spec updates.
8. Live read-only smoke check, approved write check, cut-over.

Each step is one commit with its tests. The server stays usable after each commit, because each tool moves as a unit.

## Endpoint mapping

Inventory method: every `client.*(...)` call in `src/tools/*.ts`, `src/sync-data.ts`, `src/local-sync.ts`, `src/config.ts` and `src/client.ts` on `main` at `41b38ed`. Paths below drop the `/api/v1.0`, `/api/v2.0` and `/api/v3` prefixes. "1:1" means one v3 call. "Multi" means two or more v3 calls or a changed request shape. All v3 list calls use cursor paging (`limit`, `cursor`, `nextCursor`, `hasMore`) instead of `limit` and `offset`. All v3 fields are camelCase.

Summary: 125 tools. 79 map 1:1. 20 are multi. 23 have no v3 counterpart. 2 are on v3 already. 1 (`niftypm_refresh_token`, `POST /oauth/token`) is not versioned and does not change.

### Tasks (`src/tools/tasks.ts`, 23 tools)

| Tool | Now | v3 | Kind | Notes |
| --- | --- | --- | --- | --- |
| list_tasks | GET v1 /tasks | GET /tasks | 1:1 | `project_id`→`projectId`, `task_group_id`→`statusId[eq]`, `milestone_id`→`listId[eq]`, `completed`→`completed[eq]`; v3 list includes subtasks; several v1 filters have no v3 field |
| get_task | GET v1 /tasks/{id} | GET /tasks/{id} | 1:1 | `?expand=` available |
| create_task | POST v1 /tasks | POST /tasks | 1:1 | see Decision 3; `story_points`→`storyPoints` |
| update_task | PUT v1 /tasks/{id} | PATCH /tasks/{id} | 1:1 | `dependency`→`dependencyId`; never send whole `labels`/`assignees` |
| delete_task | DELETE v1 /tasks/{id} | DELETE /tasks/{id} | 1:1 | soft delete |
| delete_tasks | DELETE v1 /tasks (bulk) | DELETE /tasks/{id} each | Multi | per-item result; DELETE limit 200 per 10 minutes |
| complete_task | POST v1 /tasks/{id}/complete | PATCH /tasks/{id} `{completed}` | 1:1 | |
| archive_task | POST v1 /tasks/{id}/archive | PATCH /tasks/{id} `{archived}` | 1:1 | |
| get_personal_tasks | GET v1 /tasks/personal | GET /tasks?scope=personal | 1:1 | |
| create_personal_task | POST v1 /tasks/personal | POST /tasks without `projectId` | 1:1 | |
| link_task | POST v1 /tasks/{id}/link_task | POST /tasks/{id}/connected-tasks | 1:1 | scope `tasks:link`; confirm semantics in the build |
| update_task_milestone | PUT v1 /tasks/{id}/milestone | PATCH /tasks/{id} `{listId}` | 1:1 | |
| move_task | POST v1 /tasks/{id}/moveOrder | PATCH /tasks/{id} `{statusId, order}` | Multi | fractional `order` needs neighbour reads |
| move_tasks | POST v1 /tasks/move | PATCH /tasks/{id} each | Multi | per-item result |
| assign_task | PUT v1 /tasks/{id}/assignees | POST /tasks/{id}/assignees | 1:1 | adds to set |
| unassign_task | DELETE v1 /tasks/{id}/assignees | POST /tasks/{id}/assignees/remove | 1:1 | |
| add_task_labels | PUT v1 /tasks/{id}/labels | POST /tasks/{id}/labels | 1:1 | |
| remove_task_labels | DELETE v1 /tasks/{id}/labels | POST /tasks/{id}/labels/remove | 1:1 | |
| add_task_field | POST v1 /tasks/{id}/fields | PATCH /tasks/{id} `{customFields}` | Multi | confirm whether `customFields` merges or replaces |
| get_task_fields | GET v1 /tasks/{id}/fields | GET /tasks/{id}?expand=customFields | 1:1 | |
| update_task_field | PUT v1 /tasks/{id}/fields/{fid} | PATCH /tasks/{id} `{customFields}` | Multi | as add_task_field |
| attach_task_document | PUT v1 /tasks/{id}/documents | POST /tasks/{id}/attach-document | 1:1 | |
| clone_task | POST v1 /tasks/{id}/clone | none | No v3 | `POST /tasks/create-tree` is not a clone |

### Task groups to statuses (`taskgroups.ts`, 8 tools)

| Tool | Now | v3 | Kind | Notes |
| --- | --- | --- | --- | --- |
| list_taskgroups | GET v1 /taskgroups | GET /statuses | 1:1 | `project_id`→`projectId` |
| get_taskgroup | GET v1 /taskgroups/{id} | GET /statuses/{id} | 1:1 | |
| create_taskgroup | POST v1 /taskgroups | POST /statuses | 1:1 | requires `name`, `projectId` |
| update_taskgroup | PUT v1 /taskgroups/{id} | PATCH /statuses/{id} | 1:1 | |
| delete_taskgroup | DELETE v1 /taskgroups/{id} | DELETE /statuses/{id} | 1:1 | |
| move_taskgroup_tasks | POST v1 /taskgroups/{id}/move | GET /tasks?statusId[eq] then PATCH each | Multi | per-item result |
| assign_taskgroup_members | PUT v1 /taskgroups/{id}/assignees | POST /statuses/{id}/assignees | 1:1 | |
| unassign_taskgroup_members | DELETE v1 /taskgroups/{id}/assignees | POST /statuses/{id}/assignees/remove | 1:1 | |

### Milestones to lists (`milestones.ts`, 9 tools)

| Tool | Now | v3 | Kind | Notes |
| --- | --- | --- | --- | --- |
| list_milestones | GET v1 /milestones | GET /lists | 1:1 | v1 `is_list` becomes `isMilestone[eq]` (inverted meaning) |
| get_milestone | GET v1 /milestones/{id} | GET /lists/{id} | 1:1 | |
| create_milestone | POST v1 /milestones | POST /lists `{isMilestone: true}` | 1:1 | `start`/`end` required for milestones |
| update_milestone | PUT v1 /milestones/{id} | PATCH /lists/{id} | 1:1 | |
| delete_milestone | DELETE v1 /milestones/{id} | DELETE /lists/{id} | 1:1 | |
| archive_milestone | POST v1 /milestones/{id}/archive | PATCH /lists/{id} `{archived}` | 1:1 | |
| move_milestone | PUT v1 /milestones/{id}/move_to_project | none | No v3 | `projectId` is immutable on v3 |
| tie_milestone_tasks | PUT v1 /milestones/{id}/tasks | PATCH /tasks/{id} `{listId}` each | Multi | per-item result |
| untie_milestone_tasks | DELETE v1 /milestones/{id}/tasks | PATCH /tasks/{id} `{listId: null}` each | Multi | per-item result |

### Checklists (`checklists.ts`, 8 tools, private API now)

| Tool | Now | v3 | Kind | Notes |
| --- | --- | --- | --- | --- |
| create_checklist | POST private /checklists | POST /checklists | 1:1 | `task_id`→`taskId` |
| get_checklist | GET private /checklists/{id} | GET /checklists/{id} + GET /checklist-items?checklistId[eq] | Multi | |
| update_checklist | PUT private /checklists/{id} | PATCH /checklists/{id} | 1:1 | |
| delete_checklist | DELETE private /checklists/{id} | DELETE /checklists/{id} | 1:1 | |
| create_checklist_items | POST private /checklists/{id} (array) | POST /checklist-items each | Multi | `checklistId` in body |
| update_checklist_item | PUT private /checklists/{id}/{item} | PATCH /checklist-items/{item} | 1:1 | |
| toggle_checklist_item | PUT private /checklists/{id}/{item} | PATCH /checklist-items/{item} `{completed}` | 1:1 | |
| delete_checklist_item | DELETE private /checklists/{id}/{item} | DELETE /checklist-items/{item} | 1:1 | |

### Documents (`documents.ts`, 14 tools)

| Tool | Now | v3 | Kind | Notes |
| --- | --- | --- | --- | --- |
| list_documents | GET v1 /docs | GET /documents | 1:1 | |
| get_document | GET v3 /documents/{id} | same | on v3 | ADR-001 |
| get_document_content | GET v3 /documents/{id}/content | same | on v3 | ADR-001 |
| create_document | POST v1 /docs | POST /documents | Multi | `content` becomes a Markdown string; the object schema goes |
| update_document | PUT v1 /docs/{id} | PATCH /documents/{id} + POST /documents/{id}/edit-text or /append | Multi | v3 `PATCH` has no `content` |
| delete_document | DELETE v1 /docs/{id} | DELETE /documents/{id} | 1:1 | |
| move_document | PUT v1 /docs/{id}/move_to_project | none | No v3 | `projectId` is immutable |
| create_personal_document | POST v1 /docs/personal | none | No v3 | v3 documents need `projectId` |
| get_personal_documents | GET v1 /docs/personal | none | No v3 | |
| add_document_members | PUT v1 /docs/{id}/members | none | No v3 | v3 has `accessType` only |
| remove_document_members | DELETE v1 /docs/{id}/members | none | No v3 | |
| change_document | POST v1 /docs/{id}/change | none | No v3 | version change |
| add_document_labels | PUT v1 /docs/{id}/labels | POST /documents/{id}/labels | 1:1 | |
| remove_document_labels | DELETE v1 /docs/{id}/labels | POST /documents/{id}/labels/remove | 1:1 | |

### Projects (`projects.ts`, 11 tools)

| Tool | Now | v3 | Kind | Notes |
| --- | --- | --- | --- | --- |
| list_projects | GET v1 /projects | GET /projects | 1:1 | |
| create_project | POST v1 /projects (multipart) | POST /projects (JSON) | 1:1 | `subteam_id`→`portfolioId` |
| get_project | GET v1 /projects/{id} | GET /projects/{id} | 1:1 | |
| update_project | PUT v1 /projects/{id} | PATCH /projects/{id} | 1:1 | |
| delete_project | DELETE v1 /projects/{id} | DELETE /projects/{id} | 1:1 | |
| invite_to_project | POST v1 /projects/{id}/invite | POST /projects/{id}/members, or POST /members `{email, projectId}` for new people | Multi | |
| leave_project | POST v1 /projects/{id}/leave | GET /members/me then POST /projects/{id}/members/remove | Multi | |
| start_project | POST v1 /projects/{id}/start | none | No v3 | |
| add_project_field | POST v1 /projects/{id}/fields | none | No v3 | v3 custom-field definitions are read-only |
| get_project_fields | GET v1 /projects/{id}/fields | GET /projects/{id}?expand=customFields | Multi | response shape differs |
| update_project_field | PUT v1 /projects/{id}/fields/{fid} | PATCH /projects/{id} `{customFields}` | Multi | |

### Subteams to portfolios (`subteams.ts`, 8 tools)

| Tool | Now | v3 | Kind |
| --- | --- | --- | --- |
| list_subteams | GET v1 /subteams | GET /portfolios | 1:1 |
| get_subteam | GET v1 /subteams/{id} | GET /portfolios/{id} | 1:1 |
| create_subteam | POST v1 /subteams | POST /portfolios | 1:1 |
| update_subteam | PUT v1 /subteams/{id} | PATCH /portfolios/{id} | 1:1 |
| delete_subteam | DELETE v1 /subteams/{id} | DELETE /portfolios/{id} | 1:1 |
| add_subteam_members | PUT v1 /subteams/{id}/members | POST /portfolios/{id}/members | 1:1 |
| remove_subteam_members | DELETE v1 /subteams/{id}/members | POST /portfolios/{id}/members/remove | 1:1 |
| leave_subteam | POST v1 /subteams/{id}/leave | GET /members/me then POST /portfolios/{id}/members/remove | Multi |

### Labels, members, messages, chats, webhooks, fields, time, users

| Tool | Now | v3 | Kind | Notes |
| --- | --- | --- | --- | --- |
| list_labels | GET v1 /labels | GET /labels | 1:1 | |
| get_label | GET v1 /labels/{id} | GET /labels/{id} | 1:1 | |
| create_label | POST v1 /labels | POST /labels | 1:1 | |
| update_label | PUT v1 /labels/{id} | PATCH /labels/{id} | 1:1 | |
| delete_label | DELETE v1 /labels/{id} | DELETE /labels/{id} | 1:1 | |
| list_members | GET v1 /members | GET /members | 1:1 | now paginated |
| get_member | GET v1 /members/{id} | GET /members/{id} | 1:1 | |
| list_messages | GET v1 /messages | GET /messages | 1:1 | |
| get_message | GET v1 /messages/{id} | GET /messages/{id} | 1:1 | |
| create_message | POST v1 /messages | POST /messages | 1:1 | |
| update_message | PUT v1 /messages/{id} | PATCH /messages/{id} | 1:1 | |
| delete_message | DELETE v1 /messages/{id} | DELETE /messages/{id} | 1:1 | |
| mark_message_seen | POST v1 /messages/{id}/see | none | No v3 | |
| mark_message_heard | POST v1 /messages/{id}/hear | none | No v3 | |
| list_chats | GET v1 /chats | GET /chats | 1:1 | |
| get_chat | GET v1 /chats/{id} | GET /chats/{id} | 1:1 | |
| list_webhooks | GET v1 /webhooks/{app_id} | GET /webhooks | 1:1 | `app_id` no longer used |
| create_webhook | POST v1 /webhooks | POST /webhooks | 1:1 | v3 needs `name`, `url`, `events` |
| update_webhook | PUT v1 /webhooks/{id} | PATCH /webhooks/{id} | 1:1 | |
| delete_webhook | DELETE v1 /webhooks/{id} | DELETE /webhooks/{id} | 1:1 | |
| list_custom_fields | GET v1 /fields | GET /custom-fields | 1:1 | |
| get_custom_field | GET v1 /fields/{id} | GET /custom-fields/{id} | 1:1 | |
| get_time_report | GET v1 /time | GET /time-entries | 1:1 | filters change |
| get_time_duration | GET v1 /time/duration | GET /time-entries (all pages), sum in the server | Multi | |
| get_current_user | GET v1 /users/me | GET /members/me | Multi | returns the team member, not the user record |

### Files (`files.ts`, 8 tools) and folders (`folders.ts`, 6 tools)

| Tool | Now | v3 | Kind | Notes |
| --- | --- | --- | --- | --- |
| upload_files | POST v1 /files (multipart) | POST /files/create-from-content (base64) | Multi | one request per file |
| list_files | GET v1 /files | GET /files | 1:1 | |
| get_file | GET v1 /files/{id} | GET /files/{id} | 1:1 | |
| delete_file | DELETE v1 /files/{id} | DELETE /files/{id} | 1:1 | |
| update_file | PUT v1 /files/{id} | PATCH /files/{id} | 1:1 | |
| copy_file | POST v1 /files/{id}/copy | none | No v3 | |
| add_file_labels | PUT v1 /files/{id}/labels | POST /files/{id}/labels | 1:1 | |
| remove_file_labels | DELETE v1 /files/{id}/labels | POST /files/{id}/labels/remove | 1:1 | |
| get_folder, create_folder, get_folder_by_id, get_folder_children, update_folder, delete_folder | v2.0 /folders | none | No v3 (6) | v3 `/project-folders` groups projects; it is not the in-project folder tree |

### No v3 counterpart (23 tools stay on v1.0 or v2.0)

apps (`list_apps`, `get_app`), templates (`list_templates`), invites (`list_invite_links`), folders on v2.0 (6 tools), `clone_task`, `move_milestone`, `move_document`, `create_personal_document`, `get_personal_documents`, `add_document_members`, `remove_document_members`, `change_document`, `copy_file`, `mark_message_seen`, `mark_message_heard`, `start_project`, `add_project_field`.

### Sync code

| Caller | Now | v3 |
| --- | --- | --- |
| `fetchCollection("tasks")` | GET v1 /tasks?project_id&limit&offset | GET /tasks?projectId&limit=200&cursor |
| `fetchCollection("taskgroups")` | GET v1 /taskgroups?project_id | GET /statuses?projectId |
| `fetchMilestones` (two calls) | GET v1 /milestones?project_id[&is_list=true] | GET /lists?projectId (one call) |
| `fetchCollection("labels")` | GET v1 /labels | GET /labels |
| `fetchCollection("members")` | GET v1 /members (unpaginated) | GET /members (cursor) |
| `fetchProject` | GET v1 /projects/{id} | GET /projects/{id} |
| `endpointInfo` in `local-sync.ts` | matches `/api/v1.0/(tasks|taskgroups|milestones|labels|projects)` | matches `/api/v3/(tasks|statuses|lists|labels|projects)` and action paths |

## Risks / Trade-offs

- [Response shape change breaks callers that read snake_case keys] → Major release, changelog entry, and an update of the `SKILLS/` folder in the same change. Open question 1 lets the operator choose the other option.
- [The API token lacks a v3 write scope] → Task 13.3 tests one write per scope on a scratch task before cut-over. Fix: issue a token with the scopes.
- [v2.0 folders have no published sunset date and no v3 counterpart] → Keep them on v2.0. Ask NiftyPM (team@niftypm.com) about the v2.0 date. Open question 3.
- [Multi-call tools are not atomic] → Per-item results (spec), stop at the first `429`, idempotency keys on creates.
- [Fractional `order` for `move_task` needs neighbour reads] → Two extra `GET` calls per move. `GET` budget is 3,000 per 5 minutes, so the cost is small.
- [`customFields` on `PATCH` may replace the whole set] → The build checks the v3 spec text first. If it replaces, the tool reads the current values and sends the merged set.
- [v3 adds fields without notice] → Return records as received. Do not validate unknown keys (the v3 docs ask clients to ignore unknown keys).
- [The two-version period doubles the client paths] → The period ends at cut-over. A follow-up change removes the v1.0 code once the last legacy tool goes.
- [Local mirror regressions] → Keep every ADR-001 regression test. Add v3 fixtures for the same cases (wrapped collections, empty pages, repeated IDs, subtasks next to parents).

## Migration Plan

1. Build after the operator's other experiment ends. Target start: January 2027.
2. Merge each domain as its tests pass. Release as 3.0.0 when all migrated domains are in.
3. Cut-over target: **31 March 2027**. On that date every tool with a v3 counterpart calls v3, the team token is removed, and the live smoke check has passed.
4. Latest acceptable cut-over: **1 June 2027**. This leaves three months before the v1.0 sunset.
5. Rollback: revert the release commit. v1.0 serves until 1 September 2027, so a rollback before that date restores the old behaviour. Keep `.secrets/team_token` until the write check passes, so the old checklist path can run after a rollback.
6. Follow-up change before 1 August 2027: decide the future of the 23 legacy-only tools.

## Decisions confirmed by the operator (2026-11-20)

1. **Response shape.** Migrated tools return v3 camelCase records (Decision 4). This is a major release (3.0.0).
2. **Legacy-only tools.** Keep the 23 tools on v1.0 until 1 September 2027. Remove them in a follow-up change.
3. **v2.0 folders.** Keep the 6 folder tools on v2.0. The operator accepts the risk that NiftyPM publishes no v2.0 end date.
4. **Change location.** Track `openspec/` in git. The `openspec/` line is removed from `.gitignore` on branch `feat/v3-migration-plan`.
