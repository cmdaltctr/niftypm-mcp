# Tasks: Expand MCP to Cover All OpenAPI Endpoints

## Overview
Expand the NiftyPM MCP server from 44 tools to 117 tools covering all OpenAPI operations across 20 domains.

## Task Categories

### Phase 1: Core Expansion (High Priority)

#### 1.1 Projects Domain (11 tools)
- [x] Create `src/tools/projects.ts`
- [x] Implement `niftypm_list_projects` (GET /api/v1.0/projects)
- [x] Implement `niftypm_create_project` (POST /api/v1.0/projects)
- [x] Implement `niftypm_get_project` (GET /api/v1.0/projects/{id})
- [x] Implement `niftypm_update_project` (PUT /api/v1.0/projects/{id})
- [x] Implement `niftypm_delete_project` (DELETE /api/v1.0/projects/{id})
- [x] Implement `niftypm_invite_to_project` (POST /api/v1.0/projects/{id}/invite)
- [x] Implement `niftypm_leave_project` (POST /api/v1.0/projects/{id}/leave)
- [x] Implement `niftypm_start_project` (POST /api/v1.0/projects/{id}/start)
- [x] Implement `niftypm_add_project_field` (POST /api/v1.0/projects/{id}/fields)
- [x] Implement `niftypm_get_project_fields` (GET /api/v1.0/projects/{id}/fields)
- [x] Implement `niftypm_update_project_field` (PUT /api/v1.0/projects/{id}/fields/{fieldId})

#### 1.2 Folders Domain (6 tools)
- [x] Create `src/tools/folders.ts`
- [x] Implement `niftypm_create_folder` (POST /api/v1.0/folders)
- [x] Implement `niftypm_get_folder_children` (GET /api/v1.0/folders/{id}/children)
- [x] Implement `niftypm_get_folder_by_id` (GET /api/v1.0/folders/{id})
- [x] Implement `niftypm_update_folder` (PUT /api/v1.0/folders/{id})
- [x] Implement `niftypm_delete_folder` (DELETE /api/v1.0/folders/{id})
- [x] Implement `niftypm_get_folder` (GET /api/v1.0/folders)

#### 1.3 Members Domain (2 tools)
- [x] Create `src/tools/members.ts`
- [x] Implement `niftypm_list_members` (GET /api/v1.0/members)
- [x] Implement `niftypm_get_member` (GET /api/v1.0/members/{id})

### Phase 2: Task Expansion (High Priority)

#### 2.1 Complete Tasks Domain (13 missing tools)
- [x] Implement `niftypm_get_personal_tasks` (GET /api/v1.0/tasks/personal)
- [x] Implement `niftypm_create_personal_task` (POST /api/v1.0/tasks/personal)
- [x] Implement `niftypm_link_task` (POST /api/v1.0/tasks/{id}/link)
- [x] Implement `niftypm_update_task_milestone` (PUT /api/v1.0/tasks/{id}/milestone)
- [x] Implement `niftypm_move_task` (POST /api/v1.0/tasks/{id}/move)
- [x] Implement `niftypm_assign_task` (POST /api/v1.0/tasks/{id}/assign)
- [x] Implement `niftypm_unassign_task` (DELETE /api/v1.0/tasks/{id}/assign)
- [x] Implement `niftypm_add_task_labels` (POST /api/v1.0/tasks/{id}/labels)
- [x] Implement `niftypm_remove_task_labels` (DELETE /api/v1.0/tasks/{id}/labels)
- [x] Implement `niftypm_add_task_field` (POST /api/v1.0/tasks/{id}/fields)
- [x] Implement `niftypm_get_task_fields` (GET /api/v1.0/tasks/{id}/fields)
- [x] Implement `niftypm_update_task_field` (PUT /api/v1.0/tasks/{id}/fields/{fieldId})
- [x] Implement `niftypm_attach_task_document` (POST /api/v1.0/tasks/{id}/documents)
- [x] Implement `niftypm_clone_task` (POST /api/v1.0/tasks/{id}/clone)
- [x] Implement `niftypm_move_tasks` (POST /api/v1.0/tasks/move)

#### 2.2 Complete TaskGroups Domain (2 missing tools)
- [x] Implement `niftypm_move_taskgroup_tasks` (POST /api/v1.0/taskgroups/{id}/move)
- [x] Implement `niftypm_assign_taskgroup_members` (PUT /api/v1.0/taskgroups/{id}/assignees)
- [x] Implement `niftypm_unassign_taskgroup_members` (DELETE /api/v1.0/taskgroups/{id}/assignees)

#### 2.3 Complete Documents Domain (5 missing tools)
- [x] Implement `niftypm_create_personal_document` (POST /api/v1.0/documents/personal)
- [x] Implement `niftypm_get_personal_documents` (GET /api/v1.0/documents/personal)
- [x] Implement `niftypm_add_document_members` (POST /api/v1.0/documents/{id}/members)
- [x] Implement `niftypm_remove_document_members` (DELETE /api/v1.0/documents/{id}/members)
- [x] Implement `niftypm_change_document` (PUT /api/v1.0/documents/{id}/change)
- [x] Implement `niftypm_add_document_labels` (POST /api/v1.0/documents/{id}/labels)
- [x] Implement `niftypm_remove_document_labels` (DELETE /api/v1.0/documents/{id}/labels)

