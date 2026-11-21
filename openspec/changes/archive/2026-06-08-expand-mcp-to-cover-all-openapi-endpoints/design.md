# Design: Expand MCP to Cover All OpenAPI Endpoints

## Architecture Overview
Extend the existing FastMCP-based architecture with new tool registration modules for each missing domain, maintaining the current pattern of:
1. Tool registration functions per domain
2. Configurable tool enabling/disabling
3. Consistent error handling via NiftyPMClient

## Design Decisions

### 1. Tool Naming Convention
**Decision:** Use `niftypm_<verb>_<resource>` pattern consistently
**Rationale:** Maintains existing convention, enables intuitive discovery, supports tool filtering
**Examples:**
- `niftypm_list_projects` (was `ProjectAPIController_getProejcts`)
- `niftypm_create_webhook` (was `WebhookApiController_addWebhook`)
- `niftypm_get_time_report` (was `TimeController_getTimeReport`)

### 2. Tool Organization
**Decision:** One TypeScript file per domain, matching OpenAPI tag grouping
**Rationale:** Logical separation, easier maintenance, aligns with API structure
**Files to create:**
- `src/tools/apps.ts` - Apps domain (2 tools)
- `src/tools/auth.ts` - Authentication (1 tool)
- `src/tools/chat.ts` - Chat domain (2 tools)
- `src/tools/fields.ts` - Custom fields (2 tools)
- `src/tools/folders.ts` - Folder management (6 tools)
- `src/tools/invite.ts` - Invite links (1 tool)
- `src/tools/members.ts` - Team members (2 tools)
- `src/tools/projects.ts` - Projects (11 tools)
- `src/tools/templates.ts` - Templates (1 tool)
- `src/tools/time.ts` - Time tracking (2 tools)
- `src/tools/users.ts` - User info (1 tool)
- `src/tools/webhooks.ts` - Webhooks (4 tools)

### 3. Configuration Extension
**Decision:** Add enable/disable flags for each new domain
**Rationale:** Allows gradual rollout, prevents tool overload, maintains backward compatibility
**Implementation:** Extend `NiftyPMConfig.enabledTools` with new boolean flags

### 4. Parameter Validation
**Decision:** Use JSON Schema for all tool parameters
**Rationale:** Type safety, automatic validation, clear documentation
**Implementation:** Define schema objects in tool definitions, leverage FastMCP validation

### 5. Error Handling
**Decision:** Centralize error handling in NiftyPMClient
**Rationale:** Consistent error messages, easier debugging, reduces code duplication
**Enhancement:** Add domain-specific error messages for better context

## Data Flow
```
User Request → MCP Tool → NiftyPMClient → NiftyPM API → Response → User
```

## API Mapping

### High-Value Domains (Priority 1)
1. **Projects** (11 tools) - Core project management
2. **Tasks** (13 missing tools) - Task operations expansion
3. **Folders** (6 tools) - File organization

### Medium-Value Domains (Priority 2)
4. **Members** (2 tools) - Team management
5. **Webhooks** (4 tools) - Integration setup
6. **Time** (2 tools) - Time tracking

### Low-Value Domains (Priority 3)
7. **Apps** (2 tools) - Application management
8. **Fields** (2 tools) - Custom field management
9. **Chat** (2 tools) - Communication
10. **Invite** (1 tool) - Collaboration
11. **Templates** (1 tool) - Project templates
12. **Users** (1 tool) - User information
13. **Auth** (1 tool) - Token refresh

## Security Considerations
1. **Token Refresh:** Auth tool requires secure token storage
2. **Webhook Secrets:** Sensitive data handling for webhook configuration
3. **Permission Checks:** Tools should respect NiftyPM role-based access

## Performance Impact
1. **Startup Time:** Minimal increase with lazy tool registration
2. **Memory Usage:** ~2KB per tool definition (negligible)
3. **API Calls:** No change in request patterns

## Testing Strategy
1. **Unit Tests:** Mock NiftyPMClient responses for each tool
2. **Integration Tests:** Test against real API with test data
3. **Validation Tests:** Verify parameter validation and error handling
4. **Documentation Tests:** Ensure examples work correctly

## Migration Path
1. **Backward Compatible:** Existing tools remain unchanged
2. **Gradual Rollout:** New domains enabled via configuration
3. **Deprecation:** None required - all additions are new tools

## Implementation Phases

### Phase 1: Core Expansion (Week 1)
- Projects (11 tools)
- Folders (6 tools)
- Members (2 tools)

### Phase 2: Task Expansion (Week 2)
- Complete Tasks domain (13 missing tools)
- TaskGroups completion (2 missing tools)
- Documents completion (5 missing tools)

### Phase 3: Integration Tools (Week 3)
- Webhooks (4 tools)
- Time tracking (2 tools)
- Fields (2 tools)

### Phase 4: Support Tools (Week 4)
- Apps, Chat, Invite, Templates, Users, Auth (9 tools)
- Configuration and documentation updates
- Test coverage completion

## Open Questions
1. Should we implement batch operations for bulk task management?
2. How to handle real-time updates (WebSocket support)?
3. Should we add tool versioning for API changes?