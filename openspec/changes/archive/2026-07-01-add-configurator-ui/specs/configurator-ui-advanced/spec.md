## ADDED Requirements

### Requirement: Two-tab interface with Simple and Advanced views

The configurator page SHALL provide a tabbed interface with two views: Simple
(domain-level toggles) and Advanced (per-tool toggle table). Both views SHALL
operate on shared state.

#### Scenario: Tabs are present and switchable

- **GIVEN** the configurator is open
- **WHEN** the user views the tool configuration section
- **THEN** a "Simple" tab and an "Advanced" tab are clearly visible
- **AND** clicking a tab switches the visible content to that view
- **AND** both views reflect the same underlying toggle state

#### Scenario: Toggling a domain OFF in Simple greys out the domain in Advanced

- **GIVEN** the Documents toggle is ON in both Simple and Advanced views
- **WHEN** the user switches Documents OFF in the Simple tab
- **AND** switches to the Advanced tab
- **THEN** the Documents category row in Advanced is dimmed (reduced opacity)
- **AND** all individual tool toggles within Documents are visually OFF
- **AND** interacting with individual tool toggles within a disabled domain
  is blocked while the domain is OFF

#### Scenario: Re-enabling a domain restores per-tool overrides

- **GIVEN** the Documents domain was ON with `niftypm_update_document`
  toggled OFF in Advanced
- **WHEN** the user turns Documents OFF in Simple, then turns it back ON
- **AND** switches to the Advanced tab
- **THEN** the Documents category row is no longer dimmed
- **AND** `niftypm_update_document` remains OFF (per-tool override is
  preserved)
- **AND** all other document tools return to ON

### Requirement: Per-tool toggle table in Advanced tab

The Advanced tab SHALL render a table grouped by tool domain. Each row SHALL
display the tool name, a human-readable description, and an individual on/off
toggle. Tools within a disabled domain SHALL appear dimmed.

#### Scenario: Table is rendered dynamically from the tool inventory

- **GIVEN** the Advanced tab is active
- **WHEN** the page renders
- **THEN** the table is built by `script.js` from the `TOOL_DOMAINS` data
  structure
- **AND** each domain appears as a labelled section
- **AND** each tool appears as a row with name, description, and toggle

#### Scenario: Individual tool can be toggled independently

- **GIVEN** the Documents domain is ON in the Advanced tab
- **WHEN** the user switches `niftypm_update_document` OFF
- **THEN** only that tool row is dimmed
- **AND** other document tools remain ON
- **AND** the Simple tab shows Documents as ON (the domain remains enabled)

#### Scenario: All tools in a table include descriptions

- **GIVEN** the Advanced tab is active
- **WHEN** the user views any tool row
- **THEN** the description column contains a human-readable sentence
  describing what the tool does

### Requirement: Shared state between Simple and Advanced tabs

The UI SHALL maintain a single state object (`state.domains` and
`state.disabledTools`) that both tabs read from and write to. State changes
in one tab SHALL immediately be reflected in the other.

#### Scenario: Domain toggle propagates from Simple to Advanced

- **GIVEN** both tabs are rendered
- **WHEN** the user toggles a domain in the Simple tab
- **THEN** that domain's category in the Advanced tab updates without a page
  reload

#### Scenario: Per-tool toggle propagates from Advanced to Simple

- **GIVEN** the Documents domain was ON with all tools ON
- **WHEN** the user disables one or more individual tools in the Advanced tab
- **THEN** the Simple tab still shows Documents as ON (the domain itself
  remains enabled)

### Requirement: script.js as dynamic rendering engine

The configurator SHALL include `ui/script.js` as the dynamic engine that holds
the tool inventory, manages shared state, renders both tabs' DOM, and
generates the `.env` output. The HTML file SHALL be a skeleton with minimal
static markup.

#### Scenario: Inventory is defined in script.js

- **GIVEN** `ui/script.js` is loaded
- **WHEN** the script initialises
- **THEN** it defines a `TOOL_DOMAINS` array with 20 entries
- **AND** each entry contains the domain `id`, `label`, `envKey`, and an array
  of tool objects with `name` and `description`

#### Scenario: DOM is rendered by script.js

- **GIVEN** the HTML contains empty container elements with IDs
- **WHEN** `script.js` runs
- **THEN** it populates the Simple tab container with domain-level toggles
- **AND** populates the Advanced tab container with the per-tool table
- **AND** attaches event listeners for all toggle interactions
