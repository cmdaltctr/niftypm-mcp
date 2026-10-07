/** Opt-in local mirrors for Node entry points. Workers never import this module. */
import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { NiftyPMClient, MutationEntry } from "./client.js";
import type { Bundle, ProjectJson } from "./reverse-sync.js";
import { buildProjectJson } from "./reverse-sync.js";
import { fetchCollection, fetchMilestones, fetchProject, isRecord, validId, mergeTasks, SyncError, syncFailure } from "./sync-data.js";
import { readMirror, withMirror, writeMirror } from "./mirror-file.js";

type EntityType = "tasks" | "task_lists" | "milestones" | "labels" | "project";
const methods = new Set(["POST", "PUT", "DELETE"]);
const types: Record<string, EntityType> = { tasks: "tasks", taskgroups: "task_lists", milestones: "milestones", labels: "labels", projects: "project" };

function endpointInfo(endpoint: string): { type: EntityType; id?: string } | undefined {
  const path = endpoint.split("?")[0];
  const match = path.match(/^\/api\/v1\.0\/(tasks|taskgroups|milestones|labels|projects)(?:\/([a-zA-Z0-9_!-]+))?(?:\/.*)?$/);
  if (!match || (match[1] === "projects" && (!match[2] || path !== `/api/v1.0/projects/${match[2]}`))) return;
  return { type: types[match[1]], id: match[2] };
}

export class LocalSync {
  private projectMap = new Map<string, string>();
  private entityIdMap = new Map<string, Set<string>>();
  private pending = new Set<Promise<void>>();

  constructor(private client: NiftyPMClient) {}

  /** Discover unique project bindings only after explicit automatic-sync consent. */
  discover(): Map<string, string> {
    this.projectMap.clear();
    this.entityIdMap.clear();
    if (process.env.NIFTYPM_AUTO_SYNC !== "true") return this.projectMap;
    const directory = join(process.cwd(), "niftypm");
    if (!existsSync(directory)) return this.projectMap;
    const candidates = new Map<string, { filepath: string; data: ProjectJson }[]>();
    try {
      for (const name of readdirSync(directory).filter((file) => file.endsWith(".json"))) {
        try {
          const filepath = join(directory, name);
          const state = readMirror(filepath);
          if (!state) continue;
          const id = state.data.meta.niftypm_project_id!;
          const files = candidates.get(id) ?? [];
          files.push({ filepath, data: state.data });
          candidates.set(id, files);
        } catch { console.error("[local-sync] Invalid mirror skipped."); }
      }
    } catch { console.error("[local-sync] Mirror discovery failed."); return this.projectMap; }
    for (const [id, files] of candidates) {
      if (files.length !== 1) { console.error("[local-sync] Duplicate project mirrors disabled."); continue; }
      this.projectMap.set(id, files[0].filepath);
      this.indexEntityIds(files[0].data, id);
    }
    return this.projectMap;
  }

  private indexEntityIds(data: ProjectJson, projectId: string): void {
    for (const [id, owners] of this.entityIdMap) {
      owners.delete(projectId);
      if (owners.size === 0) this.entityIdMap.delete(id);
    }
    for (const section of [data.tasks, data.task_lists, data.milestones, data.labels]) {
      for (const row of section) {
        if (!validId(row.id)) continue;
        const owners = this.entityIdMap.get(row.id) ?? new Set<string>();
        owners.add(projectId);
        this.entityIdMap.set(row.id, owners);
      }
    }
  }

  /** Resolve agreeing project evidence; ambiguous shared ownership requires an explicit project. */
  resolveProjectId(entry: MutationEntry): string | null {
    const candidates = new Set<string>();
    for (const body of [entry.responseBody, entry.requestBody]) {
      if (!isRecord(body)) continue;
      for (const key of ["project", "project_id", "projectId"]) {
        if (body[key] == null) continue;
        if (!validId(body[key])) return null;
        candidates.add(body[key]);
      }
    }
    const info = endpointInfo(entry.endpoint);
    if (info?.type === "project" && info.id) candidates.add(info.id);
    if (candidates.size > 1) return null;
    const explicit = [...candidates][0];
    const owners = info?.id ? this.entityIdMap.get(info.id) : undefined;
    if (explicit) return owners && !owners.has(explicit) ? null : explicit;
    return owners?.size === 1 ? [...owners][0] : null;
  }

