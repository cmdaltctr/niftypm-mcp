## 1. Prerequisites

- [ ] 1.1 Get the operator's answers to the four open questions in `design.md`. Record them in `design.md`. Verify: `design.md` "Open Questions" shows a decision for each item.
- [ ] 1.2 Confirm that `fix/rate-limit-retry-after` is merged into the integration branch. Verify: `git merge-base --is-ancestor <fix commit> HEAD` exits 0.
- [ ] 1.3 Create the feature worktree from the integration branch and install with the frozen lockfile. Verify: `git branch --show-current` shows the feature branch, and `bun install --frozen-lockfile` exits 0.
- [ ] 1.4 Download the current v3 OpenAPI description to `docs/api/v3-openapi-source.json` and record its version and SHA-256 in `docs/api/README` or the ADR. Verify: the file parses as JSON, and the version is 0.154.0 or later.

## 2. Client v3 request layer (tests first)

- [ ] 2.1 Write failing tests in `test/client-v3.test.ts` for: `/api/v3` path building, `PATCH` support, envelope read (`data`, `hasMore`, `nextCursor`), `v3ListAll` cursor loop, refusal of empty pages that claim more rows, and refusal of repeated IDs. Verify: `bunx vitest run test/client-v3.test.ts` fails, and each failure names a missing behaviour.
- [ ] 2.2 Write failing tests for problem-details errors: message has status, `code` and `title`; `detail` cut to 300 characters; no headers or token in the message; non-JSON body falls back to status text. Verify: the new tests fail on the current code.
- [ ] 2.3 Write failing tests for idempotency: each v3 `POST` has a UUID `Idempotency-Key`; a network failure or `502` retries once with the same key; two tool calls use different keys. Verify: the new tests fail on the current code.
- [ ] 2.4 Write failing tests for `429` on v3: the error names the wait from `Retry-After` or body `retryAfter`, and the client sends no second request. Verify: the new tests fail on the current code.
- [ ] 2.5 Write a failing test that a successful v3 `PATCH` calls the mutation callback. Verify: the test fails on the current code.
- [ ] 2.6 Implement the v3 methods in `src/client.ts` (Decisions 1, 6 and 7). Verify: `bunx vitest run test/client-v3.test.ts test/client.test.ts` passes, and `bun run build` exits 0.
- [ ] 2.7 Confirm that the tests catch real faults: remove the `Idempotency-Key` line, then the `retryAfter` read, and run the tests after each removal. Verify: each removal makes at least one test fail; restore the code after.

## 3. Checklists to v3

- [ ] 3.1 Rewrite `test/tools/checklists.test.ts` to expect the v3 calls in the `checklist-tools` delta spec, including one `POST /checklist-items` per item and the two reads in `niftypm_get_checklist`. Verify: `bunx vitest run test/tools/checklists.test.ts` fails on the current code.
- [ ] 3.2 Move the 8 checklist tools in `src/tools/checklists.ts` to the v3 methods. Keep the tool names and inputs. Verify: `bunx vitest run test/tools/checklists.test.ts` passes.
- [ ] 3.3 Add a test that no checklist tool sends a request to `api.niftypm.com`. Verify: the test passes, and it fails if one tool is set back to `internalGet`.

## 4. Tasks to v3

- [ ] 4.1 List each `niftypm_list_tasks`, `niftypm_create_task` and `niftypm_update_task` input that has no v3 field, from the v3 OpenAPI file. Write the list into the domain mapping function comment. Verify: each listed input has a test that expects an error naming it.
- [ ] 4.2 Write failing tests in `test/tools/tasks.test.ts` and `test/tools/list-tasks-params.test.ts` for the 17 one-call task tools in the design table: method, path, camelCase body, and query names. Verify: the tests fail on the current code.
- [ ] 4.3 Write failing tests for the multi-call task tools (`delete_tasks`, `move_task`, `move_tasks`, `add_task_field`, `update_task_field`), including the per-item result and the stop at the first `429`. Verify: the tests fail on the current code.
- [ ] 4.4 Check in the v3 spec whether `customFields` on `PATCH /tasks/{id}` merges or replaces. Record the answer in `design.md`. Verify: `design.md` names the behaviour and the spec text that shows it.
- [ ] 4.5 Implement the task mapping and move 22 task tools to v3. Leave `clone_task` on v1.0. Verify: `bunx vitest run test/tools/tasks.test.ts test/tools/list-tasks-params.test.ts` passes.
- [ ] 4.6 Add the optional `cursor` and `expected_updated_at` inputs to the task list and update tools. Verify: tests for `offset` rejection and the `stale_write` message pass.

