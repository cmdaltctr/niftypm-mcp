# NiftyPM Domain Workflows

Detailed, step-by-step workflows for specific domains. Follow these when the user's request matches a domain.

---

## 1. Academic Research & Fellowship Management

### When to use:
User says "organise my research", "set up my fellowship project", "track my papers", "manage my grant applications", "create a literature review workflow".

### NiftyPM Structure for Research

```
Portfolio: "Research"
 ├── Folder: "Papers"
 │    ├── Project: "Literature Review — [Topic]"
 │    ├── Project: "[Second Paper Title]"
 │    └── Project: "Systematic Review Project"
 ├── Folder: "Grants"
 │    ├── Project: "Grant Application — [Funder]"
 │    └── Project: "EPSRC Proposal"
 └── Folder: "Fellowship"
      ├── Project: "Fellowship Reports"
      └── Project: "Conference Presentations"
```

### Step-by-Step: Setting Up a Paper Project

1. **Discover context:**
   ```
   niftypm_list_subteams() → find/create "Research" portfolio
   niftypm_list_projects() → check for existing paper project
   niftypm_list_members() → find your member_id
   ```

2. **Create paper project:**
   ```
    niftypm_create_project(
      name="[Paper Title] — [Topic]",
      description="Research paper on [your topic here]"
    )
   ```

3. **Create task lists (workflow stages for academic writing):**
   ```
   niftypm_create_taskgroup(name="Literature Review", project_id="...")
   niftypm_create_taskgroup(name="Methodology / Framework Design", project_id="...")
   niftypm_create_taskgroup(name="Writing", project_id="...")
   niftypm_create_taskgroup(name="Review & Revision", project_id="...")
   niftypm_create_taskgroup(name="Submission Ready", project_id="...")
   ```

4. **Create milestones (key deadlines):**
   ```
   niftypm_create_milestone(name="Literature Review Complete", project_id="...", due_date="2026-07-15")
   niftypm_create_milestone(name="First Draft Complete", project_id="...", due_date="2026-08-30")
   niftypm_create_milestone(name="Submit to Journal", project_id="...", due_date="2026-10-01")
   ```

5. **Create tasks with dependencies:**
   ```
   // Literature review tasks
    niftypm_create_task(name="Search Scopus for related papers", task_group_id="LIT_REVIEW_ID", labels=["research"])
    niftypm_create_task(name="Search Semantic Scholar for related papers", task_group_id="LIT_REVIEW_ID", labels=["research"])
   niftypm_create_task(name="Compile annotated bibliography", task_group_id="LIT_REVIEW_ID", labels=["writing"])
   niftypm_link_task(task_id="COMPILE_ID", linked_task_id="SCOPUS_ID", link_type="blocks")
   niftypm_link_task(task_id="COMPILE_ID", linked_task_id="SEMANTIC_ID", link_type="blocks")

   // Writing tasks
   niftypm_create_task(name="Write introduction", task_group_id="WRITING_ID", labels=["writing"], story_points=3)
   niftypm_create_task(name="Write methodology section", task_group_id="WRITING_ID", labels=["writing"], story_points=5)
   niftypm_create_task(name="Write results and discussion", task_group_id="WRITING_ID", labels=["writing"], story_points=8)
   ```

6. **Upload references and create docs:**
   ```
   niftypm_create_document(title="Literature Review Notes", project_id="...", content="...")
   niftypm_create_document(title="Paper Outline", project_id="...", content="...")
   niftypm_upload_files(files=[...], project_id="...")
   ```

7. **Tie tasks to milestones:**
   ```
   niftypm_tie_milestone_tasks(milestone_id="LIT_REVIEW_MILESTONE", task_ids=["SCOPUS_ID", "SEMANTIC_ID", "COMPILE_ID"])
   ```

### Grant Application Workflow

Task lists for a grant:
- "Call / Funder Research"
- "Proposal Writing"
- "Budget & Justification"
- "Internal Review"
- "Submission"

Key tasks:
- "Read funding call guidelines" (labels: ["research"])
- "Draft project summary" (labels: ["writing"])
- "Prepare budget spreadsheet" (labels: ["admin"], due_date: 2 weeks before deadline)
- "Get internal approvals" (labels: ["admin"])
- "Submit application" (labels: ["admin"], due_date: deadline date)

