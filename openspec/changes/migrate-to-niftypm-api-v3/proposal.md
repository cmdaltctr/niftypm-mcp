## Why

NiftyPM has frozen its v1.0 REST API. It stops serving requests on 1 September 2027 (https://developers.niftypm.com/docs/versioning). The MCP server has 125 tools. 122 of them call `/api/v1.0`, `/api/v2.0` (folders) or the private web-app API. Two call v3 already, and one calls the OAuth token endpoint. When v1.0 stops, most tools stop.

v3 runs on the same host (`https://openapi.niftypm.com/api/v3`) and accepts the same bearer token. It also gives us:

- A higher write limit. v3 allows 100 `PATCH` per minute per token. v1.0 allows 50 `PUT` per minute (https://developers.niftypm.com/docs/rate-limits).
- `Idempotency-Key` on `POST`. A retried create returns the first result for 10 minutes and does not make a duplicate.
- RFC 7807 errors with a stable `code` and a `retryAfter` value (https://developers.niftypm.com/docs/errors).
- Public checklist endpoints. The checklist tools can stop using the private `api.niftypm.com` API and its 90-day browser team token.

The build waits until the operator's other experiment is done. This proposal fixes the plan now, so the build can start without new research.

## What Changes

- Add a v3 request layer to the client. It reads the v3 envelope (`data`, `total`, `limit`, `hasMore`, `nextCursor`), follows cursor pagination, parses RFC 7807 errors, sends `Idempotency-Key` on `POST`, and waits for `Retry-After` on `429`.
- Move 99 tools to v3:
  - 79 tools map to one v3 call.
  - 20 tools need two or more v3 calls, or a changed request shape. Examples: bulk task delete, tie tasks to a milestone, create several checklist items.
- Leave the 2 document reads on v3 (ADR-001) and the OAuth refresh tool as they are.
- Keep 23 tools on v1.0 or v2.0 because v3 has no counterpart: apps (2), templates (1), invites (1), folders on v2.0 (6), and 13 single operations (see `design.md`, section "Endpoint mapping").
- Move all 8 checklist tools from the private API (`api.niftypm.com`) to v3 `/checklists` and `/checklist-items`. Remove the team-token requirement after a write check passes.
- Keep every MCP tool name and every tool input parameter name. A mapping layer converts snake_case tool input to v3 camelCase fields. Agents and skills that call the tools need no change.
- **BREAKING**: tool responses from migrated tools return the v3 record shape (camelCase keys, the v3 envelope for lists). This follows the ADR-001 precedent for documents. See `design.md` Decision 4 and the open question on response shape.
- **BREAKING**: list tools replace `offset` with `cursor`. `limit` stays, with the v3 range of 1 to 200.
- Add an optional `expected_updated_at` input on update tools. v3 returns `409 stale_write` if the record changed after that time.
- Move local mirror fetches (`niftypm init`, `niftypm sync`, automatic sync) to v3. The mirror file format does not change.
- Set a cut-over target of 31 March 2027 and a latest date of 1 June 2027. Both dates are well before the v1.0 sunset.

## Capabilities

### New Capabilities

- `niftypm-api-v3`: how the server calls the v3 API. Covers routing between v3 and v1.0, the response envelope, cursor pagination, error reporting, idempotent creates, rate-limit waits, stale-write protection and stable tool inputs.

### Modified Capabilities

- `checklist-tools`: checklist and checklist-item tools call the public v3 API with the API token. The private `api.niftypm.com` base URL and the team token go away.
- `local-sync`: mutation interception includes `PATCH` and v3 paths. Targeted refetch uses v3 list endpoints. Project ID resolution reads the camelCase `projectId` field.

## Impact

- **Code**: `src/client.ts` (v3 request layer, `PATCH`, errors, idempotency, `429`), `src/config.ts` (remove `internalBaseUrl` and the team token after cut-over), `src/tools/*.ts` (19 of 21 domain files), `src/sync-data.ts`, `src/local-sync.ts`, `src/reverse-sync.ts`, `src/cli.ts`.
- **Tests**: `test/tools/*.test.ts` and the sync regression tests. New contract tests check method, path and body for each migrated tool.
- **Credentials**: the API token (`.secrets/api_token`) stays. The team token (`.secrets/team_token`) is no longer needed after the checklist move.
- **Dependency**: the open fix on branch `fix/rate-limit-retry-after` adds `Retry-After` handling for v1.0. This change builds on it, so that fix merges first.
- **Docs**: README, `docs/guides/api-coverage.md`, `docs/guides/configuration.md`, `docs/guides/migration.md`, a new ADR-002, and the baseline spec `niftypm-mcp-remaining-tools` (its v1.0 paths).
- **Out of scope**:
  - New tools for v3-only resources (goals, check-ins, reminders, roles, and others).
  - New restore tools for soft-deleted records.
  - Webhook payload version changes.
  - Removal of the 23 v1.0-only tool calls. A follow-up change before 1 September 2027 decides their future.
  - Cloudflare Worker deployment changes beyond the shared client code.
