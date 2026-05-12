import { describe, it, expect } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { discoverRepos } from "../src/lib/ingest/discover";

describe("discoverRepos", () => {
  it("finds direct child git repos and skips non-repos", () => {
    const root = mkdtempSync(join(tmpdir(), "discover-"));
    mkdirSync(join(root, "AppA/.git"), { recursive: true });
    mkdirSync(join(root, "AppB/.git"), { recursive: true });
    mkdirSync(join(root, "not-a-repo"), { recursive: true });
    writeFileSync(join(root, "AppA/STATUS.md"), "# AppA\n## Human\nintent: 主力\n");
    const repos = discoverRepos(root);
    expect(repos.map(r => r.name).sort()).toEqual(["AppA", "AppB"]);
    const a = repos.find(r => r.name === "AppA")!;
    expect(a.hasStatusMd).toBe(true);
  });
});