### Fellowship Report Workflow

- Task list: "Monthly Reports", "Quarterly Reports", "Annual Report"
- Recurring task: "Submit monthly progress report" (due end of each month)
- Attach report templates as documents

---

## 2. Software Development Project Management

### When to use:
User says "set up my dev project", "create a sprint", "track my features and bugs", "organise my MCP server work", "set up agile workflow".

### NiftyPM Structure for Software Dev

```
Portfolio: "Software Development"
 ├── Project: "MCP Server" (API/integration layer)
 ├── Project: "Web Application" (frontend)
 └── Project: "cloudflare-workers" (Infrastructure)
```

### Step-by-Step: Agile Sprint Setup

1. **Create project and task lists:**
   ```
   niftypm_create_project(name="my-web-app", description="Full-stack web application")

   niftypm_create_taskgroup(name="Backlog", project_id="...")
   niftypm_create_taskgroup(name="Sprint Backlog", project_id="...")
   niftypm_create_taskgroup(name="In Progress", project_id="...")
   niftypm_create_taskgroup(name="Code Review", project_id="...")
   niftypm_create_taskgroup(name="Testing", project_id="...")
   niftypm_create_taskgroup(name="Done", project_id="...")
   ```

2. **Create sprint milestone:**
   ```
   niftypm_create_milestone(name="Sprint 1 — Core Features", project_id="...", due_date="2026-06-23")
   ```

3. **Create tasks with story points:**
   ```
   niftypm_create_task(name="Set up project scaffolding", task_group_id="SPRINT_ID", story_points=3, labels=["infra"])
   niftypm_create_task(name="Implement user authentication", task_group_id="SPRINT_ID", story_points=8, labels=["feature"])
   niftypm_create_task(name="Create database schema", task_group_id="SPRINT_ID", story_points=5, labels=["infra"])

   // Set dependencies: auth depends on DB
   niftypm_link_task(task_id="AUTH_TASK_ID", linked_task_id="DB_TASK_ID", link_type="blocks")

   // Tie to sprint milestone
   niftypm_tie_milestone_tasks(milestone_id="SPRINT_1_ID", task_ids=["SCAFFOLD_ID", "AUTH_ID", "DB_ID"])
   ```

4. **Create subtasks for complex features:**
   ```
   niftypm_create_task(name="Login form UI", task_group_id="SPRINT_ID", task_id="AUTH_TASK_ID")
   niftypm_create_task(name="JWT token handling", task_group_id="SPRINT_ID", task_id="AUTH_TASK_ID")
   niftypm_create_task(name="Password reset flow", task_group_id="SPRINT_ID", task_id="AUTH_TASK_ID")
   ```

5. **Upload design specs and docs:**
   ```
   niftypm_create_document(title="API Specification", project_id="...", content="...")
   niftypm_create_document(title="Database Schema Design", project_id="...", content="...")
   niftypm_upload_files(files=[...], project_id="...", folder_id="DESIGN_FOLDER_ID")
   ```

### Bug Tracking Workflow

Task lists for bugs:
- "Reported"
- "Triaged"
- "In Progress"
- "Fixed — Pending Verification"
- "Closed"

Labels for bugs: "bug", "critical", "minor", "ui", "backend", "regression"

### Feature Request Workflow

Task lists for features:
- "Feature Requests"
- "Specification"
- "Development"
- "Testing"
- "Released"

Each feature task should have:
- `story_points` for effort estimation
- `labels` for categorisation (e.g., "feature", "enhancement")
- `description` with user story format: "As a [role], I want [feature] so that [benefit]"

---

## 3. Business / Startup Project Management

### When to use:
User says "set up my startup project", "track product features", "manage my business tasks", "organise client work", "create a product roadmap".

### NiftyPM Structure for Business

```
Portfolio: "Business" or "[Company Name]"
 ├── Folder: "Product"
 │    ├── Project: "Feature — [Name]"
 │    └── Project: "Bug Fixes"
 ├── Folder: "Clients"
 │    ├── Project: "Client A — [Project]"
 │    └── Project: "Client B — [Project]"
 ├── Folder: "Operations"
 │    ├── Project: "Marketing"
 │    └── Project: "Finance & Admin"
 └── Folder: "Growth"
      ├── Project: "Business Development"
      └── Project: "Partnerships"
```

