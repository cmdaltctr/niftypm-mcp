# TDR-001: Use v3 for document reads after legacy 403

- **Date:** 2026-10-07
- **Status:** Accepted
- **Deciders:** Project maintainer (approved task 1.4)

## Context

The parent run tested the same personal access token (PAT) and document `BzTUZ1vtd3` with read-only requests:

| Endpoint | Result |
| --- | --- |
| `GET /api/v1.0/docs/BzTUZ1vtd3` | `403` |
| `GET /api/v3/documents/BzTUZ1vtd3` | `200` |
| `GET /api/v3/documents/BzTUZ1vtd3/content` | `200`; Markdown, 7,685 bytes, `truncated: false`, `lossy: false` |

### Root Cause Analysis

This pattern matches NiftyPM's documented legacy API restrictions for fine-grained scopes. The exact issued token scopes were not introspected. The successful v3 reads establish access through v3; the legacy `403` provides no evidence of an MCP authentication bug or a malformed document.

## Decision

Route `niftypm_get_document` to `GET /api/v3/documents/{id}` for metadata. Add `niftypm_get_document_content` for `GET /api/v3/documents/{id}/content`. Return upstream fields unchanged. Keep other document operations and legacy object-write schemas unchanged.

## Consequences

### Positive

The verified v3 endpoints provide metadata and readable content with the existing PAT.

### Negative

Raw camelCase metadata breaks callers that depend on legacy fields. Metadata and body require separate reads.

### Neutral

This change covers document reads. The sync fix remains pending in a second commit. The new registered tools passed a direct read-only API smoke test; the configured Pi MCP entry still loads main until deployment is approved.

## Alternatives Considered

| Option | Rejected because |
| --- | --- |
| Repair or recreate the document | v3 already reads the same document successfully. |
| Rotate the token or change MCP authentication | v3 accepts the same PAT. |
| Delete cloud resources | The observed restriction concerns a legacy API route. |
| Migrate all document operations to v3 | Only document reads are in scope. |

## How to Recognise / Handle This Again

1. Compare the legacy and v3 read endpoints using the same authorised token and document ID.
2. Record status codes and conversion flags; exclude credentials and document content.
3. Use v3 reads when they succeed and the legacy route returns `403`.
4. Obtain deployment or launch-path approval before switching the MCP entry from main or reloading feature code.
5. Verify both tools through the approved MCP entry after it loads the feature implementation.

The recorded outcome requires no document repair, cloud deletion or token rotation.

## Revisit Triggers

Revisit if v3 rejects the same authorised read, its response contract changes, or a broader migration is approved.

## Verification

- Before the fix, 50 of the 77 new read tests failed for the route, missing tool or input validation.
- After the fix, all 372 tests and the TypeScript check passed, including the 24 existing object-content tests.
- Removing registration failed all 77 read tests. Reversing the domain gate failed four bootstrap tests; exposing error bodies failed four privacy tests. Each mutation was reverted and the tests passed again.
- Both new registered tools read the existing native document with the same credential. Content remained 7,685 bytes with no truncation or formatting loss. The smoke test made no cloud mutation and changed no launch configuration.
- Aikido scanned all six changed first-party code files with zero findings and no skipped paths.

## References

- [v1 migration](https://developers.niftypm.com/docs/getting-started#migrating-from-v1)
- [Legacy scope restrictions](https://developers.niftypm.com/docs/authentication#scope-requirement-for-the-legacy-rest-api)
- [v3 document operations](https://developers.niftypm.com/docs/api/v3/document)
- [v3 OpenAPI 0.136.0](https://developers.niftypm.com/docs/api/v3/0.136.0/nifty-v3-openapi.json)
- Implementation: [`src/tools/documents.ts`](../../src/tools/documents.ts)
- Usage: [Document tools](../guides/tools.md#documents)
