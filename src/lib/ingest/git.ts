import simpleGit from "simple-git";

export interface DailyGitRow {
  date: string;
  commits: number;
}

export async function ingestGit(repoPath: string, days = 14): Promise<DailyGitRow[]> {
  const git = simpleGit(repoPath);
  const since = new Date(Date.now() - days * 86400_000).toISOString();
  const log = await git.log({ "--since": since });
  const buckets = new Map<string, number>();
  for (const c of log.all) {
    const date = c.date.slice(0, 10);
    buckets.set(date, (buckets.get(date) ?? 0) + 1);
  }
  return [...buckets.entries()]
    .map(([date, commits]) => ({ date, commits }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
