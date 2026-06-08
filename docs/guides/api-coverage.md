# API Coverage

This guide summarises current MCP tool coverage against the NiftyPM OpenAPI source available in `docs/api/`.

## Current status

The implementation currently exposes the tool domains below from `src/tools/*.ts`. The OpenSpec change originally targeted 117 operations, but the current source inventory is closer to 104 MCP tools. This guide records the implemented domains and the known gaps so the README does not overclaim coverage.

## Domain coverage table

| Domain | Source file | Tools implemented | Status |
| --- | --- | ---: | --- |
| Apps | `src/tools/apps.ts` | 2 | Implemented |
| Auth | `src/tools/auth.ts` | 1 | Implemented |
| Chat | `src/tools/chat.ts` | 2 | Implemented |
| Documents | `src/tools/documents.ts` | 13 | Implemented |
| Fields | `src/tools/fields.ts` | 2 | Implemented |
| Files | `src/tools/files.ts` | 4 | Partial |
| Folders | `src/tools/folders.ts` | 6 | Implemented |
| Invite | `src/tools/invite.ts` | 1 | Implemented |
| Labels | `src/tools/labels.ts` | 5 | Implemented |
| Members | `src/tools/members.ts` | 2 | Implemented |
| Messages | `src/tools/messages.ts` | 6 | Partial |
| Milestones | `src/tools/milestones.ts` | 6 | Partial |
| Projects | `src/tools/projects.ts` | 11 | Implemented |
| Subteams | `src/tools/subteams.ts` | 5 | Partial |
| Task groups | `src/tools/taskgroups.ts` | 8 | Implemented |
| Tasks | `src/tools/tasks.ts` | 22 | Partial |
| Templates | `src/tools/templates.ts` | 1 | Implemented |
| Time | `src/tools/time.ts` | 2 | Implemented |
| Users | `src/tools/users.ts` | 1 | Implemented |
| Webhooks | `src/tools/webhooks.ts` | 4 | Implemented |

## Known OpenAPI gaps

The following operations were identified during the OpenSpec verification pass as not clearly represented by MCP tools yet:

- File upload, file edit, and file label management.
- Bulk task deletion.
- Some task move/order variants.
- Milestone move-to-project and milestone task tie/untie operations.
- Subteam member add/remove and leave operations.
- Message hear/read-state variants, if required by the upstream spec.

## How to update this table

1. Add or update the relevant tool in `src/tools/<domain>.ts`.
2. Export the registration function from `src/tools/index.ts`.
3. Register the domain in both `src/index.ts` and `src/worker.ts` if it is a new domain.
4. Add a unit test in `test/tools/<domain>.test.ts`.
5. Update this guide with the new tool count and status.

## Verification commands

```bash
bun run vitest run
bun run build
```

Use the OpenAPI files under `docs/api/` as the source of truth for operation coverage when extending the server.
