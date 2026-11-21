## MODIFIED Requirements

### Requirement: `.env` generation and download

The page SHALL generate a `.env` file whose format exactly matches the format
consumed by `loadConfig()` and trigger a browser download named `.env`. The
output SHALL include human-readable section comments grouping tool toggles by
category and documenting per-tool overrides.

#### Scenario: Generated file matches loader format

- **GIVEN** the user has filled credentials and set toggles
- **WHEN** they download the `.env`
- **THEN** the file contains the four `NIFTYPM_*` credential lines
- **AND** contains all 20 `ENABLE_*` lines with `true` or `false` values
- **AND** the variable names exactly match those read in `src/config.ts`

#### Scenario: Section comments group toggles by category

- **GIVEN** the user has configured toggles
- **WHEN** the `.env` is generated
- **THEN** credential lines appear under a `# NiftyPM OAuth Credentials` header
- **AND** tool toggles appear under a `# Tool Configuration` section
- **AND** core domains (Files, Labels, Documents, Milestones, Messages,
  Task Groups, Tasks, Subteams) appear under a `# Core` subsection comment
- **AND** extended domains (Projects, Folders, Members, Webhooks, Time,
  Fields, Apps, Chat, Invite, Templates, Users, Auth) appear under a
  `# Extended` subsection comment

#### Scenario: Per-tool override section appears when individual tools are disabled

- **GIVEN** the user has disabled two document tools in the Advanced tab
- **WHEN** the `.env` is generated
- **THEN** a `# Per-tool overrides` section appears after the domain toggles
- **AND** a comment lists the disabled tools with their domain:
  `# Disabled: niftypm_update_document (Documents), niftypm_delete_document (Documents)`
- **AND** a `DISABLED_TOOLS=<comma-separated list>` line follows the comment

#### Scenario: Per-tool override section is absent when no tools are individually disabled

- **GIVEN** the user has only used domain-level toggles in the Simple tab
- **AND** no individual tools are disabled in the Advanced tab
- **WHEN** the `.env` is generated
- **THEN** no `DISABLED_TOOLS` line appears in the output
- **AND** no `# Per-tool overrides` section appears

#### Scenario: Toggle state maps to env value

- **GIVEN** the Tasks toggle is OFF and the Files toggle is ON
- **WHEN** the `.env` is generated
- **THEN** the file contains `ENABLE_TASKS=false`
- **AND** contains `ENABLE_FILES=true`

#### Scenario: Download uses the existing fallback order

- **GIVEN** the generated `.env` is placed in the project root
- **WHEN** the MCP server is restarted
- **THEN** `loadConfig()` reads the values from `process.env` (via `.env`)
- **AND** no change to `src/config.ts` is required for domain toggles to work
