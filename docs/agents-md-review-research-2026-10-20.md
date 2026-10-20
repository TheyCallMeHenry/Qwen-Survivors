# AGENTS.md review research — 2026-10-20

Verified date: 2026-10-20 (own tool call, 17:46 EDT). Windows: 30-day (2026-09-20→) primary; 60-day (2026-08-21→) where noted. Purpose: re-validate the external/factual claims AGENTS.md rules rest on (10–19), and check overlaps/conflicts.

## Findings

### A. Zed crash/overflow citations in rule 13 — partially stale, law still correct
- FACT (GitHub API, 2026-10-20): zed-industries/zed **#59401** ("Large tool outputs sent without truncation, overflowing the model context") still **open**, last updated 2026-10-15. Our "no size cap exists" premise holds.
- FACT: **#64560** (compaction permanently fails when history > window) — **closed 2026-09-21 as `duplicate`**, NOT confirmed fixed. The rule's warning stands (closed-as-duplicate ≠ repaired; canonical fix unverified).
- FACT: **#65307** (fetch ingests raw PDF/binary into context) — **closed as `not_planned`**: fix explicitly declined, so AGENTS rule 13 is confirmed to be the only cap that exists.
- FACT: Zed releases through v1.24.4 (2026-10-20) show no compaction/truncation/fetch-cap changelog entries in recent release notes.

### B. Rule 16 comment stats — source now identified, recent, and sharper than our phrasing
- FACT: origin = arXiv **2609.09242, "Talking to Itself While Coding: What Makes Comments Help Code Generation?"** (Sept 2026): comments from **passing** solutions raise recipient pass@1 **+17.2%**; comments describing **failed** solutions = **no reliable gain**; comments written for a **different problem** (stale/mismatched) = **−20.8%**. https://arxiv.org/abs/2609.09242 (via pith.science + ResearchGate snippets).
- Counter-nuance (arXiv 2512.16790 "Inside Out", Dec 2025 — outside 60d window, background only): comment effects range −90%→+67% model/task-dependent.
- Adversarial angle: arXiv 2602.16741 (2026): embedded comments steered code-**generation** models into vulnerable code **75.92%** of attempts — comments are load-bearing instructions to models, not decoration. Supports rule 16's fix-or-delete-stale-comment law.

### C. Rule 16 duplication/refactor stats — source = GitClear 2026, current
- FACT: GitClear 2026 study of **623M code changes**: duplicated blocks **+81%** (vs 2023), moved/refactored code **−70%**, error-masking **+47%**, within-commit copy-paste +41%, maintenance of >1yr-old code −74%. Sources: arturmarkus.com writeup; leaddev.com; endorlabs.com; govard.tech roundup. CAVEAT (inference): GitClear sells diff-analysis — treat as claim; corroborated by LeadDev/Endor coverage; methodology is longitudinal commit-type mix, not RCT.

### D. Rule 19 "one sub-agent at a time" — premise is topology-dependent, not universal
- FACT: OpenAI GPT-6 guide (developers.openai.com, Oct 2026): "Multi-agent [beta]… coordinate multiple subagents **in parallel**… can reduce wall-clock time."
- FACT: Claude Code docs (code.claude.com/docs/en/agent-teams, current): agent teams run concurrently, each in its own context window.
- FACT: arXiv 2606.10662v2 (2026): multi-agent value = "converting additional test-time compute into useful parallel progress, **reducing wall-clock time** and improving success rates."
- FACT (measured case): summarized in jjakimoto/research-issues #2055 — paper "When Sub-Agents Work in Parallel: The Promises and **Pitfalls** of Dynamic Concurrency in Long-Horizon Coding Tasks": 8 parallel sub-agents cut wall time 734.1s→468.0s, both modes passing all tests; pitfalls = the concurrency conflicts our rule names.
- FACT: developersdigest.tech (2026): 3 parallel agents ≈ 3× token cost; runpane.com: parallel diffs move the review bottleneck rather than removing it.
- INFERENCE (machine-bound, needs operator confirmation): on THIS box the model is served locally as one inference slot, so the "zero wall-clock gain" clause is true here but stated as if universal; on cloud/concurrent serving it is false.

### E. Cliff-write / doc-durability discipline (rules 1/9/13/15) — 2026 research strengthens it
- FACT: arXiv 2609.33013 "The Epistemics of Agent Memory" (Sept 2026): formalizes the keep/compress/forget **consolidation decision** as a measured long-horizon problem.
- FACT: arXiv 2610.20927 "Prune the Summary, Not the History" (Oct 2026): compaction summaries carry extra risk; naive history-replacement summaries lose more than "what happened."
- FACT: ConstraintRot / "Governance Decay" (June 2026, 1,323 episodes, 7 model families, via ai-boost/awesome-harness-engineering): constraint-violation rate rises **0%→30%** (up to 59% some models) after context compaction — durable rules must live in files, exactly our write-behind-docs law. (Behind a secondary list; primary paper not yet fetched — flag as corroborated-2nd-hand.)
- FACT: CompactionRL (arXiv 2607.05378, July 2026): long-horizon agents are context-limited; compaction is standard harness practice.

## Overlaps/conflicts found in-file (no research needed)
- Rule 1 vs 9: both state Session-Log one-line rule + lean-file duty + Resume-Notes rewrite rule (frozen 1–9; redundancy is small and cited by number — leave or fix only via explicit operator amendment).
- Rule 14 ("decided action gets taken in this same turn") vs rule 18 ("open decisions: stop until explicit go"): tie unassigned — needs a precedence clause.
- Rule 13 names findings home `docs/RESEARCH_FINDINGS.md`; operator prompt template names `docs/<topic>-research-<date>.md` — two homes for one fact.

## Could not verify
- Whether #64560's canonical duplicate target is fixed (would change rule 13's "force-kills the session" severity — keep as-is until a changelog entry proves otherwise).
- ConstraintRot primary paper body (cited via awesome-list; numbers as reported there).
