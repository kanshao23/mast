export type Lifecycle =
  | "ideation" | "building"
  | "shipped-growing" | "shipped-maintained"
  | "paused" | "archived";

export type Intent = "主力" | "试验" | "维护" | "僵尸候选" | "unknown";

export interface HumanSection {
  intent: Intent;
  lifecycle: Lifecycle | "unknown";
  betLevel: number | null;
  northStar: string;
  weeklyGoal: string;
  externalBlock: string;
  notes: string;
  multica?: { workspaceId: string; projectId: string };
}

export interface AiSection {
  lastUpdated: string;
  activity7d: {
    commits: number;
    claudeSessions: number;
    hours: number;
    tokensIn: number;
    tokensOut: number;
  };
  velocityTrend: "rising" | "flat" | "cooling";
  focusArea: string;
  healthScore: number;
  shippedMetrics?: {
    downloads7d: number;
    mrr: number;
    crashFreePct: number;
    rating: number;
  };
  zombieRisk: number;
  aiNotes: string;
}

export interface ProjectStatus {
  projectName: string;
  human: HumanSection;
  ai: AiSection | null;
}
