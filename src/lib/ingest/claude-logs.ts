import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { homedir } from "node:os";

function expandTilde(p: string): string {
  return p.startsWith("~") ? resolve(homedir(), p.slice(2)) : resolve(p);
}

export interface ClaudeFileAggregate {
  sessionCount: number;
  byDate: Record<string, { tokensIn: number; tokensOut: number; hours: number }>;
  tokensIn: number;
  tokensOut: number;
  hours: number;
}

const IDLE_GAP_MS = 10 * 60 * 1000;

export function aggregateClaudeFile(path: string): ClaudeFileAggregate {
  const lines = readFileSync(path, "utf8").split("\n").filter(Boolean);
  const timestamps: number[] = [];
  let tokensIn = 0, tokensOut = 0;
  const byDate: ClaudeFileAggregate["byDate"] = {};

  for (const line of lines) {
    let entry: any;
    try { entry = JSON.parse(line); } catch { continue; }
    const ts = entry.timestamp ? Date.parse(entry.timestamp) : NaN;
    if (!Number.isNaN(ts)) timestamps.push(ts);
    const usage = entry.message?.usage;
    if (usage) {
      const date = entry.timestamp?.slice(0, 10);
      if (!date) continue;
      byDate[date] ??= { tokensIn: 0, tokensOut: 0, hours: 0 };
      byDate[date].tokensIn += usage.input_tokens ?? 0;
      byDate[date].tokensOut += usage.output_tokens ?? 0;
      tokensIn += usage.input_tokens ?? 0;
      tokensOut += usage.output_tokens ?? 0;
    }
  }

  timestamps.sort((a, b) => a - b);
  let spanStart = timestamps[0];
  let prev = timestamps[0];
  for (let i = 1; i <= timestamps.length; i++) {
    const t = timestamps[i];
    if (t === undefined || t - prev > IDLE_GAP_MS) {
      const date = new Date(prev).toISOString().slice(0, 10);
      const hours = (prev - spanStart) / 3600_000;
      byDate[date] ??= { tokensIn: 0, tokensOut: 0, hours: 0 };
      byDate[date].hours += hours;
      spanStart = t;
    }
    prev = t;
  }

  const totalHours = Object.values(byDate).reduce((s, d) => s + d.hours, 0);
  return { sessionCount: 1, byDate, tokensIn, tokensOut, hours: totalHours };
}

function decodeProjectDir(encoded: string): string {
  return "/" + encoded.replace(/^-/, "").replace(/-/g, "/");
}

export function aggregateAllClaude(claudeDir?: string): Map<string, ClaudeFileAggregate> {
  const root = expandTilde(claudeDir ?? process.env.CLAUDE_PROJECTS_DIR ?? "~/.claude/projects");
  const out = new Map<string, ClaudeFileAggregate>();
  if (!existsSync(root)) return out;
  for (const entry of readdirSync(root)) {
    const dir = join(root, entry);
    if (!statSync(dir).isDirectory()) continue;
    const repoCandidate = decodeProjectDir(entry);
    if (!existsSync(repoCandidate)) continue;
    const merged: ClaudeFileAggregate = { sessionCount: 0, byDate: {}, tokensIn: 0, tokensOut: 0, hours: 0 };
    for (const f of readdirSync(dir).filter(f => f.endsWith(".jsonl"))) {
      const agg = aggregateClaudeFile(join(dir, f));
      merged.sessionCount += 1;
      merged.tokensIn += agg.tokensIn;
      merged.tokensOut += agg.tokensOut;
      merged.hours += agg.hours;
      for (const [date, v] of Object.entries(agg.byDate)) {
        merged.byDate[date] ??= { tokensIn: 0, tokensOut: 0, hours: 0 };
        merged.byDate[date].tokensIn += v.tokensIn;
        merged.byDate[date].tokensOut += v.tokensOut;
        merged.byDate[date].hours += v.hours;
      }
    }
    out.set(repoCandidate, merged);
  }
  return out;
}
