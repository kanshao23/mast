import { getDb } from "../lib/db/client";
import { discoverRepos } from "../lib/ingest/discover";
import { ingestGit } from "../lib/ingest/git";
import { aggregateAllClaude } from "../lib/ingest/claude-logs";
import { ingestMultica } from "../lib/ingest/multica";
import { regenerateStatusAi } from "../lib/ai/status-ai";
import { generateBrief } from "../lib/ai/brief";

export async function jobIngestRepos(): Promise<void> {
  const db = getDb();
  const repos = discoverRepos();
  const upsert = db.prepare(`
    INSERT INTO projects (path, name, last_seen)
    VALUES (?, ?, ?)
    ON CONFLICT(path) DO UPDATE SET name=excluded.name, last_seen=excluded.last_seen
  `);
  const now = new Date().toISOString();
  const tx = db.transaction(() => {
    for (const r of repos) upsert.run(r.path, r.name, now);
  });
  tx();
}

export async function jobIngestGit(): Promise<void> {
  const db = getDb();
  const projects = db.prepare("SELECT path FROM projects").all() as { path: string }[];
  const upsert = db.prepare(`
    INSERT INTO daily_activity (project_path, date, commits)
    VALUES (?, ?, ?)
    ON CONFLICT(project_path, date) DO UPDATE SET commits=excluded.commits
  `);
  for (const p of projects) {
    const rows = await ingestGit(p.path, 28).catch(() => []);
    const tx = db.transaction(() => { for (const r of rows) upsert.run(p.path, r.date, r.commits); });
    tx();
  }
}

export async function jobIngestClaude(): Promise<void> {
  const db = getDb();
  const all = aggregateAllClaude();
  const upsert = db.prepare(`
    INSERT INTO daily_activity (project_path, date, claude_sessions, hours, tokens_in, tokens_out)
    VALUES (?, ?, 1, ?, ?, ?)
    ON CONFLICT(project_path, date) DO UPDATE SET
      claude_sessions = daily_activity.claude_sessions + 1,
      hours = daily_activity.hours + excluded.hours,
      tokens_in = daily_activity.tokens_in + excluded.tokens_in,
      tokens_out = daily_activity.tokens_out + excluded.tokens_out
  `);
  for (const [projectPath, agg] of all) {
    const exists = db.prepare("SELECT 1 FROM projects WHERE path=?").get(projectPath);
    if (!exists) continue;
    const tx = db.transaction(() => {
      for (const [date, v] of Object.entries(agg.byDate)) {
        upsert.run(projectPath, date, v.hours, v.tokensIn, v.tokensOut);
      }
    });
    tx();
  }
}

export async function jobRegenerateStatusMd(): Promise<void> {
  const db = getDb();
  const projects = db.prepare("SELECT path FROM projects").all() as { path: string }[];
  for (const p of projects) {
    await regenerateStatusAi(p.path).catch(e => console.error(`status-ai ${p.path}:`, e.message));
  }
}

export async function jobBrief(): Promise<void> {
  await generateBrief().catch(e => console.error("brief:", e.message));
}

export async function jobMulticaPoll(): Promise<void> {
  await ingestMultica().catch(e => console.error("multica:", e.message));
}
