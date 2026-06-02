# Contributing to Mast

Thanks for the interest. A few ground rules before you sink time into a PR.

## Scope

Mast is intentionally **narrow**:

- It is a **personal** portfolio strategy tool, single-user, local-first.
- It sits **on top of Multica**. It does not replicate Multica's job (agent fleet execution, runtime daemon, skills system).
- It is **not** a time tracker, a pomodoro app, a focus tool, or a project management system.
- It is **not** intended to scale to teams or to host in the cloud.

Features that fight any of the above will be politely closed.

## What's welcome

- Bug fixes
- Documentation improvements (especially the QUICKSTART)
- Additional ingestion sources that follow the existing pattern (App Store Connect, RevenueCat, Google Play, etc.) — see `src/lib/ingest/git.ts` for the shape
- Tests
- Performance fixes
- Better terminal output / logging

## What needs discussion first

Open an issue with the "discussion" label before opening a PR for:

- New top-level pages or major UI changes
- Schema migrations (the `migrations/` folder is append-only)
- New AI providers beyond `claude` / `codex` CLI shell-out
- Anything that changes the Multica integration contract

## Dev setup

```bash
git clone https://github.com/kanshao23/mast
cd mast
pnpm install
cp .env.example .env.local
# edit .env.local — point MAST_REPOS_ROOT at a folder with a few git repos
pnpm test         # runs Vitest suite (~300ms)
pnpm exec tsc --noEmit
pnpm lint
pnpm dev          # UI at http://localhost:3000
pnpm daemon:once  # one-shot ingest run (no --watch loop)
```

## Commit style

Conventional Commits: `feat(daemon): poll multica every 30s`, `fix(ui): handle empty project list`, `docs: clarify quickstart`.

## Testing

If you touch ingestion or parsing, add a fixture in `tests/fixtures/` and a Vitest case. Don't mock what you can fixture.

The risky parts are the daemon and the parsers (STATUS.md, git log, Claude JSONL). UI components have no test coverage in v0.1 — that's intentional for now.

## Code style

Biome is the linter. Run `pnpm lint` before pushing. We don't enforce a separate formatter — match the surrounding style.

## File size

Keep files small. UI components under 200 lines. Split when you start to wonder if a file is doing too much.

## Reporting bugs

Use the bug report template. Include: OS, Node version, `pnpm --version`, what you did, what happened, what you expected, and the daemon log if relevant.
