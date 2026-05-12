import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { aggregateClaudeFile } from "../src/lib/ingest/claude-logs";

describe("aggregateClaudeFile", () => {
  it("sums tokens and counts session as 1 file", () => {
    const result = aggregateClaudeFile(join(__dirname, "fixtures/sample-claude.jsonl"));
    expect(result.sessionCount).toBe(1);
    expect(result.tokensIn).toBeGreaterThan(0);
    expect(Object.keys(result.byDate).length).toBeGreaterThan(0);
  });
});
