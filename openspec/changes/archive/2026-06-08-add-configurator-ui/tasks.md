# Tasks: NiftyPM Configurator UI

## Phase 1 — Scaffold

- [x] Create `ui/` directory at the project root.
- [x] Create `ui/index.html` with semantic markup: heading, intro note
      ("runs entirely in your browser, no data is sent anywhere"), credentials
      section, toggles section, download button, placement/restart guidance.

## Phase 2 — Credentials

- [x] Add four labelled inputs: Client ID (`text`), Client Secret
      (`password`), Access Token (`password`), Refresh Token (`password`).
- [x] Add a show/hide control for each masked field.
- [x] Map each input to its env var: `NIFTYPM_CLIENT_ID`,
      `NIFTYPM_CLIENT_SECRET`, `NIFTYPM_ACCESS_TOKEN`, `NIFTYPM_REFRESH_TOKEN`.

## Phase 3 — Tool toggles

- [x] Hardcode the 20-domain → env-var mapping table (see design.md). Do NOT
      derive env names by case conversion — `ENABLE_TASK_GROUPS` and
      `ENABLE_SUBTEAMS` are irregular.
- [x] Render 20 labelled toggle switches, all defaulting to ON.
- [x] Group toggles logically (e.g. core vs extended domains) for readability.

## Phase 4 — Generation & download

- [x] Implement `.env` text generation matching `.env.example` format exactly
      (header comments, four credential lines, blank line, 20 `ENABLE_*`
      lines).
- [x] Toggle ON → `=true`, OFF → `=false`.
- [x] Implement download via `Blob` + object URL + synthetic anchor click,
      filename `.env`.
- [x] Ensure no network request is made anywhere in the code path.

## Phase 5 — UX safeguards

- [x] Non-blocking warning if any credential field is empty at download time.
- [x] Placement/restart guidance shown near the download button, including
      "back up any existing `.env` first".
- [x] Confirm the page works opened via `file://` with no server.

## Phase 6 — Decide single-file vs split

- [x] If `index.html` stays under ~300 lines, keep inline `<style>` and
      `<script>`. Otherwise split into `ui/styles.css` and
      `ui/configurator.js`.

## Phase 7 — README updates (DEFERRED — separate editing session)

> These are captured here so the other session has the exact spec. Do NOT
> edit the README from this change unless asked.

- [x] Fix `NIFTYPM_REFRESH_TOKEN` description: replace "reserved for future
      auto-refresh" with "OAuth refresh token for automatic 401 recovery.
      Required for stable connections — without it, every token expiry forces
      manual re-authorisation." (Feature is implemented in
      `src/client.ts:33-86`.)
- [x] Add a short "How to obtain the refresh token" note: the
      `authorization_code` grant against
      `https://openapi.niftypm.com/oauth/token` returns both `access_token`
      and `refresh_token` (per `docs/api/api-openapi-source.json:82-90`).
- [x] Document the manual `.secrets/` option (four files: `client_id`,
      `client_secret`, `access_token`, `refresh_token`), noting the easiest
      path is the UI configurator generating a `.env` by copy-paste.
- [x] Add a short "Configurator UI" section pointing at `ui/index.html`.

## Phase 8 — Verification

- [x] Manually open `ui/index.html`, fill dummy credentials, toggle a few
      domains, download, and diff the result against `.env.example` to confirm
      format and variable-name correctness.
- [x] Confirm `ENABLE_TASK_GROUPS` and `ENABLE_SUBTEAMS` are emitted correctly.
- [x] Place the generated `.env`, restart the server, confirm disabled domains
      are not registered (cross-check against `test/index.test.ts` expectation
      pattern).

## Phase 9 — Pre-existing test fix (UNRELATED bug, captured so it isn't forgotten)

> Discovered while creating this change. NOT caused by the configurator UI.
> The mock `config` objects in `test/index.test.ts` only list 8 of the 20
> `enabledTools` domains, so they no longer satisfy the `NiftyPMConfig` type
> (added `projects`, `folders`, `members`, `webhooks`, `time`, `fields`,
> `apps`, `chat`, `invite`, `templates`, `users`, `auth` — 12 missing). This
> fails `tsc` / LSP at the two `new NiftyPMClient(config)` call sites.

- [x] `test/index.test.ts:81-90` — add the 12 missing `enabledTools` keys to
      the first mock config (all `true`).
- [x] `test/index.test.ts:122-131` — add the 12 missing `enabledTools` keys to
      the second mock config (set to `false` to match that test's intent, or
      whatever the test asserts).
- [x] Alternatively, build the mock from `loadConfig()` or a shared factory so
      the test cannot drift from the `NiftyPMConfig` type again.
- [x] Run `bun run build` (tsc) and the test suite to confirm both errors clear.

## Out of Scope (do not implement)

- Runtime hot-reload of toggles.
- Browser filesystem writes.
- Shell-script generation.
- `.secrets/` file generation from the UI.
