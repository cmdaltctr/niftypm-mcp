# Design: Complete Remaining OpenAPI Tool Coverage

## Context

The NiftyPM MCP server currently implements 104 tools covering 20 domains. The upstream OpenAPI spec defines 116 callable operations (excluding the unauthenticated health check). A prior expansion effort (`expand-mcp-to-cover-all-openapi-endpoints`) ticked every task off but 12 endpoints were never actually implemented. The implementation follows a consistent pattern: each domain is a `register*Tools(server, client)` function in `src/tools/*.ts`, tools use Zod-validated parameters, and the `NiftyPMClient` handles auth and HTTP. The two runtime targets are Node stdio (MCP over stdin) and Cloudflare Workers (MCP over HTTP). The missing tools span five domains and one structural gap (no multipart upload support in the client).

## Goals / Non-Goals

**Goals:**
- Add the 12 missing MCP tools, each with Zod parameter schemas matching the OpenAPI request/response contracts
- Extend `NiftyPMClient` with multipart `formUpload` support so file upload works in both Node 18+ and Cloudflare Workers runtimes
- Bring `docs/guides/tools.md` to full parity with the registered tool list
- Add tests for every new tool and for the new client upload path
- Preserve backward compatibility: no existing tool name, parameter, or behaviour changes

**Non-Goals:**
- Re-implementing or refactoring the 104 existing tools
- Adding file download support (the API's `GET /api/v1.0/files/{id}/download` endpoint is not in the MCP scope)
- Implementing OAuth flow automation (token refresh is already handled)
- Adding tool-level rate limiting (upstream handles this)
- Restructuring the `enabledTools` config to per-tool granularity

## Decisions

### 1. Add `formUpload` to `NiftyPMClient`

**Decision:** Add a new `formUpload(endpoint, formData, query)` method to `NiftyPMClient` that sends `multipart/form-data` with the standard `Authorization` and `Content-Type` headers omitted (the runtime `fetch` sets the multipart boundary).

**Alternatives considered:**
- *Bake multipart into existing `post()`*: Rejected — `post()` serialises `body` as `JSON.stringify()`, so adding multipart as an overloaded branch would break the existing contract.
- *Read file from disk in the tool, construct a `Request` directly*: Couples tool logic to runtime (no `fs` in Workers). Keeps the client as the single HTTP layer.
- *Use a library like `form-data`*: Adds a dependency; native `FormData` is available in both Node 18+ and Workers.

**Rationale:** Native `FormData` + `Blob` work identically in both runtimes. The method is narrowly scoped and doesn't change existing client behaviour.

### 2. Accept file content as Base64 string in tool parameters

**Decision:** The `niftypm_upload_files` tool SHALL accept file content as a Base64-encoded string alongside a filename and MIME type. The tool decodes the Base64 into a `Blob`, appends it to a `FormData` instance, and calls `client.formUpload`.

**Alternatives considered:**
- *Accept file path*: Impossible in Workers (no filesystem access); inconsistent across runtimes.
- *Accept raw binary stream*: MCP tool schemas are JSON-only; binary payloads cannot pass through without encoding.

**Rationale:** Base64 is the only encoding that passes cleanly through MCP's JSON tool interface and works in both runtimes. This is the same pattern used by the OpenAI file API and Anthropic document tool.

### 3. New tools go in existing domain files

**Decision:** Each new tool is added to the domain file that already exists for its group: `files.ts`, `messages.ts`, `milestones.ts`, `subteams.ts`, `tasks.ts`. No new source files are created.

**Rationale:** Follows the established convention. Each domain file maps 1:1 to a conceptual group. Creating a new file for 12 tools adds unnecessary indirection.

### 4. `niftypm_delete_tasks` uses `DELETE` with JSON body

**Decision:** The bulk-delete tool sends `DELETE /api/v1.0/tasks` with `{ task_ids: [...] }` in the JSON body. This matches the OpenAPI spec's `RemoveTasks` schema and follows the existing pattern in `NiftyPMClient.delete()` which accepts a `body` option.

**Alternatives considered:**
- *Use POST with action parameter*: Deviates from the OpenAPI contract.
- *One-by-one single delete*: Inefficient; doesn't match the bulk endpoint.

**Rationale:** The client already supports `DELETE` with a body (used by `remove_task_labels`, `remove_document_members`, etc.). This is consistent.

### 5. Milestone tie/untie tool parameter naming

**Decision:** Use `task_ids` as the array parameter name for `niftypm_tie_milestone_tasks` and `niftypm_untie_milestone_tasks`, matching the OpenAPI `UpdateTasks.tasks` field. Internally map `task_ids` → `tasks` in the request body.

**Rationale:** `task_ids` is more explicit and consistent with `niftypm_delete_tasks`. The mapping to the upstream API body is handled in the execute function.

## Risks / Trade-offs

- **Multipart in Workers** — `Blob` and `FormData` are available in Workers, but file *streams* are not natively supported in MCP tool schemas. The Base64 encoding adds ~33% size overhead. → Mitigated by documenting this as a limitation; large file uploads are out of scope for MCP anyway.
- **Client `formUpload` adds complexity** — Only one tool uses it currently. → Mitigated by keeping it minimal (one method). If more upload endpoints appear later, it's already in place.
- **LSP type mismatch in test files** — Pre-existing issues in `test/index.test.ts` and `test/benchmark.test.ts` related to `enabledTools` and `FastMCP` mock types. Not introduced by this change. → Should be fixed in a separate cleanup.
