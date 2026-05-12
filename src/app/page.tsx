import { getDb } from "@/lib/db/client";
import { BriefPanel } from "@/components/BriefPanel";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function Today() {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);
  const brief = db.prepare("SELECT markdown, generated_at FROM briefs WHERE date = ?").get(today) as any;

  const topProjects = db.prepare(`
    SELECT p.path, p.name, h.health_score
    FROM projects p
    LEFT JOIN health_snapshots h ON h.project_path = p.path
    WHERE p.lifecycle != 'archived' OR p.lifecycle IS NULL
    ORDER BY p.bet_level DESC NULLS LAST, h.health_score DESC NULLS LAST
    LIMIT 3
  `).all() as any[];

  const pending = db.prepare("SELECT COUNT(*) AS c FROM issue_drafts WHERE status='pending'").get() as any;

  return (
    <main className="p-8 space-y-8">
      <header className="flex justify-between items-baseline">
        <h1 className="text-2xl font-semibold">Today</h1>
        <nav className="space-x-4 text-sm">
          <Link href="/projects">Projects</Link>
          <Link href="/portfolio">Portfolio</Link>
          <Link href="/settings">Settings</Link>
        </nav>
      </header>

      {brief
        ? <BriefPanel markdown={brief.markdown} />
        : <p className="text-muted-foreground">No brief yet today. Run the daemon.</p>}

      <section>
        <h2 className="text-lg font-medium mb-2">Top picks — draft issues</h2>
        <div className="space-y-2">
          {topProjects.map(p => (
            <form key={p.path} action={`/projects/${encodeURIComponent(p.path)}`} className="flex items-center gap-4">
              <span className="flex-1">{p.name} <span className="text-muted-foreground text-sm">health {p.health_score?.toFixed(1) ?? "—"}</span></span>
              <Link href={`/projects/${encodeURIComponent(p.path)}`}>
                <Button variant="outline" size="sm">Open</Button>
              </Link>
            </form>
          ))}
        </div>
      </section>

      <p className="text-sm text-muted-foreground">{pending.c} draft(s) pending review.</p>
    </main>
  );
}
