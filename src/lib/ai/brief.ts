import yaml from "js-yaml";
import { getDb } from "../db/client";
import { aiCallSerial } from "./cli";
import { BRIEF_PROMPT } from "./prompts";

export async function generateBrief(date: string = new Date().toISOString().slice(0, 10)): Promise<string> {
  const db = getDb();

  const projects = db.prepare(`
    SELECT p.path, p.name, p.lifecycle, p.intent, p.bet_level, p.north_star, p.weekly_goal,
           h.health_score, h.velocity_trend, h.zombie_risk, h.focus_area,
           sm.downloads, sm.mrr, sm.crashfree, sm.rating
    FROM projects p
    LEFT JOIN health_snapshots h ON h.project_path = p.path AND h.date = (SELECT MAX(date) FROM health_snapshots WHERE project_path = p.path)
    LEFT JOIN shipped_metrics sm ON sm.project_path = p.path AND sm.date = (SELECT MAX(date) FROM shipped_metrics WHERE project_path = p.path)
  `).all();

  const fleet = db.prepare(`
    SELECT
      SUM(CASE WHEN status='open' THEN 1 ELSE 0 END) AS open,
      SUM(CASE WHEN status='in_progress' THEN 1 ELSE 0 END) AS running,
      SUM(CASE WHEN status='awaiting_review' THEN 1 ELSE 0 END) AS awaitingReview
    FROM multica_issues
  `).get() as any;

  const snapshot = yaml.dump({ projects, fleet });
  const md = await aiCallSerial({ provider: "claude", prompt: BRIEF_PROMPT(snapshot) });

  db.prepare(`
    INSERT INTO briefs (date, markdown, generated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(date) DO UPDATE SET markdown=excluded.markdown, generated_at=excluded.generated_at
  `).run(date, md as unknown as string, new Date().toISOString());

  return md as unknown as string;
}
