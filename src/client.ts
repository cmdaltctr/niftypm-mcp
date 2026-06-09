/**
 * NiftyPM API Client
 * Handles authentication and HTTP requests to the NiftyPM API.
 * Automatically refreshes the access token on 401 responses
 * using the stored refresh token (in-memory only — does not
 * persist the new token to disk or env).
 */

import type { NiftyPMConfig } from "./config.js";

export class NiftyPMClient {
  private config: NiftyPMConfig;

  /** Prevent concurrent refresh attempts. */
  private refreshPromise: Promise<void> | null = null;

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
      } catch { /* fall back to statusText */ }
      throw new Error(
        `Token refresh failed (${response.status}): ${errorMessage}`
      );
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
  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;
    
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
        headers.set(
          "Authorization",
          `Bearer ${this.config.accessToken}`
        );
        continue; // retry with fresh token
      }

      if (!response.ok) {
        // Use statusText only to avoid leaking upstream error bodies
        // (which could contain tokens) into logs or LLM context.
        throw new Error(
          `NiftyPM API error (${response.status}): ${response.statusText}`
        );
      }

      return response.json() as Promise<T>;
    }

    // Should never be reached — the loop always returns or throws.
    throw new Error("NiftyPM API error: unexpected request state");
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
    params?: Record<string, any>
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
        throw new Error(
          `NiftyPM API error (${response.status}): ${response.statusText}`
        );
      }

      return response.json() as Promise<T>;
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
}
