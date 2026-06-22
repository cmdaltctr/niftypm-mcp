---
name: s-niftypm
description: "NiftyPM Project Management skill for AI agents — teaches agents to be an effective Project Manager/assistant using the NiftyPM MCP tools. Covers the full NiftyPM hierarchy (Portfolios, Projects, Task Lists, Tasks, Subtasks, Milestones, Dependencies, Docs, Files, Goals), domain-specific workflows for academic research fellowship management, software development, business/startup management, and hybrid cross-domain projects. Includes colour-coded label taxonomy, dependency patterns, error recovery, tool-to-action mapping, and NiftyPM best practices from official help documentation. Load this skill whenever an agent needs to organise, track, or manage any project work in NiftyPM — creating portfolios and projects, setting up task hierarchies with dependencies and milestones, uploading files and docs, tracking goals and time, or acting as a PM assistant."
---

# s-niftypm

Reference skill for any AI agent acting as a Project Manager or assistant in NiftyPM. Teaches the NiftyPM hierarchy, best practices, and exact MCP tool sequences for common project management workflows.

## NIFTYPM HIERARCHY (CRITICAL — MEMORISE THIS)

Every operation in NiftyPM sits within this hierarchy. All create/list/update calls need parent IDs from the level above:

```
Workspace
 └── Portfolio (subteam)        ← create with: niftypm_create_subteam
      └── Folder (optional)      ← create with: niftypm_create_folder
      └── Project                ← create with: niftypm_create_project
           ├── Task List/Group   ← create with: niftypm_create_taskgroup
           │    └── Task         ← create with: niftypm_create_task
            │         └── Subtask ← create with: niftypm_create_task (with task_id)
            │              └── Checklist ← create with: niftypm_create_checklist + niftypm_create_checklist_items
           ├── Milestone         ← promote a Task List via niftypm_create_milestone
           ├── Doc               ← create with: niftypm_create_document
           ├── File              ← upload with: niftypm_upload_files
           ├── Discussion        ← create messages with: niftypm_create_message
           └── Goal              ← UI-only at this time
```

**Discovery order (always follow this)**: List existing → find IDs → create/update.

## MANDATORY WORKFLOW RULES

### Rule 0: Discover Before You Create
Always list existing resources first. Never assume IDs.
```
niftypm_list_projects() → find project_id
niftypm_list_taskgroups(project_id="...") → find taskgroup_id
niftypm_list_subteams() → find portfolio_id
```

### Rule 0a: Reconcile Default Task Lists AND Milestones
**A newly created or template-based project ALWAYS ships with auto-generated default task lists AND milestones** (e.g., "To Do", "In Progress", "Done" for task groups; an unnamed "Untitled List" for milestones). Before you create any custom lists or milestones, you MUST list the existing ones and decide: delete the defaults you won't use, or rename/reuse them.

Never create new task groups without first calling `niftypm_list_taskgroups(project_id="...")`, and never create new milestones without calling `niftypm_list_milestones(project_id="...")`. Otherwise you leave orphaned empty lists and unnamed milestones cluttering the board. **Pay special attention to any milestone or list named "Untitled List" — ALWAYS rename these immediately.**

```
// Always do this BEFORE creating ANY task lists or milestones:
niftypm_list_taskgroups(project_id="...") → see what's already there
niftypm_list_milestones(project_id="...") → discover auto-created defaults (including "Untitled List")
// Then either:
//   a) Delete defaults you won't use: niftypm_delete_taskgroup(taskgroup_id="...") / niftypm_delete_milestone(milestone_id="...")
//   b) Rename defaults to match your workflow:
//        niftypm_update_taskgroup(taskgroup_id="...", name="Shipped")
//        niftypm_update_milestone(milestone_id="...", name="Sprint 1")
//   c) Create only the additional ones you still need
```