## 5. Task groups to statuses

- [ ] 5.1 Write failing tests in `test/tools/taskgroups.test.ts` for the 8 tools in the design table, including the multi-call `move_taskgroup_tasks`. Verify: the tests fail on the current code.
- [ ] 5.2 Move the 8 tools to `/api/v3/statuses` and `/api/v3/tasks`. Verify: `bunx vitest run test/tools/taskgroups.test.ts` passes.

## 6. Milestones to lists

- [ ] 6.1 Write failing tests in `test/tools/milestones.test.ts` for the 8 tools with a v3 counterpart, including the `isMilestone` mapping and the multi-call tie and untie tools. Verify: the tests fail on the current code.
- [ ] 6.2 Move the 8 tools to `/api/v3/lists` and `/api/v3/tasks`. Leave `move_milestone` on v1.0. Verify: `bunx vitest run test/tools/milestones.test.ts` passes.

## 7. Labels, members, chats and custom fields

- [ ] 7.1 Write failing tests in `labels.test.ts`, `members.test.ts`, `chat.test.ts` and `fields.test.ts` under `test/tools/` for the 11 tools in the design table. Verify: the tests fail on the current code.
- [ ] 7.2 Move the 11 tools to v3. Verify: `bunx vitest run test/tools/labels.test.ts test/tools/members.test.ts test/tools/chat.test.ts test/tools/fields.test.ts` passes.

## 8. Projects and portfolios

- [ ] 8.1 Write failing tests in `test/tools/projects.test.ts` for the 9 project tools with a v3 counterpart, including the JSON body for `create_project` and the multi-call `invite_to_project` and `leave_project`. Verify: the tests fail on the current code.
- [ ] 8.2 Write failing tests in `test/tools/subteams.test.ts` for the 8 tools on `/api/v3/portfolios`. Verify: the tests fail on the current code.
- [ ] 8.3 Move the 17 tools to v3. Leave `start_project` and `add_project_field` on v1.0. Verify: `bunx vitest run test/tools/projects.test.ts test/tools/subteams.test.ts` passes.

## 9. Documents and files

- [ ] 9.1 Write failing tests in `test/tools/documents.test.ts` and `test/document-content-contract.test.ts` for the 6 document tools that move: Markdown `content` on create, `PATCH` plus `edit-text` or `append` on update, and the label endpoints. Verify: the tests fail on the current code.
- [ ] 9.2 Write failing tests in `test/tools/files.test.ts` for the 7 file tools that move, including base64 upload with one request per file. Verify: the tests fail on the current code.
- [ ] 9.3 Move the 13 tools to v3. Leave the 6 document tools and `copy_file` that have no counterpart on v1.0. Verify: `bunx vitest run test/tools/documents.test.ts test/tools/files.test.ts test/document-content-contract.test.ts` passes.

## 10. Messages, webhooks, time and current user

- [ ] 10.1 Write failing tests for the 5 message tools, 4 webhook tools, 2 time tools and `get_current_user` that move. Include the summed duration in `get_time_duration`. Verify: the tests fail on the current code.
- [ ] 10.2 Move the 12 tools to v3. Leave `mark_message_seen` and `mark_message_heard` on v1.0. Verify: `bunx vitest run test/tools/messages.test.ts test/tools/webhooks.test.ts test/tools/time.test.ts test/tools/users.test.ts` passes.

## 11. Local mirror and mutation interception

