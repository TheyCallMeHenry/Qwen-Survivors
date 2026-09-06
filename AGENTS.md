# AGENTS.md — QWEN SURVivors project rules

Applies to every agent session in this repo. Overrides personal defaults where stricter.

## Environment & Access (this machine — read first)

- **Real location:** `D:\Apps\Qwen-Survivors` (Windows, secondary drive). All real files live there — there is no C: copy, and never create one.
- **DSH workspace:** register the workspace at `D:\Apps\Qwen-Survivors`. In the WebGUI picker, the path editor (pencil in the crumb bar) accepts any absolute path — type the D: path, Enter, then Open (the "This PC" crumb at the crumb bar's far left also reaches D:, but the bar auto-scrolls to its tail, so it is often off-screen). The C: junction `C:\Users\ajbro\DeepSeekHarness-STUFF\LINKED-Qwen-Survivors` → `D:\Apps\Qwen-Survivors` is an equivalent entry: the registry canonicalizes via `fs.realpath`, so both spellings resolve to the same single D: workspace.
- **Dead-state check (first thing, session start):** if the session's working directory does not exist on disk or carries a duplicated `C:\Users\ajbro\` prefix (e.g. `C:\Users\ajbro\C:\Users\ajbro\…`), the workspace registration is stale — it was adopted through a phantom nested directory tree that no longer exists. Tell the user: in the WebGUI, delete that workspace registration (sessions and logs are kept), re-register at `D:\Apps\Qwen-Survivors`, and start a fresh session. Never recreate the nested tree; never target a path with a duplicated prefix.
- **Junction repair (no admin needed):** if missing/broken — remove any placeholder at the C: path, then `New-Item -ItemType Junction -Path 'C:\Users\ajbro\DeepSeekHarness-STUFF\LINKED-Qwen-Survivors' -Target 'D:\Apps\Qwen-Survivors'`. Never `mklink` without `/J` (symlinks need elevation). Deleting the junction removes only the link, never the D: files.
- **Git:** `origin` = `https://github.com/TheyCallMeHenry/Qwen-Survivors.git` (**public** repo — never commit user-private content). Branches: `main` + per-night work branches `overnight-YYYY-MM-DD`. Commit/push only when the user explicitly asks (rule 7).
- **Off-limits:** never read, modify, or commit `human-user-notes_AI-agent-ignore/` (user's private notes; gitignored). `D:\Apps\Qwen-Survivors-backups` (outside the repo) is user backup material — do not touch.
- **Session start:** this file → `docs/PROGRESS.md` (Status → active resume notes) → propose the next step(s) → user confirms → implement. Before any tick: all three gates green (baselines in PROGRESS "How to Resume a Session").

## Non-negotiables

1. **`docs/PROGRESS.md` is the law.** A task/step/phase is NOT complete until its checkbox is ticked in `docs/PROGRESS.md` with a date + one-line note. Update it *before* declaring anything done. Zero exceptions. Keep it lean — it is loaded every session: Status + Master Checklist + *active* resume notes only, one line per session in the log; no API dumps, line refs, or kept-for-reference blocks (the code is the implementation record).
2. **No external assets, ever.** All art/audio stays procedural in `js/art` and `js/audio`. No image files, no audio files, no CDN, no npm dependencies, no build step.
3. **ES6 modules** for all `js/` code. Top level of every module must be side-effect-free (imports + definitions only) so `tools/check.mjs` can import it in Node.
4. **Ports:** only **47893** (tools/serve.mjs). Never 8000 or other common ports.
5. **Tuning lives in `js/config.js`.** Don't scatter magic numbers; add to config.
6. **Mobile parity is a requirement**, not polish: touch targets ≥ 72 px, safe-area insets, pause-on-blur, gesture audio unlock.
7. **No git commits unless the user explicitly asks.**
8. **Workspace hygiene is proactive, not requested (2026-09-04).** Keep the workspace neat/tidy/efficient/optimal **without being told**: delete accidentally-created strays in the same turn they appear (temp/debug files, scratch dirs, backups, and Windows reserved-name artifacts like `nul` — remove those via an extended-length path, e.g. Python `os.remove(r'\\?ullile')`, since shell `rm`/`del` fail on reserved names); fix typos the moment they are noticed; never leave untracked clutter that could be committed. Verify with `git status --short` before declaring a turn done.
9. **Handoff = `docs/PROGRESS.md` (no separate handoff file).** The resumption record lives in PROGRESS.md, not a standalone handoff doc: **Resume Notes** = bare minimum for resumption, **≤30 lines**, NOW state + exact next steps + pending decisions ONLY, rewritten (not appended) every session; **Session Log** = one append-only line per session. Update on EVERY completion (a step is not done until Resume Notes reflect it). Cliff writes: after every auto-compact / visible "Context Compacted" (append delta only), ~every 3 agent turns or at task and/or phase boundaries, when context gauge ≥40% or before a large edit burst, and immediately before any `spawn_agent` with large expected output. Durable content (decisions/pitfalls/rationale/history) → `docs/DECISIONS.md` / `docs/PLAN.md` / PROGRESS Session Log — never in Resume Notes.

## Commands

- Syntax/import validation: `node tools/check.mjs`
- Logic tests: `node tools/test-logic.mjs`
- Boot + full-run simulation (third gate): `node tools/test-boot.mjs`
- Serve (user-facing): `node tools/serve.mjs` → http://<LAN-IP>:47893

## Architecture quick map

See `docs/PLAN.md` §3 (module map + frame pipeline). Key invariants:

- Render order: sky/parallax → ground → pickups → Y-sorted (entities+decor) → projectiles → particles → lighting → foreground snow/vignette → HUD.
- Fixed 60 Hz update step; render every rAF; `timescale` + hit-stop in `core/loop.js`.
- Entities drawn via pre-rendered offscreen canvases only (no per-frame path art).
- Lighting = half-res darkness canvas, `destination-out` holes, additive glow pass.
- Enemy query structure = spatial hash grid in `entities/combat.js`/`enemies.js`.

## Style

- Small files, one responsibility. No frameworks. `const`/`let` only, arrow fns, template strings.
- Comments only for non-obvious intent. Match existing style per file.
- Canvas math in CSS pixels; DPR applied once at canvas setup.
