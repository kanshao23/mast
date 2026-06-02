import { describe, it, expect, vi, beforeEach } from "vitest";
import { MulticaClient } from "../src/lib/multica/client";

describe("MulticaClient", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn(async (url: any, init: any) => {
      if (String(url).endsWith("/api/issues") && init?.method === "POST") {
        return new Response(JSON.stringify({ id: "iss_1", title: "t", body: "b", status: "open", assignee: null, workspaceId: "ws", projectId: "p", createdAt: "x", updatedAt: "x" }), { status: 200 });
      }
      if (String(url).includes("/api/issues") && (!init?.method || init.method === "GET")) {
        return new Response(JSON.stringify({ issues: [] }), { status: 200 });
      }
      return new Response("not found", { status: 404 });
    }) as any;
  });

  it("creates an issue", async () => {
    const c = new MulticaClient({ baseUrl: "https://api.multica.ai", token: "mul_x" });
    const r = await c.createIssue({ workspaceId: "ws", projectId: "p", title: "t", body: "b" });
    expect(r.id).toBe("iss_1");
  });

  it("lists issues", async () => {
    const c = new MulticaClient({ baseUrl: "https://api.multica.ai", token: "mul_x" });
    const r = await c.listIssues({ workspaceId: "ws" });
    expect(Array.isArray(r)).toBe(true);
  });
});
