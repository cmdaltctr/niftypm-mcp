import { readFileSync, writeFileSync, renameSync, statSync, existsSync, realpathSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { randomUUID } from "node:crypto";
import type { ProjectJson } from "./reverse-sync.js";
import { isRecord, validId, SyncError } from "./sync-data.js";

const sections = ["tasks", "labels", "task_lists", "milestones"] as const;
const queues = new Map<string, Promise<void>>();

export interface MirrorState { data: ProjectJson; bytes: string; mode: number }

function checkedMirrorPath(filepath: string): string {
  const directory = join(process.cwd(), "niftypm");
  const base = existsSync(directory) ? realpathSync(directory) : directory;
  const name = basename(filepath);
  if (!name.endsWith(".json") || ![directory, base, "niftypm", "./niftypm"].includes(dirname(filepath))) {
    throw new SyncError("Mirror paths must stay inside the working directory's niftypm/ folder.");
  }
  // Reconstruct from a trusted directory and a single filename, never from a caller's path.
  const candidate = join(base, name);
  const physical = existsSync(candidate) ? realpathSync(candidate) : candidate;
  if (dirname(physical) !== base) throw new SyncError("Mirror symlinks must stay inside the selected directory.");
  return physical;
}

/** Validate a mirror without interpreting local-only task enrichment as API fields. */
export function validateMirror(value: unknown, projectId?: string): asserts value is ProjectJson {
  if (!isRecord(value) || !isRecord(value.meta) || !validId(value.meta.niftypm_project_id) || !isRecord(value.project)) {
    throw new SyncError("Invalid local mirror structure; sync was refused.");
  }
  if (projectId && value.meta.niftypm_project_id !== projectId) throw new SyncError("Local mirror belongs to another project.");
  for (const section of sections) {
    const rows = value[section];
    if (!Array.isArray(rows)) throw new SyncError("Invalid local mirror collection; sync was refused.");
    const ids = new Set<string>();
    for (const row of rows) {
      if (!isRecord(row) || !validId(row.id) || ids.has(row.id)) throw new SyncError("Invalid local mirror record; sync was refused.");
      ids.add(row.id);
    }
  }
}

/** Read exact bytes for recovery; missing targets are valid only for initial creation. */
export function readMirror(filepath: string, projectId?: string): MirrorState | undefined {
  const checked = checkedMirrorPath(filepath);
  let bytes: string;
  try {
    bytes = readFileSync(checked, "utf-8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw new SyncError("Cannot read the local mirror; check file access before retrying.");
  }
  let data: unknown;
  try { data = JSON.parse(bytes); } catch { throw new SyncError("The local mirror contains invalid JSON; sync was refused."); }
  validateMirror(data, projectId);
  return { data, bytes, mode: statSync(checked).mode & 0o777 };
}

/** Serialise the entire operation across all same-process writers using this module. */
export function withMirror<T>(filepath: string, operation: () => Promise<T>): Promise<T> {
  const key = checkedMirrorPath(filepath);
  const result = (queues.get(key) ?? Promise.resolve()).then(operation);
  const tail = result.then(() => {}, () => {});
  queues.set(key, tail);
  void tail.then(() => { if (queues.get(key) === tail) queues.delete(key); });
  return result;
}

/** Commit a validated mirror atomically after preserving its exact previous bytes. */
export function writeMirror(
  filepath: string, data: ProjectJson, previous?: MirrorState, allowEmpty = false,
): void {
  filepath = checkedMirrorPath(filepath);
  validateMirror(data, previous?.data.meta.niftypm_project_id);
  if (previous && !allowEmpty) {
    for (const section of sections) {
      if (previous.data[section].length > 0 && data[section].length === 0) {
        throw new SyncError(`Refusing to empty ${section}. Verify the complete API result, then use manual --allow-empty for an intentional clear.`);
      }
    }
  }
  const stamp = randomUUID();
  if (previous) {
    try {
      writeFileSync(`${filepath}.${stamp}.bak`, previous.bytes, { encoding: "utf-8", flag: "wx", mode: 0o600 });
    } catch { throw new SyncError("Backup creation failed; the existing mirror was preserved."); }
  }
  const candidate = { ...data, meta: { ...data.meta, last_synced: new Date().toISOString().replace(/\.\d+Z$/, "Z") } };
  const temporary = `${filepath}.${stamp}.tmp`;
  try {
    writeFileSync(temporary, JSON.stringify(candidate, null, 2) + "\n", {
      encoding: "utf-8", flag: "wx", mode: previous?.mode ?? 0o600,
    });
    renameSync(temporary, filepath);
  } catch { throw new SyncError("Atomic mirror replacement failed; recovery files were retained."); }
}
