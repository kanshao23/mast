import { readdirSync, existsSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { homedir } from "node:os";

function expandTilde(p: string): string {
  return p.startsWith("~") ? resolve(homedir(), p.slice(2)) : resolve(p);
}

export interface DiscoveredRepo {
  path: string;
  name: string;
  hasStatusMd: boolean;
}

export function discoverRepos(root?: string): DiscoveredRepo[] {
  const r = expandTilde(root ?? process.env.PORTFOLIO_REPOS_ROOT ?? "~/dev");
  if (!existsSync(r)) return [];
  const out: DiscoveredRepo[] = [];
  for (const entry of readdirSync(r)) {
    if (entry.startsWith(".")) continue;
    const full = join(r, entry);
    if (!statSync(full).isDirectory()) continue;
    if (!existsSync(join(full, ".git"))) continue;
    out.push({
      path: full,
      name: entry,
      hasStatusMd: existsSync(join(full, "STATUS.md")),
    });
  }
  return out;
}
