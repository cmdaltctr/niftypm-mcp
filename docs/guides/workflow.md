# NiftyPM MCP Workflow

The most effective way to use the NiftyPM MCP server for creating or migrating projects is through a **JSON-First Planning** workflow. Instead of making individual tool calls to create tasks ad-hoc, you design the project structure in a JSON file, validate it, and then execute it systematically.

## Why JSON-First?

Calling MCP tools directly on-the-fly for complex projects often results in:
- Markdown `- [ ]` checklists in descriptions instead of native subtasks.
- Tasks without labels, due dates, or story points.
- Orphaned tasks that are not assigned to a milestone or task list.
- Broken or circular blocking dependencies.

By writing a JSON blueprint first, you ensure all relationships and fields are correct before making a single API call to NiftyPM.

## The Four-Phase Pipeline

### 1. Plan (JSON only)

Create a JSON file that defines your project structure: `labels`, `task_lists`, `milestones`, and `tasks`. 
*(Note: If using the `s-niftypm` agent skill, start by copying its included `niftypm-project-plan-template.json`.)*

### 2. Validate

Run a strict validation checklist against your JSON:
- Every task has a `task_list` and `milestone` assigned.
- Subtasks are defined in a `subtasks` array, never as markdown checkboxes.
- Dependencies reference valid task IDs.
- Labels, task lists, and milestones meet minimum requirements for a healthy project.

### 3. Execute

Use the NiftyPM MCP tools to execute the plan in exactly this order:

- **Phase 0 (Labels):** Create all labels first (`niftypm_create_label`).
- **Phase 1 (Create):** Create task lists (`niftypm_create_taskgroup`), then milestones (`niftypm_create_milestone`), then the top-level tasks (`niftypm_create_task`).
- **Phase 2 (Enrich):** Create subtasks, link blocking dependencies via `niftypm_update_task(dependency=...)`, and tie tasks to milestones (`niftypm_tie_milestone_tasks`).
- **Phase 3 (Verify):** Fetch each task (`niftypm_get_task`) to confirm all fields and subtasks are correctly populated in the NiftyPM workspace.

### 4. Update the Source of Truth

As the MCP tools return IDs for the newly created resources, write those IDs back into your JSON file. The JSON file becomes your persistent audit trail and ongoing source of truth for the project.
