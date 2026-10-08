import type { NiftyPMClient } from "./client.js";
import type { Bundle, BundleProject, BundleTask, ProjectJsonTask } from "./reverse-sync.js";

export type Collection = "tasks" | "labels" | "taskgroups" | "milestones" | "projects" | "members";
const PAGE_SIZE = 100;
const ID = /^[a-zA-Z0-9_!-]+$/;

/** Identify trusted local validation messages without exposing external error bodies. */
export class SyncError extends Error {}

/** Return a diagnostic that cannot include an upstream body or filesystem exception. */
export function syncFailure(error: unknown): string {
  return error instanceof SyncError ? error.message : "Local sync failed; the existing mirror was preserved.";
}

/** Recognise JSON records before accessing boundary fields. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** Validate identifiers used in API paths and project bindings. */
export function validId(value: unknown): value is string {
  return typeof value === "string" && ID.test(value);
}

const strings: Record<Collection, string[]> = {
  tasks: ["name", "nice_id", "description", "task_group", "milestone", "dependency", "due_date", "start_date", "completed_on"],
  labels: ["name", "color"], taskgroups: ["name"], milestones: ["name", "description", "end", "start"],
  projects: ["name", "nice_id", "description", "portfolio", "portfolio_id", "repo"], members: [],
};

function validateRow(value: unknown, collection: Collection, projectId?: string): Record<string, unknown> {
  if (!isRecord(value) || !validId(value.id)) throw new SyncError(`Invalid ${collection} record; sync was refused.`);
  for (const key of strings[collection]) {
    if (value[key] != null && typeof value[key] !== "string") throw new SyncError(`Invalid ${collection} field; sync was refused.`);
  }
  if (collection === "tasks" || collection === "taskgroups") {
    const keys = collection === "tasks" ? ["total_subtasks"] : ["order"];
    for (const key of keys) {
      if (value[key] != null && (typeof value[key] !== "number" || !Number.isFinite(value[key]))) {
        throw new SyncError(`Invalid ${collection} number; sync was refused.`);
      }
    }
  }
  if (collection === "tasks") {
    // Legacy estimates can be strings; retain their upstream representation.
    const estimate = value.story_points;
    if (estimate != null && typeof estimate !== "string" &&
      (typeof estimate !== "number" || !Number.isFinite(estimate))) throw new SyncError("Invalid task estimate; sync was refused.");
    for (const key of ["labels", "assignees"]) {
      if (value[key] != null && (!Array.isArray(value[key]) || !value[key].every(validId))) {
        throw new SyncError("Invalid task references; sync was refused.");
      }
    }
    for (const key of ["completed", "archived"]) {
      if (value[key] != null && typeof value[key] !== "boolean") throw new SyncError("Invalid task status; sync was refused.");
    }
  }
  if (projectId) {
    for (const key of ["project", "project_id", "projectId"]) {
      if (value[key] != null && value[key] !== projectId) throw new SyncError("Fetched project ownership conflicts with the mirror.");
    }
  }
  return value;
}

