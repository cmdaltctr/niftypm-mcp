# cli-interface Specification

## Purpose

Defines the command line interface of the niftypm-mcp binary: subcommand dispatch, argument parsing, the interactive init command and the manual sync command, while running with no arguments still starts the MCP server.

## Requirements

### Requirement: CLI subcommand dispatch
The `niftypm-mcp` binary SHALL support subcommand dispatch via `process.argv`. When invoked with no subcommand, it SHALL start the MCP server (current behaviour). When invoked with a recognised subcommand (`init`, `sync`), it SHALL execute that command and exit. When invoked with a string matching a registered tool name, it SHALL execute that tool with CLI-parsed arguments and exit.

#### Scenario: No arguments starts MCP server
- **WHEN** `niftypm-mcp` is invoked with no arguments
- **THEN** the MCP server starts in stdio mode (identical to current behaviour)

#### Scenario: Unknown subcommand exits with error
- **WHEN** `niftypm-mcp` is invoked with an argument that is neither `init`, `sync`, nor a registered tool name
- **THEN** the system prints `Unknown command or tool: "<name>"` and a hint to run `niftypm-mcp help`, and exits with code 1
- **AND** credential validation runs before this check, so missing credentials fail first

#### Scenario: Tool name as subcommand executes tool
- **WHEN** `niftypm-mcp niftypm_list_projects` is invoked
- **THEN** the system executes the `niftypm_list_projects` tool and prints the JSON result to stdout

### Requirement: CLI argument parsing
The system SHALL parse `--key value` pairs from `process.argv` into a plain object and validate it against the tool's Zod schema before execution. Array parameters SHALL accept repeated flags (e.g., `--labels id1 --labels id2`). Boolean parameters SHALL accept `--flag` (true) and `--no-flag` (false). Numeric parameters SHALL be coerced from strings.

#### Scenario: String argument parsed correctly
- **WHEN** `niftypm-mcp niftypm_create_task --name "Fix bug" --task_group_id "abc123"` is invoked
- **THEN** the system parses `name` as `"Fix bug"` and `task_group_id` as `"abc123"`, validates against the Zod schema, and executes the tool

#### Scenario: Array argument parsed with repeated flags
- **WHEN** `niftypm-mcp niftypm_create_task --name "Task" --task_group_id "abc" --labels "id1" --labels "id2"` is invoked
- **THEN** the system parses `labels` as `["id1", "id2"]`

#### Scenario: Invalid argument fails with Zod error
- **WHEN** `niftypm-mcp niftypm_create_task` is invoked without the required `task_group_id`
- **THEN** the system prints the Zod validation error to stderr and exits with code 1

### Requirement: Init command
The `niftypm-mcp init` command SHALL present an interactive wizard that lists all accessible NiftyPM projects, lets the user select one, fetches all entities (labels, task groups, milestones including list-type, tasks, members), transforms them into the schema-compliant JSON format, and writes the result to `niftypm/<project-name>.json` in the current working directory.

#### Scenario: Init creates local JSON file
- **WHEN** the user runs `niftypm-mcp init` in a project directory and selects a NiftyPM project
- **THEN** the system fetches all project data, creates the `niftypm/` directory if it does not exist, writes `<project-name>.json` with `meta.last_synced` set to the current UTC timestamp, and prints a success message

#### Scenario: Init with no credentials fails gracefully
- **WHEN** `niftypm-mcp init` is invoked without valid NiftyPM credentials configured
- **THEN** the system prints a configuration error message referencing `.env` and `.secrets/` setup, and exits with code 1

#### Scenario: Init when file already exists prompts for confirmation
- **WHEN** `niftypm-mcp init` is invoked and the target JSON file already exists
- **THEN** the system prompts the user to confirm overwrite before proceeding

### Requirement: Sync command
The `niftypm-mcp sync` command SHALL perform a full re-sync of an existing local JSON file from the live NiftyPM API. It SHALL read `meta.niftypm_project_id` from the local file, fetch all entities, and rewrite the file with fresh data.

#### Scenario: Sync updates existing file
- **WHEN** the user runs `niftypm-mcp sync` in a directory containing `niftypm/<project>.json`
- **THEN** the system reads the project ID from the existing file, fetches all entities from the live API, and overwrites the file with updated data and a new `meta.last_synced` timestamp

#### Scenario: Sync with no local JSON fails gracefully
- **WHEN** `niftypm-mcp sync` is invoked and no `niftypm/*.json` file exists in the current directory
- **THEN** the system prints a message suggesting `niftypm-mcp init` and exits with code 1

#### Scenario: Sync with multiple local JSON files prompts for selection
- **WHEN** `niftypm-mcp sync` is invoked and multiple `niftypm/*.json` files exist
- **THEN** the system lists the files and prompts the user to select one
