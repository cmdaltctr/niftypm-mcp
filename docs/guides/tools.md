# Tool Guide

This guide documents the NiftyPM MCP tool domains, common usage patterns, and examples. The README stays intentionally short; this file is the practical reference for day-to-day tool use.

## General conventions

- All tools are prefixed with `niftypm_`.
- Tool arguments are validated with Zod schemas before API requests are sent.
- Responses are JSON objects returned by the upstream NiftyPM API.
- Most list tools support filters such as `project_id`, `task_id`, `limit`, or pagination fields where the upstream endpoint supports them.
- Project work usually flows through: project → task group/list → task → subtasks, comments, labels, fields, documents.

## Quick examples

### List projects

```json
{
  "tool": "niftypm_list_projects",
  "arguments": {}
}
```

### Create a task in a task group

```json
{
  "tool": "niftypm_create_task",
  "arguments": {
    "name": "Prepare fellowship report",
    "task_group_id": "task_group_id_here",
    "description": "Draft the report outline and collect evidence."
  }
}
```

### Create related subtasks under a parent task

Use `task_id` to create a subtask. The child task still belongs to a task group, but NiftyPM links it to the parent.

```json
{
  "tool": "niftypm_create_task",
  "arguments": {
    "name": "Collect reviewer feedback",
    "task_group_id": "task_group_id_here",
    "task_id": "parent_task_id_here",
    "description": "Related work tracked as a subtask."
  }
}
```

### Refresh the access token manually

```json
{
  "tool": "niftypm_refresh_token",
  "arguments": {
    "refresh_token": "your_refresh_token"
  }
}
```

The main client also auto-refreshes access tokens in memory when an API call returns `401`.

### Upload a file with Base64 content

`niftypm_upload_files` accepts file content as Base64 so uploads work in both local Node and Cloudflare Worker runtimes.

```json
{
  "tool": "niftypm_upload_files",
  "arguments": {
    "project_id": "project_id_here",
    "task_id": "task_id_here",
    "files": [
      {
        "filename": "notes.txt",
        "mime_type": "text/plain",
        "content_base64": "SGVsbG8gZnJvbSBOaWZ0eVBN"
      }
    ]
  }
}
```

## Domains

### Apps

| Tool | Purpose |
| --- | --- |
| `niftypm_list_apps` | List all installed applications. |
| `niftypm_get_app` | Get a specific app by ID. |

### Authentication

| Tool | Purpose |
| --- | --- |
| `niftypm_refresh_token` | Refresh the authentication token. |

### Chat

| Tool | Purpose |
| --- | --- |
| `niftypm_list_chats` | List all chat conversations. |
| `niftypm_get_chat` | Get a specific chat conversation by ID. |

### Documents

| Tool | Purpose |
| --- | --- |
| `niftypm_list_documents` | List documents in a project. |
| `niftypm_get_document` | Get a document by ID. |
| `niftypm_create_document` | Create a document in a project. |
| `niftypm_update_document` | Update an existing document. |
| `niftypm_delete_document` | Delete a document. |
| `niftypm_move_document` | Move a document to another project. |
| `niftypm_create_personal_document` | Create a personal document. |
| `niftypm_get_personal_documents` | List personal documents. |
| `niftypm_add_document_members` | Add members to a document. |
| `niftypm_remove_document_members` | Remove members from a document. |
| `niftypm_change_document` | Create a new version of a document. |
| `niftypm_add_document_labels` | Add labels to a document. |
| `niftypm_remove_document_labels` | Remove labels from a document. |

### Fields

| Tool | Purpose |
| --- | --- |
| `niftypm_list_custom_fields` | List custom field definitions. |
| `niftypm_get_custom_field` | Get a custom field definition by ID. |

### Files

| Tool | Purpose |
| --- | --- |
| `niftypm_upload_files` | Upload one or more files with Base64-encoded content. |
| `niftypm_list_files` | List files in a project or task. |
| `niftypm_get_file` | Get a file by ID. |
| `niftypm_delete_file` | Delete a file. |
| `niftypm_update_file` | Update file metadata such as folder or annotation task. |
| `niftypm_copy_file` | Copy a file to another project. |
| `niftypm_add_file_labels` | Add labels to a file. |
| `niftypm_remove_file_labels` | Remove labels from a file. |

### Folders

| Tool | Purpose |
| --- | --- |
| `niftypm_get_folder` | Get the root folder structure. |
| `niftypm_create_folder` | Create a folder. |
| `niftypm_get_folder_by_id` | Get a folder by ID. |
| `niftypm_get_folder_children` | List a folder's children. |
| `niftypm_update_folder` | Update a folder. |
| `niftypm_delete_folder` | Delete a folder. |

### Invite links

| Tool | Purpose |
| --- | --- |
| `niftypm_list_invite_links` | List active invite links. |

### Labels

| Tool | Purpose |
| --- | --- |
| `niftypm_list_labels` | List labels or tags. |
| `niftypm_get_label` | Get a label by ID. |
| `niftypm_create_label` | Create a label or tag. |
| `niftypm_update_label` | Update a label. |
| `niftypm_delete_label` | Delete a label. |

### Members

| Tool | Purpose |
| --- | --- |
| `niftypm_list_members` | List team members. |
| `niftypm_get_member` | Get a team member by ID. |

### Messages

