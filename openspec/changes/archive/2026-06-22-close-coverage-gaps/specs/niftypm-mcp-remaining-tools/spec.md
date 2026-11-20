## MODIFIED Requirements

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
