import type { MulticaIssue, CreateIssueInput } from "./types";

export interface MulticaConfig { baseUrl: string; token: string; }

export class MulticaClient {
  constructor(private cfg: MulticaConfig) {}

  private async req<T>(path: string, init: RequestInit = {}): Promise<T> {
    const r = await fetch(`${this.cfg.baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.cfg.token}`,
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
    });
    if (!r.ok) throw new Error(`Multica ${path}: ${r.status} ${await r.text()}`);
    return r.json() as Promise<T>;
  }

  async listIssues(opts: { workspaceId: string; updatedAfter?: string }): Promise<MulticaIssue[]> {
    const qs = new URLSearchParams({ workspace_id: opts.workspaceId });
    if (opts.updatedAfter) qs.set("updated_after", opts.updatedAfter);
    const r = await this.req<{ issues: MulticaIssue[] }>(`/v1/issues?${qs}`);
    return r.issues;
  }

  async createIssue(input: CreateIssueInput): Promise<MulticaIssue> {
    return this.req<MulticaIssue>("/v1/issues", { method: "POST", body: JSON.stringify(input) });
  }
}
