# ENV.md — Environment & Known Caveats

One line per caveat (Format contract §6). Read before running anything non-gate.
Owned here; never re-narrated in PROGRESS.md.

## Node

- **Node on PATH:** `node` resolves directly in the current shell (verified 2026-09-05, v24.11.0). If a shell lacks it, use `"/c/Program Files/nodejs/node.exe"`. Session 15 reported v24.14.1 in its environment — version may differ per shell; check `node --version` at session start.
- Gates (canonical commands, run from repo root):
  - `node tools/check.mjs` → 33/33 modules import-clean
  - `node tools/test-logic.mjs` → 661/661
  - `node tools/test-boot.mjs` → `PASS boot-sim runs=4`

## Git

- Branch layout: `main` (Pages source) + work branch `overnight-2026-08-22`; commit/push only on explicit user ask (AGENTS rule 7).
- **Push from the agent shell works** (harness push succeeded 2026-09-04, session-log entry for `e502417`/`e5e9469`/`68c455e`). No credential workaround needed.
- **Pages staleness = the standing test-channel trap:** the user's only test channel is the published Pages build, which serves `main` only. Work-branch commits are invisible to the user until an explicit ff-merge + push to `main`. When the user reports "feature X missing," check whether it is unpublished before auditing code (D73 lesson, 2026-08-28).
- Repo is **public** — never commit user-private content; `human-user-notes_AI-agent-ignore/` is off-limits and gitignored.

## Server

- Dev serve: `node tools/serve.mjs` → port **47893** only (AGENTS rule 4). Server state at last check (2026-09-05): DOWN.
- Co-op hosting (11.13, pending NAS-side impl): Tailscale on the user's DS124 NAS running unmodified `serve.mjs` (D64).

## Workspace artifacts

- Gitignored scratch: `unsloth-tmp/` (disposable sims — `pool-sim.mjs` 12.7 Monte-Carlo, `syn-seed-scan.mjs` boot-flake seed scan live here; re-create as needed), `NOTES.md`, `STATUS.md`, `server.log`/`server-err.log`, `isolate-*-v8.log`, `prof-out.txt`.
- Hygiene is proactive (AGENTS rule 8): delete strays the same turn they appear, incl. Windows reserved-name artifacts (`nul`) via extended-length path (Python `os.remove(r'\\?\full\file')`; shell `rm`/`del` fail on reserved names). Verify `git status --short` before declaring a turn done.

## Browser note

- All gate coverage is Node stub-DOM (D15); **no real-browser run happens in this environment**. Browser-only behavior (CSS rendering, WebGL/compositor, device input) is verified by CSS-content asserts (test-logic regexes on `main.css`) + user playtest on Pages. 22.8 (mobile "View zoom") needs device repro — impossible here.

## Docs history

- This file + `docs/DECISIONS.md` were planned in session 13 (2026-09-05) but lost before writing; created 2026-09-05 (session 16). Until a decision has a DECISIONS.md entry, its full text lives on its PROGRESS checklist line / table row.