**CRITICAL:** The `niftypm_list_milestones` tool accepts an optional `is_list` parameter. Default milestones often have `is_list: true`. If your initial `list_milestones` call returns `[]` despite you knowing a milestone exists, try again with `is_list="true"`. This is a known NiftyPM API behaviour — list-type milestones are filtered unless you explicitly request them.

### Rule 0b: Check for Templates
Before creating a project from scratch, list available templates — NiftyPM workspaces often ship with reusable templates that pre-populate task lists and structure:
```
niftypm_list_templates() → check if a relevant template exists
If yes: niftypm_create_project(name="...", template_id="TEMPLATE_ID")
Then reconcile the template's default task lists (Rule 0a applies).
If no suitable template: create from scratch.
```

### Rule 1: Context-Aware Tool Selection
Match the user's domain to the right NiftyPM structure (see Domain Workflows below). A research fellowship needs different organisation than a software project.

### Rule 1a: The Three-Phase Task Creation Mandate (NON-NEGOTIABLE)

Task creation is NOT a single `create_task` call. It is a **three-phase pipeline**. You MUST complete every phase. Skipping enrichment steps produces the empty-field problem: tasks with no labels, no dates, no dependencies, no story points, and markdown checklists instead of real subtasks.

**Phase 0 — Label Taxonomy (before any tasks):**
```
niftypm_create_label(name="Critical", color="#FF0000", project_id="...")   // keep IDs!
niftypm_create_label(name="Research", color="#00AA00", project_id="...")
niftypm_create_label(name="Writing", color="#FF69B4", project_id="...")
niftypm_create_label(name="Feature", color="#00CED1", project_id="...")
niftypm_create_label(name="Bug", color="#DC143C", project_id="...")
// ... create all labels the project needs BEFORE any task references them
```
**Labels are project-scoped IDs, not names.** `create_task(labels=["research"])` WILL FAIL — you MUST pass the label IDs returned by `create_label`. Store the returned IDs in your working memory for Phase 1.

**Phase 1 — Bulk Task Creation (with inline enrichment):**
```
niftypm_create_task(
  name="Task name",
  task_group_id="LIST_ID",
  description="Clear description (1-3 sentences)",
  assignees=["MEMBER_ID"],
  due_date="2026-07-15",
  start_date="2026-07-01",
  labels=["LABEL_ID_1", "LABEL_ID_2"],
  story_points=5,
  milestone_id="MILESTONE_ID"
)
```
These fields are NON-NEGOTIABLE for every task: `task_group_id` + `description`. Strongly preferred: `due_date`, `labels`, `story_points`. Always include them unless the user explicitly says to skip them.

**Phase 2 — Enrichment Pass (dependencies + real subtasks):**
After ALL tasks exist, make a second pass:
```
// Wire blocking dependencies (must use update_task — NOT link_task):
niftypm_update_task(task_id="TASK_B", dependency="TASK_A")   // B depends on A

// Convert markdown - [ ] lines into real subtasks:
niftypm_create_task(name="Sub-step 1", task_group_id="SAME_LIST", task_id="PARENT_TASK_ID")
niftypm_create_task(name="Sub-step 2", task_group_id="SAME_LIST", task_id="PARENT_TASK_ID")

// Verify every task:
niftypm_get_task(task_id="...") → confirm labels, dates, points, subtasks, dependency
```
**NEVER use `niftypm_link_task` for dependencies.** `link_task` creates informational cross-references only. TRUE blocking dependencies require `niftypm_update_task(dependency="PREDECESSOR_ID")`.

**Violation consequences:** Tasks created without this three-phase pipeline will have empty labels, no due dates, zero story points, missing dependencies, and markdown checklists instead of real subtasks — exactly the defects observed in the AIE project.

### Rule 2: Create Task Lists Before Creating Tasks
Start with the top of the hierarchy and work down. A task MUST be placed inside a task list — you cannot leave it orphaned. If no suitable task list exists for what you're about to create, create the list first. Uncategorised tasks create clutter that's hard to find and clean up.

