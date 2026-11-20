## ADDED Requirements

### Requirement: Checklist Management Tools

The MCP server SHALL provide tools for full checklist CRUD via the NiftyPM internal API at `api.niftypm.com/checklists`. This endpoint is undocumented in the public OpenAPI spec but was verified empirically (see `docs/api/checklist-api-discovery.md`). The server SHALL use the authenticated `teamToken` for these calls, targeting `api.niftypm.com` as the base URL (not `openapi.niftypm.com`).

#### Scenario: Create a checklist on a task

- **WHEN** the user calls `niftypm_create_checklist` with a `task_id` (internal task ID) and a `name`
- **THEN** the MCP server SHALL send `POST /checklists` with body `{"task_id": "...", "name": "..."}` to `api.niftypm.com`
- **AND** the response SHALL include the created checklist `{id, name, order, task_id}`

#### Scenario: Get a checklist with its items

- **WHEN** the user calls `niftypm_get_checklist` with a `checklist_id`
- **THEN** the MCP server SHALL send `GET /checklists/{checklist_id}` to `api.niftypm.com`
- **AND** the response SHALL include `{id, name, items[], createdAt, updatedAt}`

#### Scenario: Update a checklist name

- **WHEN** the user calls `niftypm_update_checklist` with a `checklist_id` and `name`
- **THEN** the MCP server SHALL send `PUT /checklists/{checklist_id}` with body `{"name": "..."}` to `api.niftypm.com`

#### Scenario: Delete a checklist

- **WHEN** the user calls `niftypm_delete_checklist` with a `checklist_id`
- **THEN** the MCP server SHALL send `DELETE /checklists/{checklist_id}` to `api.niftypm.com`
- **AND** the response SHALL confirm removal

### Requirement: Checklist Item Management Tools

The MCP server SHALL provide tools for creating, updating, completing, and deleting individual items within a checklist.

#### Scenario: Create checklist item(s)

- **WHEN** the user calls `niftypm_create_checklist_items` with a `checklist_id` and one or more item `names`
- **THEN** the MCP server SHALL send `POST /checklists/{checklist_id}` with body `[{"name": "..."}, ...]` (an **array** of item objects) to `api.niftypm.com`
- **AND** the response SHALL include the created items with `{id, name, order, completed, checklist_id}`

#### Scenario: Update a checklist item name

- **WHEN** the user calls `niftypm_update_checklist_item` with `checklist_id`, `item_id`, and `name`
- **THEN** the MCP server SHALL send `PUT /checklists/{checklist_id}/{item_id}` with body `{"name": "..."}` to `api.niftypm.com`

#### Scenario: Toggle checklist item completion

- **WHEN** the user calls `niftypm_toggle_checklist_item` with `checklist_id`, `item_id`, and `completed` (boolean)
- **THEN** the MCP server SHALL send `PUT /checklists/{checklist_id}/{item_id}` with body `{"completed": true|false}` to `api.niftypm.com`

#### Scenario: Delete a checklist item

- **WHEN** the user calls `niftypm_delete_checklist_item` with `checklist_id` and `item_id`
- **THEN** the MCP server SHALL send `DELETE /checklists/{checklist_id}/{item_id}` to `api.niftypm.com`
- **AND** the response SHALL confirm removal

### Requirement: Dual API Base URL Support

The MCP client (`NiftyPMClient`) SHALL support requests to both API base URLs: the existing `openapi.niftypm.com` (for the documented OpenAPI operations) and `api.niftypm.com` (for the undocumented checklist endpoints). The client SHALL route checklist requests to `api.niftypm.com` and all other requests to `openapi.niftypm.com`.

#### Scenario: Checklist tools route to the correct API

- **WHEN** any checklist tool makes an API call
- **THEN** the request SHALL target `https://api.niftypm.com/checklists/...`
- **AND** SHALL NOT target `https://openapi.niftypm.com/api/v1.0/checklists/...`

#### Scenario: Non-checklist tools continue using the existing base URL

- **WHEN** any non-checklist tool (tasks, projects, milestones, etc.) makes an API call
- **THEN** the request SHALL continue targeting `https://openapi.niftypm.com/api/v1.0/...`
