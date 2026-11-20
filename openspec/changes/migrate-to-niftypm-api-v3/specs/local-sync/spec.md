## MODIFIED Requirements

### Requirement: Mutation interception
The `NiftyPMClient` SHALL support an optional `onMutation` callback that is invoked after every successful POST, PUT, PATCH, or DELETE request. The callback SHALL receive the HTTP method, endpoint URL, request body, and response body. GET requests SHALL NOT trigger the callback. The callback SHALL be invoked asynchronously and SHALL NOT block the tool response or throw errors into the calling context.

#### Scenario: Mutation triggers callback
- **WHEN** a `PATCH /api/v3/tasks/abc123` request succeeds
- **THEN** the `onMutation` callback is invoked with `{method: "PATCH", endpoint: "/api/v3/tasks/abc123", requestBody: {...}, responseBody: {...}}`

#### Scenario: Action endpoint triggers callback
- **WHEN** a `POST /api/v3/tasks/abc123/labels` request succeeds
- **THEN** the `onMutation` callback is invoked with the method `POST` and that endpoint

#### Scenario: GET request does not trigger callback
- **WHEN** a `GET /api/v3/tasks/abc123` request succeeds
- **THEN** the `onMutation` callback is NOT invoked

#### Scenario: Callback error does not affect tool result
- **WHEN** the `onMutation` callback throws an error during execution
- **THEN** the error is logged to stderr and the original tool response is returned unchanged to the MCP client

### Requirement: Targeted entity refetch
After a mutation, the system SHALL determine the affected entity type from the endpoint URL pattern and refetch only that entity type for the affected project. The refetch SHALL use the v3 list endpoint for that entity type and follow `nextCursor` until `hasMore` is false. The system SHALL write the refetched records in the existing mirror file format, so mirror files keep their keys and layout.

#### Scenario: Task mutation refetches tasks
- **WHEN** a mutation hits `/api/v3/tasks` (POST) or `/api/v3/tasks/{id}` (PATCH/DELETE)
- **THEN** the system refetches all tasks for the affected project via `GET /api/v3/tasks?projectId=X`
- **AND** the system keeps tasks with no `parentTaskId` as top-level tasks, as the legacy mirror did
- **AND** the system updates the `tasks` section in the local JSON

#### Scenario: List mutation refetches milestones and lists in one collection
- **WHEN** a mutation hits `/api/v3/lists` or `/api/v3/lists/{id}`
- **THEN** the system refetches lists via `GET /api/v3/lists?projectId=X`, which returns both milestones (`isMilestone` true) and plain lists
- **AND** the system updates the `milestones` section

#### Scenario: Status mutation refetches task lists
- **WHEN** a mutation hits `/api/v3/statuses` or `/api/v3/statuses/{id}`
- **THEN** the system refetches statuses via `GET /api/v3/statuses?projectId=X` and updates the `task_lists` section

#### Scenario: Unmapped endpoint skips sync
- **WHEN** a mutation hits an endpoint that does not match any known entity type pattern (e.g., `/api/v3/webhooks`)
- **THEN** the system skips the sync for that mutation and logs a debug message to stderr

### Requirement: Project ID resolution
The system SHALL determine which project was affected by a mutation using this resolution chain, in order: (1) check the response body for a `projectId`, `project` or `project_id` field, (2) check the request body for a `projectId` or `project_id` field, (3) scan local JSON files for the entity ID extracted from the URL path, (4) skip silently if no project can be determined.

#### Scenario: Project ID from response body
- **WHEN** a `POST /api/v3/tasks` response contains `{"id": "task123", "projectId": "proj456"}`
- **THEN** the system resolves the project ID as `"proj456"` and syncs to the corresponding local JSON file

#### Scenario: Project ID from request body
- **WHEN** a `POST /api/v3/statuses` request body contains `{"projectId": "proj456", "name": "Backlog"}` and the response does not contain a project field
- **THEN** the system resolves the project ID as `"proj456"` from the request body

#### Scenario: Project ID from local JSON scan
- **WHEN** a `PATCH /api/v3/tasks/task123` request is made and neither the response nor request body contains a project ID, but a local JSON file contains a task with `id: "task123"`
- **THEN** the system resolves the project ID from the local JSON file containing that task ID

#### Scenario: Project ID unresolvable skips sync
- **WHEN** a mutation is made and no project ID can be determined through any resolution step
- **THEN** the system logs a message to stderr and skips the sync without failing the mutation
