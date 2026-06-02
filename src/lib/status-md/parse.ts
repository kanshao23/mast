import yaml from "js-yaml";
import type { ProjectStatus, HumanSection, AiSection, Intent } from "./types";

function extractSection(md: string, header: string): string | null {
  const re = new RegExp(`^##\\s+${header}\\s*$`, "m");
  const m = md.match(re);
  if (!m) return null;
  const start = (m.index ?? 0) + m[0].length;
  const rest = md.slice(start);
  const next = rest.match(/^##\s+/m);
  return (next ? rest.slice(0, next.index) : rest).trim();
}

function projectNameOf(md: string): string {
  const m = md.match(/^#\s+(.+?)\s*$/m);
  return m ? m[1].trim() : "Unknown";
}

function parseYaml(block: string): Record<string, any> {
  return (yaml.load(block) ?? {}) as Record<string, any>;
}

function toHuman(data: Record<string, any>): HumanSection {
  const intentMap: Record<string, Intent> = {
    "主力": "primary",
    "试验": "experiment",
    "维护": "maintenance",
    "僵尸候选": "zombie-candidate",
    "primary": "primary",
    "experiment": "experiment",
    "maintenance": "maintenance",
    "zombie-candidate": "zombie-candidate",
    "unknown": "unknown",
  };
  const intentRaw = (data.intent ?? "unknown") as string;
  const intent: Intent = intentMap[intentRaw] ?? "unknown";
  return {
    intent,
    lifecycle: (data.lifecycle ?? "unknown") as HumanSection["lifecycle"],
    betLevel: data["bet-level"] ?? null,
    northStar: data["north-star"] ?? "",
    weeklyGoal: data["weekly-goal"] ?? "",
    externalBlock: data["external-block"] ?? "",
    notes: data.notes ?? "",
    multica: data.multica
      ? {
          workspaceId: data.multica["workspace-id"],
          projectId: data.multica["project-id"],
        }
      : undefined,
  };
}

function toAi(data: Record<string, any>): AiSection {
  const a = data["activity-7d"] ?? {};
  const s = data["shipped-metrics"];
  return {
    lastUpdated: data["last-updated"],
    activity7d: {
      commits: a.commits ?? 0,
      claudeSessions: a["claude-sessions"] ?? 0,
      hours: a.hours ?? 0,
      tokensIn: a["tokens-in"] ?? 0,
      tokensOut: a["tokens-out"] ?? 0,
    },
    velocityTrend: data["velocity-trend"] ?? "flat",
    focusArea: data["focus-area"] ?? "",
    healthScore: data["health-score"] ?? 0,
    shippedMetrics: s
      ? {
          downloads7d: s["downloads-7d"] ?? 0,
          mrr: s.mrr ?? 0,
          crashFreePct: s["crash-free-pct"] ?? 0,
          rating: s.rating ?? 0,
        }
      : undefined,
    zombieRisk: data["zombie-risk"] ?? 0,
    aiNotes: data["ai-notes"] ?? "",
  };
}

export function parseStatus(md: string): ProjectStatus {
  const human = extractSection(md, "Human");
  const ai = extractSection(md, "AI");
  return {
    projectName: projectNameOf(md),
    human: human ? toHuman(parseYaml(human)) : ({} as HumanSection),
    ai: ai ? toAi(parseYaml(ai)) : null,
  };
}
