import { getDb } from "@/lib/db/client";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { ProjectActions } from "./actions";
import { DraftListClient } from "./DraftListClient";

export default async function ProjectDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const path = decodeURIComponent(slug);
  const db = getDb();
  const project = db.prepare("SELECT * FROM projects WHERE path = ?").get(path) as any;
  if (!project) return <main className="p-8">Not found.</main>;

  const drafts = db.prepare(`SELECT id, title, body, labels FROM issue_drafts WHERE project_path = ? AND status='pending' ORDER BY id DESC`).all(path) as any[];
  const multicaIssues = db.prepare(`SELECT id, title, status, assignee FROM multica_issues WHERE project_path = ? ORDER BY updated_at DESC LIMIT 20`).all(path) as any[];

  const statusPath = join(path, "STATUS.md");
  const statusMd = existsSync(statusPath) ? readFileSync(statusPath, "utf8") : "(no STATUS.md yet)";

  return (
    <main className="p-8 space-y-8">
      <h1 className="text-2xl font-semibold">{project.name}</h1>
      <p className="text-sm text-muted-foreground">{path}</p>

      <section>
        <h2 className="text-lg font-medium mb-2">STATUS.md</h2>
        <pre className="bg-muted p-4 rounded text-xs whitespace-pre-wrap">{statusMd}</pre>
      </section>

      <ProjectActions projectPath={path} />

      <section>
        <h2 className="text-lg font-medium mb-2">Pending drafts ({drafts.length})</h2>
        <DraftListClient drafts={drafts.map(d => ({ ...d, labels: JSON.parse(d.labels ?? "[]") }))} />
      </section>

      <section>
        <h2 className="text-lg font-medium mb-2">Multica issues (latest 20)</h2>
        <ul className="text-sm space-y-1">
          {multicaIssues.map(i => (
            <li key={i.id}><span className="font-mono text-xs mr-2">{i.status}</span>{i.title} <span className="text-muted-foreground">— {i.assignee ?? "unassigned"}</span></li>
          ))}
        </ul>
      </section>
    </main>
  );
}
