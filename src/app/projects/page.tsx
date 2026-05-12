import { getDb } from "@/lib/db/client";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function Projects() {
  const db = getDb();
  const rows = db.prepare(`
    SELECT p.path, p.name, p.lifecycle, p.intent, p.bet_level,
           h.health_score, h.velocity_trend, h.zombie_risk,
           (SELECT SUM(hours) FROM daily_activity WHERE project_path = p.path AND date >= date('now','-7 days')) AS hours_7d
    FROM projects p
    LEFT JOIN health_snapshots h ON h.project_path = p.path
    ORDER BY p.bet_level DESC NULLS LAST, p.name
  `).all() as any[];

  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold mb-4">Projects</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Lifecycle</TableHead>
            <TableHead>Intent</TableHead>
            <TableHead>Bet</TableHead>
            <TableHead>Health</TableHead>
            <TableHead>Trend</TableHead>
            <TableHead>Zombie</TableHead>
            <TableHead>Hours 7d</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(r => (
            <TableRow key={r.path}>
              <TableCell><Link href={`/projects/${encodeURIComponent(r.path)}`} className="underline">{r.name}</Link></TableCell>
              <TableCell>{r.lifecycle ?? "—"}</TableCell>
              <TableCell>{r.intent ?? "—"}</TableCell>
              <TableCell>{r.bet_level ?? "—"}</TableCell>
              <TableCell>{r.health_score?.toFixed(1) ?? "—"}</TableCell>
              <TableCell>{r.velocity_trend ?? "—"}</TableCell>
              <TableCell>{r.zombie_risk?.toFixed(2) ?? "—"}</TableCell>
              <TableCell>{r.hours_7d?.toFixed(1) ?? "0"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </main>
  );
}
