import { expect, vi } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { collectionResponse, mirrorFixture } from "./sync-regression-fixtures.js";

export const PRIVATE_MARKER = "synthetic-private-cli-value";
export const projectRecord = { id: "proj1", name: "Cloud synthetic project", nice_id: "SYN" };
export const memberRecords = [{ id: "member1", name: "Synthetic member", email: "member@example.invalid" }];
const controls = vi.hoisted(() => ({
  answers: [] as string[], questions: [] as string[], target: "",
  onQuestion: undefined as undefined | ((question: string) => void),
  fault: "" as "" | "backup" | "temp" | "rename", injected: false,
  writes: [] as string[], renames: [] as string[],
}));
export { controls };

// Questions are replaced before importing the CLI. Filesystem operations remain real except selected faults.
vi.mock("node:readline", () => ({
  createInterface: () => ({
    question: (question: string, answer: (value: string) => void) => {
      controls.questions.push(question);
      controls.onQuestion?.(question);
      answer(controls.answers.shift() ?? "1");
    },
    close: () => {},
  }),
}));
vi.mock("node:fs", async (importOriginal) => {
  const fs = await importOriginal<typeof import("node:fs")>();
  return {
    ...fs,
    writeFileSync: (...args: any[]) => {
      const path = String(args[0]);
      controls.writes.push(path);
      const adjacent = controls.target && path.startsWith(`${controls.target}.`);
      if (adjacent && ((controls.fault === "backup" && path.endsWith(".bak")) ||
        (controls.fault === "temp" && path.endsWith(".tmp")))) {
        controls.injected = true;
        throw new Error(PRIVATE_MARKER);
      }
      return (fs.writeFileSync as any)(...args);
    },
    renameSync: (...args: any[]) => {
      controls.renames.push(String(args[1]));
      if (controls.fault === "rename" && String(args[1]) === controls.target) {
        controls.injected = true;
        throw new Error(PRIVATE_MARKER);
      }
      return (fs.renameSync as any)(...args);
    },
  };
});

const originalArgv = process.argv;
class ExitSignal { constructor(readonly code: number) {} }
export type CliHttp = (url: URL, method: string) => unknown | Promise<unknown>;
export const turn = () => new Promise<void>((resolve) => setImmediate(resolve));

/** Exercise real configuration, client, CLI dispatch and production writers against synthetic I/O. */
export function cliHarness(options: { existing?: boolean; autoSync?: string; answers?: string[] } = {}) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "nifty-cli-synthetic-")));
  const directory = join(root, "niftypm");
  mkdirSync(directory);
  const filepath = join(directory, "cloud-synthetic-project.json");
  const original = JSON.stringify(mirrorFixture(), null, 3) + "\n\n";
  if (options.existing !== false) writeFileSync(filepath, original);
  controls.answers = [...(options.answers ?? ["1", "y"])];
  controls.questions = [];
  controls.onQuestion = undefined;
  controls.target = filepath;
  controls.writes = [];
  controls.renames = [];
  controls.fault = "";
  controls.injected = false;
  vi.spyOn(process, "cwd").mockReturnValue(root);
  vi.stubEnv("NIFTYPM_AUTO_SYNC", options.autoSync);
  for (const key of ["API_TOKEN", "CLIENT_ID", "CLIENT_SECRET", "ACCESS_TOKEN", "REFRESH_TOKEN", "TEAM_TOKEN"]) {
    vi.stubEnv(`NIFTYPM_${key}`, PRIVATE_MARKER);
  }
  vi.stubEnv("DISABLED_TOOLS", "");
  for (const key of Object.keys(process.env).filter((key) => key.startsWith("ENABLE_"))) vi.stubEnv(key, "true");
  const stdout = vi.spyOn(console, "log").mockImplementation(() => {});
  const stderr = vi.spyOn(console, "error").mockImplementation(() => {});
  const info = vi.spyOn(console, "info").mockImplementation(() => {});
  const exitCodes: number[] = [];
  vi.spyOn(process, "exit").mockImplementation((code) => {
    const number = Number(code ?? 0);
    exitCodes.push(number);
    throw new ExitSignal(number);
  });
  const calls: { url: URL; method: string }[] = [];
  let override: CliHttp | undefined;
  vi.stubGlobal("fetch", vi.fn(async (input: string | URL, init: RequestInit = {}) => {
    const url = new URL(String(input));
    const method = init.method || "GET";
    calls.push({ url, method });
    const overridden = await override?.(url, method);
    const value = overridden ?? (method !== "GET" ? { id: "task1", project_id: "proj1", cloud: "ok" }
      : url.pathname === "/api/v1.0/projects" ? { projects: [projectRecord], hasMore: false }
      : url.pathname === "/api/v1.0/members" ? memberRecords : collectionResponse(url));
    return value instanceof Response ? value : Response.json(value);
  }));
  return {
    root, directory, filepath, original, calls, stdout, stderr, exitCodes,
    http: (handler: CliHttp) => { override = handler; },
    bytes: () => readFileSync(filepath, "utf-8"),
    read: () => JSON.parse(readFileSync(filepath, "utf-8")) as ReturnType<typeof mirrorFixture>,
    exists: () => existsSync(filepath),
    backups: () => readdirSync(directory).filter((name) => name.endsWith(".bak"))
      .map((name) => readFileSync(join(directory, name), "utf-8")),
    getCalls: () => calls.filter((call) => call.method === "GET"),
    safe: () => ![stdout, stderr, info].some((spy) => spy.mock.calls.some((args) =>
      args.some((arg) => typeof arg !== "string" || arg.includes(PRIVATE_MARKER)))),
    async run(args: string[]) {
      process.argv = ["node", "synthetic-cli", ...args];
      const { runCli } = await import("../../src/cli.js");
      try { await runCli(); return { code: undefined, escaped: false }; }
      catch (error) {
        return error instanceof ExitSignal ? { code: error.code, escaped: false } : { code: undefined, escaped: true };
      }
    },
  };
}

export type CliHarness = ReturnType<typeof cliHarness>;

/** Compare refusal bytes and safe error handling without putting raw diagnostics into assertion diffs. */
export function expectRefused(h: CliHarness, result: { code: number | undefined; escaped: boolean }) {
  expect.soft(result.escaped).toBe(false);
  expect.soft(result.code).toBe(1);
  expect.soft(h.bytes() === h.original).toBe(true);
  expect.soft(h.stderr.mock.calls.length > 0).toBe(true);
  expect(h.safe()).toBe(true);
}

export function restoreCliTest() {
  process.argv = originalArgv;
  controls.target = "";
  controls.onQuestion = undefined;
  controls.fault = "";
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
}
