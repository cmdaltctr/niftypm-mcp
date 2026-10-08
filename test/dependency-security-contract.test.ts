/** Check actual installed packages, including npm's bundled archive parser. */
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);

function atLeast(version: string, minimum: number[]): boolean {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return false;
  const parts = match.slice(1).map(Number);
  for (let i = 0; i < 3; i++) {
    if (parts[i] !== minimum[i]) return parts[i] > minimum[i];
  }
  return true;
}

describe("fixed transitive dependency floors", () => {
  it("contains no vulnerable tar or proxy-addr lock resolution", () => {
    const lock = readFileSync(new URL("../bun.lock", import.meta.url), "utf8");
    const resolutions = [...lock.matchAll(/"[^"\n]+":\s*\["(tar|proxy-addr)@(\d+\.\d+\.\d+)"/g)];
    expect(resolutions.length).toBeGreaterThanOrEqual(2);
    for (const [, name, version] of resolutions) {
      expect(atLeast(version, name === "tar" ? [7, 5, 19] : [2, 0, 8])).toBe(true);
    }
  });

  it("loads proxy-addr at or above the IPv6 trust-boundary fix", () => {
    const installed = require("proxy-addr/package.json") as { version: string };
    expect(atLeast(installed.version, [2, 0, 8])).toBe(true);
  });

  it("loads a fixed tar from npm's own bundled dependency tree", () => {
    const fromNpm = createRequire(require.resolve("npm/package.json"));
    const installed = fromNpm("tar/package.json") as { version: string };
    expect(atLeast(installed.version, [7, 5, 19])).toBe(true);
  });
});