### Step-by-Step: Product Feature Project

1. **Create project:**
   ```
   niftypm_create_project(name="Feature — [Name]", description="...")
   ```

2. **Create task lists (product development flow):**
   ```
   niftypm_create_taskgroup(name="Ideas", project_id="...")
   niftypm_create_taskgroup(name="Spec", project_id="...")
   niftypm_create_taskgroup(name="In Progress", project_id="...")
   niftypm_create_taskgroup(name="Testing", project_id="...")
   niftypm_create_taskgroup(name="Shipped", project_id="...")
   ```

3. **Create tasks with descriptions and checklists:**
   ```
   niftypm_create_task(
     name="Implement payment integration",
     task_group_id="SPEC_ID",
     description="Integrate Stripe for subscription billing.
   - [ ] Research Stripe API options
   - [ ] Design checkout flow
   - [ ] Implement payment intent creation
   - [ ] Handle webhook events
   See: https://docs.stripe.com/payments/accept-a-payment",
     labels=["FEATURE_ID", "HIGH_URGENCY_ID"],
     story_points=8,
     due_date="2026-09-01"
   )
   ```

4. **Create milestone for release:**
   ```
   niftypm_create_milestone(name="v2.0 Release", project_id="...", due_date="2026-09-15")
   niftypm_tie_milestone_tasks(milestone_id="...", task_ids=[...])
   ```

### Client Work Workflow

Task lists:
- "New Request"
- "Scoping"
- "In Progress"
- "Client Review"
- "Delivered"
- "Invoice Pending"

Key practices:
- Set due dates to client-facing deadlines
- Use labels for client name and project type
- Track time per task for billing

### Business Operations Workflow

Task lists:
- "Backlog"
- "This Week"
- "In Progress"
- "Done"

Labels: "urgent", "admin", "finance", "marketing", "legal", "hr"

---

## 4. Hybrid Research + Dev + Business Workflow

### When to use:
User runs a research-oriented software startup or academic-industry project. Work spans multiple domains within a single initiative.

### NiftyPM Structure for Hybrid Projects

```
Portfolio: "[Initiative Name]"
 ├── Folder: "Research"
 │    ├── Project: "Literature Review"
 │    └── Project: "Experiments & Validation"
 ├── Folder: "Development"
 │    ├── Project: "Core Product"
 │    └── Project: "Infrastructure"
 ├── Folder: "Business"
 │    ├── Project: "Grant Applications"
 │    └── Project: "Client Acquisition"
 └── Project: "Cross-Cutting Tasks" (no folder — visible at root)
```

### Cross-Project Linking for Dependencies
When a research finding drives a dev task, or a business milestone depends on a research deliverable:
```
// Research task in Project A:
niftypm_link_task(task_id="RESEARCH_TASK_ID", linked_task_id="DEV_TASK_ID", link_type="related")
```
Use `link_type="related"` (not "blocks") because dependencies only work within the same milestone scope.

### Daily Move Pattern for Kanban Flow

For solo/small-team hybrid projects, tasks often span multiple projects. Move tasks between status lists daily:

```
// Morning check-in — move tasks to reflect current state:
niftypm_list_tasks(completed=false, project_id="...")
// For each task that's done:
niftypm_move_task(task_id="...", target_task_group_id="DONE_LIST_ID")
// For each task you're starting today:
niftypm_move_task(task_id="...", target_task_group_id="IN_PROGRESS_LIST_ID")
```

---

## 5. Label Taxonomy & Colour Conventions

Use a consistent colour-coded label system across all projects. Create these labels once at workspace level and reuse them everywhere.

### Urgency Labels (Traffic Light System)

| Label | Colour | When to Use |
|-------|--------|-------------|
| 🔴 Critical | `#FF0000` (red) | Blocking, must-do today, production down |
| 🟠 High | `#FF8C00` (dark orange) | Important, do this week |
| 🟡 Medium | `#FFD700` (gold) | Normal priority, do this sprint |
| 🔵 Low | `#1E90FF` (dodger blue) | Nice to have, backlogged |

