# Spec: Configurator UI

## ADDED Requirements

### Requirement: Static, server-free configurator page

The system SHALL provide a configurator page (`ui/index.html`) that runs
entirely in the browser with no server process and no network requests.

#### Scenario: Open without a server

- **GIVEN** a user has cloned the repository
- **WHEN** they open `ui/index.html` directly via `file://` in a browser
- **THEN** the page renders fully with no server running
- **AND** no outbound network request is made at any point

#### Scenario: No data leaves the browser

- **GIVEN** the user has entered credentials
- **WHEN** they generate and download the `.env` file
- **THEN** all processing happens client-side
- **AND** no credential value is transmitted to any endpoint

### Requirement: Credential capture

The page SHALL provide input fields for all four OAuth credentials:
`NIFTYPM_CLIENT_ID`, `NIFTYPM_CLIENT_SECRET`, `NIFTYPM_ACCESS_TOKEN`, and
`NIFTYPM_REFRESH_TOKEN`.

#### Scenario: Secret fields are masked

- **GIVEN** the configurator is open
- **WHEN** the user views the Client Secret, Access Token, and Refresh Token
  fields
- **THEN** those fields mask input by default (`type="password"`)
- **AND** a show/hide control allows revealing the value

#### Scenario: Empty credential warning

- **GIVEN** one or more credential fields are empty
- **WHEN** the user clicks the download button
- **THEN** the page warns that the configuration is incomplete
- **AND** still allows the download to proceed (non-blocking)

### Requirement: Tool-domain toggles

The page SHALL present one labelled on/off toggle for each of the 20 tool
domains defined in `src/config.ts` `enabledTools`, each defaulting to ON.

#### Scenario: All 20 domains present and default on

- **GIVEN** the configurator is open
- **WHEN** the user views the toggles
- **THEN** exactly 20 toggles are shown, one per tool domain
- **AND** every toggle defaults to the ON (enabled) state

#### Scenario: Correct env-var mapping for irregular names

- **GIVEN** the Task Groups and Subteams toggles
- **WHEN** the `.env` is generated
- **THEN** Task Groups maps to `ENABLE_TASK_GROUPS` (with underscore)
- **AND** Subteams maps to `ENABLE_SUBTEAMS` (no underscore)

### Requirement: `.env` generation and download

The page SHALL generate a `.env` file whose format exactly matches the format
consumed by `loadConfig()` and trigger a browser download named `.env`.

#### Scenario: Generated file matches loader format

- **GIVEN** the user has filled credentials and set toggles
- **WHEN** they download the `.env`
- **THEN** the file contains the four `NIFTYPM_*` credential lines
- **AND** contains all 20 `ENABLE_*` lines with `true` or `false` values
- **AND** the variable names exactly match those read in `src/config.ts`

#### Scenario: Toggle state maps to env value

- **GIVEN** the Tasks toggle is OFF and the Files toggle is ON
- **WHEN** the `.env` is generated
- **THEN** the file contains `ENABLE_TASKS=false`
- **AND** contains `ENABLE_FILES=true`

#### Scenario: Download uses the existing fallback order

- **GIVEN** the generated `.env` is placed in the project root
- **WHEN** the MCP server is restarted
- **THEN** `loadConfig()` reads the values from `process.env` (via `.env`)
- **AND** no change to `src/config.ts` is required for this to work

### Requirement: Placement and restart guidance

The page SHALL display clear instructions telling the user to save the file
as `.env` in the project root, back up any existing `.env`, and restart the
MCP server for changes to take effect.

#### Scenario: Guidance is visible near the action

- **GIVEN** the configurator is open
- **WHEN** the user looks at the download button
- **THEN** adjacent instructions explain where to place the file and to
  restart the server
- **AND** advise backing up any existing `.env` first
