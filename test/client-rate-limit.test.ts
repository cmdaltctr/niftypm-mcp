/**
 * A 429 error must show the Retry-After wait time, on both request paths
 * (request and formUpload). Other statuses keep the plain message.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NiftyPMClient } from "../src/client.js";
import type { NiftyPMConfig } from "../src/config.js";

function createConfig(): NiftyPMConfig {
  return {
    apiToken: "",
    clientId: "test-client-id",
    clientSecret: "test-client-secret",
    accessToken: "test-access-token",
    refreshToken: "test-refresh-token",
    baseUrl: "https://openapi.niftypm.com",
    enabledTools: {} as NiftyPMConfig["enabledTools"],
  };
}

function tooManyRequests(retryAfter?: string): Response {
  return new Response("Too Many Requests", {
    status: 429,
    statusText: "Too Many Requests",
    headers: retryAfter === undefined ? {} : { "Retry-After": retryAfter },
  });
}

const paths: Array<[string, (client: NiftyPMClient) => Promise<unknown>]> = [
  ["request", (client) => client.request("/api/v1.0/tasks/t1", { method: "PUT", body: "{}" })],
  ["formUpload", (client) => client.formUpload("/api/v1.0/files", new FormData())],
];

describe("429 rate-limit message", () => {
  let client: NiftyPMClient;

  beforeEach(() => {
    client = new NiftyPMClient(createConfig());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe.each(paths)("%s", (_name, call) => {
    it("includes the Retry-After seconds", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(tooManyRequests("600"));

      const error = await call(client).catch((e: Error) => e);

      expect(error).toBeInstanceOf(Error);
      const message = (error as Error).message;
      expect(message).toContain("NiftyPM API error (429): Too Many Requests");
      expect(message).toContain("retry after 600 seconds");
      expect(message).toContain("retrying sooner does not help");
    });

    it("shows an HTTP-date Retry-After as a date, not as seconds", async () => {
      const date = "Sat, 21 Nov 2026 12:10:00 GMT";
      vi.spyOn(globalThis, "fetch").mockResolvedValue(tooManyRequests(date));

      const error = await call(client).catch((e: Error) => e);

      const message = (error as Error).message;
      expect(message).toContain(`retry after ${date}`);
      expect(message).not.toContain(`${date} seconds`);
    });

    it("says the wait is unknown when Retry-After is missing", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(tooManyRequests());

      const error = await call(client).catch((e: Error) => e);

      expect(error).toBeInstanceOf(Error);
      const message = (error as Error).message;
      expect(message).toContain("NiftyPM API error (429): Too Many Requests");
      expect(message).toContain("wait time unknown");
      expect(message).toContain("at least 10 minutes");
      expect(message).not.toContain("retry after");
    });

    it("leaves other statuses unchanged", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response("boom", {
          status: 500,
          statusText: "Internal Server Error",
          headers: { "Retry-After": "600" },
        }),
      );

      await expect(call(client)).rejects.toThrow(/^NiftyPM API error \(500\): Internal Server Error$/);
    });
  });
});
