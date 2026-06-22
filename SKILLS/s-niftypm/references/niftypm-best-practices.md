# NiftyPM Best Practices

Extracted from official NiftyPM help documentation. Reference this when designing workspace structure or advising on PM workflows.

---

## Hierarchy Design

- **Portfolios = teams/departments.** One per research area, one per software project family.
- **Projects = initiatives.** Each paper, grant, or software feature set is a project.
- **Task Lists = workflow stages.** Use clear status names: "To Do", "In Progress", "Under Review", "Done".
- **Milestones = deadlines/sprints.** Visualised on the Roadmap. Colour indicates progress:
  - Green: all tasks complete
  - Orange: partially complete
  - Red: overdue
  - Grey: not started, not overdue

## Task Design

- Every task gets: name, description, assignee, due date, and label.
- **Descriptions**: Concise, with links and checklists. See SKILL.md Task & Subtask Descriptions section.
- Use **labels/tags** for filtering. Apply a consistent colour taxonomy (see niftypm-workflows.md §5).
- Use **story points** for effort estimation (rolls up to milestones).
- Set **start dates** in addition to due dates for timeline visibility.
- Use **dependencies** to enforce workflow order (blocks completion until dependency resolves).
- Dependencies **cascade due dates**: changing one task's due date shifts all dependent tasks.
- Use **task linking** for cross-project references (not enforced, just informational).

## Milestones

- Milestones are Task Lists shown on the Roadmap.
- **Auto mode**: Milestone dates auto-update from task dates within.
- **Manual mode**: Fixed date range that tasks must fit within.
- Milestone dependencies lock tasks until the prerequisite milestone is complete.
- Tasks are NOT automatically tied to milestones — you must call `niftypm_tie_milestone_tasks` explicitly.

## Portfolios (Subteams)

- Only Owners/Admins can create portfolios.
- Portfolio members auto-join all public projects in that portfolio.
- Use **folders** inside portfolios for additional grouping (without access control).
- Guests see only their invited project, not the portfolio.

## Docs & Files

- Nifty Docs are collaborative, with AI generation, version control, and public sharing.
- Docs can be attached to tasks; assignees auto-added as doc collaborators.
- Files are organised into folders; all project files consolidated in the Files tab.
- File annotations and proofing are supported (images, videos).

## Goals

- Goals track KPIs across projects: task counts, tracked time, story points, custom field values.
- **Dynamic targets** auto-update as tasks are added/removed.
- **Static targets** compare against a fixed number.
- Use tags and custom fields to auto-associate tasks across projects into a goal.
- Goal Groups bundle related goals (e.g., "Q4 Research Objectives").

## Custom Fields

- Custom fields enable structured data on tasks and projects (dropdown, number, text, date, currency).
- Use rollups to aggregate custom field values across tasks for project-level dashboards.
- Common custom fields: Priority Level (dropdown), Estimated Hours (number), Phase (dropdown).

## Time Tracking

- Track time per task or per project.
- Use the time report endpoint to generate weekly/monthly summaries.
- Combine time tracking with milestones to measure sprint velocity.
