import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { MulticaClient } from "@/lib/multica/client";

const body = z.object({ ids: z.array(z.number().int()) });

export async function POST(req: Request) {
  const { ids } = body.parse(await req.json());
  const db = getDb();
  const client = new MulticaClient({
    baseUrl: process.env.MULTICA_API_BASE ?? "https://api.multica.ai",
    token: process.env.MULTICA_TOKEN!,
  });

  const drafts = db.prepare(
    `SELECT id, project_path, title, body, labels FROM issue_drafts WHERE id IN (${ids.map(() => "?").join(",")}) AND status='pending'`
  ).all(...ids) as any[];

  const results: any[] = [];
  for (const d of drafts) {
    const p = db.prepare("SELECT multica_workspace_id, multica_project_id FROM projects WHERE path = ?").get(d.project_path) as any;
    if (!p?.multica_workspace_id) {
      results.push({ id: d.id, ok: false, reason: "no multica mapping" });
      continue;
    }
    try {
      const created = await client.createIssue({
        workspaceId: p.multica_workspace_id,
        projectId: p.multica_project_id,
        title: d.title,
        body: d.body,
        labels: JSON.parse(d.labels ?? "[]"),
      });
      db.prepare("UPDATE issue_drafts SET status='pushed', multica_issue_id=?, pushed_at=? WHERE id=?")
        .run(created.id, new Date().toISOString(), d.id);
      results.push({ id: d.id, ok: true, multicaId: created.id });
    } catch (e: any) {
      results.push({ id: d.id, ok: false, reason: e.message });
    }
  }
  return NextResponse.json({ results });
}
