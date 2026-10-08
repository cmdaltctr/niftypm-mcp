import { afterEach, describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import { tasks, mirrorFixture } from "./fixtures/sync-regression-fixtures.js";
import { cliHarness, controls, expectRefused, projectRecord, PRIVATE_MARKER, restoreCliTest } from "./fixtures/cli-regression-harness.js";

afterEach(restoreCliTest);

describe("public runCli init selection and protected creation", () => {
  it.each(["projects", "items"])("completes the %s project list before selecting, without a project-detail GET", async (key) => {
    const h = cliHarness({ existing: false, answers: ["2"] });
    let projectPagesAtSelection = 0;
    controls.onQuestion = (question) => {
      if (question.includes("Select a project")) {
        projectPagesAtSelection = h.getCalls().filter(({ url }) => url.pathname === "/api/v1.0/projects").length;
      }
    };
    h.http((url) => {
      if (url.pathname !== "/api/v1.0/projects") return;
      const offset = Number(url.searchParams.get("offset") || 0);
      return { [key]: offset ? [projectRecord] : [{ id: "other1", name: "Other synthetic project" }], hasMore: offset === 0 };
    });
    expect.soft(await h.run(["init"])).toEqual({ code: 0, escaped: false });
    expect.soft(controls.questions.some((question) => question.includes("Select a project"))).toBe(true);
    expect.soft(projectPagesAtSelection).toBe(2);
    expect.soft(h.getCalls().filter(({ url }) => url.pathname === "/api/v1.0/projects")
      .map(({ url }) => url.searchParams.get("offset"))).toEqual(["0", "1"]);
    expect.soft(h.getCalls().some(({ url }) => /^\/api\/v1\.0\/projects\//.test(url.pathname))).toBe(false);
    expect.soft(h.exists()).toBe(true);
    if (h.exists()) {
      expect.soft(h.read().tasks.length).toBe(48);
      expect.soft(h.read().meta.niftypm_project_id).toBe("proj1");
      expect.soft(h.read().project.name).toBe(projectRecord.name);
      expect.soft(h.read().meta.last_synced.length > 0).toBe(true);
    }
    expect.soft(controls.renames.includes(h.filepath)).toBe(true);
    expect.soft(h.getCalls().filter(({ url }) => url.pathname.endsWith("/members"))
      .every(({ url }) => url.search === "")).toBe(true);
    expect(h.getCalls().filter(({ url }) => url.pathname.endsWith("/labels"))
      .every(({ url }) => !url.searchParams.has("project_id"))).toBe(true);
  });

  it.each([
    { projects: [projectRecord], items: [projectRecord], hasMore: false },
    { projects: [projectRecord] }, { items: [projectRecord], hasMore: "false" },
    { projects: [projectRecord], hasMore: null }, [projectRecord],
    { projects: [{ ...projectRecord, id: "bad/id" }], hasMore: false },
    { projects: [{ ...projectRecord, name: 42 }], hasMore: false },
  ].map((response) => [response]))("rejects unsafe project-list %j before prompts, collection fetches or writes", async (response) => {
    const h = cliHarness();
    h.http((url) => url.pathname === "/api/v1.0/projects" ? response : undefined);
    expectRefused(h, await h.run(["init"]));
    expect.soft(controls.questions.length).toBe(0);
    expect.soft(controls.writes.length).toBe(0);
    expect(h.getCalls().every(({ url }) => url.pathname === "/api/v1.0/projects")).toBe(true);
  });

  it.each(["repeat", "failure", "no-progress"])("rejects project pagination %s before selection", async (fault) => {
    const h = cliHarness();
    h.http((url) => {
      if (url.pathname !== "/api/v1.0/projects") return;
      if (!Number(url.searchParams.get("offset"))) return { projects: [projectRecord], hasMore: true };
      if (fault === "failure") return new Response(PRIVATE_MARKER, { status: 503 });
      return { projects: fault === "repeat" ? [projectRecord] : [], hasMore: fault === "no-progress" };
    });
    expectRefused(h, await h.run(["init"]));
    expect.soft(controls.questions.length).toBe(0);
    expect(h.getCalls().filter(({ url }) => url.pathname === "/api/v1.0/projects")
      .map(({ url }) => url.searchParams.get("offset"))).toEqual(["0", "1"]);
  });

  it("creates a valid new empty mirror atomically without --allow-empty or a backup", async () => {
    const h = cliHarness({ existing: false });
    h.http((url) => {
      if (url.pathname.endsWith("/tasks")) return { tasks: [], hasMore: false };
      if (/\/(labels|taskgroups|milestones)$/.test(url.pathname)) return { items: [], hasMore: false };
    });
    expect.soft((await h.run(["init"])).code).toBe(0);
    expect.soft(h.exists()).toBe(true);
    if (h.exists()) expect.soft(h.read().tasks.length).toBe(0);
    expect.soft(h.backups().length).toBe(0);
    expect(controls.renames.includes(h.filepath)).toBe(true);
  });

  it("declining an existing target leaves its exact bytes unchanged", async () => {
    const h = cliHarness({ answers: ["1", "n"] });
    expect.soft(await h.run(["init"])).toEqual({ code: 0, escaped: false });
    expect.soft(controls.questions.some((question) => question.includes("Overwrite"))).toBe(true);
    expect.soft(h.bytes() === h.original).toBe(true);
    expect(controls.writes.length).toBe(0);
  });

  it("confirmed same-project overwrite preserves 48 parents, 53 children and local enrichment with an exact backup", async () => {
    const h = cliHarness();
    h.http((url) => {
      if (!url.pathname.endsWith("/tasks")) return;
      const offset = Number(url.searchParams.get("offset") || 0);
      return { tasks: tasks.slice(offset, offset + 24), hasMore: offset === 0 };
    });
    expect.soft(await h.run(["init"])).toEqual({ code: 0, escaped: false });
    expect.soft(controls.questions.some((question) => question.includes("Overwrite"))).toBe(true);
    const data = h.read();
    expect.soft(data.tasks.length).toBe(48);
    expect.soft(data.tasks.reduce((count, task) => count + task.subtasks.length, 0)).toBe(53);
    expect.soft(data.tasks[0].name === tasks[0].name).toBe(true);
    expect.soft(data.tasks[0].subtask_details).toEqual(mirrorFixture().tasks[0].subtask_details);
    expect.soft(data.tasks[0].local_note).toBe("Retain local-only field");
    expect.soft(data.meta.created).toBe(mirrorFixture().meta.created);
    expect.soft(data.custom_top_level).toEqual({ preserve: true });
    expect.soft(h.getCalls().filter(({ url }) => url.pathname.endsWith("/tasks"))
      .map(({ url }) => url.searchParams.get("offset"))).toEqual(["0", "24"]);
    expect(h.backups().some((bytes) => bytes === h.original)).toBe(true);
  });

  it("rechecks the target project's binding even after overwrite confirmation", async () => {
    const h = cliHarness();
    let changed = false;
    controls.onQuestion = (question) => {
      if (!question.includes("Overwrite")) return;
      changed = true;
      const other = mirrorFixture();
      other.meta.niftypm_project_id = "other1";
      writeFileSync(h.filepath, JSON.stringify(other, null, 3) + "\n\n");
    };
    const result = await h.run(["init", "--allow-empty"]);
    const otherBytes = JSON.stringify({ ...mirrorFixture(), meta: { ...mirrorFixture().meta, niftypm_project_id: "other1" } }, null, 3) + "\n\n";
    expect.soft(changed).toBe(true);
    expect.soft(controls.questions.some((question) => question.includes("Overwrite"))).toBe(true);
    expect.soft(result).toEqual({ code: 1, escaped: false });
    expect.soft(h.bytes() === otherBytes).toBe(true);
    expect(h.safe()).toBe(true);
  });

  it("refuses to empty a confirmed populated target without --allow-empty", async () => {
    const h = cliHarness();
    h.http((url) => url.pathname.endsWith("/tasks") ? { tasks: [], hasMore: false } : undefined);
    expectRefused(h, await h.run(["init"]));
    expect.soft(controls.questions.some((question) => question.includes("Overwrite"))).toBe(true);
    expect(h.stderr.mock.calls.some((args) => args.some((arg) => String(arg).includes("--allow-empty")))).toBe(true);
  });

  it("--allow-empty permits a confirmed validated clear with exact backup bytes", async () => {
    const h = cliHarness();
    h.http((url) => url.pathname.endsWith("/tasks") ? { tasks: [], hasMore: false } : undefined);
    expect.soft((await h.run(["init", "--allow-empty"])).code).toBe(0);
    expect.soft(controls.questions.some((question) => question.includes("Overwrite"))).toBe(true);
    expect.soft(h.read().tasks.length).toBe(0);
    expect.soft(h.backups().some((bytes) => bytes === h.original)).toBe(true);
    expect(process.env.NIFTYPM_AUTO_SYNC).toBeUndefined();
  });

  it.each(["bare", "published"])("accepts %s members while keeping the 48-task legacy model", async (form) => {
    const h = cliHarness();
    h.http((url) => url.pathname.endsWith("/members") ? form === "bare"
      ? [{ id: "member1" }] : { items: [{ id: "member1" }], has_more: false } : undefined);
    expect.soft((await h.run(["init"])).code).toBe(0);
    expect.soft(h.read().tasks.length).toBe(48);
    const memberCalls = h.getCalls().filter(({ url }) => url.pathname.endsWith("/members"));
    expect.soft(memberCalls.length).toBe(1);
    expect(memberCalls.every(({ url }) => url.search === "")).toBe(true);
  });

  it.each([
    { items: [], has_more: true }, { items: [] }, [{ id: "bad/id" }],
    { items: [], has_more: "false" }, { items: [{ id: "" }], has_more: false },
  ].map((response) => [response]))("rejects unsafe members %j even with --allow-empty", async (response) => {
    const h = cliHarness();
    h.http((url) => url.pathname.endsWith("/members") ? response : undefined);
    expectRefused(h, await h.run(["init", "--allow-empty"]));
    const memberCalls = h.getCalls().filter(({ url }) => url.pathname.endsWith("/members"));
    expect.soft(memberCalls.length).toBe(1);
    expect(memberCalls.every(({ url }) => url.search === "")).toBe(true);
  });

  it.each(["backup", "temp", "rename"] as const)("owns a safe %s failure after confirmation without replacing the target", async (fault) => {
    const h = cliHarness();
    controls.fault = fault;
    expectRefused(h, await h.run(["init"]));
    expect.soft(controls.questions.some((question) => question.includes("Overwrite"))).toBe(true);
    expect(controls.injected).toBe(true);
  });

  it("owns a safe fetch-error exit without the index fallback", async () => {
    const h = cliHarness();
    h.http(() => { throw new Error(PRIVATE_MARKER); });
    expectRefused(h, await h.run(["init"]));
  });

  it.each(["init", "sync"])("%s with no configured credentials exits 1 before HTTP", async (command) => {
    const h = cliHarness();
    for (const key of ["API_TOKEN", "CLIENT_ID", "CLIENT_SECRET", "ACCESS_TOKEN", "REFRESH_TOKEN", "TEAM_TOKEN"]) {
      process.env[`NIFTYPM_${key}`] = "";
    }
    expectRefused(h, await h.run([command]));
    expect(h.calls.length).toBe(0);
  });
});
