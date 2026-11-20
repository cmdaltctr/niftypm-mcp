## Purpose

Define how the MCP server calls the NiftyPM v3 REST API, and when it still calls the legacy v1.0 and v2.0 APIs, so that tools keep working after v1.0 stops on 1 September 2027.

## ADDED Requirements

### Requirement: API version routing

Each tool SHALL call `https://openapi.niftypm.com/api/v3` when the v3 API has a counterpart operation for it. A tool SHALL call `/api/v1.0` or `/api/v2.0` only when it is on the legacy list in the design document (section "Endpoint mapping"). No tool SHALL call the private host `api.niftypm.com`.

#### Scenario: Tool with a v3 counterpart

- **WHEN** the user calls `niftypm_get_task` with `task_id` `abc123`
- **THEN** the server SHALL send `GET /api/v3/tasks/abc123`
- **AND** the server SHALL NOT send a request to `/api/v1.0/tasks/abc123`

#### Scenario: Tool without a v3 counterpart

- **WHEN** the user calls `niftypm_list_templates`
- **THEN** the server SHALL send `GET /api/v1.0/templates`

#### Scenario: Same credential for both versions

- **WHEN** a v3 request and a v1.0 request run in the same session
- **THEN** both SHALL send the same configured bearer token

### Requirement: Stable tool inputs

Each migrated tool SHALL keep its name and accept the same input parameter names as before the migration. The server SHALL convert those inputs to the v3 field names before it sends the request.

#### Scenario: Create a subtask with legacy parameter names

- **WHEN** the user calls `niftypm_create_task` with `name`, `task_group_id` `s1`, `milestone_id` `l1`, `task_id` `p1` and `story_points` `3`
- **THEN** the server SHALL send `POST /api/v3/tasks` with body fields `name`, `statusId` `s1`, `listId` `l1`, `parentTaskId` `p1` and `storyPoints` `3`

#### Scenario: Set a task dependency

- **WHEN** the user calls `niftypm_update_task` with `task_id` `t1` and `dependency` `t0`
- **THEN** the server SHALL send `PATCH /api/v3/tasks/t1` with body `{"dependencyId": "t0"}`

#### Scenario: Unknown legacy parameter

- **WHEN** a tool input has no v3 field
- **THEN** the server SHALL return an error that names the parameter
- **AND** the server SHALL NOT send the request

### Requirement: Partial updates

Update tools on v3 SHALL send `PATCH` with only the fields that the user supplied.

#### Scenario: Rename a label

- **WHEN** the user calls `niftypm_update_label` with `label_id` `lb1` and `name` `Urgent`
- **THEN** the server SHALL send `PATCH /api/v3/labels/lb1` with body `{"name": "Urgent"}`
- **AND** the body SHALL NOT contain other fields

### Requirement: Add and remove set members without replacing the set

Tools that add or remove assignees, labels or members SHALL use the v3 add and remove endpoints. They SHALL NOT send a whole-set field on `PATCH`, because v3 replaces the whole set when that field is present.

#### Scenario: Add a label to a task

- **WHEN** the user calls `niftypm_add_task_labels` with `task_id` `t1` and labels `["lb1"]`
- **THEN** the server SHALL send `POST /api/v3/tasks/t1/labels` with the label IDs
- **AND** labels already on the task SHALL stay on the task

#### Scenario: Remove an assignee from a task

- **WHEN** the user calls `niftypm_unassign_task` with `task_id` `t1` and a member ID
- **THEN** the server SHALL send `POST /api/v3/tasks/t1/assignees/remove` with that ID

### Requirement: Cursor pagination on list tools

List tools on v3 SHALL accept an optional `cursor` input and an optional `limit` input from 1 to 200. They SHALL return the v3 page fields `data`, `hasMore` and `nextCursor`. A non-zero `offset` input SHALL cause an error that tells the user to use `cursor`.

#### Scenario: Read the next page

- **WHEN** the user calls `niftypm_list_tasks` with `project_id` `p1` and `cursor` `c2`
- **THEN** the server SHALL send `GET /api/v3/tasks` with query `projectId=p1` and `cursor=c2`
- **AND** the tool result SHALL contain `data`, `hasMore` and `nextCursor`

#### Scenario: Offset is no longer supported

- **WHEN** the user calls `niftypm_list_tasks` with `offset` `100`
- **THEN** the server SHALL return an error that names `cursor` as the replacement
- **AND** the server SHALL NOT send the request

### Requirement: Problem-details error reporting

When a v3 request fails, the tool error SHALL contain the HTTP status and the problem-details `code` and `title`. It MAY contain `detail`, cut to 300 characters. The error SHALL NOT contain request headers, tokens or the raw response body.

#### Scenario: Record not found

- **WHEN** v3 answers `404` with `code` `resource_not_found`
- **THEN** the tool error SHALL contain `404` and `resource_not_found`

#### Scenario: Body is not problem details

- **WHEN** a v3 error response has no valid JSON body
- **THEN** the tool error SHALL contain the HTTP status and status text only

### Requirement: Idempotent creates

Every v3 `POST` SHALL carry an `Idempotency-Key` header with a new random value for each tool call. When the server sends the same `POST` again inside one tool call, it SHALL reuse the same key.

#### Scenario: Network failure on create

- **WHEN** a v3 `POST /api/v3/tasks` fails with no HTTP response
- **THEN** the server SHALL send the request once more with the same `Idempotency-Key`
- **AND** NiftyPM SHALL NOT create a second task

#### Scenario: Two separate tool calls

- **WHEN** the user calls `niftypm_create_task` two times
- **THEN** the two requests SHALL carry different `Idempotency-Key` values

### Requirement: Rate-limit reporting

When v3 answers `429`, the tool SHALL stop and return an error that states the wait in seconds from `Retry-After` or the body field `retryAfter`. The server SHALL NOT retry inside the same tool call, because NiftyPM blocks for 10 to 60 minutes.

#### Scenario: Rate limited

- **WHEN** v3 answers `429` with `Retry-After: 600`
- **THEN** the tool error SHALL contain `429` and `600`
- **AND** the server SHALL NOT send the request again

### Requirement: Stale-write protection

Update tools on v3 SHALL accept an optional `expected_updated_at` input and send it as `expectedUpdatedAt`. When v3 answers `409` with `code` `stale_write`, the tool error SHALL tell the user to read the record again and repeat the change.

#### Scenario: Record changed by another writer

- **WHEN** the user calls `niftypm_update_task` with `expected_updated_at` and v3 answers `409 stale_write`
- **THEN** the tool error SHALL contain `stale_write`
- **AND** the error SHALL tell the user to read the task again

### Requirement: Multi-call tools report each item

A tool that needs more than one v3 request SHALL return the result of each item. It SHALL list the items that succeeded and the items that failed, with the reason for each failure. It SHALL stop at the first `429`.

#### Scenario: Bulk delete stops at a rate limit

- **WHEN** the user calls `niftypm_delete_tasks` with five task IDs and v3 answers `429` on the third
- **THEN** the result SHALL list two deleted tasks
- **AND** the result SHALL list three tasks as not deleted, with the wait from the `429`
