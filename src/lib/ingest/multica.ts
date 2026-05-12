import { getDb } from "../db/client";
import { MulticaClient } from "../multica/client";

export async function ingestMultica(): Promise<void> {
  const token = process.env.MULTICA_TOKEN;
  const baseUrl = process.env.MULTICA_API_BASE ?? "https://api.multica.ai";
  if (!token) return;
  const db = getDb();
  const projects = db
    .prepare("SELECT path, multica_workspace_id, multica_project_id FROM projects WHERE multica_workspace_id IS NOT NULL")
    .all() as any[];

  const client = new MulticaClient({ baseUrl, token });

  for (const p of projects) {
    const lastSeen = db
      .prepare("SELECT MAX(updated_at) AS u FROM multica_issues WHERE project_path = ?")
      .get(p.path) as any;
    const issues = await client.listIssues({
      workspaceId: p.multica_workspace_id,
      updatedAfter: lastSeen?.u ?? undefined,
    });

    const upsert = db.prepare(`
      INSERT INTO multica_issues (id, project_path, title, status, assignee, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title=excluded.title, status=excluded.status,
        assignee=excluded.assignee, updated_at=excluded.updated_at
    `);
    const tx = db.transaction((items: any[]) => {
      for (const i of items) {
        if (i.projectId !== p.multica_project_id) continue;
        upsert.run(i.id, p.path, i.title, i.status, i.assignee?.name ?? null, i.createdAt, i.updatedAt);
      }
    });
    tx(issues);
  }
}
