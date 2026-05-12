export interface MulticaIssue {
  id: string;
  title: string;
  body: string;
  status: "open" | "in_progress" | "awaiting_review" | "done" | "blocked";
  assignee: { id: string; name: string } | null;
  workspaceId: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateIssueInput {
  workspaceId: string;
  projectId: string;
  title: string;
  body: string;
  labels?: string[];
}
