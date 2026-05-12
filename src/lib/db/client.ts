import Database from "better-sqlite3";
import { resolve } from "node:path";
import { homedir } from "node:os";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

let _db: Database.Database | null = null;

function expandTilde(p: string): string {
  return p.startsWith("~") ? resolve(homedir(), p.slice(2)) : resolve(p);
}

export function getDb(): Database.Database {
  if (_db) return _db;
  const raw = process.env.PORTFOLIO_DB_PATH ?? "~/.local/share/portfolio-os/db.sqlite";
  const path = expandTilde(raw);
  mkdirSync(dirname(path), { recursive: true });
  _db = new Database(path);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");
  return _db;
}