- [ ] 11.1 Add v3 fixtures for the ADR-001 regression cases: wrapped collections, empty page that claims more, repeated IDs, and subtasks next to parents. Write failing tests in the `test/local-sync-*.test.ts` and `test/cli-*-regression.test.ts` files that expect v3 fetches. Verify: the tests fail on the current code.
- [ ] 11.2 Write a failing test that a v3 mirror refresh writes the same keys and layout as a v1.0 refresh of the same data. Verify: the test fails on the current code.
- [ ] 11.3 Move `src/sync-data.ts` to `v3ListAll` and the collection map in `design.md` Decision 9. Verify: `bunx vitest run test/sync-bootstrap.test.ts test/local-sync.test.ts` passes.
- [ ] 11.4 Update `endpointInfo` in `src/local-sync.ts` for v3 paths, action paths and `PATCH`. Verify: the `local-sync` delta spec scenarios pass as tests.
- [ ] 11.5 Run the full suite. Verify: `bun run test` passes, and `bun run build` exits 0.

## 12. Legacy tools, configuration, docs and specs

- [ ] 12.1 Add "Uses the legacy v1.0 API, which stops on 1 September 2027." to the description of each of the 23 tools without a v3 counterpart. Verify: a test counts 23 tools with that sentence.
- [ ] 12.2 Add a contract test that lists every `/api/v1.0` and `/api/v2.0` path in `src/` and compares it with the 23-tool legacy list. Verify: the test passes, and it fails if one migrated tool calls v1.0 again.
- [ ] 12.3 Write ADR-002 "Migrate to NiftyPM API v3" in `docs/adr/`. Verify: the ADR lists Decisions 1 to 10 and the evidence URLs.
- [ ] 12.4 Update `README.md`, `docs/guides/api-coverage.md`, `docs/guides/configuration.md`, `docs/guides/migration.md` and `docs/guides/tools.md` for v3, cursor paging, the response shape and the team-token removal. Verify: `grep -rn "team_token\|api/v1.0" README.md docs/guides` shows only the legacy-tool notes.
- [ ] 12.5 Update the `SKILLS/` folder where it reads snake_case response keys from migrated tools. Verify: `grep -rn` for each renamed key in `SKILLS/` returns no stale reads.
- [ ] 12.6 Add MODIFIED deltas for the `niftypm-mcp-remaining-tools` requirements whose paths change. Verify: `openspec validate migrate-to-niftypm-api-v3 --strict` passes.
- [ ] 12.7 Fix the baseline specs `checklist-tools`, `local-sync` and `cli-interface`: replace the delta header `## ADDED Requirements` with a `# <name> Specification` title, a `## Purpose` section and `## Requirements`. Verify: `openspec validate migrate-to-niftypm-api-v3 --strict` prints no "Archive would refuse this delta" notes.

## 13. Live smoke check and cut-over

- [ ] 13.1 Run a live read-only smoke check with the API token: one `limit=1` read for each migrated read group (tasks, statuses, lists, labels, members, projects, portfolios, documents, files, messages, chats, webhooks, custom fields, time entries, checklists, checklist items). Do not print the token. Verify: each read returns `200` and the v3 envelope; record the status codes in the PR.
- [ ] 13.2 Run `niftypm sync` against a copy of one mirror file in a scratch folder. Verify: the diff with the v1.0 result shows no key or layout changes.
- [ ] 13.3 With the operator's written approval, run one write per scope on a scratch task in a scratch project: create, update and delete a checklist and an item; update a task. Verify: each write returns `2xx`; the operator confirms the scratch data is gone.
- [ ] 13.4 Remove `internalBaseUrl`, the `internal*` client methods, `NIFTYPM_TEAM_TOKEN` and the `team_token` loading from `src/config.ts` and `src/client.ts`. Verify: `grep -rn "api.niftypm.com\|teamToken\|team_token" src` returns nothing, and `bun run test` passes.
- [ ] 13.5 Release 3.0.0 and switch the local MCP configuration to it by **31 March 2027** (latest **1 June 2027**). Verify: `niftypm_get_current_user` and `niftypm_list_tasks` work in a fresh MCP session.

## Workflow follow-up

- Open a follow-up change before 1 August 2027 for the 23 legacy-only tools.
- Archive this change after cut-over and verification.
