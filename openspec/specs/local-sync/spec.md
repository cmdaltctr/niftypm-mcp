# local-sync Specification

## Purpose

Defines how the running MCP server keeps local project JSON files current: discovering them, intercepting mutations, refetching affected entities and updating the files in place, without breaking Cloudflare Workers builds.

## Requirements

### Requirement: Local JSON auto-discovery
The MCP server SHALL scan `process.cwd()/niftypm/*.json` at startup, read `meta.niftypm_project_id` from each file, and build an in-memory map of `project_id → filepath`. If no JSON files are found, auto-sync SHALL be silently disabled (no error, no warning).

#### Scenario: Auto-discovery finds local JSON
- **WHEN** the MCP server starts in a directory containing `niftypm/project.json` with `meta.niftypm_project_id: "abc123"`
- **THEN** the server builds a map entry `{"abc123": "niftypm/project.json"}` and enables auto-sync for that project

#### Scenario: Auto-discovery with no local JSON disables sync
- **WHEN** the MCP server starts in a directory with no `niftypm/` directory or no `*.json` files inside it
- **THEN** auto-sync is disabled and no sync operations are attempted on mutations

### Requirement: Mutation interception
The `NiftyPMClient` SHALL support an optional `onMutation` callback that is invoked after every successful POST, PUT, or DELETE request. The callback SHALL receive the HTTP method, endpoint URL, request body, and response body. GET requests SHALL NOT trigger the callback. The callback SHALL be invoked asynchronously and SHALL NOT block the tool response or throw errors into the calling context.

#### Scenario: Mutation triggers callback
- **WHEN** a `PUT /api/v1.0/tasks/abc123` request succeeds
- **THEN** the `onMutation` callback is invoked with `{method: "PUT", endpoint: "/api/v1.0/tasks/abc123", requestBody: {...}, responseBody: {...}}`

#### Scenario: GET request does not trigger callback
- **WHEN** a `GET /api/v1.0/tasks/abc123` request succeeds
- **THEN** the `onMutation` callback is NOT invoked

#### Scenario: Callback error does not affect tool result
- **WHEN** the `onMutation` callback throws an error during execution
- **THEN** the error is logged to stderr and the original tool response is returned unchanged to the MCP client

### Requirement: Targeted entity refetch
After a mutation, the system SHALL determine the affected entity type from the endpoint URL pattern and refetch only that entity type for the affected project. The refetch SHALL use the same API calls as the reverse-sync workflow for that entity type.

#### Scenario: Task mutation refetches tasks
- **WHEN** a mutation hits `/api/v1.0/tasks` (POST) or `/api/v1.0/tasks/{id}` (PUT/DELETE)
- **THEN** the system refetches all tasks for the affected project via `GET /api/v1.0/tasks?project_id=X` and updates the `tasks` section in the local JSON

#### Scenario: Milestone mutation refetches both milestone types
- **WHEN** a mutation hits `/api/v1.0/milestones` or `/api/v1.0/milestones/{id}`
- **THEN** the system refetches milestones via both `GET /api/v1.0/milestones?project_id=X` and `GET /api/v1.0/milestones?project_id=X&is_list=true`, merges and deduplicates by ID, and updates the `milestones` section

#### Scenario: Unmapped endpoint skips sync
- **WHEN** a mutation hits an endpoint that does not match any known entity type pattern (e.g., `/api/v1.0/webhooks`)
- **THEN** the system skips the sync for that mutation and logs a debug message to stderr

### Requirement: Project ID resolution
The system SHALL determine which project was affected by a mutation using this resolution chain, in order: (1) check the response body for a `project` or `project_id` field, (2) check the request body for a `project_id` field, (3) scan local JSON files for the entity ID extracted from the URL path, (4) skip silently if no project can be determined.

#### Scenario: Project ID from response body
- **WHEN** a `POST /api/v1.0/tasks` response contains `{"id": "task123", "project": "proj456"}`
- **THEN** the system resolves the project ID as `"proj456"` and syncs to the corresponding local JSON file

#### Scenario: Project ID from request body
- **WHEN** a `POST /api/v1.0/taskgroups` request body contains `{"project_id": "proj456", "name": "Backlog"}` and the response does not contain a project field
- **THEN** the system resolves the project ID as `"proj456"` from the request body

#### Scenario: Project ID from local JSON scan
- **WHEN** a `PUT /api/v1.0/tasks/task123` request is made and neither the response nor request body contains a project ID, but a local JSON file contains a task with `id: "task123"`
- **THEN** the system resolves the project ID from the local JSON file containing that task ID

#### Scenario: Project ID unresolvable skips sync
- **WHEN** a mutation is made and no project ID can be determined through any resolution step
- **THEN** the system logs a message to stderr and skips the sync without failing the mutation

### Requirement: In-place JSON section update
The system SHALL update only the affected section(s) in the local JSON file, preserving all other sections. The `meta.last_synced` timestamp SHALL be updated to the current UTC time on every sync operation. The file SHALL be written atomically (write to temp file, then rename) to prevent corruption from interrupted writes.

#### Scenario: Task update preserves other sections
- **WHEN** a task mutation triggers sync and the local JSON has `labels`, `task_lists`, `milestones`, and `tasks` sections
- **THEN** only the `tasks` section and `meta.last_synced` are updated; `labels`, `task_lists`, `milestones`, and `project` remain unchanged

#### Scenario: Atomic write prevents corruption
- **WHEN** a sync operation writes the updated JSON file
- **THEN** the system writes to a temporary file first and renames it to the target path, ensuring the file is never in a partially-written state

### Requirement: Cloudflare Workers compatibility
The local sync feature SHALL NOT be imported or activated in the Cloudflare Workers entry point (`worker.ts`). The `onMutation` callback SHALL be `undefined` in Workers mode. No `fs` or `path` imports from local-sync code SHALL be present in the Workers bundle.

#### Scenario: Workers mode has no local sync
- **WHEN** the server starts via `worker.ts` (Cloudflare Workers deployment)
- **THEN** no `niftypm/*.json` discovery occurs, no `onMutation` callback is set, and no file system operations are attempted