/** Fetch a complete validated legacy collection, with a narrow unpaginated members exception. */
export async function fetchCollection<T extends { id?: string }>(
  client: NiftyPMClient, collection: Collection, params: Record<string, unknown> = {}, projectId?: string,
): Promise<T[]> {
  const records: T[] = [];
  const ids = new Set<string>();
  let offset = 0;
  for (;;) {
    const query = collection === "members" ? undefined : { ...params, limit: PAGE_SIZE, offset };
    const response = await client.get<unknown>(`/api/v1.0/${collection}`, query);
    let rows: unknown[];
    let more: boolean;
    if (collection === "members" && Array.isArray(response)) {
      rows = response;
      more = false;
    } else {
      if (!isRecord(response)) throw new SyncError(`Unexpected ${collection} response; sync was refused.`);
      const keys = collection === "tasks" ? ["tasks"] : collection === "projects" ? ["projects", "items"] : ["items"];
      const present = keys.filter((key) => Object.hasOwn(response, key));
      const mixed = ["tasks", "items", "projects", "members", "data"].some((key) =>
        !keys.includes(key) && Object.hasOwn(response, key));
      if (present.length !== 1 || mixed || !Array.isArray(response[present[0]])) {
        throw new SyncError(`Unexpected ${collection} envelope; sync was refused.`);
      }
      rows = response[present[0]] as unknown[];
      const flag = collection === "members" ? "has_more" : "hasMore";
      const optional = collection === "labels" || collection === "taskgroups";
      if (Object.hasOwn(response, flag)) {
        if (typeof response[flag] !== "boolean") throw new SyncError(`Invalid ${collection} pagination flag.`);
        more = response[flag] as boolean;
      } else {
        if (!optional) throw new SyncError(`Missing ${collection} pagination flag.`);
        more = rows.length >= PAGE_SIZE;
      }
    }
    if (collection === "members" && more) throw new SyncError("Members report incomplete results without a supported continuation; sync was refused.");
    for (const value of rows) {
      const row = validateRow(value, collection, projectId);
      const id = row.id as string;
      if (ids.has(id)) throw new SyncError(`Repeated ${collection} IDs; sync was refused.`);
      ids.add(id);
      records.push(row as T);
    }
    if (!more) return records;
    if (rows.length === 0) throw new SyncError(`Empty ${collection} page claims more results; sync was refused.`);
    offset += rows.length;
  }
}

/** Read and validate one project's metadata before building its mirror. */
export async function fetchProject(client: NiftyPMClient, projectId: string): Promise<BundleProject> {
  if (!validId(projectId)) throw new SyncError("Invalid mirror project ID.");
  const response = await client.get<unknown>(`/api/v1.0/projects/${projectId}`);
  const project = validateRow(response, "projects");
  if (project.id !== projectId) throw new SyncError("Fetched project metadata belongs to another project.");
  return project as BundleProject;
}

/** Fetch both milestone variants and deduplicate only across the validated collections. */
export async function fetchMilestones(client: NiftyPMClient, projectId: string): Promise<NonNullable<Bundle["milestones"]>> {
  const [regular, lists] = await Promise.all([
    fetchCollection<NonNullable<Bundle["milestones"]>[number]>(client, "milestones", { project_id: projectId }, projectId),
    fetchCollection<NonNullable<Bundle["milestones"]>[number]>(client, "milestones", { project_id: projectId, is_list: "true" }, projectId),
  ]);
  const merged = new Map<string | undefined, (typeof regular)[number]>();
  for (const row of [...regular, ...lists]) if (!merged.has(row.id)) merged.set(row.id, row);
  return [...merged.values()];
}

/** Fetch a full legacy snapshot without flattening nested subtasks into the task collection. */
export async function fetchBundle(client: NiftyPMClient, project: BundleProject): Promise<Bundle> {
  const projectId = project.id;
  if (!validId(projectId)) throw new SyncError("Invalid selected project ID.");
  const [labels, taskgroups, milestones, tasks, members] = await Promise.all([
    fetchCollection<NonNullable<Bundle["labels"]>[number]>(client, "labels"),
    fetchCollection<NonNullable<Bundle["taskgroups"]>[number]>(client, "taskgroups", { project_id: projectId }, projectId),
    fetchMilestones(client, projectId),
    fetchCollection<BundleTask>(client, "tasks", { project_id: projectId }, projectId),
    fetchCollection<NonNullable<Bundle["members"]>[number]>(client, "members"),
  ]);
  return { project, labels, taskgroups, milestones, tasks, members };
}

/** Retain local enrichment while refreshing all fields owned by the task transformer. */
export function mergeTasks(previous: ProjectJsonTask[], fresh: ProjectJsonTask[]): ProjectJsonTask[] {
  const old = new Map(previous.map((task) => [task.id, task]));
  return fresh.map((task) => {
    const local = old.get(task.id);
    return local ? { ...local, ...task, subtasks: local.subtasks ?? task.subtasks } : task;
  });
}
