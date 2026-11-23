import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

const root = join(import.meta.dirname, "..");
const script = readFileSync(join(root, "ui", "script.js"), "utf-8");
const html = readFileSync(join(root, "ui", "index.html"), "utf-8");
const configSource = readFileSync(join(root, "src", "config.ts"), "utf-8");

/** Run the real browser script against a stub DOM and return a handle to its globals. */
function loadConfigurator(values: Record<string, string>) {
  const context = vm.createContext({
    document: {
      getElementById: (id: string) => ({ value: values[id] ?? "" }),
      addEventListener: () => {},
    },
  });
  vm.runInContext(script, context);
  return {
    env: () => vm.runInContext("generateEnvFile()", context) as string,
    envKeys: () => vm.runInContext("TOOL_DOMAINS.map((d) => d.envKey)", context) as string[],
  };
}

describe("configurator UI", () => {
  it("writes the API token and team token into the generated .env", () => {
    const lines = loadConfigurator({ "api-token": "tok_api", "team-token": "tok_team" }).env().split("\n");
    expect(lines).toContain("NIFTYPM_API_TOKEN=tok_api");
    expect(lines).toContain("NIFTYPM_TEAM_TOKEN=tok_team");
  });

  it("has a masked input for each token", () => {
    for (const id of ["api-token", "team-token"]) {
      expect(html).toMatch(new RegExp(`<input type="password" id="${id}"`));
    }
  });

  it("has one toggle for every ENABLE_ variable that loadConfig reads", () => {
    const fromConfig = [...configSource.matchAll(/process\.env\.(ENABLE_[A-Z_]+)/g)].map((m) => m[1]);
    expect(fromConfig.length).toBeGreaterThan(0);
    expect([...loadConfigurator({}).envKeys()].sort()).toEqual([...new Set(fromConfig)].sort());
  });

  it("emits ENABLE_CHECKLISTS in the generated .env", () => {
    expect(loadConfigurator({}).env().split("\n")).toContain("ENABLE_CHECKLISTS=true");
  });
});
