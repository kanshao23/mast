import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { z } from "zod";
import yaml from "js-yaml";
import { aiCallSerial } from "./cli";
import { DRAFT_ISSUES_PROMPT } from "./prompts";
import { parseStatus } from "../status-md/parse";
import { getDb } from "../db/client";

const schema = z.object({
  drafts: z.array(z.object({
    title: z.string().min(1),
    body: z.string().min(1),
    labels: z.array(z.string()).default([]),
  })),
});

function repoContext(projectPath: string): string {
  try {
    const log = execSync(`git log --since="14 days ago" --pretty=format:"%s" -n 30`, { cwd: projectPath }).toString();
    const files = execSync(`git log --since="14 days ago" --name-only --pretty=format: | sort -u | head -40`, { cwd: projectPath, shell: "/bin/bash" }).toString();
    return `recent commit messages:\n${log}\n\ntouched files:\n${files}`;
  } catch {
    return "(git context unavailable)";
  }
}

export async function draftIssues(projectPath: string): Promise<number[]> {
  const db = getDb();
  const statusPath = join(projectPath, "STATUS.md");
  if (!existsSync(statusPath)) throw new Error("STATUS.md missing");
  const s = parseStatus(readFileSync(statusPath, "utf8"));

  const existing = db
    .prepare("SELECT title FROM multica_issues WHERE project_path = ? AND status IN ('open','in_progress')")
    .all(projectPath) as { title: string }[];

  const humanBlock = yaml.dump({
    intent: s.human.intent,
    lifecycle: s.human.lifecycle,
    "north-star": s.human.northStar,
    "weekly-goal": s.human.weeklyGoal,
    "external-block": s.human.externalBlock,
  });

  const prompt = DRAFT_ISSUES_PROMPT(
    s.projectName,
    humanBlock,
    repoContext(projectPath),
    existing.map(e => `- ${e.title}`).join("\n") || "(none)",
  );

  const r = await aiCallSerial({ provider: "claude", prompt, schema });

  const insert = db.prepare(`
    INSERT INTO issue_drafts (project_path, title, body, labels, status, created_at)
    VALUES (?, ?, ?, ?, 'pending', ?)
  `);
  const ids: number[] = [];
  const now = new Date().toISOString();
  const tx = db.transaction(() => {
    for (const d of r.drafts) {
      const info = insert.run(projectPath, d.title, d.body, JSON.stringify(d.labels), now);
      ids.push(Number(info.lastInsertRowid));
    }
  });
  tx();
  return ids;
}
