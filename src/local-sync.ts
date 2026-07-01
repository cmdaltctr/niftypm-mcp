/**
 * Local sync engine — auto-discovers niftypm/*.json files in cwd,
 * intercepts mutations, refetches affected entity types, and updates
 * the local JSON file in-place.
 *
 * Only active in Node.js stdio mode (src/index.ts), never in Workers.
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, renameSync } from "node:fs";
import { join } from "node:path";
import type { NiftyPMClient, MutationEntry } from "./client.js";
import type { Bundle, ProjectJson } from "./reverse-sync.js";
import { buildProjectJson } from "./reverse-sync.js";

type EntityType = "tasks" | "task_lists" | "milestones" | "labels" | "project";

const MUTATION_METHODS = new Set(["POST", "PUT", "DELETE"]);

/** Map endpoint pattern → entity type */
function classifyEndpoint(endpoint: string): EntityType | null {
  if (endpoint.includes("/api/v1.0/tasks")) return "tasks";
  if (endpoint.includes("/api/v1.0/taskgroups")) return "task_lists";
  if (endpoint.includes("/api/v1.0/milestones")) return "milestones";
  if (endpoint.includes("/api/v1.0/labels")) return "labels";
  if (endpoint.match(/\/api\/v1\.0\/projects\/[^/]+$/)) return "project";
  return null;
}

/** Extract entity ID from URL path (last segment) */
function extractEntityId(endpoint: string): string | null {
  const match = endpoint.match(
    /\/api\/v1\.0\/(?:tasks|taskgroups|milestones|labels)\/([a-zA-Z0-9_!-]+)/,
  );
  return match ? match[1] : null;
}

export class LocalSync {
  /** project_id → absolute filepath */
  private projectMap = new Map<string, string>();

  /** entity_id → project_id (built from local JSON scan) */
  private entityIdMap = new Map<string, string>();

  constructor(private client: NiftyPMClient) {}

  /**
   * Scan cwd/niftypm/*.json, read meta.niftypm_project_id,
   * build project_id → filepath map and entity_id → project_id map.
   */
  discover(): Map<string, string> {
    const niftypmDir = join(process.cwd(), "niftypm");
    if (!existsSync(niftypmDir)) return this.projectMap;

    let files: string[];
    try {
      files = readdirSync(niftypmDir).filter((f) => f.endsWith(".json"));
    } catch {
      return this.projectMap;
    }

    for (const file of files) {
      const filepath = join(niftypmDir, file);
      try {
        const data = JSON.parse(readFileSync(filepath, "utf-8"));
        const projectId = data?.meta?.niftypm_project_id;
        if (projectId) {
          this.projectMap.set(projectId, filepath);
          this.indexEntityIds(data, projectId);
        }
      } catch (err) {
        console.error(`[local-sync] Failed to read ${file}:`, err);
      }
    }

    if (this.projectMap.size > 0) {
      console.error(
        `[local-sync] Discovered ${this.projectMap.size} local JSON file(s) for auto-sync`,
      );
    }

    return this.projectMap;
  }

  /** Build entity_id → project_id index from a local JSON file */
  private indexEntityIds(data: any, projectId: string): void {
    for (const t of data?.tasks || []) {
      if (t?.id) this.entityIdMap.set(t.id, projectId);
    }
    for (const tl of data?.task_lists || []) {
      if (tl?.id) this.entityIdMap.set(tl.id, projectId);
    }
    for (const ms of data?.milestones || []) {
      if (ms?.id) this.entityIdMap.set(ms.id, projectId);
    }
    for (const l of data?.labels || []) {
      if (l?.id) this.entityIdMap.set(l.id, projectId);
    }
  }

  /**
   * Resolve which project was affected by a mutation.
   * Chain: response body → request body → local JSON scan → skip.
   */
  resolveProjectId(entry: MutationEntry): string | null {
    // 1. Response body
    const resp = entry.responseBody;
    if (resp && typeof resp === "object") {
      if (resp.project && typeof resp.project === "string") return resp.project;
      if (resp.project_id && typeof resp.project_id === "string") return resp.project_id;
    }

    // 2. Request body
    const req = entry.requestBody;
    if (req && typeof req === "object") {
      if (req.project_id && typeof req.project_id === "string") return req.project_id;
      if (req.project && typeof req.project === "string") return req.project;
    }

    // 3. Local JSON scan — extract entity ID from URL
    const entityId = extractEntityId(entry.endpoint);
    if (entityId && this.entityIdMap.has(entityId)) {
      return this.entityIdMap.get(entityId)!;
    }

    // 4. Check if the endpoint itself contains a project ID
    const projMatch = entry.endpoint.match(/\/api\/v1\.0\/projects\/([a-zA-Z0-9_!-]+)/);
    if (projMatch && this.projectMap.has(projMatch[1])) {
      return projMatch[1];
    }

    return null;
  }

