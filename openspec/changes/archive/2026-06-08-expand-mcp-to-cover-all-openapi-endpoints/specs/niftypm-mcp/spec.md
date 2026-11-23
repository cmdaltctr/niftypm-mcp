# NiftyPM MCP Expansion Specification

## ADDED Requirements

### Requirement: Projects Domain Support
The MCP server SHALL provide tools for managing NiftyPM projects including listing, creating, updating, deleting, and performing project operations like inviting members, leaving projects, starting projects, and managing project fields.

#### Scenario: List Projects
- **Given** the user is authenticated with NiftyPM
- **When** the user calls `niftypm_list_projects`
- **Then** the MCP server SHALL return a list of all accessible projects
- **And** the response SHALL include project details (id, name, status, dates, etc.)
- **And** the response SHALL support pagination via limit and offset parameters

#### Scenario: Create Project
- **Given** the user is authenticated with NiftyPM
- **When** the user calls `niftypm_create_project` with project details
- **Then** the MCP server SHALL create a new project
- **And** the response SHALL include the created project details
- **And** the project SHALL be accessible to the user

#### Scenario: Get Project
- **Given** the user is authenticated with NiftyPM
- **When** the user calls `niftypm_get_project` with a valid project ID
- **Then** the MCP server SHALL return the project details
- **And** the response SHALL include all project fields

#### Scenario: Update Project
- **Given** the user is authenticated with NiftyPM
- **When** the user calls `niftypm_update_project` with a valid project ID and update data
- **Then** the MCP server SHALL update the project
- **And** the response SHALL include the updated project details

#### Scenario: Delete Project
- **Given** the user is authenticated with NiftyPM
- **When** the user calls `niftypm_delete_project` with a valid project ID
- **Then** the MCP server SHALL delete the project
- **And** the project SHALL no longer be accessible

#### Scenario: Invite to Project
- **Given** the user is authenticated with NiftyPM
- **When** the user calls `niftypm_invite_to_project` with a project ID and user details
- **Then** the MCP server SHALL send an invitation to the specified user
- **And** the invitation SHALL appear in the user's NiftyPM interface

#### Scenario: Leave Project
- **Given** the user is authenticated with NiftyPM
- **When** the user calls `niftypm_leave_project` with a valid project ID
- **Then** the MCP server SHALL remove the user from the project
- **And** the user SHALL no longer have access to the project

#### Scenario: Start Project
- **Given** the user is authenticated with NiftyPM
- **When** the user calls `niftypm_start_project` with a valid project ID
- **Then** the MCP server SHALL change the project status to "started"
- **And** the project SHALL be marked as active

#### Scenario: Add Project Field
- **Given** the user is authenticated with NiftyPM
- **When** the user calls `niftypm_add_project_field` with a project ID and field definition
- **Then** the MCP server SHALL add a custom field to the project
- **And** the field SHALL be available for tasks in the project

#### Scenario: Get Project Fields
- **Given** the user is authenticated with NiftyPM
- **When** the user calls `niftypm_get_project_fields` with a valid project ID
- **Then** the MCP server SHALL return all custom fields for the project
- **And** the response SHALL include field definitions and values

#### Scenario: Update Project Field
- **Given** the user is authenticated with NiftyPM
- **When** the user calls `niftypm_update_project_field` with a project ID, field ID, and update data
- **Then** the MCP server SHALL update the custom field definition
- **And** the field SHALL reflect the changes immediately

### Requirement: Folders Domain Support
The MCP server SHALL provide tools for managing NiftyPM folders including creating, listing, updating, and deleting folders for organizing files.

#### Scenario: Create Folder
- **Given** the user is authenticated with NiftyPM
- **When** the user calls `niftypm_create_folder` with folder details
- **Then** the MCP server SHALL create a new folder
- **And** the response SHALL include the created folder details

#### Scenario: Get Folder Children
- **Given** the user is authenticated with NiftyPM
- **When** the user calls `niftypm_get_folder_children` with a valid folder ID
- **Then** the MCP server SHALL return all child items (files and subfolders)
- **And** the response SHALL include item details and types

#### Scenario: Get Folder by ID
- **Given** the user is authenticated with NiftyPM
- **When** the user calls `niftypm_get_folder_by_id` with a valid folder ID
- **Then** the MCP server SHALL return the folder details
- **And** the response SHALL include folder metadata