| Tool | Purpose |
| --- | --- |
| `niftypm_list_messages` | List messages in a chat or discussion. |
| `niftypm_get_message` | Get a message by ID. |
| `niftypm_create_message` | Create a message. |
| `niftypm_update_message` | Update a message. |
| `niftypm_delete_message` | Delete a message. |
| `niftypm_mark_message_seen` | Mark a message as seen. |
| `niftypm_mark_message_heard` | Mark a message as heard. |

### Milestones

| Tool | Purpose |
| --- | --- |
| `niftypm_list_milestones` | List milestones in a project. |
| `niftypm_get_milestone` | Get a milestone by ID. |
| `niftypm_create_milestone` | Create a milestone. |
| `niftypm_update_milestone` | Update a milestone. |
| `niftypm_delete_milestone` | Delete a milestone. |
| `niftypm_archive_milestone` | Archive a milestone. |
| `niftypm_move_milestone` | Move a milestone to another project. |
| `niftypm_tie_milestone_tasks` | Add tasks to a milestone. |
| `niftypm_untie_milestone_tasks` | Remove tasks from a milestone. |

### Projects

| Tool | Purpose |
| --- | --- |
| `niftypm_list_projects` | List accessible projects. |
| `niftypm_create_project` | Create a project. |
| `niftypm_get_project` | Get a project by ID. |
| `niftypm_update_project` | Update a project. |
| `niftypm_delete_project` | Delete a project. |
| `niftypm_invite_to_project` | Invite a user to a project. |
| `niftypm_leave_project` | Leave a project. |
| `niftypm_start_project` | Start or activate a project. |
| `niftypm_add_project_field` | Add a custom field value to a project. |
| `niftypm_get_project_fields` | Get custom fields for a project. |
| `niftypm_update_project_field` | Update a project custom field value. |

### Subteams / portfolios

| Tool | Purpose |
| --- | --- |
| `niftypm_list_subteams` | List subteams or portfolios. |
| `niftypm_get_subteam` | Get a subteam by ID. |
| `niftypm_create_subteam` | Create a subteam. |
| `niftypm_update_subteam` | Update a subteam. |
| `niftypm_delete_subteam` | Delete a subteam. |
| `niftypm_add_subteam_members` | Add members to a subteam or portfolio. |
| `niftypm_remove_subteam_members` | Remove members from a subteam or portfolio. |
| `niftypm_leave_subteam` | Leave a subteam or portfolio. |

### Task groups

| Tool | Purpose |
| --- | --- |
| `niftypm_list_taskgroups` | List task groups. |
| `niftypm_get_taskgroup` | Get a task group by ID. |
| `niftypm_create_taskgroup` | Create a task group. |
| `niftypm_update_taskgroup` | Update a task group. |
| `niftypm_delete_taskgroup` | Delete a task group. |
| `niftypm_move_taskgroup_tasks` | Move all tasks between groups. |
| `niftypm_assign_taskgroup_members` | Set assignees for all tasks in a group. |
| `niftypm_unassign_taskgroup_members` | Remove assignees from all tasks in a group. |

### Tasks

| Tool | Purpose |
| --- | --- |
| `niftypm_list_tasks` | List tasks with filters. |
| `niftypm_get_task` | Get a task by ID. |
| `niftypm_create_task` | Create a task or subtask. |
| `niftypm_update_task` | Update a task. |
| `niftypm_delete_task` | Delete a task. |
| `niftypm_delete_tasks` | Delete multiple tasks in one request. |
| `niftypm_complete_task` | Mark a task complete. |
| `niftypm_archive_task` | Archive a task. |
| `niftypm_get_personal_tasks` | List personal tasks. |
| `niftypm_create_personal_task` | Create a personal task. |
| `niftypm_link_task` | Link a task to another task. |
| `niftypm_update_task_milestone` | Update a task milestone. |
| `niftypm_move_task` | Move a task to another group. |
| `niftypm_move_tasks` | Move multiple tasks. |
| `niftypm_assign_task` | Assign a user to a task. |
| `niftypm_unassign_task` | Remove a task assignee. |
| `niftypm_add_task_labels` | Add labels to a task. |
| `niftypm_remove_task_labels` | Remove labels from a task. |
| `niftypm_add_task_field` | Add a task custom field value. |
| `niftypm_get_task_fields` | Get task custom fields. |
| `niftypm_update_task_field` | Update a task custom field value. |
| `niftypm_attach_task_document` | Attach a document to a task. |
| `niftypm_clone_task` | Clone or copy a task. |

### Templates

| Tool | Purpose |
| --- | --- |
| `niftypm_list_templates` | List project templates. |

### Time tracking

| Tool | Purpose |
| --- | --- |
| `niftypm_get_time_report` | Get a time tracking report. |
| `niftypm_get_time_duration` | Get total tracked time duration. |

### Users

| Tool | Purpose |
| --- | --- |
| `niftypm_get_current_user` | Get the authenticated user profile. |

### Webhooks
| Tool | Purpose |
| --- | --- |
| `niftypm_list_webhooks` | List webhooks for an app. |
| `niftypm_create_webhook` | Create a webhook. |
| `niftypm_update_webhook` | Update a webhook. |
| `niftypm_delete_webhook` | Delete a webhook. |

## Notes

- For related tasks, prefer subtasks by passing the parent task ID as `task_id` to `niftypm_create_task`.
- For project work, create or locate a task group before creating tasks.
- For local OpenCode use, file-based secrets are recommended to avoid token truncation.