  /** Refetch and commit one section inside the shared per-file read/fetch/write queue. */
  async syncEntity(projectId: string, entityType: EntityType, filepath: string): Promise<void> {
    await withMirror(filepath, async () => {
      const previous = readMirror(filepath, projectId);
      if (!previous) throw new SyncError("Local mirror no longer exists; sync was refused.");
      const data: ProjectJson = { ...previous.data, meta: { ...previous.data.meta } };
      const bundle: Bundle = { project: { id: projectId } };
      if (entityType === "project") {
        const project = await fetchProject(this.client, projectId);
        data.project = {
          ...data.project, name: project.name ?? data.project.name,
          description: project.description ?? data.project.description,
          portfolio: project.portfolio ?? data.project.portfolio,
          portfolio_id: project.portfolio_id ?? data.project.portfolio_id,
          repo: project.repo ?? data.project.repo,
        };
      } else if (entityType === "labels") {
        const workspace = await fetchCollection<NonNullable<Bundle["labels"]>[number]>(this.client, "labels");
        const labels = new Map(workspace.map((label) => [label.id, label]));
        data.labels = data.labels.flatMap((local) => {
          const remote = labels.get(local.id);
          return remote ? [{ ...local, name: remote.name ?? "", color: remote.color ?? "#000000" }] : [];
        });
      } else {
        if (entityType === "tasks") {
          const [tasks, labels, taskgroups, milestones] = await Promise.all([
            fetchCollection<NonNullable<Bundle["tasks"]>[number]>(this.client, "tasks", { project_id: projectId }, projectId),
            fetchCollection<NonNullable<Bundle["labels"]>[number]>(this.client, "labels"),
            fetchCollection<NonNullable<Bundle["taskgroups"]>[number]>(this.client, "taskgroups", { project_id: projectId }, projectId),
            fetchMilestones(this.client, projectId),
          ]);
          Object.assign(bundle, { tasks, labels, taskgroups, milestones });
        } else if (entityType === "task_lists") {
          bundle.taskgroups = await fetchCollection(this.client, "taskgroups", { project_id: projectId }, projectId);
        } else {
          bundle.milestones = await fetchMilestones(this.client, projectId);
        }
        const fresh = buildProjectJson(bundle);
        if (entityType === "tasks") data.tasks = mergeTasks(data.tasks, fresh.tasks);
        else if (entityType === "task_lists") data.task_lists = fresh.task_lists;
        else data.milestones = fresh.milestones;
      }
      writeMirror(filepath, data, previous);
      this.indexEntityIds(data, projectId);
    });
  }

  /** Wait for background work owned by a CLI invocation before it exits. */
  async drain(): Promise<void> {
    while (this.pending.size > 0) await Promise.all([...this.pending]);
  }

  /** Contain mirror failures so a successful cloud mutation stays successful. */
  onMutation = (entry: MutationEntry): Promise<void> => {
    if (process.env.NIFTYPM_AUTO_SYNC !== "true" || !methods.has(entry.method) || entry.baseUrl) return Promise.resolve();
    const info = endpointInfo(entry.endpoint);
    if (!info) return Promise.resolve();
    const projectId = this.resolveProjectId(entry);
    const filepath = projectId ? this.projectMap.get(projectId) : undefined;
    if (!projectId || !filepath) return Promise.resolve();
    const task = this.syncEntity(projectId, info.type, filepath).catch((error) => {
      console.error(`[local-sync] ${syncFailure(error)}`);
    });
    this.pending.add(task);
    void task.then(() => this.pending.delete(task));
    return task;
  };
}
