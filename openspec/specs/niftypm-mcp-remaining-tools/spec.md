# NiftyPM MCP Remaining Tools Specification

## Purpose

Complete NiftyPM MCP tool coverage for authenticated OpenAPI operations not
implemented by the prior expansion change, including file uploads, file
metadata and label operations, message heard state, milestone task association,
subteam membership operations, and bulk task deletion.

## Requirements

### Requirement: File Upload Support

The MCP server SHALL provide a `niftypm_upload_files` tool that uploads one or
more files to a NiftyPM project, task, or document via `POST /api/v1.0/files`
using `multipart/form-data`. The underlying client SHALL support multipart
request bodies in both the Node and Cloudflare Worker runtimes.

#### Scenario: Upload files to a task

- **WHEN** the user calls `niftypm_upload_files` with file content and a target
  `task_id` (and required `project_id`/`doc_id` query parameters as applicable)
- **THEN** the MCP server SHALL send a `multipart/form-data` request to
  `POST /api/v1.0/files`
- **AND** the response SHALL include the uploaded file records

#### Scenario: Missing required target

- **WHEN** the user calls `niftypm_upload_files` without any of the required
  target identifiers
- **THEN** the MCP server SHALL reject the request with a validation error before
  calling the API

### Requirement: File Update Support

The MCP server SHALL provide a `niftypm_update_file` tool that updates file
metadata via `PUT /api/v1.0/files/{file_id}`, supporting `folder_id`,
`folder_stack`, and `annotations_task_id` fields.

#### Scenario: Move a file to a folder

- **WHEN** the user calls `niftypm_update_file` with a valid `file_id` and a
  `folder_id`
- **THEN** the MCP server SHALL update the file metadata
- **AND** the response SHALL include the updated file identifier

### Requirement: File Label Management

The MCP server SHALL provide `niftypm_add_file_labels` and
`niftypm_remove_file_labels` tools that add or remove labels on a file via `PUT`
and `DELETE /api/v1.0/files/{file_id}/labels` respectively, sending the
`labels` array in the request body.

#### Scenario: Add labels to a file

- **WHEN** the user calls `niftypm_add_file_labels` with a valid `file_id` and a
  non-empty `labels` array
- **THEN** the MCP server SHALL add the labels to the file
- **AND** the response SHALL include the updated label list

#### Scenario: Remove labels from a file

- **WHEN** the user calls `niftypm_remove_file_labels` with a valid `file_id` and
  a `labels` array
- **THEN** the MCP server SHALL remove those labels from the file
- **AND** the response SHALL include the remaining label list

### Requirement: Mark Message Heard

The MCP server SHALL provide a `niftypm_mark_message_heard` tool that marks a
message as heard via `POST /api/v1.0/messages/{message_id}/hear`.

#### Scenario: Mark a message as heard

- **WHEN** the user calls `niftypm_mark_message_heard` with a valid `message_id`
- **THEN** the MCP server SHALL mark the message as heard
- **AND** the response SHALL confirm the operation

### Requirement: Move Milestone to Project

The MCP server SHALL provide a `niftypm_move_milestone` tool that moves a
milestone to another project via
`PUT /api/v1.0/milestones/{milestone_id}/move_to_project`, sending the target
`project_id` in the request body.

#### Scenario: Move a milestone

- **WHEN** the user calls `niftypm_move_milestone` with a valid `milestone_id`
  and target `project_id`
- **THEN** the MCP server SHALL move the milestone to the specified project
- **AND** the response SHALL confirm the move

### Requirement: Milestone Task Association

The MCP server SHALL provide `niftypm_tie_milestone_tasks` and
`niftypm_untie_milestone_tasks` tools that associate or dissociate a list of
tasks with a milestone via `PUT` and
`DELETE /api/v1.0/milestones/{milestone_id}/tasks` respectively. Each tool takes
a `task_ids` array and sends it as the `tasks` array in the request body.

#### Scenario: Tie tasks to a milestone

- **WHEN** the user calls `niftypm_tie_milestone_tasks` with a valid
  `milestone_id` and a non-empty `task_ids` array
- **THEN** the MCP server SHALL associate those tasks with the milestone
- **AND** the response SHALL include the associated task list

#### Scenario: Untie tasks from a milestone

- **WHEN** the user calls `niftypm_untie_milestone_tasks` with a valid
  `milestone_id` and a `task_ids` array
- **THEN** the MCP server SHALL remove those tasks from the milestone
- **AND** the response SHALL include the remaining associated task list

### Requirement: Subteam Member Management

