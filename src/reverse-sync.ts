/**
 * TypeScript port of reverse-sync.py transform logic.
 * Shared by `init`, `sync`, and auto-sync.
 * Same output schema as the Python script.
 */

// ── Bundle input types ──────────────────────────────────────────────

export interface BundleProject {
  id?: string;
  nice_id?: string;
  name?: string;
  description?: string;
  portfolio?: string;
  portfolio_id?: string;
  repo?: string;
}

export interface BundleLabel {
  id: string;
  name?: string;
  color?: string;
}

export interface BundleTaskgroup {
  id: string;
  name?: string;
  order?: number;
}

export interface BundleMilestone {
  id: string;
  name?: string;
  end?: string;
  start?: string;
  description?: string;
}

export interface BundleTask {
  id: string;
  nice_id?: string;
  name?: string;
  task_group?: string;
  milestone?: string;
  dependency?: string;
  labels?: string[];
  description?: string;
  story_points?: number | null;
  due_date?: string | null;
  start_date?: string | null;
  total_subtasks?: number;
  completed?: boolean;
  completed_on?: string | null;
  assignees?: string[];
  archived?: boolean;
}

export interface BundleMember {
  id: string;
  name?: string;
  email?: string;
}

export interface Bundle {
  project?: BundleProject;
  labels?: BundleLabel[];
  taskgroups?: BundleTaskgroup[];
  milestones?: BundleMilestone[];
  tasks?: BundleTask[];
  members?: BundleMember[];
}

// ── Output types ────────────────────────────────────────────────────

export interface ProjectJsonMeta {
  created: string;
  last_synced: string;
  generated_by: string;
  project_nice_id?: string;
  niftypm_project_id?: string;
  source: string;
  notes: string;
}

export interface ProjectJsonProject {
  name: string;
  description: string;
  portfolio: string;
  portfolio_id?: string;
  repo?: string;
}

export interface ProjectJsonLabel {
  name: string;
  color: string;
  id: string;
}

export interface ProjectJsonTaskList {
  name: string;
  id: string;
  order: number;
}

export interface ProjectJsonMilestone {
  name: string;
  id: string;
  due: string | null;
  description: string;
}

export interface ProjectJsonTask {
  id: string;
  nice_id?: string;
  name: string;
  task_list: string | null;
  milestone: string | null;
  description: string;
  labels: string[];
  story_points: number | null;
  due_date: string | null;
  start_date: string | null;
  dependency: string | null;
  subtasks: any[];
  total_subtasks: number;
  completed: boolean;
  completed_on: string | null;
  assignees: string[];
  archived: boolean;
}

export interface ProjectJson {
  meta: ProjectJsonMeta;
  project: ProjectJsonProject;
  labels: ProjectJsonLabel[];
  task_lists: ProjectJsonTaskList[];
  milestones: ProjectJsonMilestone[];
  tasks: ProjectJsonTask[];
  _validation_checklist: string[];
}

// ── Helpers ─────────────────────────────────────────────────────────

function dateOnly(isoStr?: string | null): string | null {
  if (!isoStr || typeof isoStr !== "string") return null;
  return isoStr.length >= 10 ? isoStr.slice(0, 10) : null;
}

function buildLabelMap(labels: BundleLabel[]): Map<string, [string, string]> {
  const m = new Map<string, [string, string]>();
  for (const l of labels) {
    if (l.id) {
      m.set(l.id, [l.name || "", l.color || "#000000"]);
    }
  }
  return m;
}

function buildTaskgroupMap(taskgroups: BundleTaskgroup[]): Map<string, [string, number]> {
  const m = new Map<string, [string, number]>();
  for (const tg of taskgroups) {
    if (tg.id) {
      m.set(tg.id, [tg.name || "", tg.order || 0]);
    }
  }
  return m;
}

function buildMilestoneMap(
  milestones: BundleMilestone[],
): Map<string, [string, string | null, string]> {
  const m = new Map<string, [string, string | null, string]>();
  for (const ms of milestones) {
    if (!ms.id) continue;
    const name = ms.name || "";
    if (name.trim().toLowerCase() === "untitled list") continue;
    if (m.has(ms.id)) continue;
    const due = dateOnly(ms.end) || dateOnly(ms.start);
    const desc = ms.description || "";
    m.set(ms.id, [name, due, desc]);
  }
  return m;
}

