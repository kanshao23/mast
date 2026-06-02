# Quickstart — 5 minutes to a running Mast

---

## 1. Prerequisites check

```bash
node --version    # need 22+
pnpm --version    # need 10+
multica --version # need a working Multica install
claude --version  # OR: codex --version (one of these must be on PATH)
```

If `multica` is not installed, see the [Multica README](https://github.com/multica-ai/multica) first. Mast depends on Multica for issue execution — it doesn't replace it.

---

## 2. Clone and install

```bash
git clone https://github.com/kanshao23/mast
cd mast
pnpm install
```

---

## 3. Configure env

```bash
cp .env.example .env.local
```

Open `.env.local` and set at minimum:

| Variable | What it does | Default |
|---|---|---|
| `MAST_REPOS_ROOT` | Directory to scan for project repos. Mast treats any folder containing `.git` here as a project. | `~/dev` |
| `MAST_DB_PATH` | Where Mast's SQLite database lives. Created automatically on first run. | `~/.local/share/mast/db.sqlite` |
| `CLAUDE_PROJECTS_DIR` | Where Claude Code stores session JSONL files. Only change this if you have a non-standard Claude Code install. | `~/.claude/projects` |
| `MULTICA_API_BASE` | Multica Cloud API base URL. Leave as-is unless you're running Multica self-hosted. | `https://api.multica.ai` |

The other variables (`MULTICA_TOKEN`, `ASC_*`, `REVENUECAT_API_KEY`) are filled in through the Settings UI — you don't need to put them in the file.

---

## 4. First daemon run

```bash
pnpm daemon:once
```

This does a single pass of all ingestion sources and then exits:

1. Walks `MAST_REPOS_ROOT`, discovers all git repos.
2. Reads `git log` for each repo (last 14 days).
3. Reads Claude Code JSONL session logs and maps them to repos.
4. Polls Multica for issue and agent state (skipped if no token is configured yet — you'll do that in step 6).
5. Writes aggregated data to SQLite.
6. Regenerates the `## AI` section of each project's `STATUS.md`.

The first run may take 30-60 seconds if you have many repos. Subsequent runs are faster (incremental).

---

## 5. Open the UI

In a separate terminal:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). You should see your projects listed on `/projects`. The `/` (Today) page will show a "Brief not yet generated" message until AI is configured and the daemon has run with a Multica token.

---

## 6. Configure Multica in Settings

1. Go to [http://localhost:3000/settings](http://localhost:3000/settings).
2. Paste your Multica personal access token (`mul_...`). You can generate one in the Multica dashboard under Account → Tokens.
3. Click Save.
4. Run `pnpm daemon:once` again — this time it will poll Multica and populate issue state.

---

## 7. Map a project to a Multica workspace

For issue drafting and push to work, Mast needs to know which Multica workspace/project corresponds to each local repo.

Open a project's `STATUS.md` (at `<your-repos-root>/<project>/STATUS.md`) and add a `multica:` block to the Human section:

```yaml
## Human (you edit, monthly cadence)
intent: main
lifecycle: building
bet-level: 3
north-star: "Ship v1 by end of month"
weekly-goal: "Finish auth flow"
multica:
  workspace-id: ws_abc123    # from Multica dashboard URL
  project-id: proj_xyz789    # from Multica project settings
```

Without this block, the project appears in the dashboard but won't push issues to Multica.

---

## 8. Draft your first issues

1. Go to [http://localhost:3000](http://localhost:3000) (Today page).
2. Find a project in the top recommendations (or go to `/projects` and pick one).
3. Click **"Draft today's issues"**.

Mast reads the project's STATUS.md + recent git diff + current open Multica issues, then calls Claude CLI with a structured prompt. After a few seconds, 3-6 draft issue cards appear.

---

## 9. Approve and push

Each draft card has three actions:

- **Approve** — queues the issue for push to Multica.
- **Edit** — opens an inline editor (title + body). Edits are local until you approve.
- **Reject** — discards the draft.

Once you've approved the drafts you want, click **"Push approved to Multica"**. Mast calls `POST /v1/issues` for each approved draft. You should see them appear in your Multica board within seconds.

---

## 10. Run the daemon continuously

For ongoing use, run the daemon in a terminal tab:

```bash
pnpm daemon
```

This starts a long-running process that polls all sources on a regular cadence (git every 15 minutes, Multica every 60 seconds, AI brief once daily at startup or if the previous brief is stale).

For a more permanent setup on macOS, you can configure a launchd plist to start the daemon at login and keep it running. A template plist will be provided in v0.2 — for now, a terminal tab or your preferred process manager (e.g., `pm2`) works fine.

---

## What's next

- Check [docs/ARCHITECTURE.md](ARCHITECTURE.md) to understand how the pieces fit together.
- Tweak the Human sections of your `STATUS.md` files — `north-star` and `weekly-goal` directly influence the quality of AI briefs and issue drafts.
- Optional: add App Store Connect or RevenueCat credentials in Settings to get revenue and crash data in the dashboard (v0.2 feature — available once you see those fields).
