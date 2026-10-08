import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const feature = fileURLToPath(new URL("..", import.meta.url));
const clientPath = fileURLToPath(new URL("../src/client.ts", import.meta.url));

describe("standalone real-client rejection containment", () => {
  it("handles an async rejected 204 callback without a test-side pre-catch or unhandledRejection event", () => {
    const script = `
      import { NiftyPMClient } from ${JSON.stringify(clientPath)};
      const marker = "synthetic-private-child-value";
      let unhandled = 0;
      let diagnostics = 0;
      let leaked = false;
      process.on("unhandledRejection", () => { unhandled++; });
      console.error = (...args) => {
        diagnostics++;
        leaked ||= args.some((arg) => typeof arg !== "string" || arg.includes(marker));
      };
      console.log = console.info = (...args) => {
        leaked ||= args.some((arg) => String(arg).includes(marker));
      };
      globalThis.fetch = async () => new Response(null, { status: 204 });
      const client = new NiftyPMClient({
        apiToken: marker, clientId: "synthetic", clientSecret: "synthetic",
        accessToken: "synthetic", refreshToken: "", teamToken: "",
        baseUrl: "https://synthetic.invalid", internalBaseUrl: "https://internal.synthetic.invalid",
        enabledTools: {}, disabledTools: [],
      });
      client.onMutation = async () => { throw new Error(marker); };
      const result = await client.put("/api/v1.0/tasks/task1", { project_id: "proj1" });
      await new Promise((resolve) => setTimeout(resolve, 40));
      process.stdout.write(JSON.stringify({
        cloudSuccess: JSON.stringify(result) === "{}", unhandled, diagnostics, leaked,
      }));
    `;
    const child = spawnSync("bun", ["run", "-"], {
      input: script, cwd: feature, encoding: "utf-8", timeout: 5000,
      env: { PATH: process.env.PATH, NIFTYPM_API_TOKEN: "synthetic-child-token" },
    });
    expect.soft(child.status === 0).toBe(true);
    expect.soft(child.stderr.length).toBe(0);
    const counts = JSON.parse(child.stdout);
    expect.soft(counts.cloudSuccess).toBe(true);
    expect.soft(counts.unhandled).toBe(0);
    expect.soft(counts.diagnostics).toBe(1);
    expect(counts.leaked).toBe(false);
  });
});
