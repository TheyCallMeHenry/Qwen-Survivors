# ENV.md — Environment & Known Caveats

One line per caveat (Format contract §6). Read before running anything non-gate.
Owned here; never re-narrated in PROGRESS.md.

## Node

- **Node on PATH:** `node` resolves directly in the current shell (verified 2026-09-05, v24.11.0). If a shell lacks it, use `"/c/Program Files/nodejs/node.exe"`. Session 15 reported v24.14.1 in its environment — version may differ per shell; check `node --version` at session start.
- Gates (canonical commands, run from repo root):
  - `node tools/check.mjs` → 34/34 modules import-clean
  - `node tools/test-logic.mjs` → 1011/1011 (session-38/39 Phase-21 tree; 861 at published HEAD)
  - `node tools/test-boot.mjs` → `PASS boot-sim runs=4`

## Git

- Branch layout: `main` (Pages source, published) + one permanent work branch `dev` (D100 — renamed from `overnight-2026-08-22` on 2026-10-22; never re-dated); commit/push only on explicit user ask (AGENTS rule 7).
- **Push from the agent shell works** (harness push succeeded 2026-09-04, session-log entry for `e502417`/`e5e9469`/`68c455e`). No credential workaround needed.
- **Pages staleness = the standing test-channel trap:** the user's only test channel is the published Pages build, which serves `main` only. Work-branch commits are invisible to the user until an explicit ff-merge + push to `main`. When the user reports "feature X missing," check whether it is unpublished before auditing code (D73 lesson, 2026-08-28).
- Repo is **public** — never commit user-private content; `human-user-notes_AI-agent-ignore/` is off-limits and gitignored. User-owned untracked material to leave alone: `docs/user-playtest-notes/`, `docs/videos/` (playtest recordings, e.g. the 2026-10-23 FPS-test mp4).
- **Canonical Pages URL (the user's test channel): https://theycallmehenry.github.io/Qwen-Survivors/** — `?fps=1` appends the live FPS readout (29.1 device measure). Publish verification recipe (always after pushing `main`): fresh cache-buster per probe, e.g. `curl -s "https://theycallmehenry.github.io/Qwen-Survivors/js/config.js?cb=$(date +%s)" | grep -c <new-build-marker>` — expect ≥1 for a marker unique to the new build; Pages build takes ~1 min, so retry once after a short sleep before concluding stale. NEGATIVE markers (proving a removed token is gone) must target live syntax (e.g. `hitStop(`), never bare words — dated removal-record comments legitimately keep the old word in the served file (learned 2026-10-24, round-4 verify).

## Server

- Dev serve: `node tools/serve.mjs` → port **47893** only (AGENTS rule 4). Server state at last check (2026-09-05): DOWN.
- Co-op hosting (11.13, pending NAS-side impl): Tailscale on the user's DS124 NAS running unmodified `serve.mjs` (D64).

## Workspace artifacts

- Gitignored scratch: `unsloth-tmp/` (disposable sims — latest perf capture `probe-mobile-session27.txt` — `pool-sim.mjs` 12.7 Monte-Carlo, `syn-seed-scan.mjs` boot-flake seed scan live here; re-create as needed), `NOTES.md`, `STATUS.md`, `server.log`/`server-err.log`, `isolate-*-v8.log`, `prof-out.txt`.
- Hygiene is proactive (AGENTS rule 8): delete strays the same turn they appear, incl. Windows reserved-name artifacts (`nul`) via extended-length path (Python `os.remove(r'\\?\full\file')`; shell `rm`/`del` fail on reserved names). Verify `git status --short` before declaring a turn done.

## Browser note

- All gate coverage is Node stub-DOM (D15); **no real-browser run happens in this environment**. Browser-only behavior (CSS rendering, WebGL/compositor, device input) is verified by CSS-content asserts (test-logic regexes on `main.css`) + user playtest on Pages. 22.8 (mobile "View zoom") needs device repro — impossible here.

## Docs history

- `docs/ARCHIVE.md` (2026-09-06, session 27b compression pass): verbatim overflow home for PROGRESS.md — completed-phase checklist detail, Session Log entries before 2026-09-06 session 24, and the retired PROGRESS Decisions row table. Consult on demand; never loaded every session.

- This file + `docs/DECISIONS.md` were planned in session 13 (2026-09-05) but lost before writing; created 2026-09-05 (session 16). Until a decision has a DECISIONS.md entry, its full text lives on its PROGRESS checklist line / table row.
