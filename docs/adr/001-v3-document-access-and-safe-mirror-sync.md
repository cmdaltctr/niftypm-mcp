# ADR-001: v3 document access and safe mirror sync

- **Date:** 2026-10-07
- **Status:** Accepted
- **Deciders:** Project maintainer (approved implementation plan)

## Context

Implementation commits `118f192` and `829a0dd` address document reads and local mirror safety. Accepted records the implemented architectural decision. Security review status is reported separately; deployment remains outside this run.

Read-only checks returned `403` for a legacy document GET and `200` for both v3 metadata and content using the same credential. The exact issued scopes were not introspected. Successful v3 reads support changing the route with the existing authentication.

An isolated reproduction converted wrapped collections into empty arrays. It reduced a mirror from 48 tasks, 7 labels, 6 task lists and 7 milestones to zero while advancing its timestamp. Broad refreshes also lost local enrichment. Concurrent operations could commit stale snapshots, and duplicate project bindings could select the wrong file.

The mirror uses legacy top-level task semantics. The observed v3 collection contained 101 records: 48 parents and 53 subtasks. Flattening that response would change the mirror model.

## Decision

### Document reads

Use `niftypm_get_document` for `GET /api/v3/documents/{id}` metadata. Return upstream camelCase fields unchanged. Add `niftypm_get_document_content` for `GET /api/v3/documents/{id}/content`; preserve the Markdown response fields `format`, `content`, `truncated`, `byteSize` and `lossy`.

Both reads validate IDs against `^[0-9A-Za-z_!]+$`. Metadata accepts documented `expand` relations as an array and sends a comma-separated query value. Existing domain and individual-tool controls apply.

Keep configured Bearer authentication. A v3 `403` remains an error with safe diagnostics and no alternative credential or legacy retry. Document lists and writes retain v1 endpoints. Create, personal-create and update retain their optional `z.record` object-content schemas; the version-change tool keeps its separate string contract. Most other tools remain v1, folders use v2 and checklists use the internal API.

### Complete legacy mirror reads

Share concrete fetch helpers across LocalSync, manual `sync` and `init`. Validate record IDs, consumed field types and project ownership before transforming a complete result.

| Collection | Accepted envelope | Completion rule |
| --- | --- | --- |
| Tasks | `{ tasks, hasMore }` | Required boolean `hasMore` |
| Projects | `{ projects, hasMore }` or `{ items, hasMore }` | Required boolean `hasMore`; reject mixed collection keys |
| Milestones | `{ items, hasMore }` | Required boolean `hasMore`; fetch both variants and merge cross-variant IDs |
| Labels and task groups | `{ items }` with optional `hasMore` | Validate a present boolean; otherwise continue until a short page |
| Members | Unpaginated bare array or `{ items, has_more: false }` | Sole bare-array exception; reject unsupported continuation |

Paginated reads use limit 100 and advance offset by returned row count. Reject repeated IDs, failed later pages, malformed envelopes and empty pages claiming more results. Members have no published continuation parameters; send no invented pagination or project filter.

Fetch labels at workspace scope. Full snapshots select labels referenced by project tasks. Label-only refresh matches existing mirror label IDs, updates matching records and omits deleted IDs. Task label names refresh during a task or full sync.

Retain `/api/v1.0/tasks` top-level semantics and legacy string story estimates unchanged. `init` uses the validated selected project-list record without another project-detail GET. Manual `sync` checks the fetched project-detail ID.

### Consent and update scope

Only exact `NIFTYPM_AUTO_SYNC=true` enables automatic discovery and mutation-triggered writes in Node stdio, HTTP and direct CLI tools. Default is off. Manual `init` and `sync` remain independent; Workers omit filesystem sync.

Duplicate project mirrors disable automatic writes for that project. Manual selection can update one duplicate file. Require agreeing ownership evidence; ambiguous shared labels or conflicts skip sync. Recheck the mirror's project ID inside its queue and refresh ownership indexes after commit.

Targeted refreshes replace only the affected section and sync metadata. Supporting task reads leave labels, lists and milestones unchanged. Preserve custom top-level keys, `meta.created` and local enrichment for retained task IDs, including `subtasks` and `subtask_details`. API-owned fields take precedence. Full manual refreshes and confirmed init overwrites use the same merge; they may regenerate the derived checklist.

Refuse an overwrite when a populated collection becomes empty. Automatic sync has no bypass. Manual `sync --allow-empty` and confirmed `init --allow-empty` permit complete, validated empty results only. Project, type and pagination checks remain active. New mirrors and already-empty sections accept valid empty collections.

### Backup, queue and path boundary

Use one shared per-file queue for the complete read/fetch/validate/merge/write operation. A failed operation releases the queue for later work. Canonical physical paths identify queue entries.

Constrain filenames to the current working directory's selected `niftypm/` directory. Reconstruct paths from that directory and a JSON basename. Resolve physical paths and reject file symlinks escaping the selected directory before reading or writing.

Before overwrite, exclusively create a unique adjacent `.bak` containing the exact previous bytes. Abort when backup creation fails. Exclusively create a unique adjacent `.tmp`, then rename it onto the target. Initial creation needs no backup. Discovery excludes backups and temporary files; retention is operator-managed.

Prepare `meta.last_synced` after validation. The timestamp becomes visible when rename succeeds. Rejected fetches, validation or filesystem operations preserve the original mirror and timestamp; available recovery files remain.

The queue covers writers using this module within one process. Operators must run one writer process per mirror and stop server writers before manual CLI refreshes. Atomic rename provides complete-file visibility. Cross-process exclusion and power-loss durability remain outside this guarantee.