#### Scenario: Update Folder
- **Given** the user is authenticated with NiftyPM
- **When** the user calls `niftypm_update_folder` with a valid folder ID and update data
- **Then** the MCP server SHALL update the folder
- **And** the response SHALL include the updated folder details

#### Scenario: Delete Folder
- **Given** the user is authenticated with NiftyPM
- **When** the user calls `niftypm_delete_folder` with a valid folder ID
- **Then** the MCP server SHALL delete the folder
- **And** the folder SHALL no longer be accessible

#### Scenario: Get Folder
- **Given** the user is authenticated with NiftyPM
- **When** the user calls `niftypm_get_folder` with optional parameters
- **Then** the MCP server SHALL return folders based on the parameters
- **And** the response SHALL support filtering and pagination

### Requirement: Members Domain Support
The MCP server SHALL provide tools for managing team members including listing and getting member details.

#### Scenario: List Members
- **Given** the user is authenticated with NiftyPM
- **When** the user calls `niftypm_list_members`
- **Then** the MCP server SHALL return a list of all team members
- **And** the response SHALL include member details (id, name, role, etc.)

#### Scenario: Get Member
- **Given** the user is authenticated with NiftyPM
- **When** the user calls `niftypm_get_member` with a valid member ID
- **Then** the MCP server SHALL return the member details
- **And** the response SHALL include all member fields

### Requirement: Webhooks Domain Support
The MCP server SHALL provide tools for managing webhooks including listing, creating, updating, and deleting webhook endpoints.

#### Scenario: List Webhooks
- **Given** the user is authenticated with NiftyPM
- **When** the user calls `niftypm_list_webhooks` with an app ID
- **Then** the MCP server SHALL return all webhooks for the application
- **And** the response SHALL include webhook details (id, URL, events, etc.)

#### Scenario: Create Webhook
- **Given** the user is authenticated with NiftyPM
- **When** the user calls `niftypm_create_webhook` with webhook configuration
- **Then** the MCP server SHALL create a new webhook endpoint
- **And** the response SHALL include the created webhook details

#### Scenario: Delete Webhook
- **Given** the user is authenticated with NiftyPM
- **When** the user calls `niftypm_delete_webhook` with a valid webhook ID
- **Then** the MCP server SHALL delete the webhook
- **And** the webhook SHALL no longer receive events

#### Scenario: Update Webhook
- **Given** the user is authenticated with NiftyPM
- **When** the user calls `niftypm_update_webhook` with a valid webhook ID and update data
- **Then** the MCP server SHALL update the webhook configuration
- **And** the response SHALL include the updated webhook details

### Requirement: Time Tracking Domain Support
The MCP server SHALL provide tools for time tracking including getting time reports and duration calculations.

#### Scenario: Get Time Report
- **Given** the user is authenticated with NiftyPM
- **When** the user calls `niftypm_get_time_report` with optional filters
- **Then** the MCP server SHALL return time tracking reports
- **And** the response SHALL include time entries and summaries

#### Scenario: Get Time Duration
- **Given** the user is authenticated with NiftyPM
- **When** the user calls `niftypm_get_time_duration` with date range and filters
- **Then** the MCP server SHALL return time duration calculations
- **And** the response SHALL include total time and breakdowns

### Requirement: Fields Domain Support
The MCP server SHALL provide tools for managing custom fields including listing and getting field definitions.

#### Scenario: List Custom Fields
- **Given** the user is authenticated with NiftyPM
- **When** the user calls `niftypm_list_custom_fields`
- **Then** the MCP server SHALL return all custom field definitions
- **And** the response SHALL include field types and configurations

#### Scenario: Get Custom Field
- **Given** the user is authenticated with NiftyPM
- **When** the user calls `niftypm_get_custom_field` with a valid field ID
- **Then** the MCP server SHALL return the custom field details
- **And** the response SHALL include field definition and usage information

### Requirement: Apps Domain Support
The MCP server SHALL provide tools for managing applications including listing and getting app details.

#### Scenario: List Apps
- **Given** the user is authenticated with NiftyPM
- **When** the user calls `niftypm_list_apps`
- **Then** the MCP server SHALL return all installed applications
- **And** the response SHALL include app details (id, name, status, etc.)