// ── Main transform ──────────────────────────────────────────────────

export function buildProjectJson(bundle: Bundle): ProjectJson {
  const now = new Date().toISOString().replace(/\.\d+Z$/, "Z");

  const project = bundle.project || {};
  const tasksRaw = bundle.tasks || [];
  const labelMap = buildLabelMap(bundle.labels || []);
  const tgMap = buildTaskgroupMap(bundle.taskgroups || []);
  const msMap = buildMilestoneMap(bundle.milestones || []);

  const idToNice = new Map<string, string>();
  for (const t of tasksRaw) {
    if (t.id && t.nice_id) {
      idToNice.set(t.id, t.nice_id);
    }
  }

  const usedLabelIds = new Set<string>();
  for (const t of tasksRaw) {
    for (const lid of t.labels || []) {
      usedLabelIds.add(lid);
    }
  }

  const outTasks: ProjectJsonTask[] = tasksRaw.map((t) => {
    const tgId = t.task_group;
    const msId = t.milestone;
    const depId = t.dependency;
    const labelIds = t.labels || [];

    const tgName = tgId ? (tgMap.get(tgId)?.[0] ?? null) : null;
    const msName = msId ? (msMap.get(msId)?.[0] ?? null) : null;
    const depNice = depId && idToNice.has(depId) ? (idToNice.get(depId) ?? null) : null;

    return {
      id: t.id,
      nice_id: t.nice_id,
      name: t.name || "",
      task_list: tgName,
      milestone: msName,
      description: t.description || "",
      labels: labelIds.filter((l) => labelMap.has(l)).map((l) => labelMap.get(l)?.[0] ?? ""),
      story_points: t.story_points ?? null,
      due_date: dateOnly(t.due_date),
      start_date: dateOnly(t.start_date),
      dependency: depNice,
      subtasks: [],
      total_subtasks: t.total_subtasks || 0,
      completed: t.completed || false,
      completed_on: t.completed_on ?? null,
      assignees: t.assignees || [],
      archived: t.archived || false,
    };
  });

  const completedCount = outTasks.filter((t) => t.completed).length;
  const noMilestone = outTasks.filter((t) => t.milestone === null).length;
  const noTaskList = outTasks.filter((t) => t.task_list === null).length;
  const usedLabelsResolved = [...usedLabelIds].filter((l) => labelMap.has(l));

  return {
    meta: {
      created: now,
      last_synced: now,
      generated_by: "niftypm-mcp/reverse-sync.ts",
      project_nice_id: project.nice_id,
      niftypm_project_id: project.id,
      source: "Live NiftyPM API via niftypm-mcp",
      notes:
        "Subtask names not yet populated (requires get_item_children per parent task). All other fields resolved from live data.",
    },
    project: {
      name: project.name || "",
      description: project.description || "",
      portfolio: project.portfolio || "",
      portfolio_id: project.portfolio_id,
      repo: project.repo,
    },
    labels: [...usedLabelsResolved]
      .sort((a, b) => a.localeCompare(b))
      .map((lid) => {
        const entry = labelMap.get(lid);
        return { name: entry?.[0] ?? "", color: entry?.[1] ?? "", id: lid };
      }),
    task_lists: [...tgMap.entries()]
      .sort((a, b) => (a[1][1] || 0) - (b[1][1] || 0))
      .map(([tid, [name, order]]) => ({ name, id: tid, order })),
    milestones: [...msMap.entries()].map(([mid, [name, due, desc]]) => ({
      name,
      id: mid,
      due,
      description: desc,
    })),
    tasks: outTasks,
    _validation_checklist: [
      `Synced from live NiftyPM API on ${now}`,
      `Tasks: ${outTasks.length} total (${completedCount} completed)`,
      `Labels used: ${usedLabelsResolved.length}`,
      `Tasks without milestone: ${noMilestone} (null is honest for retrospective done-records)`,
      `Tasks without task_list: ${noTaskList}`,
      "Subtask names are a known gap - enrich via get_item_children in a follow-up pass",
      "All task IDs, nice_ids, dependencies, and milestone assignments resolved from live data",
    ],
  };
}