```
// WRONG — task has no home:
niftypm_create_task(name="Do X")  // missing task_group_id!

// RIGHT — list exists first, task placed in it:
niftypm_create_taskgroup(name="Backlog", project_id="...")  // create list first
niftypm_create_task(name="Do X", task_group_id="BACKLOG_ID")  // task has a home
```

**Before you create any task, ask yourself: "Which task list does this belong to?"** If the answer is "I don't know" or "none exist yet," stop and create the list first.

### Rule 3: ID Tracking
Keep a running list of created IDs (project_id, taskgroup_id, task_id, milestone_id) in your working memory. You will need them for subsequent calls.

### Rule 4: Verify Every Mutating Call
After creating or updating anything, immediately read it back with the corresponding `get` tool to confirm it was created/updated correctly.

### Rule 5: JSON-First Planning (Source of Truth) — NON-NEGOTIABLE

**NEVER call MCP tools directly when populating a new project.** Write the project structure to JSON first, validate it, then use the JSON as a script to call NiftyPM MCP tools.

**Why**: The original AIE project was populated with 31 direct `create_task` calls, resulting in: markdown `- [ ]` instead of real subtasks, empty labels, zero story points, all tasks under one milestone, and an unnamed "Untitled List." All of these would have been caught by JSON validation BEFORE any MCP call.

#### The Pattern (Five Steps)

1. **COPY the template**: Start from `references/niftypm-project-plan-template.json` — it has all required fields, sensible defaults, and the validation checklist.
2. **FILL the plan**: Write project details, labels, task lists, milestones, and tasks into the JSON. Every task gets `task_list`, `milestone`, `story_points`, `labels`, and `subtasks[]` (never markdown `- [ ]` in description).
3. **VALIDATE**: Run the `_validation_checklist` in the JSON. Every item must pass before proceeding. Schema file: `references/niftypm-project-plan.schema.json`.
4. **EXECUTE via four-phase pipeline** (no deviations from the JSON):
   - Phase 0: Create labels → store IDs in JSON
   - Phase 1: Reconcile defaults → create task lists → create milestones → create tasks (resolving label names → IDs, task_list names → IDs, milestone names → IDs)
   - Phase 2: Create subtasks (`create_task(task_id=PARENT)`) → wire dependencies (`update_task(dependency=...)`) → tie milestones
   - Phase 3: Verify every task with `get_task`
5. **UPDATE the JSON**: As each resource is created, populate the `id` and `nice_id` fields in the JSON. The JSON file becomes the audit trail.

#### Key Files

| File | Purpose |
|------|---------|
| `references/niftypm-project-plan-template.json` | Blank template — COPY this to start |
| `references/niftypm-project-plan.schema.json` | JSON Schema for machine validation |
| `references/niftypm-project-plan-schema.md` | Human-readable spec with examples |
| `docs/test_data/llamaindex-rag-mcp-project-plan.json` | Real validated example (AIE project, 20 tasks + 37 subtasks) |

**Template location for new projects**: Place project plans in `docs/test_data/<project-name>-plan.json` within the relevant repo.

#### Worked Example: From Template to Populated Project

This is the end-to-end flow. No new MCP tool is needed — the template + existing tools are sufficient.

**Step 1 — Read the template** to see the required shape:
```
read_file("references/niftypm-project-plan-template.json")
```

