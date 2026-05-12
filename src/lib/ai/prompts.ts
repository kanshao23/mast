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
- zombie-risk: 0 (active) to 1 (dead). >0.5 means project has not progressed in 14+ days and intent != 维护.
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
- list projects with zombie-risk > 0.5 and intent != 维护.
- Recommend an action: archive, paused, or "explicitly mark维护".

## Shipped-app anomalies
- list any shipped project with: MRR drop >10% week-over-week, crash-free <99%, rating drop, downloads down >25%.
- Skip if none.

## Fleet status
- One line: "X Multica issues open, Y running, Z awaiting your review".

Keep total under 400 words. No filler. No "as an AI". Use the project names exactly as given.
`.trim();
