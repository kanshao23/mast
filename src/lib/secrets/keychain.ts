import { readFileSync, writeFileSync, mkdirSync, existsSync, chmodSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { homedir } from "node:os";

function path() {
  return resolve(homedir(), ".local/share/mast/secrets.json");
}

export function readSecrets(): Record<string, string> {
  const p = path();
  if (!existsSync(p)) return {};
  return JSON.parse(readFileSync(p, "utf8"));
}

export function writeSecrets(s: Record<string, string>): void {
  const p = path();
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(s, null, 2));
  chmodSync(p, 0o600);
}
