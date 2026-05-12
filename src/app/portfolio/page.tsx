import { getDb } from "@/lib/db/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";

export default async function Portfolio() {
  const db = getDb();
  const rows = db.prepare(`
    SELECT p.path, p.name, p.lifecycle,
      (SELECT SUM(hours) FROM daily_activity WHERE project_path = p.path) AS lifetime_hours,
      (SELECT mrr FROM shipped_metrics WHERE project_path = p.path ORDER BY date DESC LIMIT 1) AS mrr,
      (SELECT SUM(mrr) FROM shipped_metrics WHERE project_path = p.path) AS lifetime_mrr_proxy
    FROM projects p
    ORDER BY (CASE WHEN lifetime_hours > 0 THEN COALESCE(mrr,0) / lifetime_hours ELSE 0 END) DESC
  `).all() as any[];

  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold mb-4">Portfolio ROI</h1>
      <p className="text-sm text-muted-foreground mb-4">MRR ÷ lifetime hours invested. Top = best return on time. Bottom = candidates to archive/paused.</p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Lifecycle</TableHead>
            <TableHead>Hours invested</TableHead>
            <TableHead>Current MRR</TableHead>
            <TableHead>$ / hour (rough)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(r => {
            const rate = r.lifetime_hours ? (r.mrr ?? 0) / r.lifetime_hours : 0;
            return (
              <TableRow key={r.path}>
                <TableCell><Link href={`/projects/${encodeURIComponent(r.path)}`} className="underline">{r.name}</Link></TableCell>
                <TableCell>{r.lifecycle ?? "—"}</TableCell>
                <TableCell>{r.lifetime_hours?.toFixed(0) ?? "0"}</TableCell>
                <TableCell>{r.mrr != null ? `$${r.mrr.toFixed(0)}` : "—"}</TableCell>
                <TableCell>{rate.toFixed(2)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </main>
  );
}
