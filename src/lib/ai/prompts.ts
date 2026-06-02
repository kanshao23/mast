export const STATUS_AI_PROMPT = (projectName: string, human: string, observed: string) => `
You are maintaining the AI section of a project's STATUS.md.

Project name: ${projectName}

The Human (user-owned) section:
\`\`\`
${human}
\`\`\`

Observed data over the past 7 and 28 days:
\`\`\`
${observed}
\`\`\`

Compute:
- velocity-trend: "rising" | "flat" | "cooling" based on 7d vs 28d activity ratio.
- focus-area: 1-line description of where work concentrated (UI / backend / docs / config).
- health-score: 0-10. Weights depend on lifecycle:
  - building: investment 30%, trend 20%, code-output 20%, token-efficiency 10%, alignment-with-north-star 20%
  - shipped-growing / shipped-maintained: downloads 25%, mrr 25%, retention 15%, hours-vs-revenue 20%, crash-free 15%
- zombie-risk: 0 (active) to 1 (dead). >0.5 means project has not progressed in 14+ days and intent != maintenance.
- ai-notes: 2-4 sentences of plain-text analysis. Mention concrete numbers. Mention zombie warning if applicable. Mention north-star progress if inferable from commits.

Return ONLY a JSON object matching this schema (no markdown fence, no commentary):
{
  "velocityTrend": "rising" | "flat" | "cooling",
  "focusArea": string,
  "healthScore": number,
  "zombieRisk": number,
  "aiNotes": string
}
`.trim();

export const BRIEF_PROMPT = (snapshot: string) => `
You are writing today's portfolio brief for an indie developer running ~15 app projects.

Here is the current portfolio snapshot in YAML:
\`\`\`
${snapshot}
\`\`\`

Produce markdown with these sections in order:

## Top picks today
- list 1-3 projects to push today.
- For each, one line "why now": cite north-star + observed signal.

## Zombie warnings
- list projects with zombie-risk > 0.5 and intent != maintenance.
- Recommend an action: archive, paused, or "explicitly mark maintenance".

## Shipped-app anomalies
- list any shipped project with: MRR drop >10% week-over-week, crash-free <99%, rating drop, downloads down >25%.
- Skip if none.

## Fleet status
- One line: "X Multica issues open, Y running, Z awaiting your review".

Keep total under 400 words. No filler. No "as an AI". Use the project names exactly as given.
`.trim();

export const DRAFT_ISSUES_PROMPT = (projectName: string, human: string, repoContext: string, existingTitles: string) => `
You are drafting issue titles + bodies for the project "${projectName}" so its AI agents (running via Multica) can execute them in parallel.

Human-owned strategic context:
\`\`\`
${human}
\`\`\`

Recent code activity (file paths most touched, recent commit messages):
\`\`\`
${repoContext}
\`\`\`

Existing open Multica issues for this project (do NOT duplicate these):
\`\`\`
${existingTitles}
\`\`\`

Produce 3-6 issue drafts that move the project toward its weekly-goal and north-star. Each issue:
- title: ≤ 70 chars, imperative ("Add X", "Fix Y", "Refactor Z")
- body: 3-8 lines. Include: what to do, where (file paths if known), how to verify.
- labels: list of 0-3 tags like "feat", "bug", "ui", "backend".

Return ONLY a JSON object:
{
  "drafts": [
    { "title": string, "body": string, "labels": string[] }
  ]
}
No commentary, no markdown fence.
`.trim();
