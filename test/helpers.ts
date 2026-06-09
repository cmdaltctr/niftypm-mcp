/**
 * Shared test helpers for tool registration tests
 * Provides mock server and mock client factories
 */

import { vi } from "vitest";

export interface MockTool {
  name: string;
  description: string;
  parameters: any;
  execute: (params: any) => Promise<string>;
}

/**
 * Creates a mock FastMCP server that captures tool registrations
 */
export function createMockServer() {
  const tools: MockTool[] = [];

  return {
    addTool: vi.fn((toolDef: MockTool) => {
      tools.push(toolDef);
    }),
    tools,
    getToolNames: () => tools.map((t) => t.name),
    getTool: (name: string) => tools.find((t) => t.name === name),
  };
}

/**
 * Creates a mock NiftyPMClient with spy methods
 */
export function createMockClient() {
  return {
    get: vi.fn().mockResolvedValue({ data: "mock-get-response" }),
    post: vi.fn().mockResolvedValue({ data: "mock-post-response" }),
    put: vi.fn().mockResolvedValue({ data: "mock-put-response" }),
    delete: vi.fn().mockResolvedValue({ data: "mock-delete-response" }),
    formUpload: vi.fn().mockResolvedValue({ data: "mock-upload-response" }),
  };
}
