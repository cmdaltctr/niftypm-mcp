## 1. Config layer

- [x] 1.1 Add `apiToken: string` field to the `NiftyPMConfig` interface in `src/config.ts`
- [x] 1.2 Load `NIFTYPM_API_TOKEN` via `loadCredential("NIFTYPM_API_TOKEN", "api_token")` and include it in the `loadConfig()` return object
- [x] 1.3 Update `validateConfig` to branch: pass when `apiToken` is non-empty (ignore OAuth quartet); else require all four OAuth creds; else throw an error listing missing creds and naming `NIFTYPM_API_TOKEN` as the recommended option

## 2. Client auth selection and 401 handling

- [x] 2.1 Add a private `activeToken()` helper (or `isApiTokenMode` getter) on `NiftyPMClient` returning `this.config.apiToken || this.config.accessToken`
- [x] 2.2 In `request()`, replace `Bearer ${this.config.accessToken}` with `Bearer ${this.activeToken()}` for both the initial set and the post-refresh retry set
- [x] 2.3 In `request()`'s `401` branch, only refresh when `!isApiTokenMode && !hasCustomAuth`; when in API-token mode, throw the actionable error naming `NIFTYPM_API_TOKEN` and the NiftyPM token-management settings
- [x] 2.4 In `formUpload()`, apply the same `activeToken()` Bearer source and the same `401` branching (no refresh in API-token mode; actionable error instead)
- [x] 2.5 Update the internal-API auth helper (around `client.ts:293`) to use `activeToken()` so `api.niftypm.com` requests also accept the API token

## 3. Env example and secrets

- [x] 3.1 Add `NIFTYPM_API_TOKEN=your_nft_user_token_here` to `.env.example` with a comment marking it the recommended primary credential
- [x] 3.2 Add `.secrets/api_token` to the README's `.secrets/` option list

## 4. Documentation

- [x] 4.1 Update README "Configure" / "How to obtain the refresh token" section to introduce `NIFTYPM_API_TOKEN` as the primary, recommended credential; document that it must be Full access (or Custom with write actions) for this MCP; note the up-to-365-day expiry and revocation
- [x] 4.2 Update `docs/guides/configuration.md` credential table to add `NIFTYPM_API_TOKEN` (primary) and annotate the OAuth rows as fallback
- [x] 4.3 Add a short "Auth modes" subsection explaining primary (API token) vs fallback (OAuth) selection and the distinct 401 behaviour

## 5. Verification

- [x] 5.1 Write a unit test asserting `validateConfig` passes with only `apiToken` set (no OAuth creds) and fails when neither set is present
- [x] 5.2 Write a unit test asserting the client uses `apiToken` as the Bearer credential when present and does NOT call refresh on a mocked `401` (instead throws the actionable error)
- [x] 5.3 Write a unit test asserting the OAuth fallback path still refreshes on `401` when `apiToken` is absent (regression guard for existing behaviour)
- [x] 5.4 Manually verify against the live API: set `NIFTYPM_API_TOKEN` to the `nft_user_…` token, run `bun run src/index.ts` (or `bun run src/cli.ts niftypm_list_projects`), confirm a successful read
- [x] 5.5 Run the full existing test suite (`bun run test` or the project's test command) and confirm no regressions
