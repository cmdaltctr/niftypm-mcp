## Context

Today `src/config.ts` loads four OAuth secrets (`CLIENT_ID`, `CLIENT_SECRET`, `ACCESS_TOKEN`, `REFRESH_TOKEN`) plus an optional `teamToken`, and `src/client.ts` sends `accessToken` as the Bearer credential, refreshing it on `401` via the refresh token. Access tokens are short-lived JWTs (the one currently in `.secrets/access_token` is already expired — returns `401`), so the refresh path is load-bearing.

NiftyPM's official MCP issues personal access tokens (`nft_user_…`) from Settings → MCP & AI assistants → API tokens. Empirical probing (see proposal) confirms these tokens are accepted as Bearer credentials by both `openapi.niftypm.com` and `api.niftypm.com`, are long-lived (up to 365 days), revocable within ~1 minute, and scoped (Read-only / Full access / Custom). They have no refresh mechanism and none is needed.

See `proposal.md` for motivation; see `specs/api-auth/spec.md` for the behavioural contract.

## Goals / Non-Goals

**Goals:**
- Make `NIFTYPM_API_TOKEN` the primary credential with zero OAuth dependencies when present.
- Preserve the OAuth flow verbatim as a fallback so existing deployments keep working.
- Keep the change surgical: only `config.ts`, `client.ts`, env example, and docs.
- Never log any credential value.

**Non-Goals:**
- Removing the OAuth flow (kept as fallback).
- Token introspection / expiry detection (NiftyPM exposes no introspection endpoint; the token is opaque, not a JWT).
- Auto-rotation of the API token (manual rotate from the NiftyPM UI).
- Changing the `teamToken` requirement for checklist writes (independent of API auth).
- Changing the Cloudflare Worker entry point's `MCP_AUTH_SECRET` gating.

## Decisions

### Decision 1: Add `apiToken` to `NiftyPMConfig`; select Bearer source by presence
Extend `NiftyPMConfig` with `apiToken: string`. In `client.ts`, derive the active Bearer credential at request time: `this.config.apiToken || this.config.accessToken`. This keeps the selection in one place and avoids duplicating logic across `request`, `formUpload`, and the internal-API auth helper.

**Alternative considered**: A strategy abstraction (`AuthStrategy` interface with `ApiTokenStrategy` / `OAuthStrategy`). Rejected — it would be a phantom abstraction for a two-branch choice (Rule of Three not met) and would touch every call site. A single `activeToken()` getter on the client is enough.

### Decision 2: Gate refresh-on-401 on the OAuth mode only
Add a private `get isApiTokenMode(): boolean { return !!this.config.apiToken; }`. In the `401` branch of `request` and `formUpload`, refresh only when `!isApiTokenMode && !hasCustomAuth`. In API-token mode, throw an actionable error immediately:

```
NiftyPM API error (401): NIFTYPM_API_TOKEN was rejected. Rotate or revoke it
from NiftyPM Settings → MCP & AI assistants → API tokens, then update
NIFTYPM_API_TOKEN.
```

This error replaces the generic `statusText` throw only for the API-token-mode 401 case; all other non-OK responses keep the existing statusText-only behaviour (no upstream body leakage).

**Alternative considered**: Refresh-on-401 for both modes with a no-op refresh in API-token mode. Rejected — it would add a pointless code path and delay the error. Failing fast with guidance is better UX.

### Decision 3: `validateConfig` branches on which credential set is present
```
if (apiToken) → valid (ignore OAuth quartet)
else if (clientId && clientSecret && accessToken && refreshToken) → valid
else → throw listing missing credentials, naming NIFTYPM_API_TOKEN as recommended
```
The error message lists the actually-missing credentials of whichever set the user appears to be targeting. Heuristic: if any of the OAuth vars is set, list the missing OAuth ones; otherwise just point to `NIFTYPM_API_TOKEN`.

**Alternative considered**: Require `NIFTYPM_API_TOKEN` and make OAuth opt-in. Rejected as a breaking change — the proposal explicitly guarantees backward compatibility.

### Decision 4: Load order for `apiToken`
Follow the existing `loadCredential` pattern: env `NIFTYPM_API_TOKEN` first, then `.secrets/api_token` file fallback. No `.env` parsing change needed (the existing `loadEnvFile` already populates any `NIFTYPM_*` var).

### Decision 5: Diagnostic mode flag without leaking the token
Expose `config.apiToken ? "api-token" : "oauth"` as a mode string for startup logging. Never print the token. The existing client already avoids logging credentials; we extend that invariant to the new field.

## Risks / Trade-offs

- **[Risk] API token scope is Read-only by default** → If a user pastes a Read-only token, writes will fail with `403`. Mitigation: document in README that the token must be Full access (or Custom with the needed write actions) for this MCP, since it creates/updates/deletes across domains. The `401`-specific error does not cover `403`; a `403` will surface as the generic statusText error, which is acceptable.
- **[Risk] API token expiry (up to 365 days) is silent** → Unlike OAuth, there's no refresh to recover. Mitigation: the actionable `401` error tells the user exactly where to rotate. Document the expiry setting in README so users pick a sensible lifetime.
- **[Risk] Token leakage via the actionable error** → The error names the env var, not the token value. Consistent with the existing "statusText only, no upstream body" policy.
- **[Trade-off] Two auth code paths to maintain** → Accepted. The OAuth path is unchanged and frozen; the new path is a strict subset (no refresh). Complexity delta is small.

## Migration Plan

1. Ship the change (code + docs). No deployment action required for existing OAuth users.
2. For users who want to switch: generate a Full-access token in NiftyPM Settings → MCP & AI assistants → API tokens, set `NIFTYPM_API_TOKEN` (env or `.secrets/api_token`), and optionally remove the OAuth quartet.
3. Rollback: unset `NIFTYPM_API_TOKEN`; the server falls back to OAuth automatically. No code rollback needed.

## Open Questions

- None. The token's scope and expiry are user-controlled in the NiftyPM UI and documented; no further upstream information is available.