Catch synchronous and asynchronous mutation-callback failures without exposing error bodies or credentials. Successful cloud results remain successful. Opted-in direct CLI tools await pending mirror work before exit; mirror failures retain exit code 0. Manual `init` and `sync` handle failures with safe diagnostics and exit code 1.

### Rollout boundary

The current configured MCP entry uses main. Obtain separate approval to deploy the patched checkout or change the launch path. Verify its source before `/reload`; reloading the existing entry alone keeps the old code. Stop old writers before relying on the opt-in flag because the old implementation ignores it.

Implementation and validation left operator files and MCP configuration unchanged. Read-only smoke checks made no cloud writes. No push or deployment forms part of this decision record. Inspect backups before seeking approval for any restore.

## Consequences

### Positive

- Typed, complete fetches prevent unsupported envelopes and partial pages from becoming empty snapshots.
- Every overwrite receives an exact recovery backup. Empty-result guards preserve populated sections after refused updates.
- Scoped merges preserve local enrichment and unrelated mirror sections. Same-process queues prevent stale concurrent commits.

### Negative

- Raw camelCase metadata breaks callers expecting legacy fields. Body reads require a separate tool call.
- Default-off automatic sync changes existing workflows and requires explicit operator consent.
- Complete pagination and supporting reads add API requests. Backups consume disk space and need retention management.
- Strict endpoint contracts refuse unsupported response shapes until evidence and regression coverage support them.

### Neutral

- Document-read support is limited to v3 metadata and content. Other API versions remain in use.
- The one-process writer constraint remains an operational requirement. Independent security triage and deployment approval are outstanding.

## Alternatives Considered

| Option | Rejected because |
| --- | --- |
| Retry the legacy document GET | The same authorised read already failed there while v3 returned `200`. |
| Rotate the token or change authentication | Both v3 reads succeeded with the same credential. |
| Repair or recreate the document | v3 already read the existing document successfully. |
| Migrate all operations and flatten v3 tasks | Beyond the approved scope; it would mix 53 children into the 48-parent mirror. |
| Keep the array fallback and broad replacement | The reproduced array wipe advanced the timestamp and lost populated sections. |
| Treat file discovery as write consent | Existing files would still permit unattended writes. |
| Add cross-process locking | Outside this implementation; operators must enforce one writer per mirror. |

## Verification and Review Status

The parent reports the following evidence. This documentation run inspected source and tests; it ran no tests, scans or live API requests.

- Final implementation: all **544 tests passed**, including the 24 unchanged object-content contract tests, with `tsc --noEmit` passing. The earlier sync checkpoint recorded 540 tests before the four path-boundary cases.
- Red proof: 50 of 77 document-read tests, 78 of 89 sync/client regressions and 60 of 78 CLI regressions failed before their respective fixes.
- Mutation checks detected removed document registration, reversed registration gates and exposed error bodies. Sync checks detected broken empty guards, queues, backups, consent and pagination. The parent restored each mutation and confirmed passing tests.
- Four path-boundary tests failed before hardening and passed afterwards. They cover outside-directory paths, parent traversal, escaping symlinks and non-JSON names.
- Existing raw-API read-only smoke checks returned 48 tasks, 7 labels, 6 task lists and 7 milestones. The shared complete-fetch helpers also returned those counts, 3 projects and 1 member without writing a mirror.
- Both new registered document reads returned `200` for the existing document using the same credential. Markdown conversion reported `truncated=false` and `lossy=false`; no private content is reproduced here.

Aikido scanned 20 changed code files without skipped paths. **One generic path warning remains**, `AIK_ts_generic_path_traversal`, at `readFileSync(checked)`. `checkedMirrorPath` constrains the directory and physical path; the four boundary tests verify refusals. Keep the warning visible for the reviewer's independent triage. Accepted status grants no security approval, and final audit approval remains outstanding.

The independent review ran its repository-wide scanner gate and stopped before source review. Its generated-cache secret report was classified without exposing a value: the cache contains numeric file metadata and SHA-256 hashes, and the reported match contains one known cache hash. Dependency advisory reports are being verified separately; `package.json` and `bun.lock` are unchanged from `97f94d5`. These raw scanner reports have not been silently lowered or represented as a clean security audit.

## References

- [Tool guide: documents](../guides/tools.md#documents) and [CLI guide](../guides/cli.md)
- [TDR-001: legacy document-read 403](../tdr/001-legacy-document-read-403.md)
- [TDR-002: safe local mirror sync](../tdr/002-safe-local-mirror-sync.md)
- [Document tools](../../src/tools/documents.ts), [complete-fetch helpers](../../src/sync-data.ts) and [mirror writer](../../src/mirror-file.ts)
- [LocalSync](../../src/local-sync.ts), [CLI](../../src/cli.ts), [client](../../src/client.ts) and [transformer](../../src/reverse-sync.ts)
- [Document-read regressions](../../test/document-read-regression.test.ts), [scoped-update regressions](../../test/local-sync-production-regression.test.ts) and [writer regressions](../../test/local-sync-writer-regression.test.ts)
- [CLI init regressions](../../test/cli-init-regression.test.ts), [CLI sync regressions](../../test/cli-sync-regression.test.ts) and [Node transport consent tests](../../test/sync-bootstrap.test.ts)
- [Path-boundary regressions](../../test/mirror-path-regression.test.ts)
- [Official v3 document operations](https://developers.niftypm.com/docs/api/v3/document)
- [Official legacy scope restrictions](https://developers.niftypm.com/docs/authentication#scope-requirement-for-the-legacy-rest-api)