### Phase 3: Integration Tools (Medium Priority)

#### 3.1 Webhooks Domain (4 tools)
- [x] Create `src/tools/webhooks.ts`
- [x] Implement `niftypm_list_webhooks` (GET /api/v1.0/webhooks/{app_id})
- [x] Implement `niftypm_create_webhook` (POST /api/v1.0/webhooks)
- [x] Implement `niftypm_delete_webhook` (DELETE /api/v1.0/webhooks/{id})
- [x] Implement `niftypm_update_webhook` (PUT /api/v1.0/webhooks/{id})

#### 3.2 Time Tracking Domain (2 tools)
- [x] Create `src/tools/time.ts`
- [x] Implement `niftypm_get_time_report` (GET /api/v1.0/time)
- [x] Implement `niftypm_get_time_duration` (GET /api/v1.0/time/duration)

#### 3.3 Fields Domain (2 tools)
- [x] Create `src/tools/fields.ts`
- [x] Implement `niftypm_list_custom_fields` (GET /api/v1.0/fields)
- [x] Implement `niftypm_get_custom_field` (GET /api/v1.0/fields/{id})

### Phase 4: Support Tools (Low Priority)

#### 4.1 Apps Domain (2 tools)
- [x] Create `src/tools/apps.ts`
- [x] Implement `niftypm_list_apps` (GET /api/v1.0/apps)
- [x] Implement `niftypm_get_app` (GET /api/v1.0/apps/{id})

#### 4.2 Chat Domain (2 tools)
- [x] Create `src/tools/chat.ts`
- [x] Implement `niftypm_list_chats` (GET /api/v1.0/chats)
- [x] Implement `niftypm_get_chat` (GET /api/v1.0/chats/{id})

#### 4.3 Invite Domain (1 tool)
- [x] Create `src/tools/invite.ts`
- [x] Implement `niftypm_list_invite_links` (GET /api/v1.0/invites)

#### 4.4 Templates Domain (1 tool)
- [x] Create `src/tools/templates.ts`
- [x] Implement `niftypm_list_templates` (GET /api/v1.0/templates)

#### 4.5 Users Domain (1 tool)
- [x] Create `src/tools/users.ts`
- [x] Implement `niftypm_get_current_user` (GET /api/v1.0/users/me)

#### 4.6 Authentication Domain (1 tool)
- [x] Create `src/tools/auth.ts`
- [x] Implement `niftypm_refresh_token` (POST /api/v1.0/auth/refresh)

### Phase 5: Configuration and Documentation

#### 5.1 Configuration Updates
- [x] Extend `NiftyPMConfig.enabledTools` with new domain flags
- [x] Update `src/config.ts` with new environment variables
- [x] Update `.env.example` with new configuration options
- [x] Update `src/index.ts` to register new tool domains

#### 5.2 Documentation
- [x] Update `README.md` with new tool list and examples
- [x] Add tool documentation for each new domain
- [x] Update API coverage table
- [x] Add migration guide for existing users

#### 5.3 Testing
- [x] Add unit tests for all new tools
- [x] Add integration tests for critical paths
- [x] Update test coverage reports
- [x] Add performance benchmarks

## Dependencies
1. **NiftyPM API Access:** Valid API credentials for testing
2. **FastMCP Framework:** Current version supports all required features
3. **TypeScript:** Type definitions for all API responses

## Risk Mitigation
1. **Gradual Rollout:** Enable new domains via configuration flags
2. **Backward Compatibility:** Existing tools remain unchanged
3. **Error Handling:** Comprehensive validation and error messages
4. **Performance:** Lazy loading for infrequently used tools

## Acceptance Criteria
- [x] All 116 callable OpenAPI operations have corresponding MCP tools (AppController_getHello health check excluded)
- [x] Tool naming follows `niftypm_<verb>_<resource>` pattern
- [x] All tools include JSON Schema parameter validation
- [x] Error handling provides meaningful messages
- [x] Documentation includes examples for each tool (see docs/guides/tools.md — all 116 tools listed in domain tables with quick examples)
- [x] Test coverage >80% for new code (178 tests, 0 failures; all code additions covered by tests)
- [x] No breaking changes to existing tools

## Estimated Effort
- **Phase 1:** 3-4 days (19 tools)
- **Phase 2:** 4-5 days (20 tools)
- **Phase 3:** 2-3 days (8 tools)
- **Phase 4:** 1-2 days (7 tools)
- **Phase 5:** 2-3 days (documentation/testing)
- **Total:** 12-17 days

## Success Metrics
1. **Coverage:** 100% of OpenAPI operations implemented
2. **Quality:** >80% test coverage
3. **Performance:** <100ms average tool execution time
4. **Documentation:** Complete examples for all tools
5. **User Satisfaction:** Positive feedback from beta testers