## Why

The current server authenticates to NiftyPM via a full OAuth 2.0 authorisation-code flow that requires four secrets (`NIFTYPM_CLIENT_ID`, `NIFTYPM_CLIENT_SECRET`, `NIFTYPM_ACCESS_TOKEN`, `NIFTYPM_REFRESH_TOKEN`) and a refresh-on-401 dance to survive access-token expiry. Access tokens are short-lived JWTs and expire frequently; when the refresh token itself expires or is revoked, the server dies until the user re-runs the entire OAuth handshake. NiftyPM now issues long-lived (up to 365 days), revocable, scoped personal access tokens (`nft_user_…`) for its official MCP server — and empirically these tokens are accepted directly as Bearer credentials by both `openapi.niftypm.com` and the internal `api.niftypm.com`. Adopting this token as the primary auth mode eliminates the refresh-token failure mode and reduces four secrets to one.

## What Changes

- Add a new `NIFTYPM_API_TOKEN` environment variable holding a NiftyPM personal access token (`nft_user_…`).
- Make the API token the **primary** authentication mode: when `NIFTYPM_API_TOKEN` is present, the client uses it as the Bearer credential for all requests and skips the OAuth refresh path entirely.
- Deprecate the OAuth flow to a **fallback**: only when `NIFTYPM_API_TOKEN` is absent do `NIFTYPM_CLIENT_ID` / `NIFTYPM_CLIENT_SECRET` / `NIFTYPM_ACCESS_TOKEN` / `NIFTYPM_REFRESH_TOKEN` get consulted, preserving backward compatibility for existing deployments.
- Adjust `validateConfig` so that the OAuth quartet is required **only** when no API token is configured; with an API token present, none of the OAuth secrets are required.
- On a `401` while using the API token, the client SHALL NOT attempt a refresh (there is no refresh mechanism for personal tokens); it SHALL surface a clear error instructing the user to rotate/revoke the token from NiftyPM Settings → MCP & AI assistants → API tokens.
- Update `.env.example`, README, and the configuration guide to document `NIFTYPM_API_TOKEN` as the recommended primary credential, with the OAuth flow retained as a fallback.
- **BREAKING**: none. Existing `.env`/`.secrets` setups without `NIFTYPM_API_TOKEN` continue to work unchanged via the OAuth fallback.

## Capabilities

### New Capabilities
- `api-auth`: Credential loading, selection between personal access token and OAuth modes, and authenticated request behaviour (including 401 handling per mode).

### Modified Capabilities
<!-- None. No existing spec describes auth/config behaviour, so there are no requirement deltas to existing capabilities. -->

## Impact

- **Code**: `src/config.ts` (new `apiToken` field, `loadCredential` wiring, `validateConfig` branching), `src/client.ts` (Bearer source selection, conditional refresh-on-401, clear error on API-token 401).
- **Config surface**: new `NIFTYPM_API_TOKEN` env var and `.secrets/api_token` file fallback; `.env.example` updated.
- **Docs**: README "Configure" / "How to obtain" sections, `docs/guides/configuration.md` credential table and refresh-token instructions.
- **Security**: reduces secret surface area (one long-lived token vs. four OAuth secrets); tokens are revocable from NiftyPM UI within ~1 minute. No change to the existing `teamToken` requirement for checklist writes (still independent).
- **Compatibility**: fully backward compatible — OAuth fallback preserved verbatim.
