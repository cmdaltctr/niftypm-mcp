# NiftyPM Project Plan Schema

## Purpose

A JSON-first workflow for populating NiftyPM projects. **Plan in JSON → validate → then call MCP tools.** This prevents the common failure modes: markdown checklists instead of real subtasks, empty labels, missing due dates, unnamed milestones, all tasks under one milestone.

This document defines the JSON schema used in files like `docs/test_data/llamaindex-rag-mcp-project-plan.json`.

---

## The Pattern (Why JSON First)

The original NiftyPM population workflow had the agent calling MCP tools directly, resulting in:

| Defect                           | Root Cause                                   |
| -------------------------------- | -------------------------------------------- |
| Markdown `- [ ]` instead of subtasks | No validation before creation                |
| Empty labels on all tasks        | Labels created ad-hoc, IDs lost              |
| Zero story points                | Never enforced at plan stage                 |
| All tasks under one milestone    | No cross-reference of milestone distribution |
| "Untitled List" milestone        | Default not reconciled in plan               |

**The fix**: Write the project structure to JSON first. Validate it. Only then use the JSON as a script to call NiftyPM MCP tools.

---

## JSON Schema

### Top-Level Structure

```json
{
  "$schema": "https://opencode.ai/niftypm-project-plan-schema.json",   // optional
  "$comment": "optional human-readable note",                          // optional
  "meta": { ... },                  // required
  "project": { ... },               // required
  "labels": [ ... ],                // required (min 5)
  "task_lists": [ ... ],            // required (min 3)
  "milestones": [ ... ],            // required (min 3, incl. M0)
  "tasks": [ ... ],                 // required
  "dependency_graph": { ... },      // optional
  "_validation_checklist": [ ... ]  // optional
}
```

### `meta`

| Field            | Type     | Required | Description                                  |
| ---------------- | -------- | -------- | -------------------------------------------- |
| `created`            | ISO 8601 | yes      | When the plan was generated                      |
| `last_updated`       | ISO 8601 | yes      | Last modification                                |
| `generated_by`       | string   | no       | Agent/model that created it                      |
| `project_nice_id`    | string   | no       | Short project ID (e.g., "AIE")                   |
| `niftypm_project_id` | string   | no       | NiftyPM internal ID (populated after creation)    |

### `project`

| Field         | Type   | Required | Description                |
| ------------- | ------ | -------- | -------------------------- |
| `name`            | string | yes      | Project name                   |
| `description`     | string | yes      | Project description            |
| `portfolio`       | string | yes      | Portfolio/Subteam name         |
| `portfolio_id`    | string | no       | Portfolio ID (after discovery) |
| `repo`            | string | no       | GitHub repository URL          |

### `labels`

Array of label objects:

| Field     | Type   | Required | Description                     |
| --------- | ------ | -------- | ------------------------------- |
| `name`        | string | yes      | Label display name                  |
| `color`       | string | yes      | Hex colour code (e.g., `#FF0000`)    |
| `id`          | string | no       | NiftyPM label ID (after creation)    |
| `purpose`     | string | no       | When to use this label              |

**Minimum taxonomy for any project**:
- At least one urgency label (P0-Critical, P1-High)
- At least one domain label (Research, Experiment, Writing, Bug)
- Colour convention: Red=critical, Orange=high, Green=research, Pink=writing

### `task_lists`

Array of task list objects:

| Field    | Type   | Required | Description                |
| -------- | ------ | -------- | -------------------------- |
| `name`       | string | yes      | Display name                   |
| `id`         | string | no       | NiftyPM ID (after creation)    |
| `order`      | number | no       | Display order                  |
| `purpose`    | string | no       | What goes in this list         |

**Guidelines**:
- At least 3 lists: Todo/Sprint, In Progress, Done
- Consider: Backlog, Evaluation, Cross-Project Prep
- Each task MUST belong to one (and only one) list

### `milestones`

Array of milestone objects:

| Field         | Type   | Required | Description                |
| ------------- | ------ | -------- | -------------------------- |
| `name`            | string | yes      | Display name (include emoji prefix for Roadmap) |
| `id`              | string | no       | NiftyPM ID (after creation)    |
| `due`             | string | no       | Due date (ISO 8601)            |
| `description`     | string | no       | What this milestone covers     |

**Guidelines**:
- At least 2-3 milestones — never one
- Each milestone represents a distinct workstream or timebox
- M0: Project Overview (container, `is_list: true`)
- M1-Mn: Real workstreams with dates
- After project creation, ALWAYS reconcile default "Untitled List" milestone
- Use `niftypm_list_milestones(project_id, is_list="true")` for discovery

### `tasks`

Array of task objects. This is the core record:

| Field              | Type            | Required | Description                                        |
| ------------------ | --------------- | -------- | -------------------------------------------------- |
| `id`                   | string          | no       | NiftyPM internal ID (populated after creation)         |
| `nice_id`              | string          | no       | Short ID (e.g., "AIE-20")                             |
| `name`                 | string          | yes      | Task name                                             |
| `task_list`            | string          | yes      | Name of the task list (must match task_lists[].name)   |
| `milestone`            | string          | yes      | Name of the milestone (must match milestones[].name)   |
| `description`          | string          | yes      | 1-3 sentences, with links where helpful                |
| `labels`               | string[]        | no       | Array of label NAMES (not IDs)                         |
| `story_points`         | number or null  | yes      | Effort estimate; null for decisions/notes only         |
| `due_date`             | string or null  | no       | ISO 8601 date; null for backlog items without deadline  |
| `dependency`           | string or null  | no       | NICE_ID of blocking predecessor (e.g., "AIE-22")        |
| `subtasks`             | string[]        | no       | Array of subtask names (will become real create_task calls) |
| `start_date`           | string or null  | no       | ISO 8601 start date for timeline visibility            |
| `assignees`            | string[]        | no       | Array of member IDs or names                           |

**NON-NEGOTIABLE rules**:
- Every task SHALL have `task_list` and `milestone` assigned
- `story_points` SHALL be >0 for actionable tasks; `null` only for decisions/notes
- **Subtasks go in the `subtasks[]` array, NOT as markdown `- [ ]` in description**
- Dependencies reference `nice_id`, not raw ID
- Labels reference names; the agent resolves IDs from the `labels[]` section

---

## Usage Workflow (Four-Phase Pipeline)

### Phase 0: Plan (JSON only, no MCP calls)

1. Write the JSON plan using this schema
2. Validate:
   - Every task has `task_list` and `milestone`
   - No task has markdown `- [ ]` in description — those go in `subtasks[]`
   - Story points >0 for all actionable tasks
   - Labels are consistent (same names across tasks)
3. Review the `dependency_graph` for correctness

### Phase 1: Create (MCP calls from JSON)

1. **Labels first**: For each label in `labels[]`, call `niftypm_create_label`. Store returned `id` in the JSON.
2. **Task lists**: For each list in `task_lists[]`, reconcile defaults first (list existing → rename/delete), then create. Store `id`.
3. **Milestones**: Reconcile defaults (especially "Untitled List"), create new ones, store `id`.
4. **Tasks**: For each task in `tasks[]`:
   - Resolve label names → IDs from the `labels[]` section
   - Resolve task_list name → ID
   - Resolve milestone name → ID
   - Call `niftypm_create_task(task_group_id, name, description, labels, story_points, due_date, milestone_id)`

### Phase 2: Enrich (MCP calls from JSON)

1. **Subtasks**: For each task with `subtasks[]`, call `niftypm_create_task(name, task_group_id, task_id=PARENT)` for each subtask.
2. **Dependencies**: For each task with `dependency`, call `niftypm_update_task(task_id, dependency=PREDECESSOR_ID)`.
3. **Tie milestones**: Call `niftypm_tie_milestone_tasks` for each milestone's task group.

### Phase 3: Verify

1. For each task, call `niftypm_get_task` to confirm: `total_subtasks`, `labels`, `story_points`, `milestone`, `dependency`.
2. Call `niftypm_list_milestones(project_id, is_list="true")` to confirm distribution.
3. Call `niftypm_list_taskgroups(project_id)` to confirm list organisation.

---

## Validation Checklist (Run Before Any MCP Call)

- [ ] `labels` section has at least 5 entries covering urgency + domain
- [ ] `task_lists` has at least 3 entries with distinct purposes
- [ ] `milestones` has at least 2 entries beyond the M0 overview
- [ ] No task has empty `task_list` or `milestone`
- [ ] No task description contains `- [ ]` (those are in `subtasks[]`)
- [ ] All `story_points` are >0 (except for Decision tasks)
- [ ] All `dependency` values reference valid `nice_id` strings
- [ ] `dependency_graph` section matches actual dependency relationships
- [ ] No two tasks share contradictory dependencies (circular graph)

---

## Reference Implementation

See `docs/test_data/llamaindex-rag-mcp-project-plan.json` for a complete example. This file is the validated source of truth for the LlamaIndex RAG MCP NiftyPM project (nice_id: AIE, 20 tasks, 5 milestones, 6 task lists, 9 labels, 37 subtasks).

---

## Common Mistakes Avoided

| Mistake                                         | How Schema Prevents It                            |
| ----------------------------------------------- | ------------------------------------------------- |
| Markdown `- [ ]` in description instead of subtasks | `subtasks[]` array is the ONLY place for sub-items |
| All tasks under one milestone                   | `milestone` field required on every task           |
| Empty labels                                    | `labels[]` in plan → resolved to IDs in Phase 1    |
| Zero story points                               | `story_points` required; `null` only for decisions  |
| "Untitled List" milestone                       | Milestone reconciliation in Phase 0 checklist       |
| `link_task` used for dependencies               | `dependency` field uses `nice_id` → `update_task`    |
| Labels referenced by name, not ID               | Labels section maps name→ID before Phase 1          |
