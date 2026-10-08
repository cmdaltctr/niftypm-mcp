/** Synthetic, deterministic legacy mirror data. No operator mirror content. */
export const PROJECT_ID = "proj1";
export const LAST_SYNCED = "2020-01-02T03:04:05Z";

export const labels = Array.from({ length: 7 }, (_, i) => ({
  id: `lab${i + 1}`, name: `Synthetic label ${i + 1}`, color: "#123456",
}));
export const taskgroups = Array.from({ length: 6 }, (_, i) => ({
  id: `group${i + 1}`, name: `Synthetic list ${i + 1}`, order: i + 1, project_id: PROJECT_ID,
}));
export const milestones = Array.from({ length: 7 }, (_, i) => ({
  id: `mile${i + 1}`, name: `Synthetic milestone ${i + 1}`,
  end: "2030-04-05T00:00:00Z", description: "Synthetic milestone description", project_id: PROJECT_ID,
}));
export const tasks = Array.from({ length: 48 }, (_, i) => ({
  id: `task${i + 1}`, nice_id: `SYN-${i + 1}`, name: `Cloud synthetic task ${i + 1}`,
  project_id: PROJECT_ID, task_group: `group${i % 6 + 1}`, milestone: `mile${i % 7 + 1}`,
  dependency: i === 0 ? undefined : "task1", labels: [`lab${i % 7 + 1}`],
  description: "Synthetic cloud description", story_points: 3, due_date: "2030-05-06T12:00:00Z",
  start_date: "2030-05-01T12:00:00Z", total_subtasks: i < 5 ? 2 : 1,
  completed: false, completed_on: null, assignees: ["member1"], archived: false,
}));

// Expected mirror fields are seeded explicitly, independently of buildProjectJson.
export const syntheticMirror = {
  meta: {
    created: "2019-01-01T00:00:00Z", last_synced: LAST_SYNCED,
    generated_by: "synthetic-fixture", project_nice_id: "SYN", niftypm_project_id: PROJECT_ID,
    source: "Synthetic regression data", notes: "Local enrichment retained", custom_meta: "keep",
  },
  project: {
    name: "Stored synthetic project", description: "Stored synthetic description",
    portfolio: "Synthetic portfolio", portfolio_id: "portfolio1", repo: "https://example.invalid/synthetic",
  },
  labels: labels.map((l) => ({ id: l.id, name: l.name, color: l.color, local_label: "keep" })),
  task_lists: taskgroups.map((g) => ({ id: g.id, name: g.name, order: g.order, local_list: "keep" })),
  milestones: milestones.map((m) => ({
    id: m.id, name: m.name, due: "2030-04-05", description: m.description, local_milestone: "keep",
  })),
  tasks: Array.from({ length: 48 }, (_, i) => ({
    id: `task${i + 1}`, nice_id: `SYN-${i + 1}`, name: `Stored synthetic task ${i + 1}`,
    task_list: `Synthetic list ${i % 6 + 1}`, milestone: `Synthetic milestone ${i % 7 + 1}`,
    description: "Stored synthetic description", labels: [`Synthetic label ${i % 7 + 1}`],
    story_points: 1, due_date: null, start_date: null, dependency: i === 0 ? null : "SYN-1",
    subtasks: Array.from({ length: i < 5 ? 2 : 1 }, (_, j) => ({
      id: `child${i + 1}_${j + 1}`, name: `Synthetic child ${i + 1}.${j + 1}`, completed: false,
    })),
    subtask_details: { source: "Synthetic local enrichment", checked: true },
    total_subtasks: i < 5 ? 2 : 1, completed: false, completed_on: null, assignees: ["member1"],
    archived: false, local_note: "Retain local-only field",
  })),
  _validation_checklist: ["Synthetic checklist stays unchanged for targeted writes"],
  custom_top_level: { preserve: true },
};

/** Return a fresh mutable mirror for each isolated test. */
export function mirrorFixture(): typeof syntheticMirror {
  return structuredClone(syntheticMirror);
}

/** Verified endpoint wrappers. Bare API arrays are deliberately absent. */
export function collectionResponse(url: URL): unknown {
  const offset = Number(url.searchParams.get("offset") || 0);
  const limit = Number(url.searchParams.get("limit") || 100);
  const page = (rows: unknown[], key: "tasks" | "items") => ({
    [key]: rows.slice(offset, offset + limit), hasMore: offset + limit < rows.length,
  });
  switch (url.pathname) {
    case "/api/v1.0/tasks": return page(tasks, "tasks");
    case "/api/v1.0/labels": return page(labels, "items");
    case "/api/v1.0/taskgroups": return page(taskgroups, "items");
    case "/api/v1.0/milestones":
      return page(url.searchParams.get("is_list") === "true" ? [] : milestones, "items");
    case "/api/v1.0/projects/proj1":
      return { id: PROJECT_ID, name: "Cloud synthetic project", description: "Cloud synthetic description" };
    default: throw new Error("Unexpected synthetic HTTP route");
  }
}
