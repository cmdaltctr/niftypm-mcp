# TDR-003: Targeted transitive dependency remediation

- **Date:** 2026-10-07
- **Status:** Accepted (bounded remediation; security sign-off remains pending)
- **Deciders:** Project maintainer (approved packages after the security block)
- **Tags:** dependencies | security | bun

## Context

The security block identified outdated `proxy-addr` and `tar` dependencies. The approved scope covered targeted updates on the current feature branch, with a separate dependency commit retaining all bug regressions.

`package.json` and every direct dependency range remain unchanged. Resolved FastMCP 4.0.2, MCP SDK 1.29.0, Express 5.2.1, semantic-release 25.0.3 and its npm plugin 13.1.5 also remain unchanged. npm 12 is excluded.

### Root Cause Analysis

npm bundles its own archive parser. Before remediation, the physical npm bundle contained `tar` 7.5.15; the old lockfile recorded 7.5.16. These are distinct observations. Updating npm to 11.21.0 supplied bundled `tar` 7.5.22, but the initial targeted update left nested 7.5.16 lock entries.

The feature's `node_modules` was a symlink to the main checkout. A lockfile update alone could leave verification using main's old packages.

## Decision

Use Bun 1.4.2 for the bounded lockfile update: npm 11.16.0 → 11.21.0 and `proxy-addr` 2.0.7 → 2.0.8. Follow with a targeted `tar` 7.5.22 update to remove remaining old lock entries.

The recorded sequence was:

```sh
bun update npm@11.21.0 proxy-addr@2.0.8 --dry-run --lockfile-only --ignore-scripts
bun update tar@7.5.22 --lockfile-only --ignore-scripts
mv node_modules node_modules.pre-security-remediation-link
bun install --frozen-lockfile --ignore-scripts
```

The first command unexpectedly wrote the feature's `bun.lock` despite `--dry-run`. Treat this exact invocation as a write operation. The second command removed the remaining old `tar` resolutions.

Moving the symlink preserved it without deletion. The fresh install created a regular, feature-owned `node_modules` directory. Verify npm's real bundled parser as well as lockfile resolutions. The regression floors are `tar` 7.5.19 and `proxy-addr` 2.0.8; the installed parser is 7.5.22.

## Consequences

### Positive

The feature install contains npm 11.21.0, bundled `tar` 7.5.22 and `proxy-addr` 2.0.8. Main remains at npm 11.16.0, bundled `tar` 7.5.15 and `proxy-addr` 2.0.7, with clean git status.

### Negative

The full audit still reports 124 raw advisories across 29 packages: 50 high, 61 moderate and 13 low; none critical. These reports remain untriaged. Broader existing dependencies, including the SDK, axios, Hono and undici, need review before security approval.

### Neutral

The preserved symlink remains at `node_modules.pre-security-remediation-link`. No push, deployment or cloud write occurred. Launch configuration remains unchanged.

## Alternatives Considered

| Option | Rejected because |
| --- | --- |
| Upgrade direct packages or adopt npm 12 | Exceeds the approved scope and changes compatibility assumptions. |
| Stop after the npm update | Nested old `tar` lock entries remained. |
| Verify through the shared install | The symlink resolved packages from main. |
| Treat the targeted audit result as security approval | The full audit still contains untriaged reports. |

## Verification

These results come from the parent run; this documentation run executed no commands or scans.

- The two installed-dependency floor tests failed before the fresh install and passed afterwards.
- The third test checks lockfile floors. Injecting an old `proxy-addr` resolution caused one failure; restoration returned it to green.
- Final run after cleanup: all **548 tests across 43 files** passed, with strict TypeScript and OpenSpec validation.
- Real FastMCP and SDK/Express construction passed under Node without opening a listener. The npm CLI reported 11.21.0.
- The semantic-release version command ran; no publication occurred.
- Aikido scanned the new test file: one file, zero issues, zero skips.
- `bun audit` JSON contained no `tar` or `proxy-addr` reports. The full-audit counts above remain unresolved.

### Known lockfile representation quirk

Bun records some of npm's hoisted bundle sub-packages (for example `npm/undici` 6.26.0) at older versions than the physical npm 11.21.0 archive ships (6.28.0), and adds nested entries such as `npm/@npmcli/fs/semver`. An independent frozen install from this lockfile completed successfully with all floor tests passing, so reproducibility is not broken. Hand-reconciling these records was attempted and abandoned as risky and unnecessary; treat accurate bundle-sub-package lock records as a Bun tooling follow-up, not a security gate.

## How to Recognise / Handle This Again

1. Verify the intended feature checkout and branch before any dependency write.
2. Check whether `node_modules` is a symlink before installing or testing.
3. Compare lock resolutions with physically installed versions, including npm's own bundled `tar`.
4. Treat the recorded `--dry-run` invocation as mutating; inspect its lockfile changes.
5. Preserve any shared-install symlink before creating an isolated feature install.
6. Run dependency-floor tests and all bug regressions against that install.
7. Triage the complete audit, including SDK, axios, Hono and undici reports, before requesting security approval.

## Revisit Triggers

Revisit when patched floors change, bundle contents drift, a direct upgrade becomes necessary, or broader audit triage identifies required changes.

## References

- [Bun update documentation](https://bun.com/docs/pm/cli/update): update flags; observed dry-run behaviour recorded above.
- [npm 11.18.0 release](https://github.com/npm/cli/releases/tag/v11.18.0): first patched npm floor with `tar` 7.5.19.
- Registry metadata: [npm 11.21.0](https://registry.npmjs.org/npm/11.21.0), [tar 7.5.22](https://registry.npmjs.org/tar/7.5.22), [proxy-addr 2.0.8](https://registry.npmjs.org/proxy-addr/2.0.8).
- [`bun.lock`](../../bun.lock), [`package.json`](../../package.json), [`dependency-security-contract.test.ts`](../../test/dependency-security-contract.test.ts).
- [TDR-001](001-legacy-document-read-403.md) and [TDR-002](002-safe-local-mirror-sync.md): retained bug fixes and regressions.