#### Scenario: Get App
- **Given** the user is authenticated with NiftyPM
- **When** the user calls `niftypm_get_app` with a valid app ID
- **Then** the MCP server SHALL return the application details
- **And** the response SHALL include app configuration and status

### Requirement: Chat Domain Support
The MCP server SHALL provide tools for chat functionality including listing and getting chat details.

#### Scenario: List Chats
- **Given** the user is authenticated with NiftyPM
- **When** the user calls `niftypm_list_chats`
- **Then** the MCP server SHALL return all chat conversations
- **And** the response SHALL include chat details and metadata

#### Scenario: Get Chat
- **Given** the user is authenticated with NiftyPM
- **When** the user calls `niftypm_get_chat` with a valid chat ID
- **Then** the MCP server SHALL return the chat details
- **And** the response SHALL include messages and participants

### Requirement: Invite Domain Support
The MCP server SHALL provide tools for managing invite links including listing available invites.

#### Scenario: List Invite Links
- **Given** the user is authenticated with NiftyPM
- **When** the user calls `niftypm_list_invite_links`
- **Then** the MCP server SHALL return all invite links
- **And** the response SHALL include link details and usage information

### Requirement: Templates Domain Support
The MCP server SHALL provide tools for project templates including listing available templates.

#### Scenario: List Templates
- **Given** the user is authenticated with NiftyPM
- **When** the user calls `niftypm_list_templates`
- **Then** the MCP server SHALL return all project templates
- **And** the response SHALL include template details and configurations

### Requirement: Users Domain Support
The MCP server SHALL provide tools for user information including getting current user details.

#### Scenario: Get Current User
- **Given** the user is authenticated with NiftyPM
- **When** the user calls `niftypm_get_current_user`
- **Then** the MCP server SHALL return the current user's details
- **And** the response SHALL include user profile and preferences

### Requirement: Authentication Domain Support
The MCP server SHALL provide tools for authentication including token refresh functionality.

#### Scenario: Refresh Token
- **Given** the user has a valid refresh token
- **When** the user calls `niftypm_refresh_token`
- **Then** the MCP server SHALL refresh the access token
- **And** the new token SHALL be stored securely
- **And** subsequent requests SHALL use the new token

### Requirement: Task Expansion
The MCP server SHALL expand existing task tools to cover all OpenAPI operations including personal tasks, linking, milestone updates, movement, assignment, label management, field operations, document attachment, and task cloning.

#### Scenario: Get Personal Tasks
- **Given** the user is authenticated with NiftyPM
- **When** the user calls `niftypm_get_personal_tasks`
- **Then** the MCP server SHALL return the user's personal tasks
- **And** the response SHALL include task details and status

#### Scenario: Create Personal Task
- **Given** the user is authenticated with NiftyPM
- **When** the user calls `niftypm_create_personal_task` with task details
- **Then** the MCP server SHALL create a new personal task
- **And** the response SHALL include the created task details

#### Scenario: Link Task
- **Given** the user is authenticated with NiftyPM
- **When** the user calls `niftypm_link_task` with a task ID and link details
- **Then** the MCP server SHALL link the task to another resource
- **And** the link SHALL be established successfully

#### Scenario: Update Task Milestone
- **Given** the user is authenticated with NiftyPM
- **When** the user calls `niftypm_update_task_milestone` with a task ID and milestone ID
- **Then** the MCP server SHALL update the task's milestone assignment
- **And** the task SHALL be associated with the new milestone

#### Scenario: Move Task
- **Given** the user is authenticated with NiftyPM
- **When** the user calls `niftypm_move_task` with a task ID and destination details
- **Then** the MCP server SHALL move the task to the specified location
- **And** the task SHALL appear in the new location

#### Scenario: Assign Task
- **Given** the user is authenticated with NiftyPM
- **When** the user calls `niftypm_assign_task` with a task ID and user ID
- **Then** the MCP server SHALL assign the task to the specified user
- **And** the user SHALL be notified of the assignment

#### Scenario: Unassign Task
- **Given** the user is authenticated with NiftyPM
- **When** the user calls `niftypm_unassign_task` with a task ID and user ID
- **Then** the MCP server SHALL unassign the task from the specified user
- **And** the user SHALL no longer be assigned to the task

#### Scenario: Add Task Labels
- **Given** the user is authenticated with NiftyPM
- **When** the user calls `niftypm_add_task_labels` with a task ID and label IDs
- **Then** the MCP server SHALL add the specified labels to the task
- **And** the labels SHALL appear on the task

