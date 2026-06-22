# NiftyPM MCP Tool Reference

Complete reference of all NiftyPM MCP tools, grouped by domain. Load this when you need to find the exact tool for a specific operation.

> **Source**: NiftyPM MCP server (niftypm-mcp) — tools exposed via the `niftypm-mcp_` prefix.
> **NiftyPM Hierarchy**: Workspace → Portfolio → Folder → Project → Task List → Task → Subtask

---

## Portfolio / Subteam Tools

| Tool | Purpose | Key Parameters |
|------|---------|---------------|
| `niftypm_create_subteam` | Create a new portfolio | `name` (required), `description` |
| `niftypm_get_subteam` | Get portfolio by ID | `subteam_id` (required) |
| `niftypm_update_subteam` | Update portfolio name/description | `subteam_id` (required), `name`, `description` |
| `niftypm_delete_subteam` | Delete a portfolio | `subteam_id` (required) |
| `niftypm_list_subteams` | List all portfolios | `limit`, `offset` |
| `niftypm_add_subteam_members` | Add members to portfolio | `subteam_id`, `members_ids[]` |
| `niftypm_remove_subteam_members` | Remove members from portfolio | `subteam_id`, `members_ids[]` |
| `niftypm_leave_subteam` | Current user leaves portfolio | `subteam_id` |

---

## Project Tools

| Tool | Purpose | Key Parameters |
|------|---------|---------------|
| `niftypm_create_project` | Create a new project | `name` (required), `description`, `template_id` |
| `niftypm_get_project` | Get project details by ID | `project_id` (required) |
| `niftypm_update_project` | Update project name/description/status | `project_id` (required), `name`, `description`, `status` |
| `niftypm_delete_project` | Delete a project | `project_id` (required) |
| `niftypm_list_projects` | List all accessible projects | `page`, `per_page` |
| `niftypm_start_project` | Start a project (activate) | `project_id` (required) |
| `niftypm_invite_to_project` | Invite user to project | `project_id`, `user_id`, `role` |
| `niftypm_leave_project` | Current user leaves project | `project_id` |

---

## Task Group / List Tools

| Tool | Purpose | Key Parameters |
|------|---------|---------------|
| `niftypm_create_taskgroup` | Create a task list/status column | `name` (required), `project_id` (required) |
| `niftypm_get_taskgroup` | Get task group details | `taskgroup_id` (required) |
| `niftypm_update_taskgroup` | Rename a task group | `taskgroup_id` (required), `name` |
| `niftypm_delete_taskgroup` | Delete a task group | `taskgroup_id` (required) |
| `niftypm_list_taskgroups` | List task groups in a project | `project_id` |
| `niftypm_assign_taskgroup_members` | Assign members to all tasks in group | `taskgroup_id`, `member_ids[]` |
| `niftypm_unassign_taskgroup_members` | Remove members from all tasks in group | `taskgroup_id`, `member_ids[]` |
| `niftypm_move_taskgroup_tasks` | Move all tasks to another group | `taskgroup_id`, `target_taskgroup_id` |

---

## Task Tools

