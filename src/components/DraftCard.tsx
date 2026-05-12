"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

export function DraftCard({ draft, onApprove, onReject, onSave }: {
  draft: { id: number; title: string; body: string; labels: string[] };
  onApprove: (id: number) => Promise<void>;
  onReject: (id: number) => Promise<void>;
  onSave: (id: number, patch: { title?: string; body?: string }) => Promise<void>;
}) {
  const [t, setT] = useState(draft.title);
  const [b, setB] = useState(draft.body);
  return (
    <div className="border rounded-md p-4 space-y-2">
      <Input value={t} onChange={e => setT(e.target.value)} />
      <Textarea rows={5} value={b} onChange={e => setB(e.target.value)} />
      <div className="flex gap-2 text-xs text-muted-foreground">{draft.labels.map(l => <span key={l} className="bg-muted px-2 py-0.5 rounded">{l}</span>)}</div>
      <div className="flex gap-2">
        <Button size="sm" onClick={async () => { await onSave(draft.id, { title: t, body: b }); await onApprove(draft.id); }}>Approve & push</Button>
        <Button size="sm" variant="outline" onClick={() => onSave(draft.id, { title: t, body: b })}>Save edits</Button>
        <Button size="sm" variant="destructive" onClick={() => onReject(draft.id)}>Reject</Button>
      </div>
    </div>
  );
}
