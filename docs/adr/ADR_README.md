# Architecture Decision Records

This directory records significant architectural decisions made during development.

## Index

| ADR | Title | Date | Status |
| --- | --- | --- | --- |
| [001](001-v3-document-access-and-safe-mirror-sync.md) | v3 document access and safe mirror sync | 2026-10-07 | Accepted |

Accepted records an implemented decision. Security review status is separate; ADR-001 records the outstanding review boundary. Deployment remains outside this run.

## Convention

Each ADR follows this template:

- **Context**: the problem, constraints and reasons for the change.
- **Decision**: the chosen approach and its scope.
- **Consequences**: positive, negative and neutral outcomes.
- **Alternatives Considered**: rejected options and their reasons.
- **References**: relevant source, tests and documentation.

Accepted ADRs are immutable. Mark a superseded decision with a "Superseded by ADR-NNN" note.

## Creating a New ADR

1. Copy the section structure from an existing ADR.
2. Use the next three-digit number and a kebab-case filename.
3. Set status to Proposed until the decision is confirmed and implemented.
4. Add a row to this index and update the [documentation index](../guides/index.md).
