/** Native-document read contracts through registered tools and the real HTTP client. */

import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { NiftyPMClient } from "../src/client.js";
import type { NiftyPMConfig } from "../src/config.js";
import { registerDocumentsTools } from "../src/tools/documents.js";
import { createMockServer } from "./helpers.js";

const metadataTool = "niftypm_get_document";
const contentTool = "niftypm_get_document_content";
const readTools = [metadataTool, contentTool];
const documentId = "Synthetic_doc!2";
const baseUrl = "https://document-regression.invalid";
const metadataPath = `/api/v3/documents/${documentId}`;
const contentPath = `${metadataPath}/content`;
const relations = [
  "project", "author", "parentDocument", "deletedBy", "createdByActor", "updatedByActor", "labels",
];

const metadata = {
  id: documentId,
  title: "Synthetic native document",
  editorVersion: 2,
  projectId: "Synthetic_project2",
  parentDocumentId: null,
  createdAt: "2026-01-02T03:04:05Z",
  updatedAt: "2026-02-03T04:05:06Z",
  createdByActor: { id: "Synthetic_actor", type: "user" },
  labels: [{ id: "Synthetic_label", name: "Synthetic label" }],
};

function configuration(mode: "api" | "oauth" = "api"): NiftyPMConfig {
  return {
    apiToken: mode === "api" ? "synthetic-personal-credential" : "",
    accessToken: "synthetic-oauth-credential",
    clientId: "synthetic-client",
    clientSecret: "synthetic-client-credential",
    refreshToken: "synthetic-refresh-credential",
    teamToken: "synthetic-team-credential",
    baseUrl,
    internalBaseUrl: "https://internal-document-regression.invalid",
    enabledTools: {
      files: false, labels: false, documents: true, milestones: false, messages: false,
      taskGroups: false, tasks: false, subTeams: false, projects: false, folders: false,
      members: false, webhooks: false, time: false, fields: false, apps: false, chat: false,
      invite: false, templates: false, users: false, auth: false, checklists: false,
    },
    disabledTools: [],
  };
}

function registered(disabledTools: string[] = [], mode: "api" | "oauth" = "api") {
  const server = createMockServer();
  const config = configuration(mode);
  const client = new NiftyPMClient(config);
  registerDocumentsTools(server, client, disabledTools);
  return { server, config };
}

function requireTool(server: ReturnType<typeof createMockServer>, name: string) {
  // Assert registration explicitly so the absent content tool gives a contract failure.
  expect(server.getToolNames(), `Missing registered document read tool: ${name}`).toContain(name);
  return server.getTool(name)!;
}

async function execute(server: ReturnType<typeof createMockServer>, name: string, input: unknown) {
  const tool = requireTool(server, name);
  return tool.execute(tool.parameters.parse(input));
}

function httpJson(body: unknown) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
    new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } }),
  );
}

function requestUrl(http: ReturnType<typeof httpJson>, index = 0) {
  return new URL(String(http.mock.calls[index][0]));
}

afterEach(() => vi.restoreAllMocks());

