import { describe, it, expect, beforeAll } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { ingestGit } from "../src/lib/ingest/git";

describe("ingestGit", () => {
  let repo: string;
  beforeAll(() => {
    repo = mkdtempSync(join(tmpdir(), "gitrepo-"));
    execSync("git init -q", { cwd: repo });
    execSync("git config user.email test@x && git config user.name test", { cwd: repo, shell: "/bin/bash" });
    writeFileSync(join(repo, "a.txt"), "1");
    execSync("git add . && git commit -qm 'first'", { cwd: repo, shell: "/bin/bash" });
    writeFileSync(join(repo, "a.txt"), "2");
    execSync("git add . && git commit -qm 'second'", { cwd: repo, shell: "/bin/bash" });
  });

  it("returns per-day commit counts", async () => {
    const rows = await ingestGit(repo, 14);
    const total = rows.reduce((sum, r) => sum + r.commits, 0);
    expect(total).toBe(2);
  });
});
