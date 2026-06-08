/**
 * Tool registration tests for Auth
 * Verifies tool names, parameter schemas, endpoint mapping,
 * and token-redaction security.
 */

import { describe, it, expect, vi } from "vitest";
import { registerAuthTools } from "../../src/tools/auth.js";
import { createMockServer } from "../helpers.js";

describe("registerAuthTools", () => {
  const server = createMockServer();
  // Auth tool uses client.request() and client.getBasicAuthHeader() directly,
  // not the standard get/post/put/delete helpers.
  const client = {
    request: vi.fn().mockResolvedValue({ token_type: "Bearer", expires_in: 3600 }),
    getBasicAuthHeader: vi.fn().mockReturnValue("Basic dGVzdC1jbGllbnQ6dGVzdC1zZWNyZXQ="),
  };

  registerAuthTools(
    server as Parameters<typeof registerAuthTools>[0],
    client as unknown as Parameters<typeof registerAuthTools>[1],
  );

  it("should register 1 auth tool", () => {
    expect(server.addTool).toHaveBeenCalledTimes(1);
  });

  it("should register tools with correct names", () => {
    const names = server.getToolNames();
    expect(names).toContain("niftypm_refresh_token");
  });

  describe("niftypm_refresh_token", () => {
    const tool = server.getTool("niftypm_refresh_token")!;

    it("should call client.request with POST /oauth/token", async () => {
      await tool.execute({ refresh_token: "rt-123" });

      expect(client.request).toHaveBeenCalledWith("/oauth/token", {
        method: "POST",
        headers: {
          Authorization: client.getBasicAuthHeader(),
        },
        body: JSON.stringify({
          grant_type: "refresh_token",
          refresh_token: "rt-123",
        }),
      });
    });

    it("should redact access_token and refresh_token from response", async () => {
      client.request.mockResolvedValueOnce({
        access_token: "should-be-redacted",
        refresh_token: "should-be-redacted",
        token_type: "Bearer",
        expires_in: 3600,
      });

      const result = await tool.execute({ refresh_token: "rt-123" });
      const parsed = JSON.parse(result);

      expect(parsed.access_token).toBeUndefined();
      expect(parsed.refresh_token).toBeUndefined();
      expect(parsed.token_type).toBe("Bearer");
      expect(parsed.expires_in).toBe(3600);
    });
  });
});