The MCP server SHALL provide `niftypm_add_subteam_members` and
`niftypm_remove_subteam_members` tools that add or remove members on a
subteam/portfolio via `PUT` and `DELETE /api/v1.0/subteams/{subteam_id}/members`
respectively, sending a `members_ids` array in the request body.

#### Scenario: Add members to a subteam

- **WHEN** the user calls `niftypm_add_subteam_members` with a valid
  `subteam_id` and a non-empty `members_ids` array
- **THEN** the MCP server SHALL add those members to the subteam
- **AND** the response SHALL confirm the update

#### Scenario: Remove members from a subteam

- **WHEN** the user calls `niftypm_remove_subteam_members` with a valid
  `subteam_id` and a `members_ids` array
- **THEN** the MCP server SHALL remove those members from the subteam
- **AND** the response SHALL confirm the update

### Requirement: Leave Subteam

The MCP server SHALL provide a `niftypm_leave_subteam` tool that allows the
authenticated member to leave a subteam/portfolio via
`POST /api/v1.0/subteams/{subteam_id}/leave`.

#### Scenario: Leave a subteam

- **WHEN** the user calls `niftypm_leave_subteam` with a valid `subteam_id`
- **THEN** the MCP server SHALL remove the authenticated member from the subteam
- **AND** the response SHALL confirm the operation

### Requirement: Bulk Task Deletion

The MCP server SHALL provide a `niftypm_delete_tasks` tool that deletes multiple
tasks in one request via `DELETE /api/v1.0/tasks`, sending a `task_ids` array
(and optional `project_id`) in the request body.

#### Scenario: Delete multiple tasks

- **WHEN** the user calls `niftypm_delete_tasks` with a non-empty `task_ids`
  array
- **THEN** the MCP server SHALL delete the specified tasks
- **AND** the response SHALL confirm the deletion

#### Scenario: Empty task list rejected

- **WHEN** the user calls `niftypm_delete_tasks` with an empty `task_ids` array
- **THEN** the MCP server SHALL reject the request with a validation error before
  calling the API

### Requirement: Complete OpenAPI Tool Parity

The MCP server SHALL expose an MCP tool for every callable NiftyPM OpenAPI operation except the unauthenticated `/` health-check endpoint. Each tool SHALL faithfully proxy its underlying operation: it SHALL expose every spec-defined query parameter as an MCP argument, use the spec-defined HTTP method, and target the spec-documented API version path. `docs/guides/tools.md` SHALL document each tool in its domain table.

#### Scenario: Documentation reflects implemented tools

- **WHEN** a reviewer compares `docs/guides/tools.md` against the registered tool names
- **THEN** every registered `niftypm_*` tool SHALL appear in the guide
- **AND** every authenticated OpenAPI operation SHALL map to exactly one documented tool

#### Scenario: Tool exposes all spec-defined query parameters

- **WHEN** a reviewer compares a tool's Zod parameter schema against the OpenAPI operation's `parameters` list
- **THEN** every spec-defined query parameter SHALL be exposed as an optional MCP argument
- **AND** the tool SHALL forward each provided argument to the underlying HTTP call as a query parameter

#### Scenario: Tool uses the spec-defined HTTP method

- **WHEN** a reviewer inspects a tool's `execute` body
- **THEN** the `NiftyPMClient` method (`get` / `post` / `put` / `delete` / `patch`) SHALL match the OpenAPI operation's verb exactly

#### Scenario: Tool targets the spec-documented API version

- **WHEN** a reviewer inspects a tool's URL template
- **THEN** the path version prefix (for example `/api/v1.0/` versus `/api/v2.0/`) SHALL match the version that the OpenAPI spec documents for that operation

#### Scenario: List tasks supports subtask inclusion

- **WHEN** a user calls `niftypm_list_tasks` with `include_subtasks=true` and a `task_id`
- **THEN** the MCP server SHALL forward both parameters to `GET /api/v1.0/tasks`
- **AND** the response SHALL include subtasks under the matching task, with no second REST call required

#### Scenario: Folder tools target the v2 API

- **WHEN** a reviewer inspects any folder tool's URL template (`niftypm_create_folder`, `niftypm_get_folder`, `niftypm_get_folder_by_id`, `niftypm_get_folder_children`, `niftypm_update_folder`, `niftypm_delete_folder`)
- **THEN** the path prefix SHALL be `/api/v2.0/folders`
- **AND** SHALL NOT be `/api/v1.0/folders`

#### Scenario: Document and task attachment tools use PUT

- **WHEN** a reviewer inspects the `execute` body of `niftypm_move_document` and `niftypm_attach_task_document`
- **THEN** both tools SHALL call `client.put(...)` against their respective spec-documented endpoints
- **AND** SHALL NOT call `client.post(...)`

