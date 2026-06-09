/**
 * Tool registration tests for Time Tracking
 * Verifies tool names, parameter schemas, and endpoint mapping
 */

import { describe, it, expect } from "vitest";
import { registerTimeTools } from "../../src/tools/time.js";
import { createMockServer, createMockClient } from "../helpers.js";

describe("registerTimeTools", () => {
  const server = createMockServer();
  const client = createMockClient();

  registerTimeTools(
    server as Parameters<typeof registerTimeTools>[0],
    client as unknown as Parameters<typeof registerTimeTools>[1],
  );

  it("should register 2 time tools", () => {
    expect(server.addTool).toHaveBeenCalledTimes(2);
  });

  it("should register tools with correct names", () => {
    const names = server.getToolNames();
    expect(names).toContain("niftypm_get_time_report");
    expect(names).toContain("niftypm_get_time_duration");
  });

  describe("niftypm_get_time_report", () => {
    const tool = server.getTool("niftypm_get_time_report")!;

    it("should call GET /api/v1.0/time with params", async () => {
      await tool.execute({
        project_id: "proj-1",
        start_date: "2024-01-01",
        end_date: "2024-12-31",
      });

      expect(client.get).toHaveBeenCalledWith("/api/v1.0/time", {
        project_id: "proj-1",
        start_date: "2024-01-01",
        end_date: "2024-12-31",
      });
    });
  });

  describe("niftypm_get_time_duration", () => {
    const tool = server.getTool("niftypm_get_time_duration")!;

    it("should call GET /api/v1.0/time/duration with params", async () => {
      await tool.execute({ start: "2026-01-01", end: "2026-01-31", project_id: "proj-1", task_id: "task-1" });

      expect(client.get).toHaveBeenCalledWith("/api/v1.0/time/duration", {
        start: "2026-01-01",
        end: "2026-01-31",
        project_id: "proj-1",
        task_id: "task-1",
      });
    });
  });
});