### Status Labels

| Label | Colour | When to Use |
|-------|--------|-------------|
| 🟣 Blocked | `#800080` (purple) | Waiting on external dependency |
| ⚪ Waiting | `#808080` (grey) | Waiting on internal decision or review |

### Domain Labels

| Label | Colour | When to Use |
|-------|--------|-------------|
| 🟢 Research | `#00AA00` (green) | Literature review, experiments, analysis |
| 🩷 Writing | `#FF69B4` (hot pink) | Drafting, editing, documentation |
| 🩵 Feature | `#00CED1` (dark turquoise) | New feature development |
| 🔴 Bug | `#DC143C` (crimson) | Bug fix |
| 🟦 Infra | `#4B0082` (indigo) | Infrastructure, CI/CD, deployment |
| 🟩 Security | `#228B22` (forest green) | Security-related work |
| 🩶 Docs | `#A9A9A9` (dark grey) | Documentation tasks |
| 🟧 Admin | `#FF7F50` (coral) | Administrative, finance, legal |

### Creating Labels

```
niftypm_create_label(name="Critical", color="#FF0000", project_id="PROJECT_ID")
niftypm_create_label(name="Research", color="#00AA00", project_id="PROJECT_ID")
```

Labels are project-scoped. For cross-project consistency, create the same labels in each project or use the same naming convention.

---

## 6. General Project Management Patterns

### Daily Standup / Check-in Pattern

1. List your tasks: `niftypm_get_personal_tasks()`
2. Check overdue: `niftypm_list_tasks(completed=false)` and compare due dates
3. Move in-progress tasks: `niftypm_move_task()` to appropriate status
4. Complete done tasks: `niftypm_complete_task()`

### Daily Move Pattern (Kanban Flow)

For Kanban-style boards, move tasks between status lists each day:
```
// Morning: see what's in progress
niftypm_list_tasks(completed=false, task_group_id="IN_PROGRESS_ID")

// Move completed items to Done:
niftypm_move_task(task_id="...", target_task_group_id="DONE_LIST_ID")
niftypm_complete_task(task_id="...")

// Pull new work from Backlog to In Progress:
niftypm_move_task(task_id="...", target_task_group_id="IN_PROGRESS_LIST_ID")
```

### Weekly Review Pattern
1. `niftypm_get_time_report()` to review tracked time
2. `niftypm_list_milestones(project_id="...")` to check milestone progress
3. Colour indicators: Green = on track, Orange = partial, Red = overdue
4. Create next week's tasks with due dates

### File Organisation Pattern
1. `niftypm_get_folder(project_id="...")` to see current structure
2. `niftypm_create_folder(name="Designs", parent_id="...")` for subfolder
3. `niftypm_upload_files(files=[...], folder_id="...")` to place files
4. `niftypm_add_file_labels(file_id="...", labels=["design", "v2"])` to tag

### Cross-Project Coordination Pattern
1. `niftypm_link_task(task_id="...", linked_task_id="...", link_type="related")` for cross-project references
2. Use task linking (not dependencies) for across-project relationships
3. Dependencies only work within the same milestone scope

---

## 7. Common Mistakes to Avoid

| Mistake | Correct Approach |
|---------|-----------------|
| Creating a task without a task_group_id | Always specify which list the task belongs to |
| Using wrong ID format | IDs are alphanumeric strings (e.g., `abc123def`), not integers |
| Not listing before creating | Always list first to avoid duplicates |
| Assuming member IDs | Always call `niftypm_list_members()` first |
| Forgetting to tie tasks to milestones | Tasks in milestones show on Roadmap; untied tasks don't |
| Using link_task for dependencies | Use `link_task(link_type="blocks")` for enforced dependencies; "related" is informational only |
| Creating duplicate portfolios | List subteams first; portfolios are shared workspace resources |
| Tasks with no description or vague description | Always include a concise description (1-3 sentences) with links and checklists where relevant |
| Using inconsistent label names across projects | Adopt a standard label taxonomy (see §5) and use the same names everywhere |
| Creating labels without specifying project_id | Labels are project-scoped; always pass `project_id` when creating |
