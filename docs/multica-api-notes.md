# Multica API notes

Source: `strings $(which multica)` on Multica CLI v0.3.12 (commit: 973a4392, built: 2026-05-29T12:30:40Z).

Binary location: `/Applications/Multica.app/Contents/Resources/app.asar.unpacked/resources/bin/multica`

## Endpoints used by Mast

- `GET  <base>/api/issues?workspace_id=...&updated_after=...` — list issues
- `POST <base>/api/issues` — create issue

> Note: The binary uses `/api/issues` (not `/v1/issues`). The client was updated in
> `src/lib/multica/client.ts` accordingly. The public method signatures
> (`listIssues`, `createIssue`) are unchanged.

## How to re-verify

If these stop working after a Multica update:

```bash
strings "/Applications/Multica.app/Contents/Resources/app.asar.unpacked/resources/bin/multica" \
  | grep -E '/(v[0-9]|api)/' | sort -u
```

Update `src/lib/multica/client.ts` constants to match.
