import yaml from "js-yaml";
import type { ProjectStatus, HumanSection, AiSection } from "./types";

function humanToYaml(h: HumanSection): string {
  const obj: Record<string, any> = {
    intent: h.intent,
    lifecycle: h.lifecycle,
    "bet-level": h.betLevel,
    "north-star": h.northStar,
    "weekly-goal": h.weeklyGoal,
    "external-block": h.externalBlock,
  };
  if (h.multica) {
    obj.multica = {
      "workspace-id": h.multica.workspaceId,
      "project-id": h.multica.projectId,
    };
  }
  obj.notes = h.notes;
  return yaml.dump(obj, { lineWidth: 100, noRefs: true });
}

function aiToYaml(a: AiSection): string {
  const obj: Record<string, any> = {
    "last-updated": a.lastUpdated,
    "activity-7d": {
      commits: a.activity7d.commits,
      "claude-sessions": a.activity7d.claudeSessions,
      hours: a.activity7d.hours,
      "tokens-in": a.activity7d.tokensIn,
      "tokens-out": a.activity7d.tokensOut,
    },
    "velocity-trend": a.velocityTrend,
    "focus-area": a.focusArea,
    "health-score": a.healthScore,
  };
  if (a.shippedMetrics) {
    obj["shipped-metrics"] = {
      "downloads-7d": a.shippedMetrics.downloads7d,
      mrr: a.shippedMetrics.mrr,
      "crash-free-pct": a.shippedMetrics.crashFreePct,
      rating: a.shippedMetrics.rating,
    };
  }
  obj["zombie-risk"] = a.zombieRisk;
  obj["ai-notes"] = a.aiNotes;
  return yaml.dump(obj, { lineWidth: 100, noRefs: true });
}

export function serializeStatus(s: ProjectStatus): string {
  let out = `# ${s.projectName}\n\n## Human\n${humanToYaml(s.human)}`;
  if (s.ai) out += `\n## AI\n${aiToYaml(s.ai)}`;
  return out;
}
