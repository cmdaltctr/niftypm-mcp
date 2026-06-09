/**
 * Unit tests for NiftyPMClient
 * Verifies HTTP method construction, URL building, and auth headers
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NiftyPMClient } from "../src/client.js";
import type { NiftyPMConfig } from "../src/config.js";

const allToolsEnabled: NiftyPMConfig["enabledTools"] = {
  files: true,
  labels: true,
  documents: true,
  milestones: true,
  messages: true,
  taskGroups: true,
  tasks: true,
  subTeams: true,
  projects: true,
  folders: true,
  members: true,
  webhooks: true,
  time: true,
  fields: true,
  apps: true,
  chat: true,
  invite: true,
  templates: true,
  users: true,
  auth: true,
};

function createMockConfig(overrides: Partial<NiftyPMConfig> = {}): NiftyPMConfig {
  return {
    clientId: "test-client-id",
    clientSecret: "test-client-secret",
    accessToken: "test-access-token",
    refreshToken: "test-refresh-token",
    baseUrl: "https://openapi.niftypm.com",
    enabledTools: allToolsEnabled,
    ...overrides,
  };
}

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

describe("NiftyPMClient", () => {
  let client: NiftyPMClient;
  let config: NiftyPMConfig;

  beforeEach(() => {
    config = createMockConfig();
    client = new NiftyPMClient(config);
    vi.restoreAllMocks();
  });

  describe("request", () => {
    it("should construct the correct URL from baseUrl + endpoint", async () => {
      const mockResponse = { data: "test" };
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      await client.request("/api/v1.0/tasks");

      const callArgs = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(callArgs[0]).toBe("https://openapi.niftypm.com/api/v1.0/tasks");
      expect(callArgs[1]).toHaveProperty("headers");
    });

    it("should include Bearer token in Authorization header", async () => {
      const mockResponse = { data: "test" };
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      await client.request("/api/v1.0/tasks");

      const callArgs = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      const headers = callArgs[1].headers as Headers;
      expect(headers.get("Authorization")).toBe("Bearer test-access-token");
    });

    it("should set Content-Type to application/json", async () => {
      const mockResponse = { data: "test" };
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      await client.request("/api/v1.0/tasks");

      const callArgs = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      const headers = callArgs[1].headers as Headers;
      expect(headers.get("Content-Type")).toBe("application/json");
    });

    it("should throw on non-OK response with status code and body", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response("Not Found", { status: 404, statusText: "Not Found" })
      );

      await expect(client.request("/api/v1.0/tasks")).rejects.toThrow(
        "NiftyPM API error (404): Not Found"
      );
    });

    it("should throw on 500 server error", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response("Internal Server Error", { status: 500, statusText: "Internal Server Error" })
      );

      await expect(client.request("/api/v1.0/tasks")).rejects.toThrow(
        "NiftyPM API error (500): Internal Server Error"
      );
    });

    it("should throw on 401 unauthorized (refresh attempt fails too)", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response("Unauthorized", { status: 401, statusText: "Unauthorized" })
      );

      await expect(client.request("/api/v1.0/tasks")).rejects.toThrow(
        "Token refresh failed (401): Unauthorized"
      );
    });

    it("should refresh the access token on 401 and retry once", async () => {
      const mockResponse = { data: "retry-success" };
      const fetchMock = vi.spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(
          new Response("Unauthorized", { status: 401, statusText: "Unauthorized" })
        )
        .mockResolvedValueOnce(
          jsonResponse({
            access_token: "new-access-token",
            refresh_token: "new-refresh-token",
          })
        )
        .mockResolvedValueOnce(jsonResponse(mockResponse));

      const result = await client.request("/api/v1.0/tasks");

      expect(result).toEqual(mockResponse);
      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect(fetchMock.mock.calls[1][0]).toBe("https://openapi.niftypm.com/oauth/token");
      expect(JSON.parse(fetchMock.mock.calls[1][1]?.body as string)).toEqual({
        grant_type: "refresh_token",
        refresh_token: "test-refresh-token",
      });
      const retryHeaders = fetchMock.mock.calls[2][1]?.headers as Headers;
      expect(retryHeaders.get("Authorization")).toBe("Bearer new-access-token");
      expect(config.accessToken).toBe("new-access-token");
      expect(config.refreshToken).toBe("new-refresh-token");
    });

    it("should throw the refresh error when token refresh returns non-2xx", async () => {
      const fetchMock = vi.spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(
          new Response("Unauthorized", { status: 401, statusText: "Unauthorized" })
        )
        .mockResolvedValueOnce(
          jsonResponse({ error: "invalid_grant" }, { status: 400, statusText: "Bad Request" })
        );

      await expect(client.request("/api/v1.0/tasks")).rejects.toThrow(
        "Token refresh failed (400): invalid_grant"
      );
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("should not refresh on 401 when caller supplies Authorization header", async () => {
      const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response("Unauthorized", { status: 401, statusText: "Unauthorized" })
      );

      await expect(
        client.request("/api/v1.0/tasks", {
          headers: { Authorization: "Basic custom-token" },
        })
      ).rejects.toThrow("NiftyPM API error (401): Unauthorized");

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const headers = fetchMock.mock.calls[0][1]?.headers as Headers;
      expect(headers.get("Authorization")).toBe("Basic custom-token");
    });
  });

  describe("get", () => {
    it("should make a GET request to the correct endpoint", async () => {
      const mockResponse = [{ id: "1", name: "Task 1" }];
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      const result = await client.get("/api/v1.0/tasks");

      expect(result).toEqual(mockResponse);
      const callArgs = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(callArgs[1].method).toBe("GET");
    });

    it("should append query parameters for non-undefined values", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      await client.get("/api/v1.0/tasks", {
        project_id: "proj-123",
        limit: 10,
        offset: 0,
      });

      const callArgs = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      const calledUrl = callArgs[0] as string;
      expect(calledUrl).toContain("project_id=proj-123");
      expect(calledUrl).toContain("limit=10");
      expect(calledUrl).toContain("offset=0");
    });

    it("should skip undefined and null query parameters", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      await client.get("/api/v1.0/tasks", {
        project_id: "proj-123",
        member_id: undefined,
        milestone_id: null,
      });

      const callArgs = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      const calledUrl = callArgs[0] as string;
      expect(calledUrl).toContain("project_id=proj-123");
      expect(calledUrl).not.toContain("member_id");
      expect(calledUrl).not.toContain("milestone_id");
    });
  });

  describe("post", () => {
    it("should make a POST request with JSON body", async () => {
      const mockResponse = { id: "1", name: "New Task" };
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      const body = { name: "New Task", task_group_id: "tg-1" };
      const result = await client.post("/api/v1.0/tasks", body);

      expect(result).toEqual(mockResponse);
      const callArgs = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(callArgs[1].method).toBe("POST");
      expect(callArgs[1].body).toBe(JSON.stringify(body));
    });

    it("should make a POST request without body", async () => {
      const mockResponse = { success: true };
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      const result = await client.post("/api/v1.0/tasks/1/archive");

      expect(result).toEqual(mockResponse);
      const callArgs = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(callArgs[1].method).toBe("POST");
      expect(callArgs[1].body).toBeUndefined();
    });
  });

  describe("formUpload", () => {
    it("should make a multipart POST request without setting Content-Type", async () => {
      const mockResponse = { files: [{ id: "file-1" }] };
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      const formData = new FormData();
      formData.append("files", new Blob(["hello"], { type: "text/plain" }), "hello.txt");

      const result = await client.formUpload("/api/v1.0/files", formData, {
        project_id: "proj-1",
        task_id: undefined,
      });

      expect(result).toEqual(mockResponse);
      const callArgs = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(callArgs[0]).toBe("https://openapi.niftypm.com/api/v1.0/files?project_id=proj-1");
      expect(callArgs[1].method).toBe("POST");
      expect(callArgs[1].body).toBe(formData);
      const headers = callArgs[1].headers as Headers;
      expect(headers.get("Authorization")).toBe("Bearer test-access-token");
      expect(headers.has("Content-Type")).toBe(false);
    });

    it("should refresh the access token on multipart 401 and retry once", async () => {
      const mockResponse = { files: [{ id: "file-1" }] };
      const fetchMock = vi.spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(
          new Response("Unauthorized", { status: 401, statusText: "Unauthorized" })
        )
        .mockResolvedValueOnce(
          jsonResponse({
            access_token: "new-upload-token",
            refresh_token: "new-upload-refresh-token",
          })
        )
        .mockResolvedValueOnce(jsonResponse(mockResponse));

      const formData = new FormData();
      formData.append("files", new Blob(["hello"], { type: "text/plain" }), "hello.txt");

      const result = await client.formUpload("/api/v1.0/files", formData);

      expect(result).toEqual(mockResponse);
      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect(fetchMock.mock.calls[1][0]).toBe("https://openapi.niftypm.com/oauth/token");
      const retryHeaders = fetchMock.mock.calls[2][1]?.headers as Headers;
      expect(retryHeaders.get("Authorization")).toBe("Bearer new-upload-token");
      expect(retryHeaders.has("Content-Type")).toBe(false);
      expect(config.accessToken).toBe("new-upload-token");
      expect(config.refreshToken).toBe("new-upload-refresh-token");
    });
  });

  describe("put", () => {
    it("should make a PUT request with JSON body", async () => {
      const mockResponse = { id: "1", name: "Updated Task" };
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      const body = { name: "Updated Task" };
      const result = await client.put("/api/v1.0/tasks/1", body);

      expect(result).toEqual(mockResponse);
      const callArgs = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(callArgs[1].method).toBe("PUT");
      expect(callArgs[1].body).toBe(JSON.stringify(body));
    });

    it("should make a PUT request without body", async () => {
      const mockResponse = { success: true };
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      await client.put("/api/v1.0/tasks/1");

      const callArgs = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(callArgs[1].method).toBe("PUT");
      expect(callArgs[1].body).toBeUndefined();
    });
  });

  describe("delete", () => {
    it("should make a DELETE request", async () => {
      const mockResponse = { success: true };
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      const result = await client.delete("/api/v1.0/tasks/1");

      expect(result).toEqual(mockResponse);
      const callArgs = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(callArgs[1].method).toBe("DELETE");
    });
  });
});
