## ADDED Requirements

### Requirement: DISABLED_TOOLS environment variable

The system SHALL support a `DISABLED_TOOLS` environment variable containing a
comma-separated list of MCP tool names. Tools whose names appear in this list
SHALL be excluded from registration regardless of their domain's
`ENABLE_*` toggle state.

#### Scenario: DISABLED_TOOLS is parsed into a string array

- **GIVEN** the environment has
  `DISABLED_TOOLS=niftypm_update_document,niftypm_delete_document`
- **WHEN** `loadConfig()` runs
- **THEN** `config.disabledTools` contains
  `["niftypm_update_document", "niftypm_delete_document"]`

#### Scenario: Empty DISABLED_TOOLS defaults to empty array

- **GIVEN** the environment does NOT have `DISABLED_TOOLS` set
- **WHEN** `loadConfig()` runs
- **THEN** `config.disabledTools` is an empty array `[]`
- **AND** every tool domain operates normally based on `enabledTools`

#### Scenario: Whitespace around comma-separated values is trimmed

- **GIVEN** `DISABLED_TOOLS=niftypm_update_document, niftypm_delete_document`
  (space after comma)
- **WHEN** `loadConfig()` runs
- **THEN** `config.disabledTools` contains two entries with no leading/trailing
  whitespace on either name

### Requirement: Per-tool registration gate

Every `register*Tools()` function SHALL accept a `disabledTools: string[]`
parameter (default `[]`) and SHALL skip calling `server.addTool()` for any
tool whose name appears in `disabledTools`.

#### Scenario: A tool in DISABLED_TOOLS is not registered

- **GIVEN** `ENABLE_DOCUMENTS=true` and
  `DISABLED_TOOLS=niftypm_delete_document`
- **WHEN** the server starts and `registerDocumentsTools()` is called
- **THEN** `niftypm_list_documents` is registered
- **AND** `niftypm_get_document` is registered
- **AND** `niftypm_create_document` is registered
- **AND** `niftypm_update_document` is registered
- **AND** `niftypm_delete_document` is NOT registered

#### Scenario: All tools register when disabledTools is empty

- **GIVEN** `ENABLE_DOCUMENTS=true` and `DISABLED_TOOLS` is empty/unset
- **WHEN** the server starts
- **THEN** all 13 document tools are registered

#### Scenario: Domain disabled takes precedence even with DISABLED_TOOLS

- **GIVEN** `ENABLE_FILES=false` and `DISABLED_TOOLS=niftypm_list_files`
- **WHEN** the server starts
- **THEN** `registerFilesTools()` is NOT called at all
- **AND** the domain-level gate takes precedence over the per-tool gate

### Requirement: TypeScript interface for disabledTools

The `NiftyPMConfig` interface in `src/config.ts` SHALL include a
`disabledTools: string[]` field. The `loadConfig()` function SHALL populate it
from `DISABLED_TOOLS`.

#### Scenario: Interface includes disabledTools

- **GIVEN** `src/config.ts` is compiled
- **WHEN** `NiftyPMConfig` is used as a type
- **THEN** the `disabledTools` field is of type `string[]`
- **AND** defaults to `[]` when the env var is absent

### Requirement: Both entry points pass disabledTools

The system SHALL pass `config.disabledTools` to every `register*Tools()` call
in both `src/index.ts` (local/FastMCP) and `src/worker.ts` (Cloudflare Workers)
without exception.

#### Scenario: Local entry passes disabledTools

- **GIVEN** the local server starts
- **WHEN** each `register*Tools()` function is called
- **THEN** `config.disabledTools` is passed as the argument

#### Scenario: Workers entry passes disabledTools

- **GIVEN** a Cloudflare Workers request arrives
- **WHEN** `createServer()` builds the server and registers tools
- **THEN** `config.disabledTools` is passed to each `register*Tools()` call
