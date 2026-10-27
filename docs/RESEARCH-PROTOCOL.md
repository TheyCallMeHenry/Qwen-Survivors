# RESEARCH-PROTOCOL.md — how to do any web/research work in this repo

Loaded on demand by AGENTS.md rule 13 (moved here 2026-10-27, D106 — split into steps; wording unchanged apart from capitalization). Read before the first search or fetch of a session.

1. Verify the real-world date FIRST as its own separate tool call and anchor every query to it; treat training data as stale for versions/APIs/deprecations/availability.
2. Bound every source: never fetch a large or unknown-size page/PDF/changelog whole — size-check (`curl -sI`) or pull bounded to `unsloth-tmp/` then filtered/line-range reads (one unbounded burst past the context window force-kills the session).
3. Cite title + URL + access-date; separate fact from inference.
4. Write findings to `docs/<topic>-research-<YYYY-MM-DD>.md` before reporting (legacy `docs/RESEARCH_FINDINGS.md` stays as history's home).
5. Report ≤20 bullets.

Added 2026-10-27 (D107; wording from the C-Zed-Misc template's research rules 18 and 20):

6. Prefer `freshness`-filtered or date-ranged queries; official docs and primary sources first; prefer measurements, benchmarks, changelogs, and issues over marketing.
7. **Broad before narrow (discovery-first).** Never aim the first search at a solution already in your head — that is confirmation, not research. Round 1 is landscape-only: category, survey, comparison, and "alternatives to" queries anchored to the verified date, enumerating what actually exists, including options you did not know. Prior knowledge is a stale index, never a shortlist. A delegation message inherits this exactly: brief the field, not your guess.
8. **The option set gates narrowing.** Deep dives on named candidates come only after the discovered option set is written into the research doc as its first substantive section (name · one line what-it-is · source), and each later section names which member it examines and why it survived. A doc where named tools precede the option set skipped discovery — redo the pass rather than patching it. Nothing surprising in the set means round 1 was too narrow.
