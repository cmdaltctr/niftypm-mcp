/** Lock document content inputs to the published NiftyPM OpenAPI contract. */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { registerDocumentsTools } from "../src/tools/documents.js";
import { createMockClient, createMockServer } from "./helpers.js";

const api = JSON.parse(
  readFileSync(new URL("./fixtures/nifty-document-content-schemas.json", import.meta.url), "utf8"),
) as { requests: Record<string, { content: { type: string } }> };

const cases = [
  { name: "niftypm_create_document", method: "post", path: "/api/v1.0/docs",
    input: { name: "Report", project_id: "project-1" }, endpoint: "/api/v1.0/docs" },
  { name: "niftypm_create_personal_document", method: "post", path: "/api/v1.0/docs/personal",
    input: { title: "Report" }, endpoint: "/api/v1.0/docs/personal" },
  { name: "niftypm_update_document", method: "put", path: "/api/v1.0/docs/{document_id}",
    input: { document_id: "doc-1", title: "Report" }, endpoint: "/api/v1.0/docs/doc-1" },
] as const;

const content = {
  blocks: [{ text: "Aggregate results", attributes: { bold: true } }],
  metadata: { pages: 1123, approved: true, optional: null },
};

for (const scenario of cases) {
  describe(`${scenario.name} content contract`, () => {
    const server = createMockServer();
    const client = createMockClient();
    registerDocumentsTools(server, client as unknown as Parameters<typeof registerDocumentsTools>[1], []);
    const tool = server.getTool(scenario.name)!;

    it("advertises the same object type as the upstream API schema", () => {
      const upstreamContent = api.requests[`${scenario.method.toUpperCase()} ${scenario.path}`].content;
      const advertised = z.toJSONSchema(tool.parameters);
      expect(upstreamContent.type).toBe("object");
      expect(advertised.properties?.content?.type).toBe(upstreamContent.type);
    });

    it("validates structured content and forwards it without conversion", async () => {
      const parsed = tool.parameters.parse({ ...scenario.input, content });
      await tool.execute(parsed);
      const body = { ...scenario.input, content } as Record<string, unknown>;
      delete body.document_id;
      if (scenario.method === "post") {
        expect(client.post).toHaveBeenLastCalledWith(scenario.endpoint, body);
      } else {
        expect(client.put).toHaveBeenLastCalledWith(scenario.endpoint, body);
      }
    });

    it("keeps omitted optional content out of the request", async () => {
      const parsed = tool.parameters.parse(scenario.input);
      await tool.execute(parsed);
      const calls = scenario.method === "post" ? client.post.mock.calls : client.put.mock.calls;
      expect(calls.at(-1)![1]).not.toHaveProperty("content");
    });

    it.each(["plain Markdown", [], null, 42, true])("rejects non-object content %j", (invalid) => {
      expect(tool.parameters.safeParse({ ...scenario.input, content: invalid }).success).toBe(false);
    });
  });
}
