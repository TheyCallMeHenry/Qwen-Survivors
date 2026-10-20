# AGENTS.md — QWEN SURVIVORS project rules

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
8. **Workspace hygiene is proactive, not requested (2026-09-04).** Keep the workspace neat/tidy/efficient/optimal **without being told**: delete accidentally-created strays in the same turn they appear (temp/debug files, scratch dirs, backups, and Windows reserved-name artifacts like `nul` — remove those via an extended-length path, e.g. Python `os.remove(r'\\?\full\file')`, since shell `rm`/`del` fail on reserved names); fix typos the moment they are noticed; never leave untracked clutter that could be committed. Verify with `git status --short` before declaring a turn done.
9. **Handoff = `docs/PROGRESS.md` (no separate handoff file).** The resumption record lives in PROGRESS.md, not a standalone handoff doc: **Resume Notes** = bare minimum for resumption, **≤30 lines**, NOW state + exact next steps + pending decisions ONLY, rewritten (not appended) every session; **Session Log** = one append-only line per session. Update on EVERY completion (a step is not done until Resume Notes reflect it). Cliff writes: after every auto-compact / visible "Context Compacted" (append delta only), ~every 3 agent turns or at task and/or phase boundaries, when context gauge ≥40% or before a large edit burst, and immediately before any `spawn_agent` with large expected output. Durable content (decisions/pitfalls/rationale/history) → `docs/DECISIONS.md` / `docs/PLAN.md` / PROGRESS Session Log — never in Resume Notes.
10. **Evidence law — this session's output decides.** No "probably/maybe/should be fine": load-bearing decisions rest only on evidence obtained this session — captured command output, the file/config actually read, a source fetched now, a measurement. A gate may be claimed green only from a run in this session (counts under Commands); numbers recorded in docs are pointers, not evidence. Label inference as inference; if you cannot name a decision's evidence, go get it or report it blocked.
11. **Verified edit anchors.** Copy every edit anchor (`old_text`) and every tool path argument byte-exact from a read/listing taken *after* that file's last change — your own shell writes stale the copy you hold; never author one from memory, a line number, or a pre-append read. Append-only sections (Session Log — newest-first in this repo) take new entries only at the section's entry edge: directly under the section header (newest-first) or at the tail (oldest-first) — never mid-section, never by line number. On an anchor miss, re-read the region then retry — never re-guess. Forward slashes in every tool path argument.
12. **Empty results are not verdicts.** Before accepting an empty *or* confidently non-empty search/test result, prove its scope actually matched ≥1 file (run its path/glob/branch filter once with a permissive query); read the exit code (grep: 1 = no match, 2 = could not run; test harness: nothing-collected ≠ passed); a pipeline reports only its **last** stage — `grep … | wc -l` looks green on a broken filter, so enable `pipefail` or check each stage; for a load-bearing negative, prove the check can fire against a known positive. Otherwise report **unverified**, never "clean".
13. **Research protocol (any web/research work).** Verify the real-world date FIRST as its own separate tool call and anchor every query to it; treat training data as stale for versions/APIs/deprecations/availability. Bound every source: never fetch a large or unknown-size page/PDF/changelog whole — size-check (`curl -sI`) or pull bounded to `unsloth-tmp/` then filtered/line-range reads (one unbounded burst past the context window force-kills the session). Cite title + URL + access-date; separate fact from inference; write findings to `docs/RESEARCH_FINDINGS.md` before reporting (report ≤20 bullets).
14. **A turn never ends on intent alone.** Every turn ends with a tool call or user-visible text — never reasoning with nothing executed, which the user experiences as a silent stall. A decided action gets taken in this same turn; questions for the user go at the end of a turn that also did its work.
15. **Never tolerate a noticed defect.** The moment a flaw is seen — in code, docs, or these rules — either fix it this turn or log it as an explicit open item; "acceptable-ish" and "tidy it up later" are not permitted states. When approaches differ, take the one with the best *verified* end state, never the one that is fastest, cheapest, or simplest to produce. A logged-open item goes where the next session will see it (PROGRESS Resume Notes / the owning doc), never only in chat; note improvement opportunities in the same turn you spot them, but never launch dedicated hunt-for-work sweeps unasked — they bloat diffs and pay off only as dedicated engagements (DungeonMind research 2026-10-19).
16. **Human-readable code — the highest code standard.** Smallest correct diff; match existing conventions. **Purpose line above every function, class, and persistent section:** what it does and why (inputs/outputs, non-obvious trade-offs) so a reviewer judges intent without reading the body; never a line-by-line restatement; inside function bodies comments stay reserved for non-obvious intent (this clause prevails over the header rule inside bodies); a stale or wrong comment is fixed or deleted the same turn (measured: good comments +17.2% task pass rate, wrong ones −20.8%). **Readable by any human:** a line a reviewer cannot follow is a defect even when it works — rewrite it simpler, never cleverer. **Reuse before new:** find the existing implementation and extend it — a near-twin second implementation and any catch that swallows a failure without handling its cause are defects (measured AI-era defaults: duplication +81%, refactoring −70%, error-masking +47%). No "just in case" abstraction without a current user — speculative generality is the same defect in reverse.
17. **Preserve others' work.** Never delete, overwrite, or revert changes you did not author this session; uncommitted working-tree edits are the user's until they say otherwise — stash them recoverably, never destroy them.
18. **Recommendation is never authorization.** When the user asks for a recommendation or leaves a decision open, deliver the analysis and stop — no edits, moves, or commits — until an explicit go or their approval of the named recommendation.
19. **One sub-agent at a time (the project-level orchestration ceiling).** Never have more than one sub-agent in flight — no two spawns in one burst, none while a previous answer is outstanding — even for read-only or disjoint-write work: a single inference slot means parallel spawns buy zero wall-clock time while unsynchronized contexts multiply conflicting decisions. The rest of the orchestration canon stays in the operator's personal rules; this is the only project-level orchestration law.

