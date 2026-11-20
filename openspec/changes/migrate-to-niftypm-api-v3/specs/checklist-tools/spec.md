## MODIFIED Requirements

### Requirement: Checklist Management Tools

The MCP server SHALL provide tools for full checklist CRUD through the public NiftyPM v3 API at `https://openapi.niftypm.com/api/v3/checklists`. The server SHALL authenticate with the configured API token. It SHALL NOT need the browser team token.

#### Scenario: Create a checklist on a task

- **WHEN** the user calls `niftypm_create_checklist` with a `task_id` and a `name`
- **THEN** the MCP server SHALL send `POST /api/v3/checklists` with body `{"taskId": "...", "name": "..."}` and an `Idempotency-Key` header
- **AND** the response SHALL include the created checklist with `id`, `name`, `order` and `taskId`

#### Scenario: Get a checklist with its items

- **WHEN** the user calls `niftypm_get_checklist` with a `checklist_id`
- **THEN** the MCP server SHALL send `GET /api/v3/checklists/{checklist_id}`
- **AND** the server SHALL read all items with `GET /api/v3/checklist-items` filtered by `checklistId[eq]`, following `nextCursor` until `hasMore` is false
- **AND** the response SHALL include the checklist fields and an `items` array

#### Scenario: Update a checklist name

- **WHEN** the user calls `niftypm_update_checklist` with a `checklist_id` and `name`
- **THEN** the MCP server SHALL send `PATCH /api/v3/checklists/{checklist_id}` with body `{"name": "..."}`

#### Scenario: Delete a checklist

- **WHEN** the user calls `niftypm_delete_checklist` with a `checklist_id`
- **THEN** the MCP server SHALL send `DELETE /api/v3/checklists/{checklist_id}`
- **AND** the response SHALL confirm removal

### Requirement: Checklist Item Management Tools

The MCP server SHALL provide tools for creating, updating, completing, and deleting individual items within a checklist through the v3 `/api/v3/checklist-items` endpoints.

#### Scenario: Create checklist item(s)

- **WHEN** the user calls `niftypm_create_checklist_items` with a `checklist_id` and one or more item `names`
- **THEN** the MCP server SHALL send one `POST /api/v3/checklist-items` per item, with body `{"checklistId": "...", "name": "..."}` and its own `Idempotency-Key`
- **AND** the response SHALL list each created item with `id`, `name`, `order`, `completed` and `checklistId`
- **AND** the response SHALL list each item that failed, with the reason

#### Scenario: Update a checklist item name

- **WHEN** the user calls `niftypm_update_checklist_item` with `checklist_id`, `item_id`, and `name`
- **THEN** the MCP server SHALL send `PATCH /api/v3/checklist-items/{item_id}` with body `{"name": "..."}`

#### Scenario: Toggle checklist item completion

- **WHEN** the user calls `niftypm_toggle_checklist_item` with `checklist_id`, `item_id`, and `completed` (boolean)
- **THEN** the MCP server SHALL send `PATCH /api/v3/checklist-items/{item_id}` with body `{"completed": true|false}`

#### Scenario: Delete a checklist item

- **WHEN** the user calls `niftypm_delete_checklist_item` with `checklist_id` and `item_id`
- **THEN** the MCP server SHALL send `DELETE /api/v3/checklist-items/{item_id}`
- **AND** the response SHALL confirm removal

## REMOVED Requirements

### Requirement: Dual API Base URL Support

**Reason**: The v3 public API has checklist and checklist-item endpoints (https://developers.niftypm.com/docs/api/v3/checklist and https://developers.niftypm.com/docs/api/v3/checklistitem). The private `api.niftypm.com` host and its 90-day team token are no longer needed.

**Migration**: Checklist tools call `https://openapi.niftypm.com/api/v3` with the API token. Operators can delete `.secrets/team_token` and `NIFTYPM_TEAM_TOKEN` after the cut-over.
