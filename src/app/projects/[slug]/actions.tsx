"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function ProjectActions({ projectPath }: { projectPath: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const gen = async () => {
    setLoading(true);
    await fetch("/api/drafts/generate", { method: "POST", body: JSON.stringify({ projectPath }) });
    setLoading(false);
    router.refresh();
  };
  return <Button onClick={gen} disabled={loading}>{loading ? "Drafting..." : "Draft today's issues"}</Button>;
}