#### Scenario: Remove Task Labels
- **Given** the user is authenticated with NiftyPM
- **When** the user calls `niftypm_remove_task_labels` with a task ID and label IDs
- **Then** the MCP server SHALL remove the specified labels from the task
- **And** the labels SHALL no longer appear on the task

#### Scenario: Add Task Field
- **Given** the user is authenticated with NiftyPM
- **When** the user calls `niftypm_add_task_field` with a task ID and field value
- **Then** the MCP server SHALL add the custom field value to the task
- **And** the field value SHALL be stored with the task

#### Scenario: Get Task Fields
- **Given** the user is authenticated with NiftyPM
- **When** the user calls `niftypm_get_task_fields` with a valid task ID
- **Then** the MCP server SHALL return all custom field values for the task
- **And** the response SHALL include field definitions and values

#### Scenario: Update Task Field
- **Given** the user is authenticated with NiftyPM
- **When** the user calls `niftypm_update_task_field` with a task ID, field ID, and value
- **Then** the MCP server SHALL update the custom field value
- **And** the field value SHALL reflect the changes immediately

#### Scenario: Attach Task Document
- **Given** the user is authenticated with NiftyPM
- **When** the user calls `niftypm_attach_task_document` with a task ID and document ID
- **Then** the MCP server SHALL attach the document to the task
- **And** the document SHALL be accessible from the task

#### Scenario: Clone Task
- **Given** the user is authenticated with NiftyPM
- **When** the user calls `niftypm_clone_task` with a task ID and clone options
- **Then** the MCP server SHALL create a copy of the task
- **And** the cloned task SHALL have the specified options applied

#### Scenario: Move Tasks (Bulk)
- **Given** the user is authenticated with NiftyPM
- **When** the user calls `niftypm_move_tasks` with multiple task IDs and destination
- **Then** the MCP server SHALL move all specified tasks
- **And** all tasks SHALL appear in the new location

### Requirement: TaskGroup Expansion
The MCP server SHALL expand existing task group tools to cover missing operations including moving tasks and managing assignees.

#### Scenario: Move TaskGroup Tasks
- **Given** the user is authenticated with NiftyPM
- **When** the user calls `niftypm_move_taskgroup_tasks` with a task group ID and destination
- **Then** the MCP server SHALL move all tasks in the group to the specified location
- **And** all tasks SHALL be relocated successfully

#### Scenario: Assign TaskGroup Members
- **Given** the user is authenticated with NiftyPM
- **When** the user calls `niftypm_assign_taskgroup_members` with a task group ID and user IDs
- **Then** the MCP server SHALL assign the specified members to the task group
- **And** the members SHALL be associated with the group

#### Scenario: Unassign TaskGroup Members
- **Given** the user is authenticated with NiftyPM
- **When** the user calls `niftypm_unassign_taskgroup_members` with a task group ID and user IDs
- **Then** the MCP server SHALL unassign the specified members from the task group
- **And** the members SHALL no longer be associated with the group

### Requirement: Document Expansion
The MCP server SHALL expand existing document tools to cover missing operations including personal documents, member management, document changes, and label operations.

#### Scenario: Create Personal Document
- **Given** the user is authenticated with NiftyPM
- **When** the user calls `niftypm_create_personal_document` with document details
- **Then** the MCP server SHALL create a new personal document
- **And** the response SHALL include the created document details

#### Scenario: Get Personal Documents
- **Given** the user is authenticated with NiftyPM
- **When** the user calls `niftypm_get_personal_documents`
- **Then** the MCP server SHALL return the user's personal documents
- **And** the response SHALL include document details and metadata

#### Scenario: Add Document Members
- **Given** the user is authenticated with NiftyPM
- **When** the user calls `niftypm_add_document_members` with a document ID and user IDs
- **Then** the MCP server SHALL add the specified members to the document
- **And** the members SHALL have access to the document

#### Scenario: Remove Document Members
- **Given** the user is authenticated with NiftyPM
- **When** the user calls `niftypm_remove_document_members` with a document ID and user IDs
- **Then** the MCP server SHALL remove the specified members from the document
- **And** the members SHALL no longer have access to the document