  /**
   * Refetch the affected entity type and update the corresponding
   * section in the local JSON file.
   */
  async syncEntity(projectId: string, entityType: EntityType, filepath: string): Promise<void> {
    let data: ProjectJson;
    try {
      data = JSON.parse(readFileSync(filepath, "utf-8"));
    } catch (err) {
      console.error(`[local-sync] Failed to read ${filepath}:`, err);
      return;
    }

    const bundle: Bundle = { project: { id: projectId } };

    switch (entityType) {
      case "tasks": {
        const tasks = await this.client.get("/api/v1.0/tasks", { project_id: projectId });
        bundle.tasks = Array.isArray(tasks) ? tasks : [];
        break;
      }
      case "task_lists": {
        const taskgroups = await this.client.get("/api/v1.0/taskgroups", { project_id: projectId });
        bundle.taskgroups = Array.isArray(taskgroups) ? taskgroups : [];
        break;
      }
      case "milestones": {
        const [regular, listType] = await Promise.all([
          this.client.get("/api/v1.0/milestones", { project_id: projectId }),
          this.client.get("/api/v1.0/milestones", { project_id: projectId, is_list: "true" }),
        ]);
        const merged = [
          ...(Array.isArray(regular) ? regular : []),
          ...(Array.isArray(listType) ? listType : []),
        ];
        const seen = new Set<string>();
        bundle.milestones = merged.filter((ms: any) => {
          if (!ms?.id || seen.has(ms.id)) return false;
          seen.add(ms.id);
          return true;
        });
        break;
      }
      case "labels": {
        const labels = await this.client.get("/api/v1.0/labels", { project_id: projectId });
        bundle.labels = Array.isArray(labels) ? labels : [];
        break;
      }
      case "project": {
        const project = await this.client.get(`/api/v1.0/projects/${projectId}`);
        bundle.project = project as any;
        break;
      }
    }

    // Update only the affected section
    const now = new Date().toISOString().replace(/\.\d+Z$/, "Z");

    if (entityType === "project" && bundle.project) {
      data.project.name = bundle.project.name || data.project.name;
      data.project.description = bundle.project.description || data.project.description;
      data.project.portfolio = bundle.project.portfolio || data.project.portfolio;
      data.project.portfolio_id = bundle.project.portfolio_id ?? data.project.portfolio_id;
      data.project.repo = bundle.project.repo ?? data.project.repo;
    } else if (entityType === "tasks" && bundle.tasks) {
      // Need labels + taskgroups + milestones to transform tasks
      const [labels, taskgroups, regular, listType] = await Promise.all([
        this.client.get("/api/v1.0/labels", { project_id: projectId }),
        this.client.get("/api/v1.0/taskgroups", { project_id: projectId }),
        this.client.get("/api/v1.0/milestones", { project_id: projectId }),
        this.client.get("/api/v1.0/milestones", { project_id: projectId, is_list: "true" }),
      ]);
      bundle.labels = Array.isArray(labels) ? labels : [];
      bundle.taskgroups = Array.isArray(taskgroups) ? taskgroups : [];
      const merged = [
        ...(Array.isArray(regular) ? regular : []),
        ...(Array.isArray(listType) ? listType : []),
      ];
      const seen = new Set<string>();
      bundle.milestones = merged.filter((ms: any) => {
        if (!ms?.id || seen.has(ms.id)) return false;
        seen.add(ms.id);
        return true;
      });
      const full = buildProjectJson(bundle);
      data.tasks = full.tasks;
      data.labels = full.labels;
      data.task_lists = full.task_lists;
      data.milestones = full.milestones;
    } else if (entityType === "task_lists" && bundle.taskgroups) {
      const full = buildProjectJson(bundle);
      data.task_lists = full.task_lists;
    } else if (entityType === "milestones" && bundle.milestones) {
      const full = buildProjectJson(bundle);
      data.milestones = full.milestones;
    } else if (entityType === "labels" && bundle.labels) {
      const full = buildProjectJson(bundle);
      data.labels = full.labels;
    }

    data.meta.last_synced = now;
    this.atomicWrite(filepath, data);
  }

  /** Write JSON atomically: temp file → rename */
  private atomicWrite(filepath: string, data: any): void {
    const tmp = filepath + ".tmp";
    writeFileSync(tmp, JSON.stringify(data, null, 2) + "\n", "utf-8");
    renameSync(tmp, filepath);
  }

  /**
   * Mutation handler — wired to client.onMutation.
   * Determines entity type + project, refetches, updates local JSON.
   */
  onMutation = async (entry: MutationEntry): Promise<void> => {
    if (!MUTATION_METHODS.has(entry.method)) return;
    if (this.projectMap.size === 0) return;

    const entityType = classifyEndpoint(entry.endpoint);
    if (!entityType) {
      console.error(`[local-sync] Unmapped endpoint, skipping: ${entry.endpoint}`);
      return;
    }

    const projectId = this.resolveProjectId(entry);
    if (!projectId) {
      console.error(
        `[local-sync] Could not resolve project for: ${entry.method} ${entry.endpoint}`,
      );
      return;
    }

    const filepath = this.projectMap.get(projectId);
    if (!filepath) {
      console.error(`[local-sync] No local JSON for project ${projectId}`);
      return;
    }

    try {
      await this.syncEntity(projectId, entityType, filepath);
      console.error(`[local-sync] Synced ${entityType} for project ${projectId}`);
    } catch (err) {
      console.error(`[local-sync] Sync failed for ${entityType}:`, err);
    }
  };
}