| Tool | Purpose | Key Parameters |
|------|---------|---------------|
| `niftypm_create_task` | Create task or subtask | `name` (required), `task_group_id` (required), `description`, `assignees[]`, `due_date`, `start_date`, `milestone_id`, `labels[]`, `story_points`, `task_id` (for subtask) |
| `niftypm_get_task` | Get task details by ID | `task_id` (required) |
| `niftypm_update_task` | Update task fields + set blocking dependency | `task_id` (required), `name`, `description`, `due_date`, `start_date`, `dependency` (predecessor ID), `milestone_id`, `assignees[]`, `story_points` |
| `niftypm_delete_task` | Delete a single task | `task_id` (required) |
| `niftypm_delete_tasks` | Delete multiple tasks | `task_ids[]`, `project_id` |
| `niftypm_list_tasks` | List/filter tasks | `project_id`, `task_group_id`, `member_id`, `milestone_id`, `completed`, `archived`, `limit`, `offset` |
| `niftypm_complete_task` | Mark task as done | `task_id` (required) |
| `niftypm_archive_task` | Archive a task | `task_id` (required) |
| `niftypm_clone_task` | Duplicate a task | `task_id` (required), `target_task_group_id`, `name` |
| `niftypm_assign_task` | Assign member to task | `task_id`, `member_id` |
| `niftypm_unassign_task` | Remove member from task | `task_id`, `member_id` |
| `niftypm_move_task` | Move task to different list | `task_id`, `target_task_group_id`, `position` |
| `niftypm_move_tasks` | Move multiple tasks | `task_ids[]`, `target_task_group_id`, `position` |
| `niftypm_link_task` | Informational cross-reference between tasks | `task_id`, `linked_task_id` |
| `niftypm_add_task_labels` | Add labels to task | `task_id`, `label_ids[]` |
| `niftypm_remove_task_labels` | Remove labels from task | `task_id`, `label_ids[]` |
| `niftypm_add_task_field` | Add custom field value | `task_id`, `field_id`, `value` |
| `niftypm_update_task_field` | Update custom field value | `task_id`, `field_id`, `value` |
| `niftypm_get_task_fields` | Get custom fields for task | `task_id` |
| `niftypm_attach_task_document` | Attach document to task | `task_id`, `document_id` |
| `niftypm_update_task_milestone` | Set task milestone | `task_id`, `milestone_id` (omit to remove) |

---

## Milestone Tools

| Tool | Purpose | Key Parameters |
|------|---------|---------------|
| `niftypm_create_milestone` | Create a milestone | `name` (required), `project_id` (required), `due_date`, `description` |
| `niftypm_get_milestone` | Get milestone details | `milestone_id` (required) |
| `niftypm_update_milestone` | Update milestone | `milestone_id` (required), `name`, `due_date`, `description` |
| `niftypm_delete_milestone` | Delete milestone | `milestone_id` (required) |
| `niftypm_archive_milestone` | Archive milestone | `milestone_id` (required) |
| `niftypm_list_milestones` | List milestones in project | `project_id`, `limit`, `offset` |
| `niftypm_tie_milestone_tasks` | Link tasks to milestone | `milestone_id`, `task_ids[]` |
| `niftypm_untie_milestone_tasks` | Unlink tasks from milestone | `milestone_id`, `task_ids[]` |
| `niftypm_move_milestone` | Move milestone to another project | `milestone_id`, `project_id` |

---

## Document Tools

| Tool | Purpose | Key Parameters |
|------|---------|---------------|
| `niftypm_create_document` | Create project document | `title` (required), `project_id` (required), `content` |
| `niftypm_create_personal_document` | Create personal document | `title` (required), `content` |
| `niftypm_get_document` | Get document by ID | `document_id` (required) |
| `niftypm_update_document` | Update document | `document_id` (required), `title`, `content` |
| `niftypm_change_document` | Create new version | `document_id` (required), `content`, `message` |
| `niftypm_delete_document` | Delete document | `document_id` (required) |
| `niftypm_list_documents` | List documents in project | `project_id`, `limit`, `offset` |
| `niftypm_get_personal_documents` | List personal documents | `page`, `per_page` |
| `niftypm_move_document` | Move doc to another project | `document_id`, `destination_project_id` |
| `niftypm_add_document_labels` | Add labels to doc | `document_id`, `label_ids[]` |
| `niftypm_remove_document_labels` | Remove labels from doc | `document_id`, `label_ids[]` |
| `niftypm_add_document_members` | Add collaborators to doc | `document_id`, `member_ids[]` |
| `niftypm_remove_document_members` | Remove collaborators from doc | `document_id`, `member_ids[]` |

---

## File & Folder Tools

