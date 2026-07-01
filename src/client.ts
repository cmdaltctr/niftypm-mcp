/**
 * NiftyPM API Client
 * Handles authentication and HTTP requests to the NiftyPM API.
 * Automatically refreshes the access token on 401 responses
 * using the stored refresh token (in-memory only — does not
 * persist the new token to disk or env).
 */

import type { NiftyPMConfig } from "./config.js";

export interface MutationEntry {
  method: string;
  endpoint: string;
  baseUrl?: string;
  requestBody?: any;
  responseBody?: any;
}

export class NiftyPMClient {
  private config: NiftyPMConfig;

  /** Prevent concurrent refresh attempts. */
  private refreshPromise: Promise<void> | null = null;

  /** Optional callback fired after successful POST/PUT/DELETE. */
  onMutation?: (entry: MutationEntry) => void | Promise<void>;

  constructor(config: NiftyPMConfig) {
    this.config = config;
  }

  /**
   * Generate Basic authentication header for token endpoints
   */
  getBasicAuthHeader(): string {
    return `Basic ${Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString("base64")}`;
  }

  /**
   * Refresh the access token using the stored refresh token.
   * Mutates this.config.accessToken on success.
   * Returns early if no refresh token is configured.
   */
  async refreshAccessToken(): Promise<void> {
    if (!this.config.refreshToken) {
      return;
    }

    // If a refresh is already in-flight, wait for it instead of
    // firing a duplicate request.
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this._doRefresh();
    try {
      await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async _doRefresh(): Promise<void> {
    const response = await fetch(`${this.config.baseUrl}/oauth/token`, {
      method: "POST",
      headers: {
        Authorization: this.getBasicAuthHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        grant_type: "refresh_token",
        refresh_token: this.config.refreshToken,
      }),
    });

    if (!response.ok) {
      let errorMessage = response.statusText;
      try {
        const err = (await response.json()) as any;
        errorMessage = err.message || err.error || response.statusText;
      } catch {
        /* fall back to statusText */
      }
      throw new Error(`Token refresh failed (${response.status}): ${errorMessage}`);
    }

    const data = (await response.json()) as {
      access_token: string;
      refresh_token?: string;
    };

    // Mutate the in-memory config so subsequent requests use the new token.
    this.config.accessToken = data.access_token;
    if (data.refresh_token) {
      this.config.refreshToken = data.refresh_token;
    }
  }

  /**
   * Make an authenticated request to the NiftyPM API.
   * Automatically refreshes the access token on 401 and retries
   * the request once, provided the request used the default Bearer
   * token (not a caller-supplied Authorization header).
   */
  async request<T>(endpoint: string, options: RequestInit = {}, baseUrl?: string): Promise<T> {
    const url = `${baseUrl || this.config.baseUrl}${endpoint}`;

    const headers = new Headers(options.headers);
    const hasCustomAuth = headers.has("Authorization");
    if (!hasCustomAuth) {
      headers.set("Authorization", `Bearer ${this.config.accessToken}`);
    }
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    // Reuse the same request init across retry attempts.
    const requestInit: RequestInit = { ...options, headers };

    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await fetch(url, requestInit);

      // On first 401 with default Bearer auth, refresh and retry.
      if (response.status === 401 && !hasCustomAuth && attempt === 0) {
        await this.refreshAccessToken();
        headers.set("Authorization", `Bearer ${this.config.accessToken}`);
        continue; // retry with fresh token
      }

      if (!response.ok) {
        // Use statusText only to avoid leaking upstream error bodies
        // (which could contain tokens) into logs or LLM context.
        throw new Error(`NiftyPM API error (${response.status}): ${response.statusText}`);
      }

      // 204 No Content — no body to parse
      if (response.status === 204) {
        this.fireMutation(options.method, endpoint, baseUrl, options.body);
        return {} as T;
      }

      const result = (await response.json()) as T;
      this.fireMutation(options.method, endpoint, baseUrl, options.body, result);
      return result;
    }

    // Should never be reached — the loop always returns or throws.
    throw new Error("NiftyPM API error: unexpected request state");
  }

