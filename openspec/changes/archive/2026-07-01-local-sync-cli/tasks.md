## 1. Mutation hook in NiftyPMClient

- [x] 1.1 Add optional `onMutation` callback property to `NiftyPMClient` (type: `(entry: MutationEntry) => void | Promise<void>`)
- [x] 1.2 Define `MutationEntry` interface: `{ method: string, endpoint: string, baseUrl?: string, requestBody?: any, responseBody?: any }`
- [x] 1.3 In `NiftyPMClient.request()`, after successful response for POST/PUT/DELETE, invoke `onMutation` if set (wrapped in try/catch, errors to stderr)
- [x] 1.4 In `NiftyPMClient.formUpload()`, after successful response, invoke `onMutation` with FormData metadata (endpoint + params, skip body)
- [x] 1.5 Ensure GET requests never trigger `onMutation`

## 2. TypeScript reverse-sync port

- [x] 2.1 Create `src/reverse-sync.ts` with `buildProjectJson(bundle: Bundle): ProjectJson` function porting `reverse-sync.py` transform logic
- [x] 2.2 Port helper functions: `dateOnly()`, `buildLabelMap()`, `buildTaskgroupMap()`, `buildMilestoneMap()`
- [x] 2.3 Port the full task transformation (ID resolution, label names, milestone names, dependency nice_ids, subtask placeholders)
- [x] 2.4 Port the `_validation_checklist` generation
- [x] 2.5 Define TypeScript interfaces for the bundle input and project JSON output (matching the Python script's schema)

## 3. Local sync engine

- [x] 3.1 Create `src/local-sync.ts` with `LocalSync` class
- [x] 3.2 Implement `discover(): Map<string, string>` — scan `cwd/niftypm/*.json`, read `meta.niftypm_project_id`, return `project_id → filepath` map
- [x] 3.3 Implement endpoint → entity type mapping (tasks, task_lists, milestones, labels, project)
- [x] 3.4 Implement project ID resolution chain: response body → request body → local JSON scan → skip
- [x] 3.5 Implement `syncEntity(client, projectId, entityType, filepath)` — refetch the entity type via API, update the corresponding section in the JSON file
- [x] 3.6 Implement atomic file write (write to temp file, rename)
- [x] 3.7 Implement `onMutation(entry)` method — ties together resolution + targeted refetch + section update + `meta.last_synced` update
- [x] 3.8 Ensure all sync errors are caught and logged to stderr (never throw)

## 4. CLI subcommand dispatch

- [x] 4.1 Create `src/cli.ts` with argument parsing and subcommand dispatch
- [x] 4.2 Implement `--key value` parser: handle strings, repeated flags for arrays, `--flag`/`--no-flag` for booleans, numeric coercion
- [x] 4.3 Implement unknown subcommand handler: print error + available commands, exit(1)
- [x] 4.4 Build a registry of all tool names and their Zod schemas (reuse existing schemas from tool registration files)

## 5. Init command

- [x] 5.1 Implement `init` command: load config, validate credentials, create `NiftyPMClient`
- [x] 5.2 Fetch all projects via `client.get('/api/v1.0/projects')`, display numbered list, read selection from stdin
- [x] 5.3 Fetch all entities in parallel (labels, taskgroups, milestones ×2, tasks, members) for selected project
- [x] 5.4 Assemble bundle, call `buildProjectJson()` from `src/reverse-sync.ts`
- [x] 5.5 Create `niftypm/` directory if needed, write `<project-name>.json`
- [x] 5.6 Handle existing file: prompt for overwrite confirmation
- [x] 5.7 Print success message with file path and task count

## 6. Sync command

- [x] 6.1 Implement `sync` command: discover local JSON files in `cwd/niftypm/`
- [x] 6.2 If no files found, print error suggesting `niftypm-mcp init`, exit(1)
- [x] 6.3 If multiple files found, list them and prompt for selection
- [x] 6.4 Read `meta.niftypm_project_id` from selected file, fetch all entities in parallel
- [x] 6.5 Assemble bundle, call `buildProjectJson()`, write updated file with new `meta.last_synced`
- [x] 6.6 Print success message with updated counts

## 7. Direct tool invocation from CLI

- [x] 7.1 Implement tool name lookup: check if `argv[2]` matches a registered tool name
- [x] 7.2 Parse remaining `argv` into args object using the `--key value` parser
- [x] 7.3 Validate args against the tool's Zod schema; print Zod error and exit(1) on failure
- [x] 7.4 Execute the tool's `execute` function with validated args, print JSON result to stdout
- [x] 7.5 Wire `onMutation` to `LocalSync` so CLI tool calls also trigger local sync

## 8. Entry point integration

- [x] 8.1 Modify `src/index.ts`: check `process.argv` at startup, dispatch to CLI if subcommand present, otherwise start MCP server
- [x] 8.2 In MCP server mode: create `LocalSync` instance, set `client.onMutation = localSync.onMutation` if local JSON files discovered
- [x] 8.3 In CLI mode: create `LocalSync` instance, set `client.onMutation` for tool calls
- [x] 8.4 Ensure `worker.ts` is unchanged — no local-sync imports, no `onMutation` wiring

## 9. Tests

- [x] 9.1 Test `MutationEntry` callback fires on POST/PUT/DELETE and NOT on GET
- [x] 9.2 Test `buildProjectJson()` produces same output shape as `reverse-sync.py` for a given bundle
- [x] 9.3 Test `LocalSync.discover()` finds JSON files and builds correct project_id → filepath map
- [x] 9.4 Test endpoint → entity type mapping for all five entity types
- [x] 9.5 Test project ID resolution chain (response body, request body, local scan, skip)
- [x] 9.6 Test atomic file write (temp file + rename)
- [x] 9.7 Test CLI arg parser: strings, arrays (repeated flags), booleans, numerics
- [x] 9.8 Test `init` command creates correct JSON file from API responses (mocked)
- [x] 9.9 Test `sync` command updates existing file correctly (mocked)
- [x] 9.10 Test unknown subcommand exits with error
- [x] 9.11 Test Workers mode does not import or activate local sync

## 10. Documentation

- [x] 10.1 Update README.md with CLI usage section (`init`, `sync`, direct tool calls)
- [x] 10.2 Document auto-sync behaviour and `niftypm/` directory convention
- [x] 10.3 Update `package.json` bin description if needed
