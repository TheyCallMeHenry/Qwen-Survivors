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
9. **User-input documentation = capture-before-reason.** When a human-user message arrives that is not on the denylist, the FIRST tool call of the turn is an append to `docs/USER-INPUT-LOG.md` — insert the entry block immediately after the stable `## Entries (newest first)` line (known from this rule; no prior read needed) — no analysis, planning, research, or implementation may precede the write. Rationale (measured, not opinion): context recall degrades with token position and total length; compaction silently drops critical items whose importance surfaces later; this log is the only durable copy of the user's words.
   - **Format (newest first):** `### YYYY-MM-DD HH:MM TZ — title` · **Received:** · **Classification:** `bug report` | `feature request` | `design decision` | `answer/approval` | `feedback` | `process rule` · **Context:** one line (max ~20 words) · **Verbatim input:** the user's complete message, their words, verbatim, unmodified, in a fenced block — **no omissions, no meta-line trimming**. Use the user-provided time if the message contains one; otherwise date only.
   - **After the write:** act on the input. In working context, reference the entry by title; never re-quote the body.
   - **Denylist (never document):**
     - The session kick-off prompt, exact text (with or without a leading banner line such as “**IMMEDIATE INSTRUCTIONS:**”): “Please review this project's documentation to get up-to-speed on the current status of development and implementation then propose your recommendation for the phase(s)/step(s) we should complete within this new session.”
     - Bare control words with no other content (“continue”, “proceed”, “ok”, “thanks”) *unless they answer the agent's pending question*
     - Commonly-repeated template prompts (closing/handoff, “Stage, commit, push.”, “proceed”-family)
     - An explicit user opt-out (“DO NOT DOCUMENT…”)
     Agent-side content (thinking/tool output) is not a user message and never enters the log.
   - **Precedence:** denylist match → never document — the doubt tiebreaker does NOT apply to denylist matches (template text is the user's own repeated wording; it is recoverable). A template **plus** substantive additions is not a denylist match → document it. Otherwise: **when in doubt, document** — a false capture costs one line; a miss is unrecoverable.

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