  /**
   * Fire onMutation callback for POST/PUT/DELETE if set.
   * Errors are caught and logged to stderr — never propagate.
   */
  private fireMutation(
    method: string | undefined,
    endpoint: string,
    baseUrl?: string,
    requestBody?: BodyInit | null,
    responseBody?: any,
  ): void {
    if (!this.onMutation) return;
    const upper = (method || "GET").toUpperCase();
    if (upper === "GET") return;

    let parsedBody: any = undefined;
    if (requestBody && typeof requestBody === "string") {
      try {
        parsedBody = JSON.parse(requestBody);
      } catch {
        /* not JSON */
      }
    }

    try {
      this.onMutation({
        method: upper,
        endpoint,
        baseUrl,
        requestBody: parsedBody,
        responseBody,
      });
    } catch (err) {
      console.error("[local-sync] onMutation error:", err);
    }
  }

  /**
   * POST multipart form data to the NiftyPM API.
   *
   * Do not set Content-Type here: fetch/FormData must generate the
   * multipart boundary for both Node 18+ and Cloudflare Workers runtimes.
   */
  async formUpload<T>(
    endpoint: string,
    formData: FormData,
    params?: Record<string, any>,
  ): Promise<T> {
    const url = new URL(`${this.config.baseUrl}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const headers = new Headers({
      Authorization: `Bearer ${this.config.accessToken}`,
    });

    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await fetch(url.toString(), {
        method: "POST",
        headers,
        body: formData,
      });

      if (response.status === 401 && attempt === 0) {
        await this.refreshAccessToken();
        headers.set("Authorization", `Bearer ${this.config.accessToken}`);
        continue;
      }

      if (!response.ok) {
        throw new Error(`NiftyPM API error (${response.status}): ${response.statusText}`);
      }

      const result = (await response.json()) as T;
      this.fireMutation("POST", endpoint, undefined, undefined, result);
      return result;
    }

    throw new Error("NiftyPM API error: unexpected upload request state");
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const url = new URL(`${this.config.baseUrl}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    return this.request<T>(url.pathname + url.search, { method: "GET" });
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, options?: { body?: any }): Promise<T> {
    return this.request<T>(endpoint, {
      method: "DELETE",
      body: options?.body ? JSON.stringify(options.body) : undefined,
    });
  }

  // ── Internal API (api.niftypm.com) ─────────────────────────────────
  // Checklist endpoints live on a different base URL than the public
  // OpenAPI spec. These methods mirror get/post/put/delete but target
  // config.internalBaseUrl. Write operations require the teamToken
  // (from the web app's nifty_auth cookie), not the OAuth access_token.
  // See docs/api/checklist-api-discovery.md.

  private internalAuthHeaders(): HeadersInit {
    // Use teamToken if available; fall back to accessToken for reads.
    const token = this.config.teamToken || this.config.accessToken;
    return { Authorization: `Bearer ${token}` };
  }

  async internalGet<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const url = new URL(`${this.config.internalBaseUrl}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }
    return this.request<T>(
      url.pathname + url.search,
      {
        method: "GET",
        headers: this.internalAuthHeaders(),
      },
      this.config.internalBaseUrl,
    );
  }

  async internalPost<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: "POST",
        headers: this.internalAuthHeaders(),
        body: body ? JSON.stringify(body) : undefined,
      },
      this.config.internalBaseUrl,
    );
  }

  async internalPut<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: "PUT",
        headers: this.internalAuthHeaders(),
        body: body ? JSON.stringify(body) : undefined,
      },
      this.config.internalBaseUrl,
    );
  }

  async internalDelete<T>(endpoint: string): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: "DELETE",
        headers: this.internalAuthHeaders(),
      },
      this.config.internalBaseUrl,
    );
  }
}