**Step 2 — Gather project specifics** from the user (ask only for what's missing):
- Project name + description
- Portfolio/subteam name
- Repo URL (optional)
- Which labels, task lists, and milestones the project needs (the template ships with sensible defaults — reuse them unless the user wants different ones)

**Step 3 — Write the filled plan** to the repo (NOT via MCP — this is a local file):
```
write_file("docs/test_data/<project>-plan.json", <filled JSON>)
```
Every task MUST have: `name`, `task_list`, `milestone`, `description`, `story_points`, and `subtasks[]` (never markdown `- [ ]`).

**Step 4 — Validate** against the `_validation_checklist` in the JSON. Do NOT proceed to any MCP call until every item passes:
- Every task has `task_list` + `milestone` (names match the arrays)
- No `- [ ]` in any description (those belong in `subtasks[]`)
- `story_points` >0 for actionable tasks, `null` only for decisions
- Dependencies reference valid `nice_id` strings
- ≥5 labels, ≥3 task lists, ≥3 milestones (incl. M0)

**Step 5 — Execute the four-phase pipeline**, reading values from the JSON:
```
// Phase 0 — Labels
for each label in plan.labels:
    id = niftypm_create_label(name, color, project_id)
    → write id back into plan.labels[].id

// Phase 1 — Reconcile + create
niftypm_list_taskgroups(project_id)  // reconcile defaults (Rule 0a)
niftypm_list_milestones(project_id, is_list="true")
for each list in plan.task_lists:    id = niftypm_create_taskgroup(...)  → write back
for each ms in plan.milestones:      id = niftypm_create_milestone(...)  → write back
for each task in plan.tasks:
    resolve label names → IDs, task_list name → ID, milestone name → ID
    id = niftypm_create_task(name, task_group_id, description, labels, story_points, due_date, milestone_id)
    → write task.id + task.nice_id back into the JSON

// Phase 2 — Enrich
for each task with subtasks[]:  niftypm_create_task(name, task_group_id, task_id=PARENT)
for each task with dependency:  niftypm_update_task(task_id, dependency=PREDECESSOR_ID)
niftypm_tie_milestone_tasks(milestone_id, task_ids=[...])

// Phase 3 — Verify
for each task:  niftypm_get_task(task_id) → confirm labels, dates, points, subtasks, dependency
```

**Step 6 — Final write-back**: Save the JSON with all populated `id`/`nice_id` fields and update `meta.niftypm_project_id` + `meta.last_updated`. The JSON is now the audit trail and source of truth for future updates.

**Key principle**: The JSON file is written and validated BEFORE any MCP mutation. If validation fails, you fix the JSON — never the live NiftyPM board. This is what prevents the empty-field defects.

### Rule 5b: Reverse Sync (NiftyPM → JSON)

The complement to JSON-First Planning. When you need to pull a live NiftyPM project into a local JSON source-of-truth — either an initial build or a re-sync after the app changes — use `scripts/reverse-sync.py`. It reads a bundle of MCP responses (labels, taskgroups, milestones, tasks, members) and produces a schema-compliant JSON with `last_synced` set to the current timestamp.

See [references/reverse-sync-workflow.md](references/reverse-sync-workflow.md) for the four-step agent workflow (fetch → bundle → run → verify).

---

## QUICK-START CHEAT SHEET

### Create a project from scratch (most common flow):

```json
// === PHASE 0: Labels (create before any tasks) ===
niftypm_create_label(name="Critical", color="#FF0000", project_id="PROJECT_ID")
niftypm_create_label(name="Research", color="#00AA00", project_id="PROJECT_ID")
// ... store returned label IDs ...

// === PHASE 1: Project setup + tasks ===
// 1. Find or create portfolio
niftypm_list_subteams()  → get subteam_id

// 2. Create project
niftypm_create_project(name="My Project", description="...", template_id="...")

// 3. Reconcile task lists AND milestones — project ships with auto-generated defaults
niftypm_list_taskgroups(project_id="PROJECT_ID") → find existing lists
niftypm_list_milestones(project_id="PROJECT_ID") → find "Untitled List" and other defaults
// Delete unwanted defaults: niftypm_delete_taskgroup(taskgroup_id="...")
// Rename to match your workflow:
niftypm_update_taskgroup(taskgroup_id="...", name="Shipped")
niftypm_update_milestone(milestone_id="...", name="Sprint 1 — Core Features")
// Create only the lists you still need:
niftypm_create_taskgroup(name="Backlog", project_id="PROJECT_ID")

// 4. Create tasks WITH inline enrichment
niftypm_create_task(
  name="First task",
  task_group_id="TODO_LIST_ID",
  description="Detailed description",
  assignees=["MEMBER_ID"],
  due_date="2026-06-30",
  labels=["LABEL_ID_1"],
  story_points=3,
  milestone_id="MILESTONE_ID"
)

// 5. Create real subtasks (within a parent task)
niftypm_create_task(
  name="Subtask — Research API options",
  task_group_id="TODO_LIST_ID",
  task_id="PARENT_TASK_ID"
)

// === PHASE 2: Enrichment pass ===
// 6. Wire blocking dependencies (use update_task, NOT link_task)
niftypm_update_task(task_id="TASK_B", dependency="TASK_A")

// 7. Tie tasks to milestone
niftypm_tie_milestone_tasks(milestone_id="MILESTONE_ID", task_ids=["TASK_ID1", "TASK_ID2"])

// 8. Verify everything
niftypm_get_task(task_id="...") → confirm labels, dates, points, subtasks, dependency
```

### Task lifecycle:
```
list exists? → create list if needed → create task (always with task_group_id) → assign → add labels → set due date → set dependency → complete/archive
```

**⚠️ A task without a `task_group_id` becomes uncategorised/orphaned. Always verify the task immediately with `niftypm_get_task(task_id="...")` to confirm it has a `task_group` field set.**

### Task & Subtask Descriptions (NON-NEGOTIABLE)

Every task and subtask SHALL include a clear description. Good descriptions answer: *What exactly needs to be done? What is the expected outcome?*

- **Be descriptive but concise**: 1-3 sentences that remove ambiguity. Not a novel, not a one-word label.
- **Include links**: If the task relates to a document, issue, paper, or external resource, paste the URL in the description so the assignee can find it immediately.

### Subtasks vs Checklists — CRITICAL DISTINCTION

NiftyPM offers three ways to represent sub-items. You MUST prefer them in this exact order:

| Priority | Mechanism                     | When to Use                                                               | Tool Call                                          |
| -------- | ----------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------- |
| **1st**      | **Native Subtask**                | Trackable work that needs its own status, assignee, due date, or label        | `niftypm_create_task(task_id="PARENT_ID", task_group_id="...")` |
| **2nd**      | **Native Checklist**              | Non-trackable sub-steps inside a single task (checked off, not full tasks)    | `niftypm_create_checklist(task_id="...", name="...")` + `niftypm_create_checklist_items(checklist_id="...", names=["item 1", "item 2"])` |
| **LAST**     | Markdown `- [ ]` in description | **THROWAWAY NOTES ONLY.** Never use for work breakdown that another agent or human might need to act on.                 | Just text in `description`                              |

**RULES:**
1. If a sub-step represents work someone might search for, assign, or track separately → **NATIVE SUBTASK.**
2. If sub-steps are just clarification within a single doer's workflow → use **native checklists** via `niftypm_create_checklist` + `niftypm_create_checklist_items` (requires team token — see [Checklist Tools & Team Token Setup](#checklist-tools--team-token-setup) below).
3. **NEVER use `- [ ]` in descriptions as a substitute for real subtasks.** The skill that created AIE-20 embedded 4 real work items as markdown text — those should have been `niftypm_create_task(task_id="AIE-20_ID")` calls.

**Retrieving subtasks:** `niftypm_list_tasks` now accepts `include_subtasks: "true"` and `task_id` (the parent task's internal ID). Use both together to fetch a task with all its subtasks in a single call:
```
niftypm_list_tasks(task_id="n4kd7Mzub2", include_subtasks="true")
```

```markdown
// RIGHT — real subtask:
niftypm_create_task(
  name="Verify ONNX export feasibility",
  task_group_id="BACKLOG_ID",
  task_id="AIE-20_ID",          // ← this makes it a subtask of AIE-20
  description="Test gte-reranker ONNX export on M1 Mac. Check latency and memory."
)

// WRONG — markdown checklist masquerading as subtasks:
description: "Tasks:\n- [ ] Verify ONNX export\n- [ ] A/B test..."
```

---

## CHECKLIST TOOLS & TEAM TOKEN SETUP

Checklist tools (`niftypm_create_checklist`, `niftypm_create_checklist_items`, `niftypm_update_checklist_item`, `niftypm_toggle_checklist_item`, `niftypm_delete_checklist_item`, etc.) use NiftyPM's **internal API** (`api.niftypm.com`), which is separate from the public OpenAPI at `openapi.niftypm.com`. This internal API requires a **team token** for write operations — the OAuth access token used by all other tools returns 401 on checklist mutations.

### When the team token is missing

- Checklist **reads** (`niftypm_get_checklist`) work with the OAuth token alone.
- Checklist **writes** (create/update/delete) return `401 Unauthorized`.
- A warning prints at server startup if `NIFTYPM_TEAM_TOKEN` is not set.

### How to obtain the team token

**The user must extract it from their browser once.** There is no API endpoint to exchange the OAuth token for a team token.

1. Log into the NiftyPM workspace in a browser.
2. Open DevTools Console (F12 → Console tab).
3. Run this one-liner:
   ```javascript
   JSON.parse(decodeURIComponent(document.cookie.match(/nifty_auth=([^;]+)/)[1])).teamToken
   ```
4. Copy the output (a long JWT string).

### Where to store it (two methods)

**Method 1 — `.secrets/` file** (recommended for local/OpenCode setups):
```bash
echo "PASTE_TOKEN_HERE" > .secrets/team_token
```

**Method 2 — `.env` or environment variable:**
```bash
# In .env:
NIFTYPM_TEAM_TOKEN=PASTE_TOKEN_HERE

# Or export inline:
export NIFTYPM_TEAM_TOKEN=PASTE_TOKEN_HERE
```

The MCP server reads from `.secrets/team_token` first (via the same credential-loading pattern as the other secrets), falling back to the `NIFTYPM_TEAM_TOKEN` env var.

### Token expiry

The team token has a long expiry (months — it's the same cookie that keeps you logged into the web app). If checklist operations start returning 401, repeat the extraction above.

### Checklist tool reference

| Tool | Endpoint | Notes |
|------|----------|-------|
| `niftypm_create_checklist` | `POST /checklists` | Body: `{task_id, name}` |
| `niftypm_get_checklist` | `GET /checklists/{id}` | Returns checklist with `items[]` |
| `niftypm_update_checklist` | `PUT /checklists/{id}` | Rename |
| `niftypm_delete_checklist` | `DELETE /checklists/{id}` | Deletes checklist + all items |
| `niftypm_create_checklist_items` | `POST /checklists/{id}` | **Body is an ARRAY** `[{name}]` — tool handles this automatically from `names` param |
| `niftypm_update_checklist_item` | `PUT /checklists/{cid}/{iid}` | Rename item |
| `niftypm_toggle_checklist_item` | `PUT /checklists/{cid}/{iid}` | `{completed: true/false}` |
| `niftypm_delete_checklist_item` | `DELETE /checklists/{cid}/{iid}` | Delete single item |

Full API reference: `docs/api/checklist-api-discovery.md` and `docs/api/checklist-endpoints.json`.

---

Detailed workflows are in the reference files. Here are the triggers:

| Scenario | Reference File |
|----------|---------------|
| Academic research / fellowship management | See [references/niftypm-workflows.md](references/niftypm-workflows.md#1-academic-research--fellowship-management) |
| Software development project management | See [references/niftypm-workflows.md](references/niftypm-workflows.md#2-software-development-project-management) |
| Business / startup project management | See [references/niftypm-workflows.md](references/niftypm-workflows.md#3-business--startup-project-management) |
| Hybrid research + dev + business workflows | See [references/niftypm-workflows.md](references/niftypm-workflows.md#4-hybrid-research--dev--business-workflow) |
| Label taxonomy and colour conventions | See [references/niftypm-workflows.md](references/niftypm-workflows.md#5-label-taxonomy--colour-conventions) |
| Full MCP tool reference | See [references/niftypm-tools.md](references/niftypm-tools.md) |
| **JSON project plan schema (PLAN FIRST)** | See [references/niftypm-project-plan-schema.md](references/niftypm-project-plan-schema.md) |
| **JSON Schema (machine validation)** | See [references/niftypm-project-plan.schema.json](references/niftypm-project-plan.schema.json) |
| **Blank template (copy to start)** | See [references/niftypm-project-plan-template.json](references/niftypm-project-plan-template.json) |

---

## TOOL MAPPING — BY INTENT

When the user says "I need to..." — use the exact tool listed:

| User Intent | NiftyPM Action | MCP Tool |
|------------|---------------|----------|
| "Create a portfolio for my research" | Create subteam | `niftypm_create_subteam` |
| "Create a new project" | Create project | `niftypm_create_project` |
| "Show me my projects" | List projects | `niftypm_list_projects` |
| "Create a task list / status column" | Create task group | `niftypm_create_taskgroup` |
| "Create a new task" | Create task | `niftypm_create_task` |
| "Create a subtask" | Create task with task_id | `niftypm_create_task(task_id="...")` |
| "Assign this to X" | Assign task | `niftypm_assign_task` |
| "Mark this as done" | Complete task | `niftypm_complete_task` |
| "Archive this task" | Archive task | `niftypm_archive_task` |
| "Clone/duplicate this task" | Clone task | `niftypm_clone_task` |
| "Add a label/tag" | Add task labels | `niftypm_add_task_labels` |
| "Create a milestone / sprint" | Create milestone | `niftypm_create_milestone` |
| "Create a checklist on a task" | Create checklist | `niftypm_create_checklist` |
| "Add checklist items" | Create checklist items | `niftypm_create_checklist_items` |
| "Toggle checklist item" | Toggle completion | `niftypm_toggle_checklist_item` |
| "Tie these tasks to a milestone" | Tie milestone tasks | `niftypm_tie_milestone_tasks` |
| "Make this task block that one" | Blocking dependency | `niftypm_update_task(task_id="B", dependency="A")` |
| "Link these related tasks" | Informational cross-reference | `niftypm_link_task` |
| "Upload a file" | Upload files | `niftypm_upload_files` |
| "Create a document" | Create document | `niftypm_create_document` |
| "Attach doc to task" | Attach task document | `niftypm_attach_task_document` |
| "Move task to another list" | Move task | `niftypm_move_task` |
| "Show me all tasks" | List tasks | `niftypm_list_tasks` |
| "Show task details" | Get task | `niftypm_get_task` |
| "Update task description" | Update task | `niftypm_update_task` |
| "Delete this" | Delete (specific tool) | `niftypm_delete_task` / `_project` / `_milestone` |
| "Add custom field" | Add task/project field | `niftypm_add_task_field` / `niftypm_add_project_field` |
| "Track time on this" | Get time duration | `niftypm_get_time_duration` |
| "Time report" | Get time report | `niftypm_get_time_report` |
| "Who's on my team?" | List members | `niftypm_list_members` |
| "Create a message/discussion" | Create message | `niftypm_create_message` |
| "Create a folder for files" | Create folder | `niftypm_create_folder` |
| "Create a webhook" | Create webhook | `niftypm_create_webhook` |

---

## NIFTYPM BEST PRACTICES (from official help docs)

For the full best practices reference (hierarchy design, task design, milestones, docs, goals), see [references/niftypm-best-practices.md](references/niftypm-best-practices.md).

### Quick Reference — Task Design Essentials
- Every task gets: **name**, **description** (concise, with links/checklists), **assignee**, **due date**, and **label**.
- Use **colour-coded labels** for urgency (🔴 critical, 🟠 high, 🟡 medium, 🔵 low) and domain (🟢 research, 🩷 writing, 🩵 features, 🔴 bugs). See [Label Taxonomy](references/niftypm-workflows.md#5-label-taxonomy--colour-conventions).
- Use **story points** for effort estimation (rolls up to milestones).
- Set **start dates** in addition to due dates for timeline visibility.
- Use **dependencies** (`update_task(dependency="PREDECESSOR_ID")`) to enforce workflow order — dependencies cascade due dates.
- Use **task linking** (`link_task`) for informational cross-references only (NOT for blocking dependencies).

---

## TODOWRITE TEMPLATES

Follow the `todowrite` HARD GATE protocol. Issue before any PM operation:

### Research project setup:
```json
todowrite([
  {content: "Discover existing portfolios and projects", status: "in_progress", priority: "high"},
  {content: "Create portfolio (subteam) for research area", status: "pending", priority: "high"},
  {content: "Create project for paper/grant/fellowship", status: "pending", priority: "high"},
  {content: "Reconcile task lists (list existing, delete unused defaults, rename/reuse)", status: "pending", priority: "high"},
  {content: "Create milestones with dates", status: "pending", priority: "high"},
  {content: "Create tasks with assignees and dependencies", status: "pending", priority: "high"},
  {content: "Upload relevant files and docs", status: "pending", priority: "medium"},
  {content: "Verify all created items", status: "pending", priority: "medium"}
])
```

### Software project setup:
```json
todowrite([
  {content: "Reconcile task lists (list existing from template, delete/rename unused defaults)", status: "in_progress", priority: "high"},
  {content: "Create sprint milestones", status: "pending", priority: "high"},
  {content: "Create tasks with story points and dependencies", status: "pending", priority: "high"},
  {content: "Upload design docs and specs", status: "pending", priority: "medium"},
  {content: "Verify all created items", status: "pending", priority: "medium"}
])
```

---

## BOUNDARIES

- **ALWAYS** list before create — never guess IDs.
- **ALWAYS** verify after mutate — read back with `get_*` tool.
- **ALWAYS** include descriptions with tasks and subtasks — see Task & Subtask Descriptions above.
- **DO NOT** create duplicate portfolios or projects with the same name — list first.
- **DO NOT** modify the user's NiftyPM workspace structure without explicit confirmation.
- **ASK** before: deleting anything, archiving anything, changing project privacy settings.
- **MANDATORY** — load this skill before any NiftyPM MCP tool call to ensure proper workflow.

### Error Recovery
If a tool call fails (network error, validation error, permission denied):
1. Read back the parent object to verify current state.
2. Do NOT blindly retry the same call — check for duplicates first with a `list` call.
3. If a create call succeeded but a subsequent call failed, report the partial success so the user can decide next steps.
4. Never create orphaned resources — if a project was created but task lists weren't, inform the user rather than silently continuing.

---

## OUTPUT FORMAT

After completing a PM operation, report with:

```
✅ NiftyPM operation complete

## Summary
- Portfolio: [name] (ID: [id])
- Project: [name] (ID: [id])
- Task Lists: [X created/modified]
- Tasks: [X created] (IDs: [...])
- Milestones: [X created] (IDs: [...])
- Labels created: [X] (names: [...])
- Files uploaded: [X]
- Docs created: [X]

## Hierarchy
Portfolio → Project → Task Lists → Tasks → [Subtasks]

## Next Steps
1. Review in NiftyPM UI
2. Add descriptions/details as needed
3. Set up automations if applicable
```
