## Purpose

Defines how the server selects and applies credentials when authenticating to the NiftyPM API, covering the personal access token (primary) and OAuth 2.0 (fallback) modes plus their distinct 401-recovery behaviour.

## ADDED Requirements

### Requirement: Personal access token is the primary credential
The system SHALL accept a `NIFTYPM_API_TOKEN` environment variable (with `.secrets/api_token` file fallback) holding a NiftyPM personal access token. When `NIFTYPM_API_TOKEN` is non-empty, the system SHALL use it as the Bearer credential for every authenticated request to both `openapi.niftypm.com` and `api.niftypm.com`, and SHALL NOT consult the OAuth credentials (`NIFTYPM_CLIENT_ID`, `NIFTYPM_CLIENT_SECRET`, `NIFTYPM_ACCESS_TOKEN`, `NIFTYPM_REFRESH_TOKEN`).

#### Scenario: API token present overrides OAuth credentials
- **WHEN** `NIFTYPM_API_TOKEN` is set and OAuth credentials are also set
- **THEN** the system authenticates all requests with the API token and ignores the OAuth credentials entirely

#### Scenario: API token loaded from secrets file fallback
- **WHEN** `NIFTYPM_API_TOKEN` is unset but `.secrets/api_token` exists
- **THEN** the system reads the token from that file and uses it as the primary credential

#### Scenario: Caller-supplied Authorization header is kept
- **WHEN** a request supplies its own `Authorization` header
- **THEN** the system keeps that header and does not apply API-token or OAuth credential selection to the request

#### Scenario: API token used for internal API
- **WHEN** a request targets `api.niftypm.com` (internal base URL) and the API token is the active credential
- **THEN** the system sends the same API token as the Bearer credential for that request

### Requirement: OAuth flow is the fallback when no API token is configured
The system SHALL fall back to the OAuth 2.0 credential set only when `NIFTYPM_API_TOKEN` is absent. In fallback mode the system SHALL use `NIFTYPM_ACCESS_TOKEN` as the Bearer credential and SHALL refresh it via `NIFTYPM_REFRESH_TOKEN` on a `401` response, exactly as before this change.

#### Scenario: No API token falls back to OAuth
- **WHEN** `NIFTYPM_API_TOKEN` is absent and the OAuth quartet is configured
- **THEN** the system authenticates with `NIFTYPM_ACCESS_TOKEN` and performs refresh-on-401 using `NIFTYPM_REFRESH_TOKEN`

#### Scenario: Existing OAuth-only deployments unchanged
- **WHEN** a deployment has only the OAuth credentials configured (no API token)
- **THEN** all observable auth behaviour matches the pre-change behaviour

### Requirement: Validation requires the active credential set only
`validateConfig` SHALL accept a configuration as valid when either (a) `NIFTYPM_API_TOKEN` is non-empty, or (b) all four OAuth credentials (`CLIENT_ID`, `CLIENT_SECRET`, `ACCESS_TOKEN`, `REFRESH_TOKEN`) are non-empty. It SHALL reject a configuration missing both. When the API token is present, missing OAuth credentials SHALL NOT be reported as missing.

#### Scenario: API token alone is sufficient
- **WHEN** only `NIFTYPM_API_TOKEN` is set and all OAuth credentials are absent
- **THEN** `validateConfig` passes without error

#### Scenario: OAuth quartet alone is sufficient
- **WHEN** `NIFTYPM_API_TOKEN` is absent but all four OAuth credentials are set
- **THEN** `validateConfig` passes without error

#### Scenario: No credentials at all is rejected
- **WHEN** neither `NIFTYPM_API_TOKEN` nor the OAuth quartet is configured
- **THEN** `validateConfig` throws an error listing the missing credentials and pointing the user to `NIFTYPM_API_TOKEN` as the recommended option

### Requirement: No refresh attempt on API-token 401
When the active credential is the API token and a request receives a `401`, the system SHALL NOT attempt a token refresh (personal access tokens have no refresh mechanism). It SHALL fail the request with an error that names the API token as the problem and instructs the user to rotate or revoke it from NiftyPM Settings → MCP & AI assistants → API tokens. This applies to client-managed authentication only. A request with a caller-supplied `Authorization` header is excluded.

#### Scenario: 401 with API token surfaces actionable error
- **WHEN** a request authenticated with the API token receives a `401`
- **THEN** the system throws an error mentioning `NIFTYPM_API_TOKEN` and the NiftyPM token-management settings, without attempting any refresh request

#### Scenario: 401 with OAuth token still refreshes
- **WHEN** a request authenticated with the OAuth access token receives a `401` and a refresh token is configured
- **THEN** the system performs the refresh-token exchange and retries the request once, matching the pre-change behaviour

### Requirement: Token source is observable for diagnostics
The system SHALL expose a boolean indicating whether the API token (primary) or OAuth (fallback) mode is active, so startup logs and error messages can identify which credential path is in use without printing the credential itself.

#### Scenario: Startup reflects active auth mode
- **WHEN** the server starts with the API token configured
- **THEN** the diagnostic/startup path identifies the active mode as the API token without logging the token value

#### Scenario: No credential value is logged
- **WHEN** the system logs auth-mode diagnostics or error messages
- **THEN** no credential value (API token, access token, refresh token, client secret) appears in the output
