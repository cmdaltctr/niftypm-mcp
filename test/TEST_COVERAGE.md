# Test Coverage Report

**Generated:** 2026-06-08
**Change:** `expand-mcp-to-cover-all-openapi-endpoints`

## Summary

| Metric | Value |
|--------|-------|
| Total tests | 162 |
| Assertions | 820 |
| Test files | 25 |
| All passing | ✅ Yes |
| Build status | ✅ Passes (`bun run build`) |

## Test File Breakdown

### Core tests (pre-existing)
| File | Tests | Domain |
|------|-------|--------|
| `test/client.test.ts` | 14 | NiftyPMClient HTTP, auth, 401 refresh |
| `test/config.test.ts` | 9 | Config loading, validation, defaults |
| `test/index.test.ts` | 3 | Server creation, tool registration baseline |

### Original domain tool tests (pre-existing)
| File | Tests | Domain |
|------|-------|--------|
| `test/tools/tasks.test.ts` | 12 | 22 task tools |
| `test/tools/documents.test.ts` | 8 | 13 document tools |
| `test/tools/files.test.ts` | — | 4 file tools |
| `test/tools/labels.test.ts` | — | 5 label tools |
| `test/tools/messages.test.ts` | — | 6 message tools |
| `test/tools/milestones.test.ts` | — | 6 milestone tools |
| `test/tools/taskgroups.test.ts` | — | 8 taskgroup tools |
| `test/tools/subteams.test.ts` | — | 5 subteam tools |

### New domain tool tests (Phase 5.3)
| File | Tests | Domain | Tools Covered |
|------|-------|--------|---------------|
| `test/tools/projects.test.ts` | 13 | Projects | 11 tools (CRUD + invite/leave/start/fields) |
| `test/tools/folders.test.ts` | 8 | Folders | 6 tools (CRUD + children) |
| `test/tools/members.test.ts` | 4 | Members | 2 tools (list + get) |
| `test/tools/webhooks.test.ts` | 8 | Webhooks | 4 tools (CRUD + secret redaction) |
| `test/tools/time.test.ts` | 4 | Time | 2 tools (report + duration) |
| `test/tools/fields.test.ts` | 4 | Fields | 2 tools (list + get) |
| `test/tools/apps.test.ts` | 4 | Apps | 2 tools (list + get) |
| `test/tools/chat.test.ts` | 4 | Chat | 2 tools (list + get) |
| `test/tools/invite.test.ts` | 3 | Invite | 1 tool (list links) |
| `test/tools/templates.test.ts` | 3 | Templates | 1 tool (list templates) |
| `test/tools/users.test.ts` | 3 | Users | 1 tool (get current user) |
| `test/tools/auth.test.ts` | 4 | Auth | 1 tool (refresh token + redaction) |

### Integration & benchmark tests (Phase 5.3)
| File | Tests | Purpose |
|------|-------|---------|
| `test/integration.test.ts` | 7 | Cross-domain registration, naming, schema validation |
| `test/benchmark.test.ts` | 3 | Registration overhead benchmarks |

## Coverage by Tool Domain

| Domain | Source Tools | Tests | Status |
|--------|-------------|-------|--------|
| files | 4 | ✅ Pre-existing | Covered |
| labels | 5 | ✅ Pre-existing | Covered |
| documents | 13 | ✅ Pre-existing + new tools covered | Covered |
| milestones | 6 | ✅ Pre-existing | Covered |
| messages | 6 | ✅ Pre-existing | Covered |
| taskGroups | 8 | ✅ Pre-existing | Covered |
| tasks | 22 | ✅ Pre-existing | Covered |
| subTeams | 5 | ✅ Pre-existing | Covered |
| **projects** | 11 | ✅ **New** | Covered |
| **folders** | 6 | ✅ **New** | Covered |
| **members** | 2 | ✅ **New** | Covered |
| **webhooks** | 4 | ✅ **New** | Covered |
| **time** | 2 | ✅ **New** | Covered |
| **fields** | 2 | ✅ **New** | Covered |
| **apps** | 2 | ✅ **New** | Covered |
| **chat** | 2 | ✅ **New** | Covered |
| **invite** | 1 | ✅ **New** | Covered |
| **templates** | 1 | ✅ **New** | Covered |
| **users** | 1 | ✅ **New** | Covered |
| **auth** | 1 | ✅ **New** | Covered |
| **Total** | **104** | | **All covered** |

## Security-Critical Test Coverage

| Area | Test Location | Scenario |
|------|--------------|----------|
| Token refresh on 401 | `test/client.test.ts` | Auto-refresh + retry once |
| Refresh failure | `test/client.test.ts` | Non-2xx refresh throws |
| Custom auth passthrough | `test/client.test.ts` | No refresh on custom auth |
| Token redaction | `test/tools/auth.test.ts` | access_token/refresh_token stripped from output |
| Webhook secret redaction | `test/tools/webhooks.test.ts` | Secret/api_key/client_secret stripped |
| Config validation | `test/config.test.ts` | Missing credentials throw with guidance |

## Performance Benchmarks

| Benchmark | Threshold | Result |
|-----------|-----------|--------|
| Register all 20 domains | < 500ms | ✅ Passes |
| Register single domain | < 50ms each | ✅ Passes |
| 100 repeated full registrations | avg < 100ms, max < 500ms | ✅ Passes |

## Notes

- No external API calls are made — all tests mock the NiftyPM client.
- No real credentials required — tests are fully deterministic.
- Integration tests verify every expected tool name against a canonical list.
- Benchmark tests verify no performance degradation in tool registration.
