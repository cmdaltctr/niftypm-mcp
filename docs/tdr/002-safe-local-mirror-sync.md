# TDR-002: Protect local mirrors and require automatic-sync consent

- **Date:** 2026-10-07
- **Status:** Accepted
- **Deciders:** Project maintainer (approved task 2.10)

## Context

An isolated reproduction emptied a populated mirror from 48 tasks, 7 labels, 6 task lists and 7 milestones to zero in every section. The checklist survived and the timestamp advanced. Operator files were left unchanged.

### Root Cause Analysis

`Array.isArray(response) ? response : []` converted valid wrapped API collections into empty arrays. Broad overwrites then committed those arrays. Task-triggered updates also replaced supporting sections; labels-only transformation had no task references and emitted no labels. Full rebuilds discarded local task enrichment. Duplicate project bindings selected the last file, and overlapping asynchronous operations could commit stale snapshots.

## Decision

Require the exact `NIFTYPM_AUTO_SYNC=true` setting for automatic discovery and writes in Node stdio, HTTP and direct CLI tools. Keep the example default `false`. Manual `niftypm-mcp init` and `niftypm-mcp sync` remain independent. Workers never activate local mirror sync.

Share endpoint-specific validation and complete legacy pagination across every writer. Accept projects under `projects` or `items` with boolean `hasMore`. Members alone accept a verified unpaginated bare array, or `items` with `has_more=false`; reject unsupported continuation. Other bare API arrays remain invalid. Workspace labels and members use no project filter.

Retain legacy top-level tasks, local enrichment for retained IDs and string story estimates. Targeted updates change only their section and sync metadata. Duplicate project bindings disable automatic writes; manual file selection remains available. Shared label ownership needs explicit, agreeing project evidence.

Refuse any populated collection becoming empty. Manual `sync --allow-empty` or confirmed `init --allow-empty` permits a complete, validated empty result only. The boolean flag leaves malformed data, ownership and multi-page checks active.

Queue each read/fetch/validate/write operation per file within one process. Before overwrite, exclusively create `project.json.<UUID>.bak` with the exact previous bytes. Exclusively create a unique adjacent `.tmp`, then atomically rename it onto the mirror. Backup failure aborts replacement. Never delete backups automatically. Initial creation needs no backup.

Set `meta.last_synced` at commit preparation; it becomes visible after successful rename. Rejected updates preserve mirror bytes and timestamp. Catch synchronous and asynchronous callback failures with safe stderr diagnostics. Cloud success remains unchanged; direct CLI calls print the result, await queued mirror work, then exit 0 even after a mirror failure.

## Consequences

### Positive

Every overwrite has a recovery snapshot. Strict validation prevents wrapper mistakes and partial fetches from emptying a mirror.

### Negative

Complete fetches add API requests. Backups consume disk space and require operator-managed retention. Existing automatic workflows need explicit consent.

### Neutral

Run one writer process per mirror. The queue provides same-process serialisation; atomic rename provides complete-file visibility. Cross-process exclusion and power-loss durability are outside this guarantee. Document reads use v3 under [TDR-001](001-legacy-document-read-403.md); mirror sync retains legacy APIs.

## Alternatives Considered

| Option | Rejected because |
| --- | --- |
| Treat unknown envelopes as empty | Valid wrapped collections caused the reproduced loss. |
| Keep discovery as consent | An existing file would still permit unattended overwrites. |
| Replace every section after a task mutation | Supporting collections and local enrichment would be lost. |
| Migrate sync to v3 | The verified 48 parents and 53 children would become 101 flat records. |
| Add cross-process locks | Outside the approved scope; operators must enforce one writer per mirror. |

## How to Recognise / Handle This Again

An unexpected zero count after sync, with an advanced timestamp, matches the reproduced failure.

1. Stop old writers; the old implementation ignores `NIFTYPM_AUTO_SYNC=false`.
2. Keep automatic sync disabled in the patched version while investigating.
3. Inspect collection wrappers, completion flags and project IDs without publishing task content or tokens.
4. Inspect adjacent `.bak` snapshots before seeking approval to restore a mirror.
5. Obtain deployment or launch-path approval before changing the MCP entry or reloading Pi.
6. Verify the approved entry loads patched code; reloading the existing main-based entry keeps the old code.
7. Establish one writer per mirror before opting in.

Manual command failures report safe diagnostics and exit 1. Resolve the reported validation, access or filesystem issue before retrying. Use `niftypm-mcp help` for guidance; root `--help`/`-h` dispatch remains outside this change.

## Verification

The parent reported the following results; this documentation run made no live requests or test runs:

- Before implementation, 78 of 89 sync/client regressions failed and 60 of 78 CLI regressions failed.
- After restoration, the parent confirmed all 540 tests and the TypeScript check passed, including the new string-estimate regression. All 78 CLI regressions passed.
- Deliberately breaking safeguards produced failures in 6 empty-result, 3 queue, 2 backup, 4 consent and 1 pagination checks. Each mutation was restored and the tests returned green.
- Real writer paths test exact backups, injected filesystem failures, record type guards, endpoint validation and retained local children: 48 top-level tasks with 53 nested children. The legacy string-estimate test checks the preserved value; TypeScript accepts the updated estimate type.

A later path-boundary regression failed in four cases before hardening. The helper now reconstructs filenames under the selected `niftypm/` directory, checks physical paths and rejects escaping symlinks before reading or writing. Canonical paths also bind the shared queue consistently.

Aikido scanned all 20 changed code files without skipped paths. Its remaining generic `AIK_ts_generic_path_traversal` warning points to `readFileSync(checked)`. The input is constrained by `checkedMirrorPath`; outside-directory, parent-traversal, symlink and non-JSON tests verify refusal. Keep this static warning visible for independent review rather than adding a suppression.

The complete-fetch helpers also passed a read-only live smoke test: 3 projects, 1 member and the intended 48/7/6/7 mirror collections. No operator mirror was written and no cloud mutation occurred.

Existing operator mirrors, the main checkout and Pi MCP configuration remain unchanged. Deployment requires separate approval. No dependency installation or full v3 migration forms part of this fix.

## Revisit Triggers

Revisit when API envelopes change, multiple writer processes become necessary, or a full v3 mirror migration is approved.

## References

- [CLI guide](../guides/cli.md): commands, consent and recovery limits
- [TDR-001](001-legacy-document-read-403.md): separate legacy document-read 403 diagnosis
- [`src/sync-data.ts`](../../src/sync-data.ts): collection validation, pagination and task merge
- [`src/mirror-file.ts`](../../src/mirror-file.ts): shared queue, backups and atomic replacement
- [`src/local-sync.ts`](../../src/local-sync.ts), [`src/cli.ts`](../../src/cli.ts): writer entry points
- [`src/client.ts`](../../src/client.ts): mutation callback containment
- [`test/local-sync-production-regression.test.ts`](../../test/local-sync-production-regression.test.ts): scoped refresh and string estimates
- [`test/local-sync-writer-regression.test.ts`](../../test/local-sync-writer-regression.test.ts): real filesystem and queue checks
- [`test/cli-sync-regression.test.ts`](../../test/cli-sync-regression.test.ts), [`test/cli-init-regression.test.ts`](../../test/cli-init-regression.test.ts): manual and direct CLI paths
- [`test/sync-bootstrap.test.ts`](../../test/sync-bootstrap.test.ts): Node stdio and HTTP consent
