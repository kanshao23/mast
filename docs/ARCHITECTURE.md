# Architecture — Mast v0.1

This document captures the architecture decisions for Mast v0.1. For the full design discussion, including alternatives considered and open questions resolved during implementation, see the internal design spec (not yet public).

---

## 1. Product Goal

Mast is a **portfolio strategy layer** for indie developers running many app projects in parallel. It complements Multica (which handles agent fleet execution) by providing the missing cross-project strategic brain:

- **Observe** all projects' real activity (git commits, Claude Code sessions, App Store, RevenueCat) without manual logging.
- **Maintain** a `STATUS.md` per project — the Human section is yours (intent, north-star, weekly goal); the AI section is overwritten daily from observed data (velocity, health score, zombie risk).
- **Brief** you each morning with portfolio-level recommendations: which 1-3 projects to push today, which are going quiet, which shipped apps have anomalies.
- **Draft** issue backlogs from STATUS.md goals and current code state, then push approved issues into Multica for agent execution.
- **Close the loop** by reading Multica issue and agent state back into the dashboard.

The user remains the dispatcher and reviewer. Mast **never executes code** in user repos — that is Multica's job.

### Non-goals (v0.1)

- Time-boxing / focus enforcement (incompatible with a parallel multi-project workflow).
- Replacing Multica's orchestration, daemon, or skills system.
- Mobile / native app for the tool itself.
- Multi-user / cloud sync.

---

## 2. Form Factor & Tech Stack

| Layer | Choice | Why |
|---|---|---|
| UI | Next.js 16, App Router, React Server Components | Fastest way to ship dashboard-heavy UI with markdown rendering and tables |
| Language | TypeScript (strict) | Safety at the parser/ingest layer is worth it |
| Database | SQLite via `better-sqlite3` | Inspectable, git-versionable, no server |
| Package manager | pnpm | Workspace support, fast |
| Styling | Tailwind v4 + shadcn/ui | |
| Background work | Long-running Node daemon (`tsx src/daemon/index.ts`) | Keeps UI stateless; ingest runs on its own cadence |
| AI calls | Shell out to `claude` or `codex` CLI | User's subscription covers the cost; no API key management |
| Secret storage | macOS keychain via `keytar` | `.p8` files and tokens stay off disk |

---

## 3. Architecture Overview

```
┌─────────────────── Mast ───────────────────────┐
│                                                │
│   Next.js UI ──┐                               │
│   (localhost) │                                │
│               ├──► SQLite (aggregates,         │
│   Daemon ─────┤         snapshots, cache)      │
│   (Node, cron)│                                │
│               └──► STATUS.md per repo          │
│                    (human + AI sections)        │
│                                                │
└────┬─────────────┬─────────────┬───────────────┘
     │ read        │ read        │ read + write
     ▼             ▼             ▼
 git logs    Claude JSONL    Multica API
 (repos dir) (~/.claude/    (Cloud REST,
              projects/)     token mul_...)
                  ▲
              (optional)
          ASC API / RevenueCat
```

The tool reads from everywhere and writes only to:

1. Its own SQLite database.
2. `STATUS.md` files (AI section only, daily, committed with `git commit -am "ai: status update"`).
3. **Multica** (creates issues via REST when user approves drafts).

It never writes code to user project repos.

---

## 4. Data Model

### 4.1 STATUS.md (per repo)

Lives at `<repos-root>/<project>/STATUS.md`. Two sections, clearly delimited.

```markdown
# My App

## Human (you edit, monthly cadence)
intent: main            # main | experiment | maintain | zombie-candidate
lifecycle: shipped-growing   # ideation | building | shipped-growing | shipped-maintained | paused | archived
bet-level: 4            # 1-5
north-star: "Reach 500 DAU in 30 days"
weekly-goal: "Ship onboarding flow"
external-block: ""      # waiting-review | waiting-design | none
multica:
  workspace-id: ws_xxx
  project-id: proj_xxx
notes: |
  Free-form notes.

## AI (daemon auto-overwrites daily — do not edit)
last-updated: 2026-05-13T08:00:00Z
activity-7d:
  commits: 12
  claude-sessions: 5
  hours: 8.3
  tokens-in: 820000
  tokens-out: 410000
velocity-trend: rising      # rising | flat | cooling
focus-area: "onboarding (UI files 70%)"
health-score: 7.5           # 0-10
zombie-risk: 0.1
ai-notes: |
  Velocity rising. Focus aligns with weekly goal.
```

