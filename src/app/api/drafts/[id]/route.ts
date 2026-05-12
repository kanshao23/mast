import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db/client";

const patch = z.object({ title: z.string().optional(), body: z.string().optional(), labels: z.array(z.string()).optional() });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = patch.parse(await req.json());
  const db = getDb();
  const sets: string[] = [];
  const vals: any[] = [];
  if (data.title !== undefined) { sets.push("title=?"); vals.push(data.title); }
  if (data.body !== undefined) { sets.push("body=?"); vals.push(data.body); }
  if (data.labels !== undefined) { sets.push("labels=?"); vals.push(JSON.stringify(data.labels)); }
  if (!sets.length) return NextResponse.json({ ok: true });
  vals.push(Number(id));
  db.prepare(`UPDATE issue_drafts SET ${sets.join(",")} WHERE id=? AND status='pending'`).run(...vals);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  getDb().prepare("UPDATE issue_drafts SET status='rejected' WHERE id=? AND status='pending'").run(Number(id));
  return NextResponse.json({ ok: true });
}