| Tool | Purpose | Key Parameters |
|------|---------|---------------|
| `niftypm_upload_files` | Upload files to project/task/doc | `files[]` (required — each with `filename`, `content_base64`, `mime_type`), `project_id`, `task_id`, `doc_id`, `folder_id` |
| `niftypm_get_file` | Get file details | `file_id` (required) |
| `niftypm_list_files` | List files in project/task | `project_id`, `task_id`, `limit`, `offset` |
| `niftypm_update_file` | Update file metadata | `file_id`, `folder_id`, `folder_stack[]`, `annotations_task_id` |
| `niftypm_delete_file` | Delete a file | `file_id` (required) |
| `niftypm_copy_file` | Copy file to another project | `file_id`, `destination_project_id` |
| `niftypm_add_file_labels` | Add labels to file | `file_id`, `labels[]` |
| `niftypm_remove_file_labels` | Remove labels from file | `file_id`, `labels[]` |
| `niftypm_create_folder` | Create a folder | `name` (required), `parent_id`, `project_id` |
| `niftypm_get_folder` | Get root folder structure | `project_id` |
| `niftypm_get_folder_by_id` | Get folder by ID | `folder_id` (required) |
| `niftypm_get_folder_children` | Get folder contents | `folder_id` (required), `page`, `per_page` |
| `niftypm_update_folder` | Update folder name/desc | `folder_id`, `name`, `description` |
| `niftypm_delete_folder` | Delete folder | `folder_id` (required) |

---

## Label / Tag Tools

| Tool | Purpose | Key Parameters |
|------|---------|---------------|
| `niftypm_create_label` | Create a label/tag | `name` (required), `color` (hex), `project_id` |
| `niftypm_get_label` | Get label details | `label_id` (required) |
| `niftypm_update_label` | Update label name/color | `label_id` (required), `name`, `color` |
| `niftypm_delete_label` | Delete a label | `label_id` (required) |
| `niftypm_list_labels` | List all labels | `project_id` |

---

## Member & User Tools

| Tool | Purpose | Key Parameters |
|------|---------|---------------|
| `niftypm_get_current_user` | Get authenticated user | (none) |
| `niftypm_get_member` | Get member by ID | `member_id` (required) |
| `niftypm_list_members` | List all team members | `project_id` |

---

## Messaging & Chat Tools

| Tool | Purpose | Key Parameters |
|------|---------|---------------|
| `niftypm_create_message` | Send a message | `text` (required), `chat_id` (required), `type` ("text", "gif", "document") |
| `niftypm_get_message` | Get message by ID | `message_id` (required) |
| `niftypm_update_message` | Edit a message | `message_id` (required), `text` |
| `niftypm_delete_message` | Delete a message | `message_id` (required) |
| `niftypm_list_messages` | List messages | `chat_id`, `task_id`, `file_id`, `doc_id`, `limit`, `offset` |
| `niftypm_mark_message_seen` | Mark message as seen | `message_id` (required) |
| `niftypm_mark_message_heard` | Mark message as heard | `message_id` (required) |
| `niftypm_get_chat` | Get chat details | `chat_id` (required) |
| `niftypm_list_chats` | List chat conversations | `project_id` |

---

## Custom Field Tools

| Tool | Purpose | Key Parameters |
|------|---------|---------------|
| `niftypm_get_custom_field` | Get field definition | `field_id` (required) |
| `niftypm_list_custom_fields` | List custom field definitions | `project_id` |
| `niftypm_get_project_fields` | Get project custom fields | `project_id` |
| `niftypm_add_project_field` | Add field to project | `project_id`, `field_id`, `value` |
| `niftypm_update_project_field` | Update project field value | `project_id`, `field_id`, `value` |

---

## Time Tracking Tools

| Tool | Purpose | Key Parameters |
|------|---------|---------------|
| `niftypm_get_time_duration` | Get total tracked time | `project_id`, `task_id` |
| `niftypm_get_time_report` | Get time tracking report | `project_id`, `user_id`, `start_date` (YYYY-MM-DD), `end_date` |

