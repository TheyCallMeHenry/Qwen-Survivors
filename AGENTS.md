# AGENTS.md — QWEN SURVIVORS project rules

Applies to every agent session in this repo; stricter than personal defaults where they differ. An explicit user instruction in chat outranks this file.
Rule numbers are permanent IDs — code comments and docs cite them ("rule 5", "rule 16"). Never renumber; add new rules at the end.

## Commands — the three gates

All three must pass before any checkbox tick (baselines: `docs/PROGRESS.md` → "How to Resume a Session"):

- `node tools/check.mjs` — syntax/import validation
- `node tools/test-logic.mjs` — logic tests
- `node tools/test-boot.mjs` — boot + full-run simulation

Serve (user-facing): `node tools/serve.mjs` → http://<LAN-IP>:47893. Check the port first (`netstat -ano | grep 47893`); clear a stale owner, never move to another port (rule 4).

## Session start

1. **Dead-state check:** if the working directory does not exist on disk or contains a doubled `C:\Users\ajbro\` prefix, stop — the workspace registration is stale. Tell the user to re-register it (steps: `docs/ENV.md` → Workspace registration). Never recreate the nested tree; never target a doubled-prefix path.
2. Read this file → `docs/PROGRESS.md` (Status → Resume Notes) → `docs/ENV.md` before running anything beyond the gates.
3. Run `git --no-pager log --oneline main..dev`; if it prints anything, report it to the user with next-step proposals.
4. Propose the next step(s); implement after the user confirms (rule 18).

## Environment & boundaries

- Real location: `D:\Apps\Qwen-Survivors` — the only copy; never create one on C:. The C: junction `C:\Users\ajbro\DeepSeekHarness-STUFF\LINKED-Qwen-Survivors` points here (repair: `docs/ENV.md`).
- Git: `origin` = `https://github.com/TheyCallMeHenry/Qwen-Survivors.git` — a **public** repo, so never commit user-private content. Branches (D100): `main` = published source (Pages serves it) + one permanent work branch `dev`; never date-/session-named branches, never rename `dev`, helper branches purpose-named only (`backup-*`). Publish = `git merge --ff-only` `dev`→`main` + push both, only on explicit ask (rule 7).
- Off-limits: `human-user-notes_AI-agent-ignore/` (user's private notes, gitignored — never modify or commit); `D:\Apps\Qwen-Survivors-backups` (user backups outside the repo — never touch).
- Model serving: one locally hosted model on a single inference lane serves the orchestrator and every sub-agent (the basis for rule 19).
- This file: edit it only at session end or on explicit ask — it sits at the top of every request, so an edit forces the model server to re-read the whole conversation. Review every change to it like code: on a public repo, instruction files are an attack surface.

## Non-negotiables

1. **`docs/PROGRESS.md` is the law.** A task/step/phase is NOT complete until its checkbox is ticked in `docs/PROGRESS.md` with a date + one-line note. Update it *before* declaring anything done. Keep it lean — it is loaded every session: Status + Master Checklist + *active* resume notes only, one line per session in the log; no API dumps, line refs, or kept-for-reference blocks (the code is the implementation record).
2. **No external assets, ever.** All art/audio stays procedural in `js/art` and `js/audio`. No image files, no audio files, no CDN, no npm dependencies, no build step.
3. **ES6 modules** for all `js/` code. Top level of every module must be side-effect-free (imports + definitions only) so `tools/check.mjs` can import it in Node.
4. **Ports:** only **47893** (`tools/serve.mjs`). Never 8000 or other common ports.
5. **Tuning lives in `js/config.js`.** Don't scatter magic numbers; add to config.
6. **Mobile parity is a requirement**, not polish: touch targets ≥ 72 px, safe-area insets, pause-on-blur, gesture audio unlock.
7. **No git commits unless the user explicitly asks.**
8. **Workspace hygiene is proactive, not requested.** Without being told: delete accidentally-created strays the same turn they appear (temp/debug files, scratch dirs, backups, Windows reserved-name artifacts like `nul` — removal recipe in `docs/ENV.md`); fix typos the moment they are noticed; never leave untracked clutter that could be committed. Verify with `git status --short` before declaring a turn done.
9. **Handoff = `docs/PROGRESS.md` (no separate handoff file).** **Resume Notes** = the bare minimum to resume, ≤30 lines: NOW state + exact next steps + pending decisions only, rewritten (not appended) every session. **Session Log** = one append-only line per session. Update on every completion. Cliff-write the delta: after any auto-compact / visible "Context Compacted", about every 3 agent turns or at task/phase boundaries, when the context gauge reads ≥40% or before a large edit burst, and immediately before any `spawn_agent` with large expected output. Durable content (decisions, pitfalls, rationale, history) → `docs/DECISIONS.md` / `docs/PLAN.md` / Session Log — never Resume Notes.
10. **Evidence law:** follow the personal Zed `AGENTS.md` (`%APPDATA%/Zed/AGENTS.md`) → Evidence law. Here, the gate baselines in `docs/PROGRESS.md` are pointers, not evidence — a gate is green only from a run this session.
11. **Verified edit anchors:** follow the personal Zed `AGENTS.md` → Verified edit anchors. Here, new Session Log entries go directly under its header (newest-first), never mid-section.
12. **Empty results are not verdicts:** follow the personal Zed `AGENTS.md` → Empty results law.
13. **Research:** before the first web search or fetch of a session, read `docs/RESEARCH-PROTOCOL.md` and follow it.
14. **End every turn with a tool call or visible text:** follow the personal Zed `AGENTS.md` → Session §4 ("Never end a turn on intent alone"). Here, rule 18 prevails for open decisions.
15. **Never tolerate a noticed defect.** When you see a flaw in code, docs, or these rules, fix it this turn or log it as an open item in PROGRESS Resume Notes (or the owning doc) — never only in chat. When approaches differ, take the best *verified* end state, not the fastest or cheapest. Note improvement ideas when spotted; never run unrequested hunt-for-work sweeps (they bloat diffs).
16. **Readable by any human — the highest code standard.** Smallest correct diff; match existing conventions. A line a reviewer cannot follow is a defect even when it works — rewrite it simpler, never cleverer.
    - **Reuse before new:** before adding a function or module, search `js/` for an existing one and extend it — agents routinely skip reuse and reviewers rarely catch it (MSR 2026, arXiv 2601.21276). A near-twin second implementation, a catch that swallows a failure without handling its cause, or a "just in case" abstraction with no current user is a defect.
    - **Purpose header on every function, class, and persistent section:** one line for a short, private, obvious helper; for anything public, longer, or non-obvious, enough to use it without reading the body — what it does and why, inputs, outputs, side effects, non-obvious trade-offs.
    - **Inside bodies:** comment only the why and the tricky parts; never narrate what the code does (this prevails over the header rule inside bodies).
    - **Stale or wrong comments are defects:** fix or delete them the same turn — they mislead humans and models alike (models lose 20.8% pass rate on comments written for a different problem, arXiv 2609.09242; D107 corrects the D87/D90 framing).
    - **Checkable (pending):** a built-in readability check inside `tools/check.mjs` (custom code, no package — rule 2) is proposed but not approved; never build it without an explicit go (rule 18).
17. **Preserve others' work.** Never delete, overwrite, or revert changes you did not author this session; uncommitted working-tree edits are the user's until they say otherwise — stash them recoverably, never destroy them.
18. **Recommendation is never authorization.** When the user asks for a recommendation or leaves a decision open, deliver the analysis and stop — no edits, moves, or commits — until an explicit go or approval of the named recommendation.
19. **One sub-agent at a time.** Never more than one sub-agent in flight — no two spawns in one burst, none while an answer is outstanding, even for read-only or disjoint-write work. Why: the single-lane model (see Environment) context-switches between concurrent agents, which the user measured as drastically slower; serial agents also keep the orchestrator's context clean (D89). Revisit only if serving becomes multi-lane (`docs/agents-md-review-research-2026-10-20.md` §D). The rest of the orchestration canon stays in the user's personal rules.

## Architecture quick map

See `docs/PLAN.md` §3 (module map + frame pipeline). Key invariants:

- Render order: sky/parallax → ground → pickups → Y-sorted (entities+decor) → projectiles → particles → lighting → foreground snow/vignette → HUD.
- Fixed 60 Hz update step; render every rAF; `timescale` in `core/loop.js` (hit-stop retired D104, 2026-10-24).
- Entities drawn via pre-rendered offscreen canvases only (no per-frame path art).
- Lighting = half-res darkness canvas, `destination-out` holes, additive glow pass.
- Enemy query structure = spatial hash grid in `entities/combat.js`/`enemies.js`.

## Style

- Code-quality law is rule 16; these lines are mechanical conventions only.
- Small files, one responsibility. No frameworks. `const`/`let` only, arrow fns, template strings.
- Canvas math in CSS pixels; DPR applied once at canvas setup.
- Tree stability: never rename, merge, or add top-level dirs (`js/`, `css/`, `tools/`, `docs/`); scratch stays in gitignored `unsloth-tmp/`; depth ≤3, subfolders only at ≥3 files.

## Amending these rules

Before adding or editing a rule (this file, or PROGRESS's Format contract): (1) make it checkable — name the command, file, or output that proves compliance and what a violation looks like; if nothing can check it, label it a preference; (2) amend an existing rule before adding one — every line costs every future session; (3) scan the whole set, fold overlaps, and state which rule prevails when two collide; (4) write triggers as "when <concrete situation>, do <action>", not "use judgement"; (5) record the change as a D-entry in `docs/DECISIONS.md`; (6) test a rewrite on the real setup before trusting it — same small task, old vs new file, 3+ runs. Rule numbers stay permanent (see top); a retired number is never reused.
