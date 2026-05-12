import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { z } from "zod";
import yaml from "js-yaml";
import { aiCallSerial } from "./cli";
import { STATUS_AI_PROMPT } from "./prompts";
import { parseStatus } from "../status-md/parse";
import { serializeStatus } from "../status-md/serialize";
import type { AiSection, ProjectStatus } from "../status-md/types";
import { getDb } from "../db/client";

const responseSchema = z.object({
  velocityTrend: z.enum(["rising", "flat", "cooling"]),
  focusArea: z.string(),
  healthScore: z.number().min(0).max(10),
  zombieRisk: z.number().min(0).max(1),
  aiNotes: z.string(),
});

function observedData(projectPath: string): string {
  const db = getDb();
  const rows = db
    .prepare("SELECT date, commits, claude_sessions, hours, tokens_in, tokens_out FROM daily_activity WHERE project_path = ? ORDER BY date DESC LIMIT 28")
    .all(projectPath);
  return yaml.dump(rows);
}

function activity7d(projectPath: string) {
  const db = getDb();
  const since = new Date(Date.now() - 7 * 86400_000).toISOString().slice(0, 10);
  const r = db
    .prepare(`
      SELECT
        COALESCE(SUM(commits),0) AS commits,
        COALESCE(SUM(claude_sessions),0) AS claudeSessions,
        COALESCE(SUM(hours),0) AS hours,
        COALESCE(SUM(tokens_in),0) AS tokensIn,
        COALESCE(SUM(tokens_out),0) AS tokensOut
      FROM daily_activity WHERE project_path = ? AND date >= ?`)
    .get(projectPath, since) as any;
  return r;
}

export async function regenerateStatusAi(projectPath: string): Promise<void> {
  const statusPath = join(projectPath, "STATUS.md");
  let current: ProjectStatus;
  if (existsSync(statusPath)) {
    current = parseStatus(readFileSync(statusPath, "utf8"));
  } else {
    current = {
      projectName: projectPath.split("/").pop() ?? "Unknown",
      human: { intent: "unknown", lifecycle: "unknown", betLevel: null, northStar: "", weeklyGoal: "", externalBlock: "", notes: "" },
      ai: null,
    };
  }

  const humanBlock = yaml.dump({
    intent: current.human.intent,
    lifecycle: current.human.lifecycle,
    "bet-level": current.human.betLevel,
    "north-star": current.human.northStar,
    "weekly-goal": current.human.weeklyGoal,
    "external-block": current.human.externalBlock,
  });

  const observed = observedData(projectPath);
  const prompt = STATUS_AI_PROMPT(current.projectName, humanBlock, observed);

  const ai = await aiCallSerial({ provider: "claude", prompt, schema: responseSchema });
  const a7 = activity7d(projectPath);

  const newAi: AiSection = {
    lastUpdated: new Date().toISOString(),
    activity7d: {
      commits: a7.commits,
      claudeSessions: a7.claudeSessions,
      hours: a7.hours,
      tokensIn: a7.tokensIn,
      tokensOut: a7.tokensOut,
    },
    velocityTrend: ai.velocityTrend,
    focusArea: ai.focusArea,
    healthScore: ai.healthScore,
    zombieRisk: ai.zombieRisk,
    aiNotes: ai.aiNotes,
  };

  writeFileSync(statusPath, serializeStatus({ ...current, ai: newAi }));

  try {
    execSync(`git add STATUS.md && git commit -q -m "ai: status update $(date -u +%Y-%m-%dT%H:%MZ)"`, {
      cwd: projectPath, shell: "/bin/bash",
    });
  } catch {
    // ignore
  }

  getDb()
    .prepare("INSERT INTO health_snapshots (project_path, date, health_score, velocity_trend, zombie_risk, focus_area) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(project_path, date) DO UPDATE SET health_score=excluded.health_score, velocity_trend=excluded.velocity_trend, zombie_risk=excluded.zombie_risk, focus_area=excluded.focus_area")
    .run(projectPath, new Date().toISOString().slice(0, 10), ai.healthScore, ai.velocityTrend, ai.zombieRisk, ai.focusArea);
}
