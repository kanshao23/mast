import { NextResponse } from "next/server";
import { readSecrets, writeSecrets } from "@/lib/secrets/keychain";

export async function GET() {
  const s = readSecrets();
  const masked = Object.fromEntries(Object.entries(s).map(([k, v]) => [k, v ? "•••" : ""]));
  return NextResponse.json(masked);
}

export async function POST(req: Request) {
  const body = await req.json() as Record<string, string>;
  const current = readSecrets();
  const next = { ...current };
  for (const [k, v] of Object.entries(body)) {
    if (v && v !== "•••") next[k] = v;
  }
  writeSecrets(next);
  return NextResponse.json({ ok: true });
}
