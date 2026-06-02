import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseStatus } from "../src/lib/status-md/parse";
import { serializeStatus } from "../src/lib/status-md/serialize";

const SAMPLE = readFileSync(join(__dirname, "fixtures/sample-status.md"), "utf8");

describe("STATUS.md parse", () => {
  it("extracts project name", () => {
    const s = parseStatus(SAMPLE);
    expect(s.projectName).toBe("Hydrio AI");
  });

  it("parses human section", () => {
    const s = parseStatus(SAMPLE);
    expect(s.human.intent).toBe("primary");
    expect(s.human.lifecycle).toBe("shipped-growing");
    expect(s.human.betLevel).toBe(5);
    expect(s.human.northStar).toBe("30 天内冲到日活 500");
    expect(s.human.multica?.workspaceId).toBe("ws_abc");
  });

  it("parses AI section", () => {
    const s = parseStatus(SAMPLE);
    expect(s.ai?.activity7d.commits).toBe(12);
    expect(s.ai?.healthScore).toBe(7.5);
    expect(s.ai?.shippedMetrics?.mrr).toBe(312);
    expect(s.ai?.velocityTrend).toBe("rising");
  });

  it("returns null AI section when absent", () => {
    const noAi = SAMPLE.split("## AI")[0];
    const s = parseStatus(noAi);
    expect(s.ai).toBeNull();
  });

  it("maps legacy Chinese intent to English", () => {
    const md = "# X\n\n## Human\nintent: 主力\nlifecycle: building\n";
    const s = parseStatus(md);
    expect(s.human.intent).toBe("primary");
  });
});

describe("STATUS.md serialize", () => {
  it("roundtrips through parse", () => {
    const s = parseStatus(SAMPLE);
    const out = serializeStatus(s);
    const reparsed = parseStatus(out);
    expect(reparsed.human).toEqual(s.human);
    expect(reparsed.ai).toEqual(s.ai);
    expect(reparsed.projectName).toBe(s.projectName);
  });

  it("preserves human section when given new AI section", () => {
    const s = parseStatus(SAMPLE);
    const newAi = { ...s.ai!, healthScore: 9.0 };
    const out = serializeStatus({ ...s, ai: newAi });
    const reparsed = parseStatus(out);
    expect(reparsed.human).toEqual(s.human);
    expect(reparsed.ai?.healthScore).toBe(9.0);
  });
});
