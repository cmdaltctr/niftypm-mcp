# Documentation Index

Start with the [README](../../README.md) for setup, examples and the current compatibility contract.

## Guides

| Guide | Covers |
| --- | --- |
| [CLI](cli.md) | Manual init/sync, automatic-sync consent, backups and writer limits |
| [Configuration and deployment](configuration.md) | Credentials, tool controls and transports |
| [Tools](tools.md) | Tool domains and separate v3 document metadata/body reads |
| [API coverage](api-coverage.md) | Endpoint coverage reference |
| [Migration](migration.md) | Earlier tool expansion; current breaking changes are in [README compatibility](../../README.md#compatibility) |
| [Workflow](workflow.md) | JSON-first project planning |

## Decision Records

- [Architecture decision index](../adr/ADR_README.md)
- [ADR-001: v3 document access and safe mirror sync](../adr/001-v3-document-access-and-safe-mirror-sync.md)
- [Technical decision index](../tdr/README.md)
- [TDR-001: legacy document-read 403](../tdr/001-legacy-document-read-403.md)
- [TDR-002: safe local mirror sync](../tdr/002-safe-local-mirror-sync.md)

ADR-001 records the accepted implementation and outstanding security triage. Deployment or a launch-path change needs separate approval before reloading the patched code.
