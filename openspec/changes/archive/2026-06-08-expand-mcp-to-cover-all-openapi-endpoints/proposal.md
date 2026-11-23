# Proposal: Expand MCP to Cover All OpenAPI Endpoints

## Problem Statement
The current NiftyPM MCP server only exposes 44 tools covering 8 domains (labels, files, tasks, milestones, messages, taskgroups, documents, subteams), while the OpenAPI specification defines 117 operations across ~20 domains. This leaves 73 operations (62%) unimplemented, making the MCP incomplete for comprehensive NiftyPM integration.

## Current State
- **Existing Tools (44):**
  - Labels: 5 tools (list, get, create, update, delete)
  - Files: 4 tools (list, get, delete, copy) - missing upload, edit, addLabels, removeLabels
  - Tasks: 7 tools (list, get, create, update, delete, complete, archive) - missing 13 operations
  - Milestones: 6 tools (list, get, create, update, delete, archive) - missing 3 operations
  - Messages: 6 tools (list, get, create, update, delete, mark_seen) - complete
  - TaskGroups: 5 tools (list, get, create, update, delete) - missing 2 operations
  - Documents: 6 tools (list, get, create, update, delete, move) - missing 5 operations
  - SubTeams: 5 tools (list, get, create, update, delete) - missing 3 operations

## Missing Domains (11 operations)
- **Apps:** 2 operations (list, get)
- **Authentication:** 1 operation (refresh token)
- **Chat:** 2 operations (list chats, get chat)
- **Fields:** 2 operations (list, get)
- **Folders:** 6 operations (create, get children, get by id, update, delete, get)
- **Invite:** 1 operation (list invite links)
- **Members:** 2 operations (list, get)
- **Projects:** 11 operations (list, create, get, update, delete, invite, leave, start, addField, getFields, updateField)
- **Templates:** 1 operation (list templates)
- **Time:** 2 operations (get report, get duration)
- **Users:** 1 operation (get current user)
- **Webhooks:** 3 operations (list, create, delete, update)

## Proposed Solution
Expand the MCP server to cover all 117 OpenAPI operations, organized by domain with appropriate tool naming and parameter validation.

## Benefits
1. **Complete API Coverage:** Users can access all NiftyPM features through the MCP
2. **Consistent Experience:** Uniform tool naming and parameter handling across all domains
3. **Better AI Integration:** Comprehensive tools enable more powerful AI workflows
4. **Reduced Workarounds:** Eliminates need for direct API calls for missing operations

## Success Criteria
- All 117 OpenAPI operations have corresponding MCP tools
- Tool naming follows consistent `niftypm_<action>_<resource>` pattern
- All tools include proper parameter validation and error handling
- Documentation covers all new tools with examples
- Test coverage maintains >80% for new code

## Scope
- **In Scope:** All OpenAPI operations except internal/infrastructure endpoints
- **Out of Scope:** Rate limiting implementation (handled at API level), OAuth flow automation (requires user interaction)

## Risks
- **Complexity:** 73 new tools may overwhelm users; mitigation: enable/disable via config
- **Maintenance:** Larger codebase requires more testing; mitigation: automated OpenAPI sync
- **Performance:** More tools may affect MCP startup; mitigation: lazy loading where possible