describe("registered native-document reads", () => {
  it("reads editorVersion 2 metadata through exactly one v3 GET, without a legacy or body request", async () => {
    const { server } = registered();
    const http = httpJson(metadata);
    const result = await execute(server, metadataTool, { document_id: documentId });

    expect(JSON.parse(result)).toEqual(metadata);
    expect(http.mock.calls.length).toBe(1);
    expect(requestUrl(http).href).toBe(`${baseUrl}${metadataPath}`);
    expect(http.mock.calls[0][1]?.method).toBe("GET");
  });

  it("returns camelCase metadata unchanged, including nested relations and null fields", async () => {
    const { server } = registered();
    httpJson(metadata);
    const result = JSON.parse(await execute(server, metadataTool, { document_id: documentId }));

    expect(result).toEqual(metadata);
    expect(result).not.toHaveProperty("editor_version");
    expect(result).not.toHaveProperty("project_id");
    expect(result).not.toHaveProperty("created_at");
  });

  it("omits expand when it is absent", async () => {
    const { server } = registered();
    const http = httpJson(metadata);
    await execute(server, metadataTool, { document_id: documentId });

    expect(requestUrl(http).search).toBe("");
    expect(http.mock.calls.length).toBe(1);
  });

  it.each([...relations.map((relation) => ({ expand: [relation] })), { expand: relations }])(
    "forwards documented expand $expand as one comma-separated query", async ({ expand }) => {
      const { server } = registered();
      const http = httpJson(metadata);
      await execute(server, metadataTool, { document_id: documentId, expand });

      expect(requestUrl(http).searchParams.getAll("expand")).toEqual([expand.join(",")]);
      expect([...requestUrl(http).searchParams.keys()]).toEqual(["expand"]);
      expect(http.mock.calls.length).toBe(1);
    },
  );

  it("omits expand when its array is empty", async () => {
    const { server } = registered();
    const http = httpJson(metadata);
    await execute(server, metadataTool, { document_id: documentId, expand: [] });
    expect(requestUrl(http).search).toBe("");
  });

  it.each([
    { expand: ["unknownRelation"] }, { expand: ["project", "unknownRelation"] },
    { expand: ["Project"] }, { expand: "project,author" }, { expand: null },
    { expand: ["project", 42] }, { expand: ["project", ""] },
  ])("rejects unsupported expand $expand before HTTP", async ({ expand }) => {
    const { server } = registered();
    const http = httpJson(metadata);
    requireTool(server, metadataTool);
    await expect(execute(server, metadataTool, { document_id: documentId, expand })).rejects.toThrow();
    expect(http.mock.calls.length).toBe(0);
  });

  it("registers the separate body-read tool by default", () => {
    const { server } = registered();
    requireTool(server, contentTool);
  });

  it.each([
    { truncated: false, lossy: false },
    { truncated: true, lossy: true },
    { truncated: true, lossy: false },
    { truncated: false, lossy: true },
  ])("preserves Markdown and byteSize with truncated=$truncated, lossy=$lossy", async (flags) => {
    const { server } = registered();
    const content = "# Synthetic body\n\nCafé £5.\n";
    const response = { format: "markdown", content, byteSize: Buffer.byteLength(content, "utf8"), ...flags };
    const http = httpJson(response);
    const result = await execute(server, contentTool, { document_id: documentId });

    expect(JSON.parse(result)).toEqual(response);
    expect(http.mock.calls.length).toBe(1);
    expect(requestUrl(http).href).toBe(`${baseUrl}${contentPath}`);
    expect(http.mock.calls[0][1]?.method).toBe("GET");
  });
});

describe.each(readTools)("%s published document_id constraint", (name) => {
  it("advertises a nonempty path constraint excluding hyphens", () => {
    const { server } = registered();
    const schema = z.toJSONSchema(requireTool(server, name).parameters) as {
      properties: { document_id: { type: string; pattern: string } };
      required: string[];
    };
    expect(schema.required).toContain("document_id");
    expect(schema.properties.document_id.type).toBe("string");
    expect(typeof schema.properties.document_id.pattern).toBe("string");
    const pattern = new RegExp(schema.properties.document_id.pattern);
    expect(pattern.test("09AZaz_!")).toBe(true);
    expect(pattern.test("")).toBe(false);
    expect(pattern.test("doc-hyphen")).toBe(false);
  });

  it.each(["0", "A", "z", "_", "!", documentId])("accepts the published path characters in %s", async (id) => {
    const { server } = registered();
    const http = httpJson({ id });
    expect(JSON.parse(await execute(server, name, { document_id: id }))).toEqual({ id });
    expect(http.mock.calls.length).toBe(1);
  });

  it.each(["", "doc-hyphen", "doc/path", "doc%2Fpath", "doc?x=1", "doc#fragment", "doc.with.dot", "doc space", "dóc"])(
    "rejects invalid document_id %j before HTTP", async (id) => {
      const { server } = registered();
      const http = httpJson({});
      requireTool(server, name);
      await expect(execute(server, name, { document_id: id })).rejects.toThrow();
      expect(http.mock.calls.length).toBe(0);
    },
  );

  it.each([undefined, null, 42, [documentId]])("rejects a missing or non-string document_id %j before HTTP", async (id) => {
    const { server } = registered();
    const http = httpJson({});
    requireTool(server, name);
    await expect(execute(server, name, { document_id: id })).rejects.toThrow();
    expect(http.mock.calls.length).toBe(0);
  });
});

