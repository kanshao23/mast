"use client";
import { DraftCard } from "@/components/DraftCard";
import { useRouter } from "next/navigation";

export function DraftListClient({ drafts }: { drafts: any[] }) {
  const router = useRouter();
  const approve = async (id: number) => {
    await fetch("/api/drafts/approve", { method: "POST", body: JSON.stringify({ ids: [id] }) });
    router.refresh();
  };
  const reject = async (id: number) => {
    await fetch(`/api/drafts/${id}`, { method: "DELETE" });
    router.refresh();
  };
  const save = async (id: number, patch: any) => {
    await fetch(`/api/drafts/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
  };
  return (
    <div className="space-y-3">
      {drafts.length === 0 && <p className="text-sm text-muted-foreground">No pending drafts.</p>}
      {drafts.map(d => <DraftCard key={d.id} draft={d} onApprove={approve} onReject={reject} onSave={save} />)}
    </div>
  );
}
