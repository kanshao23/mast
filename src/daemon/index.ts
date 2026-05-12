import { migrate } from "../lib/db/migrate";
import * as jobs from "./jobs";

interface Job { name: string; intervalMs: number; run: () => Promise<void>; lastRun: number; }

const ONCE = process.argv.includes("--once");

const list: Job[] = [
  { name: "ingest-repos",   intervalMs: 60 * 60_000,      run: jobs.jobIngestRepos,        lastRun: 0 },
  { name: "ingest-git",     intervalMs: 60 * 60_000,      run: jobs.jobIngestGit,          lastRun: 0 },
  { name: "ingest-claude",  intervalMs: 15 * 60_000,      run: jobs.jobIngestClaude,       lastRun: 0 },
  { name: "multica-poll",   intervalMs: 60_000,           run: jobs.jobMulticaPoll,        lastRun: 0 },
  { name: "status-ai",      intervalMs: 6 * 60 * 60_000,  run: jobs.jobRegenerateStatusMd, lastRun: 0 },
  { name: "brief",          intervalMs: 12 * 60 * 60_000, run: jobs.jobBrief,             lastRun: 0 },
];

async function tick() {
  const now = Date.now();
  for (const j of list) {
    if (now - j.lastRun < j.intervalMs) continue;
    console.log(`[daemon] running ${j.name}`);
    j.lastRun = now;
    try { await j.run(); }
    catch (e: any) { console.error(`[daemon] ${j.name} failed:`, e.message); }
  }
}

async function main() {
  migrate();
  await tick();
  if (ONCE) return;
  setInterval(tick, 30_000);
}

main().catch(e => { console.error(e); process.exit(1); });