The daemon rewrites everything below `## AI` each run. The Human section is parsed but never modified.

### 4.2 SQLite Tables

| Table | Purpose |
|---|---|
| `projects` | One row per discovered repo: path (PK), name, lifecycle, intent, bet_level, north_star, weekly_goal |
| `daily_activity` | Per-project per-day: commits, claude_sessions, hours, tokens_in, tokens_out |
| `health_snapshots` | Per-project per-day: health_score, velocity_trend, zombie_risk, focus_area |
| `shipped_metrics` | Per-project per-day: downloads, mrr, crashfree, rating (populated from ASC / RevenueCat) |
| `multica_issues` | Mirror of Multica issue list per watched workspace |
| `issue_drafts` | AI-generated drafts: title, body, status (pending / approved / rejected / pushed), multica_issue_id |
| `briefs` | Daily brief markdown, one row per date |
| `ingest_log` | Source, ran_at, ok, message — for daemon diagnostics |

All schema changes live in `migrations/` as append-only numbered SQL files.

---

## 5. Data Sources & Ingestion

### 5.1 Git (per repo)

The daemon walks `MAST_REPOS_ROOT`, treats any directory containing `.git` as a project. For each project, runs `git log --since="14 days ago"` to compute commit count, file churn, and dominant change area (UI / backend / config / docs — heuristic from file paths).

See `src/lib/ingest/git.ts`.

### 5.2 Claude Code JSONL

Maps `~/.claude/projects/<encoded-path>/*.jsonl` back to repo paths. Each file is one session. Parsed for timestamp, model, and token usage (input, output, cache read/write). Hours estimated from contiguous activity windows — ≤10 minute idle gap is considered the same session.

See `src/lib/ingest/claude-logs.ts`.

### 5.3 App Store Connect API (v0.2)

For shipped iOS apps: daily pull of downloads, impressions, conversion, crash-free %, and rating. Requires ASC API key (issuer ID, key ID, .p8 file) in Settings. The .p8 is stored in the macOS keychain via `keytar`, not on disk.

### 5.4 RevenueCat REST API (v0.2)

Per-app secret key. Pulls MRR, active subscriptions, churn. v0.2 priority — the integration wire will be proven first with one connected app.

### 5.5 Multica Cloud REST

Personal access token (`mul_...`). The daemon polls every 60 seconds for issue list and agent state across all watched workspaces. Maps Multica workspace/project to local repo path via the `multica:` block in STATUS.md's Human section (one-time per-project setup).

See `src/lib/ingest/multica.ts` and `src/lib/multica/`.

---

## 6. AI Integration

All AI calls shell out to CLIs the user already runs via subscription — no Anthropic or OpenAI API keys required.

```
aiCall({ provider, prompt, schema })
  → writes prompt to temp file
  → spawns `claude -p <file> --output-format json`
     or `codex exec <file>`
  → captures stdout
  → validates against Zod schema
  → retries once on parse failure
  → falls back to plain-text result + logs warning
```

**Why CLI shell-out instead of SDK?**

- The user's Claude Code subscription has a higher effective rate limit for their workflow than a pay-per-token API key.
- No secrets to manage — the CLI handles auth.
- Codex works the same way, giving a seamless provider fallback.

**Rate limiting:** the daemon serializes AI calls and inserts a brief delay between them. Health scores and STATUS.md AI sections regenerate once daily, never on page load.

See `src/lib/ai/cli.ts`.

---

## 7. How the System is Intended to Be Used

**Morning (brief review)**

1. The daemon has already run overnight: refreshed all data sources, regenerated each STATUS.md AI section, and generated the daily brief via Claude CLI.
2. The brief surfaces on `/`: top 1-3 projects to push today (with reasoning), zombie warnings (no activity ≥14 days), shipped-app anomalies (MRR drop, crash spike, rating change), and Multica fleet status.
3. For each top recommendation, an "Draft today's issues" button is available.

**Midday (issue drafting and dispatch)**

1. User clicks "Draft today's issues" for a project.
2. Mast reads the project's STATUS.md + recent git diff + current Multica backlog.
3. Sends to Claude CLI with a structured prompt: generate N issue drafts (title + body + tentative labels) that move toward the weekly goal without duplicating existing open issues.
4. Drafts appear as cards — approve, edit inline, or reject. Approved drafts are batch-pushed to Multica via REST.
5. Multica's agent fleet picks them up and executes as usual.