## Commands

- Syntax/import validation: `node tools/check.mjs`
- Logic tests: `node tools/test-logic.mjs`
- Boot + full-run simulation (third gate): `node tools/test-boot.mjs`
- Serve (user-facing): `node tools/serve.mjs` → http://<LAN-IP>:47893 — check occupancy first (`netstat -ano | grep 47893`); clear a stale owner, never repurpose another port (rule 4).

## Architecture quick map

See `docs/PLAN.md` §3 (module map + frame pipeline). Key invariants:

- Render order: sky/parallax → ground → pickups → Y-sorted (entities+decor) → projectiles → particles → lighting → foreground snow/vignette → HUD.
- Fixed 60 Hz update step; render every rAF; `timescale` + hit-stop in `core/loop.js`.
- Entities drawn via pre-rendered offscreen canvases only (no per-frame path art).
- Lighting = half-res darkness canvas, `destination-out` holes, additive glow pass.
- Enemy query structure = spatial hash grid in `entities/combat.js`/`enemies.js`.

## Style

- Code-quality law lives in rule 16 (human-readable code); these lines are mechanical conventions only.
- Small files, one responsibility. No frameworks. `const`/`let` only, arrow fns, template strings.
- Canvas math in CSS pixels; DPR applied once at canvas setup.
- **Tree stability:** never rename, merge, or add top-level dirs (`js/`, `css/`, `tools/`, `docs/`); scratch stays in gitignored `unsloth-tmp/`; depth ≤3, subfolders only at ≥3 files.

## Amending these rules (a rule request is a rewrite job, never a transcription)

Before adding or editing any rule (this file, or PROGRESS's Format contract): **1)** make it enforceable — name the command/file/output that proves compliance and what a violation looks like (uncheckable = label it a preference, don't ship it as a rule); **2)** single mention — amend an existing rule before adding one; every line is charged to every future session; **3)** scan the whole set first — fold overlaps, and where two rules can both apply state which prevails. **Never renumber or reword rules 1–9** — other docs cite them by number ("rule 5", "rule 7", "rule 8").