describe.each(readTools)("%s configured authentication and permission boundary", (name) => {
  it.each(["api", "oauth"] as const)("uses the configured %s Bearer credential", async (mode) => {
    const { server, config } = registered([], mode);
    const http = httpJson({ id: documentId });
    await execute(server, name, { document_id: documentId });

    const headers = new Headers(http.mock.calls[0][1]?.headers);
    // Compare booleans so a failed assertion cannot print credentials or headers.
    expect(headers.get("Authorization") === `Bearer ${config.apiToken || config.accessToken}`).toBe(true);
    expect(headers.has("Cookie")).toBe(false);
    expect(requestUrl(http).origin).toBe(baseUrl);
    expect(requestUrl(http).search).toBe("");
    expect(http.mock.calls.length).toBe(1);
  });

  it.each(["api", "oauth"] as const)("keeps a 403 private without any %s credential fallback", async (mode) => {
    const { server, config } = registered([], mode);
    requireTool(server, name);
    const upstreamBody = JSON.stringify({
      message: "synthetic-upstream-private-diagnostic",
      Authorization: `Bearer ${config.apiToken || config.accessToken}`,
      refreshToken: config.refreshToken,
      teamToken: config.teamToken,
      clientSecret: config.clientSecret,
    });
    const http = vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      new Response(upstreamBody, { status: 403, statusText: "Forbidden" }),
    );
    const error = await execute(server, name, { document_id: documentId }).catch((reason: unknown) => reason);

    expect(error instanceof Error).toBe(true);
    const diagnostic = String(error);
    const privateValues = [
      config.apiToken, config.accessToken, config.refreshToken, config.teamToken, config.clientSecret,
      "synthetic-upstream-private-diagnostic", "Authorization", upstreamBody,
    ].filter(Boolean);
    expect(privateValues.some((value) => diagnostic.includes(value))).toBe(false);
    expect(diagnostic.includes("403")).toBe(true);
    expect(diagnostic.includes("Forbidden")).toBe(true);
    expect(http.mock.calls.length).toBe(1);
    const headers = new Headers(http.mock.calls[0][1]?.headers);
    expect(headers.get("Authorization") === `Bearer ${config.apiToken || config.accessToken}`).toBe(true);
    expect(headers.has("Cookie")).toBe(false);
  });

  it("sends a denied read to the v3 route without any legacy retry", async () => {
    const { server } = registered();
    requireTool(server, name);
    const http = vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      new Response("synthetic-private-body", { status: 403, statusText: "Forbidden" }),
    );
    await expect(execute(server, name, { document_id: documentId })).rejects.toThrow("403");

    expect(http.mock.calls.length).toBe(1);
    const path = name === metadataTool ? metadataPath : contentPath;
    expect(requestUrl(http).href).toBe(`${baseUrl}${path}`);
    expect(http.mock.calls[0][1]?.method).toBe("GET");
  });
});

describe("individual document read controls", () => {
  it("omits a disabled content tool while metadata and existing document tools stay available", () => {
    const { server } = registered([contentTool]);
    expect(server.getToolNames()).not.toContain(contentTool);
    requireTool(server, metadataTool);
    requireTool(server, "niftypm_list_documents");
    requireTool(server, "niftypm_create_document");
    requireTool(server, "niftypm_update_document");
  });

  it("keeps content available when only metadata reads are disabled", () => {
    const { server } = registered([metadataTool]);
    expect(server.getToolNames()).not.toContain(metadataTool);
    requireTool(server, contentTool);
  });

  it("omits both read tools when both names are disabled", () => {
    const { server } = registered(readTools);
    expect(server.getToolNames()).not.toContain(metadataTool);
    expect(server.getToolNames()).not.toContain(contentTool);
    requireTool(server, "niftypm_list_documents");
  });
});