**Throughout the day**

- Dashboard shows live Multica state per project: issues open / running / awaiting review.
- "Awaiting review" is surfaced prominently — that is the most common bottleneck.

---

## 8. Dashboard Views

| Route | Contents |
|---|---|
| `/` | **Today**: daily brief, top recommendations, "Draft issues" entry points, Multica live state |
| `/projects` | Table of all projects: lifecycle, intent, bet-level, health score, 7-day activity, MRR, zombie risk. Sortable + filterable by lifecycle. |
| `/projects/[path]` | Single project: STATUS.md rendered, recent commits, recent Claude sessions, Multica issues, shipped metrics chart, "Draft issues" button |
| `/portfolio` | ROI lens: lifetime revenue / lifetime hours per project. Graveyard candidates surfaced at the bottom. |
| `/settings` | Multica token, optional ASC / RevenueCat keys, repos root path, daemon controls |

Lifecycle-based filtering on `/projects` covers the "Building / Shipped / Paused / Archived" lens — no separate routes needed in v0.1.

---

## 9. Multica Integration Detail

**Connection**: user pastes `mul_...` token in Settings. Mast reads the Multica API base URL from `MULTICA_API_BASE` in `.env.local` (default: `https://api.multica.ai`).

**Workspace mapping**: each STATUS.md Human section can include:

```yaml
multica:
  workspace-id: ws_xxx
  project-id: proj_xxx
```

Without this block, the project appears in the dashboard but has no Multica integration (no issue push, no agent state). The user fills it in once per project.

**Issue push**: `POST /v1/issues` with title, body, labels, and project_id. The returned issue ID is stored in `issue_drafts.multica_issue_id`.

**Status polling**: daemon polls `GET /v1/issues?workspace_id=...&updated_after=...` every 60 seconds. Results are written to the `multica_issues` table.

**Failure modes**:
- Token expired → Settings page shows a red banner. All push attempts fail loudly, not silently.
- Rate limited → exponential backoff, logged to `ingest_log`.

---

## 10. What's in v0.1

### Must-have (shipped)

- Cross-project data ingestion: git + Claude JSONL
- STATUS.md AI section auto-maintenance (Human/AI split, daily overwrite, git commit)
- Daily AI brief on `/`
- Issue drafting from STATUS.md + repo state + Multica backlog, with approve / edit / reject UI
- Push approved issues to Multica via REST
- Read Multica issue and agent state back into dashboard
- Settings for tokens (Multica required; ASC / RC optional)

### Deferred to v0.2

- App Store Connect API ingestion
- RevenueCat API ingestion
- Portfolio ROI view
- Zombie auto-detect with archive suggestions in brief
- Token / cost statistics per project

### Cut to later / never

- SwiftUI menubar widget (v0.3)
- Codex session ingestion (v0.3 — depends on log schema confirmation)
- Google Play Console API (v0.4+)
- Time-boxing / focus enforcement (out of scope by design)

---

## 11. Error Handling & Edge Cases

| Situation | Behavior |
|---|---|
| STATUS.md missing | Daemon creates a template with empty Human section. Project shows in dashboard with `intent: unknown` until user fills it in. |
| STATUS.md Human section malformed | Ingestion logs a warning; project card shows a "Fix STATUS.md" badge. AI section regeneration still proceeds. |
| AI CLI unavailable / rate-limited | Brief and drafts pages show "AI temporarily unavailable, retry in N min". Previous brief is shown if same-day cache exists. |
| Multica token revoked | Settings page red banner; all push attempts fail loudly. |
| Repo deleted from disk | Project auto-marked `archived` after 7 consecutive days missing from disk scan. |
| Two projects with the same name | Deduped by absolute path (which is the primary key throughout). |

---

## 12. Testing Strategy

- **Unit tests**: STATUS.md parser/serializer, git log aggregator, Claude JSONL aggregator, Multica API client (with recorded response fixtures in `tests/fixtures/`).
- **Integration test**: end-to-end "ingest fake repo → generate STATUS.md → draft issues → mock Multica push".
- **No UI component tests in v0.1** — the daemon and parsers are the risky parts.

Run the suite: `pnpm test` (Vitest, ~300ms).