---

## Personal Tools

| Tool | Purpose | Key Parameters |
|------|---------|---------------|
| `niftypm_get_personal_tasks` | List personal tasks | `page`, `per_page` |
| `niftypm_create_personal_task` | Create personal task | `name` (required), `description`, `due_date` |

---

## Webhook & Integration Tools

| Tool | Purpose | Key Parameters |
|------|---------|---------------|
| `niftypm_create_webhook` | Create a webhook | `url` (required), `event` (required), `app_id`, `secret` |
| `niftypm_update_webhook` | Update webhook | `webhook_id`, `url`, `event`, `active` |
| `niftypm_delete_webhook` | Delete webhook | `webhook_id` (required) |
| `niftypm_list_webhooks` | List webhooks for app | `app_id` (required) |
| `niftypm_get_app` | Get app details | `app_id` (required) |
| `niftypm_list_apps` | List installed apps | (none) |

---

## Other Tools

| Tool | Purpose | Key Parameters |
|------|---------|---------------|
| `niftypm_list_templates` | List project templates | (none) |
| `niftypm_list_invite_links` | List active invite links | (none) |
| `niftypm_refresh_token` | Refresh auth token | `refresh_token` (required) |

---

## Common Tool Chains

### Create a task with everything:
```
create → assign → add_labels → add_task_field → link_task (dependency) → attach_task_document
```

### Set up a milestone sprint:
```
create_milestone → tie_milestone_tasks → create_task (with milestone_id)
```

### Organise files:
```
create_folder → upload_files (with folder_id) → add_file_labels
```

### Full project setup (research):
```
list_templates → (use template if available) → list_taskgroups → delete/rename defaults → create_taskgroup (×N) → create_milestone → create_task (×N) → tie_milestone_tasks → upload_files → create_document
```

### Full project setup (development):
```
list_templates → create_project → list_taskgroups → reconcile defaults → create_taskgroup (×N) → create_milestone → create_task (with story_points, labels) → update_task (dependency) → tie_milestone_tasks
```

---

## Dependency Patterns

### Within a milestone (enforced blocking):
```
// CORRECT — use update_task with dependency param:
niftypm_update_task(task_id="TASK_B", dependency="TASK_A")
```
Task B cannot be completed until Task A is done. Due dates cascade. **This is the ONLY way to set a TRUE blocking dependency.**

### Cross-project (informational only):
```
// Informational cross-reference only — no blocking behaviour:
niftypm_link_task(task_id="TASK_IN_PROJECT_A", linked_task_id="TASK_IN_PROJECT_B")
```
No enforcement — purely for reference. **`link_task` does NOT create blocking dependencies despite the "link" name.** Only `update_task(dependency=...)` creates actual blockers.

### Setting up a dependency chain (A → B → C):
```
niftypm_update_task(task_id="B_ID", dependency="A_ID")
niftypm_update_task(task_id="C_ID", dependency="B_ID")
```

### Checking what blocks a task:
```
niftypm_get_task(task_id="...") → inspect dependency field in response
```

---

## Error Recovery

| Error | Cause | Recovery |
|-------|-------|----------|
| Task created without task_group_id | Missing required param | Update task with `niftypm_update_task` or delete and recreate |
| Duplicate project/portfolio | Didn't list first | List first, then decide: use existing or rename new one |
| Task not showing on Roadmap | Not tied to milestone | Call `niftypm_tie_milestone_tasks` |
| Dependency not enforcing | Cross-project link used `link_type="blocks"` | Cross-project blocks don't enforce; use "related" instead or restructure |
| Permission denied on portfolio | Not Owner/Admin | Ask workspace owner to create the portfolio, then add you as member |
| Orphaned default task lists | Template created lists you don't need | List taskgroups, delete unused ones with `niftypm_delete_taskgroup` |
