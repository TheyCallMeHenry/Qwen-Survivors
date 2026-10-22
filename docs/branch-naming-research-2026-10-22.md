# Branch naming — research + recommendation (2026-10-22)

Trigger: the work branch `overnight-2026-08-22` is misleading — it was created 2026-08-22 for one night's work and has carried ~15 phases across two months; today (2026-10-22) we work all day. Topic: the best/practical naming + lifecycle convention for this repo's work branch(es). Date verified standalone first: `date` → Thu, Oct 22, 2026 4:21 PM.

## What the sources say (accessed 2026-10-22)

1. **Mechanics (official, fact).** Git's own rules ([git-check-ref-format, git-scm.com](https://git-scm.com/docs/git-check-ref-format)): names can't contain spaces/`~^:?*[\`, `..`, `@{`, can't end with `/` or `.`, no consecutive slashes; GitHub adds URL-encoding caveats ([GitHub Docs](https://docs.github.com/en/get-started/using-git/dealing-with-special-characters-in-branch-and-tag-names)). Practical consensus everywhere ([Graphite](https://graphite.com/guides/git-branch-naming-conventions), [ToolsMint 2026 guide](https://www.toolsmint.com/learn/git-branch-naming-conventions)): lowercase kebab-case, short, purpose-describing; consistency beats any particular scheme.
2. **Team prefix taxonomies (`feature/`, `bugfix/`, `hotfix/`) exist for ticket traceability** in multi-person teams ([StackOverflow thread](https://stackoverflow.com/questions/273695/...), multiple 2026 guides). FACT: no source recommends them for solo work; several explicitly call them ceremony.
3. **Branch LIFETIME, not name, is what the 2026 literature optimizes.** DORA research cited repeatedly: shorter branch lifetimes correlate with better delivery ([env.dev guide](https://env.dev/guides/git-branching-strategies)); trunk-based/GitHub Flow = main always releasable, any extra branch merges in hours-to-days ([Medium comparison](https://medium.com/@patibandha/...), [Codelit](https://codelit.io/blog/git-branching-strategies), [kokil 2026 guide](https://kokil.com.np/blog/trunk-based-development-vs-git-flow)). Explicit anti-pattern: long-lived branches whose names claim otherwise — "calling develop 'trunk' does not make it trunk-based" (kokil). INFERENCE: a date in a branch name *implies* short life; when the branch outlives the date, the name lies — exactly our current defect.
4. **Environment/time names are called out as confusing** ("development, prod-new, test-old… these describe environments, not purpose" — [Medium, Hosseinzadeh](https://medium.com/@aliakbarhosseinzadeh/git-branching-done-right-simple-strategy-and-clear-branch-names-aea0703bf8e8)). FACT.
5. **Counter-research (does solo even need a work branch?):** strong practitioner push for pure trunk-based on solo projects ([r/git threads 2024–2026](https://www.reddit.com/r/git/comments/1fv4ih8/)). INFERENCE for THIS repo: pure trunk-based conflicts with a deliberate invariant — `main` = published-only because GitHub Pages serves `main` and the user's test channel is the live site (D73 lesson). A staging branch that holds verified-but-unpublished work is the mechanism that keeps "publish on explicit ask" (rule 7) workable. So the workflow is right; only the naming is wrong. (The agentic-workflow claim in [DeployHQ 2026](https://www.deployhq.com/blog/5-effective-git-branching-strategies-for-streamlined-development) — agents on long-lived branches fit GitHub Flow/trunk better than GitFlow ceremony — is a vendor blog claim, unchecked; it does match our observed experience that our branch is ff-only and never conflicts.)

## Our actual pattern (measured this session)

- `main` = published source of truth; work branch = permanent integration line; publish = `merge --ff-only` + push both. The two branches are usually IDENTICAL commits (right now: both at `d429665`-pending). The "night" framing was never the real concept.

## Options

- **A (recommended): ONE permanent work branch named `dev`** (or `work`), created once by renaming the existing one (`git branch -m`), never date-stamped, ff-merged + pushed on publish like today. Matches reality (a permanent work line), zero churn, no stale names, no ceremony, keeps rule 7's staging gate. Cost: branch lives forever (harmless; it's usually equal to main).
- **B: per-phase short-lived branches** (`phase-29`, `fix-zoom`) — closest to trunk-based consensus. Cost: constant create/delete churn for a solo+agent flow that merges with ff-only anyway; phase numbers already live in docs + commit messages; sessions mid-phase would need branch handoffs. Worse ergonomics, no real safety gain here.
- **C: rename to a fresh date scheme** (`work-2026-10-22`) — reintroduces the same lie next week. Rejected.

## Migration (if A approved)

`git branch -m overnight-2026-08-22 dev && git push -u origin dev && git push origin --delete overnight-2026-08-22` — safe: default branch is `main`; no PRs depend on it. Docs to amend: AGENTS.md Environment/Git line + `docs/ENV.md` branch-layout line + this repo's resume-recipe wording (`backup-agents-local` keeps its purpose-name — it describes what it is for, per point 4).

## Not verified

DORA numbers (only ever cited secondhand); the DeployHQ agentic-branching claim (vendor blog); any GitHub-side retention/CI behavior tied to branch names (none expected — Pages deploys `main` only).

---

## Round 2 — fresh-only pass (results published/updated 2026-09-07 → 2026-10-22; date re-verified standalone 16:23)

1. **["Why trunk-based development" — DEVEDANOS, 2026-10-13, devedanos.com]** — within window. Concrete claims: long-lived branches cost drift (trunk moves on without them); Humble & Farley's *Continuous Delivery Pipelines* ideal = "Don't Branch!" — branches only tiny/few/short, merged ≥×/day; explicitly addresses "when AI agents commit: more commits, same rules"; restates DORA's link between trunk-based and delivery performance (its own DORA sourcing is 2016–2017 data — FACT about that study's age).
2. **["Trunk-Based Development With Coding Agents" — dev.to, 2026-10-20]** — within window. Reports primary events: Amp (Sourcegraph) engineers + agents push straight to main with NO pull requests; controls = restricted push access, signed commits, CI blocking bad changes, commits linkable to the agent thread that wrote them (Will Dollman 2026-08-13; Quinn Slack, Paradigm Frontiers 2026-10-13: "the agent thread can replace the PR"); Thoughtworks CTO Rachel Laycock (2026-09-02): review by exception, judgment moved earlier. CLAIMS (reported speech, not independently measured here).
3. **[GitHub issue thread — glennfaison/livepage#76, Sep–Oct 2026]** + [amirbena#26] + [amirbena#42] — within window, primary project records: agent harnesses create their own branches (`claude/<slug>-<id>`, `codex/...`), and these repos moved to MECHANICAL enforcement (server-side branch rules / CI checks) so naming holds for every actor, human or agent. Directly relevant to this repo (agents push here).
4. **[InfoQ — DORA talk by Nathen Harvey, 2026-10-21]** "AI is an Amplifier" — confirms a 2026 DORA cycle exists and its theme: AI scales existing system strengths/dysfunction; code review is called out as the current bottleneck. (Presentation summary; the full report text was not fetched — NOT VERIFIED beyond this.)

### Round-2 verdict (inferences labeled)

**APPROVED 2026-10-22 — Option A adopted as D100.** Executed same day: branch renamed to `dev`, pushed with tracking, old remote name deleted; `dev` = `main` = `d429665` verified; rule text codified in AGENTS.md (Environment/Git line) + ENV.md (Branch layout).

- The fresh corpus SHIFTS the frontier from "branch naming" to **"branch lifetime + mechanical gates"** — naming is a small, enforceable detail; drift and integration cadence are the expensive parts. That strengthens Option A only IF the staging line never drifts — ours is ff-merged continuously (verified this session: `dev`-equivalent == `main` at every publish), so drift cost ≈ 0 (measured pattern, not just literature).
- **New practical addition (optional, small):** the in-window repos enforce naming mechanically rather than by convention (hooks/branch rules). For this repo a one-line rule + the existing discipline suffices (single agent lane, AGENTS rule 19); a server-side branch-protection on `main` IS a cheap real analogue of the DORA/Thoughtworks "gate" pattern if the user ever wants it. Not part of the current recommendation.
- Agent-prefix naming (`claude/`, `codex/`, `copilot/`) is a MULTI-agent reality; this repo runs one agent lane — purpose-names stay correct for us; no prefix scheme needed (inference from rule 19's single-lane setup).
- **Recommendation unchanged: Option A — one permanent, purpose-named work branch `dev`** (never date-stamped), ff-merged into published `main` on user ask; add the one-line discipline from the fresh sources: *never let `dev` sit far behind `main`* (merge often — already our behavior).
