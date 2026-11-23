# Proposal: Complete Remaining OpenAPI Tool Coverage

## Why

The NiftyPM MCP server documents and implements 104 tools, but the upstream OpenAPI specification defines 116 callable operations (excluding the `/` health check). A prior change (`expand-mcp-to-cover-all-openapi-endpoints`) marked its tasks complete, yet 12 operations across five domains still have no corresponding MCP tool. This leaves real gaps where AI workflows must fall back to raw API calls — most visibly file uploads, file editing, file-label management, milestone↔task tie/untie, portfolio (subteam) membership, and bulk task deletion. Finishing this coverage delivers the "complete API surface" the previous change promised.

## What Changes

- Add **12 missing MCP tools** mapping one-to-one to currently-unimplemented OpenAPI operations:
  - **Files (4):** `niftypm_upload_files`, `niftypm_update_file`, `niftypm_add_file_labels`, `niftypm_remove_file_labels`
  - **Messages (1):** `niftypm_mark_message_heard`
  - **Milestones (3):** `niftypm_move_milestone`, `niftypm_tie_milestone_tasks`, `niftypm_untie_milestone_tasks`
  - **Subteams/Portfolios (3):** `niftypm_add_subteam_members`, `niftypm_remove_subteam_members`, `niftypm_leave_subteam`
  - **Tasks (1):** `niftypm_delete_tasks` (bulk delete via `DELETE /api/v1.0/tasks`)
- Extend `NiftyPMClient` with **`multipart/form-data` upload support** so `niftypm_upload_files` can send file payloads (the client currently only sends JSON). **BREAKING** to the client's internal request contract only; no existing tool behaviour changes.
- Update `docs/guides/tools.md` so every documented domain table lists the new tools (Files, Messages, Milestones, Subteams, Tasks).
- Add unit tests for each new tool and for the new multipart client path.

## Capabilities

### New Capabilities
- `niftypm-mcp-remaining-tools`: Covers the 12 previously-unimplemented NiftyPM API operations as MCP tools, plus the client-level multipart upload capability required by file upload.

### Modified Capabilities
<!-- The baseline openspec/specs/ contains only configurator-ui; the niftypm-mcp
     capability spec from the prior change has not been archived into the baseline,
     so there is no baseline requirement to modify. This change introduces a new
     capability spec scoped to the remaining endpoints. -->

## Impact

- **Code:** `src/tools/files.ts`, `src/tools/messages.ts`, `src/tools/milestones.ts`, `src/tools/subteams.ts`, `src/tools/tasks.ts`, and `src/client.ts` (new multipart helper).
- **Docs:** `docs/guides/tools.md` (domain tables), `README.md` tool count if referenced.
- **Tests:** `test/tools/*` for the five touched domains, plus `test/client.test.ts` for multipart.
- **Dependencies:** None required if using the platform `FormData`/`Blob` (Node 18+/Workers). Confirm during design — avoid adding heavy multipart libraries.
- **Tool count:** 104 → 116 tools; full OpenAPI parity (excluding health check).
- **Runtime:** Targets both the Node stdio entry (`src/index.ts`) and the Cloudflare Worker entry (`src/worker.ts`); multipart approach must work in both.
