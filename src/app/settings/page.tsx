"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const KEYS = [
  { k: "MULTICA_TOKEN", label: "Multica personal access token (mul_...)" },
  { k: "MULTICA_API_BASE", label: "Multica API base URL" },
  { k: "ASC_KEY_ID", label: "App Store Connect Key ID (optional)" },
  { k: "ASC_ISSUER_ID", label: "ASC Issuer ID (optional)" },
  { k: "ASC_PRIVATE_KEY_PATH", label: "ASC .p8 path (optional)" },
  { k: "REVENUECAT_API_KEY", label: "RevenueCat API key (optional)" },
];

export default function Settings() {
  const [vals, setVals] = useState<Record<string, string>>({});
  useEffect(() => { fetch("/api/settings").then(r => r.json()).then(setVals); }, []);
  const save = async () => {
    await fetch("/api/settings", { method: "POST", body: JSON.stringify(vals) });
    alert("saved");
  };
  return (
    <div className="p-8 max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold">Settings</h1>
      {KEYS.map(({ k, label }) => (
        <Card key={k}>
          <CardHeader><CardTitle className="text-sm font-normal">{label}</CardTitle></CardHeader>
          <CardContent>
            <Input value={vals[k] ?? ""} onChange={e => setVals({ ...vals, [k]: e.target.value })} />
          </CardContent>
        </Card>
      ))}
      <Button onClick={save}>Save</Button>
    </div>
  );
}