#### Scenario: Change Document
- **Given** the user is authenticated with NiftyPM
- **When** the user calls `niftypm_change_document` with a document ID and change details
- **Then** the MCP server SHALL update the document content
- **And** the document SHALL reflect the changes immediately

#### Scenario: Add Document Labels
- **Given** the user is authenticated with NiftyPM
- **When** the user calls `niftypm_add_document_labels` with a document ID and label IDs
- **Then** the MCP server SHALL add the specified labels to the document
- **And** the labels SHALL appear on the document

#### Scenario: Remove Document Labels
- **Given** the user is authenticated with NiftyPM
- **When** the user calls `niftypm_remove_document_labels` with a document ID and label IDs
- **Then** the MCP server SHALL remove the specified labels from the document
- **And** the labels SHALL no longer appear on the document

### Requirement: File Expansion
The MCP server SHALL expand existing file tools to cover missing operations including file upload, editing, and label management.

#### Scenario: Upload File
- **Given** the user is authenticated with NiftyPM
- **When** the user calls `niftypm_upload_file` with file data and metadata
- **Then** the MCP server SHALL upload the file to NiftyPM
- **And** the response SHALL include the uploaded file details

#### Scenario: Edit File
- **Given** the user is authenticated with NiftyPM
- **When** the user calls `niftypm_edit_file` with a file ID and update data
- **Then** the MCP server SHALL update the file metadata
- **And** the response SHALL include the updated file details

#### Scenario: Add File Labels
- **Given** the user is authenticated with NiftyPM
- **When** the user calls `niftypm_add_file_labels` with a file ID and label IDs
- **Then** the MCP server SHALL add the specified labels to the file
- **And** the labels SHALL appear on the file

#### Scenario: Remove File Labels
- **Given** the user is authenticated with NiftyPM
- **When** the user calls `niftypm_remove_file_labels` with a file ID and label IDs
- **Then** the MCP server SHALL remove the specified labels from the file
- **And** the labels SHALL no longer appear on the file

### Requirement: Configuration Extension
The MCP server SHALL provide configuration options to enable or disable each new domain, maintaining backward compatibility and allowing gradual rollout.

#### Scenario: Enable New Domains
- **Given** the MCP server is configured with new domain flags
- **When** the server starts
- **Then** only enabled domains SHALL register their tools
- **And** disabled domains SHALL not register any tools

#### Scenario: Backward Compatibility
- **Given** existing MCP configurations
- **When** the server starts with default settings
- **Then** all existing tools SHALL remain available
- **And** new tools SHALL be enabled by default

### Requirement: Error Handling Expansion
The MCP server SHALL provide comprehensive error handling for all new tools with meaningful error messages and appropriate HTTP status codes.

#### Scenario: API Error Handling
- **Given** a new tool encounters an API error
- **When** the error response is received
- **Then** the MCP server SHALL return a meaningful error message
- **And** the error SHALL include the original API error details

#### Scenario: Validation Error Handling
- **Given** a new tool receives invalid parameters
- **When** the parameters fail validation
- **Then** the MCP server SHALL return a validation error
- **And** the error SHALL specify which parameters are invalid

### Requirement: Documentation Expansion
The MCP server SHALL provide comprehensive documentation for all new tools including descriptions, parameters, examples, and usage guidelines.

#### Scenario: Tool Documentation
- **Given** a new tool is implemented
- **When** the tool is registered
- **Then** the tool SHALL include a description
- **And** the tool SHALL include parameter descriptions
- **And** the tool SHALL include usage examples

#### Scenario: API Coverage Documentation
- **Given** the MCP server is expanded
- **When** the documentation is updated
- **Then** the documentation SHALL include a complete list of all tools
- **And** the documentation SHALL map tools to OpenAPI operations
- **And** the documentation SHALL include migration guides

### Requirement: Test Coverage Expansion
The MCP server SHALL maintain high test coverage for all new tools including unit tests, integration tests, and validation tests.

#### Scenario: Unit Test Coverage
- **Given** a new tool is implemented
- **When** the tool is tested
- **Then** the tool SHALL have unit tests covering all code paths
- **And** the tests SHALL mock external dependencies
- **And** the tests SHALL achieve >80% coverage

#### Scenario: Integration Test Coverage
- **Given** a new tool is implemented
- **When** the tool is integration tested
- **Then** the tool SHALL be tested against the real API
- **And** the tests SHALL use test data
- **And** the tests SHALL verify end-to-end functionality