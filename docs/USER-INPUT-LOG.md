# USER INPUT LOG

> **RULE (binding — AGENTS.md non-negotiable 8 / D63):** Capture-before-reason. Any non-denylisted human-user message → the FIRST tool call of the turn appends an entry below — no analysis/planning/research/implementation may precede the write; this log is the only durable copy of the user's words (measured: context recall degrades with token position/total length; compaction silently drops critical items). Denylist (never document): bare control words (unless answering a pending agent question), commonly-repeated template prompts, explicit user opt-out (“DO NOT DOCUMENT…”), agent-side content. When in doubt, document.
>
> **Entry format (newest first):**
> - `### YYYY-MM-DD HH:MM TZ — short title`
> - **Received:** date + time (user-provided time if in the message, else date only)
> - **Classification:** `bug report` | `feature request` | `design decision` | `answer/approval` | `feedback` | `process rule`
> - **Context:** one line (max ~20 words) — what the input responds to / triggers
> - **Verbatim input:** the user's complete message, their words, verbatim, unmodified (fenced block) — no omissions, no meta-line trimming

---

## Entries (newest first)

### 2026-08-22 14:18 EDT — Rule #8 scope clarification + trim of meta line from entry #1

**Received:** 2026-08-22 14:18 EDT
**Classification:** `feedback` / `process rule`
**Context:** User feedback on the first log entry (the meta question line "Do you require any additional information…?" was included — flagged as not sensible/practical/token-efficient) + clarification of rule #8 scope with a reference example (a copy of a previous/different development session). Requests a discussion of my understanding of the revisions needed to the original rule wording.

**Verbatim input:**

```
Why would you include the "Do you require any additional information prior to implementing this new project rule?" within the rule? That is not sensible or practical, nor is it token-/context-efficient.
Let me rephrase/revise the new rule (#8) as I originally provided it to you.
Do not take this *QUITE* so literally; the type of input/feedback/responses I'm referring to are things like the following example (which is a copy of a previous/different development session of ours):

**EXAMPLE OF INPUT/FEEDBACK/RESPONSES I *ACTUALLY* WANT YOU TO DOCUMENT IMMEDIATELY UPON RECEIVING THEM:**

[@Qwen Survivors Progress Review Next Phase Recommendation.md](file:///D:/Apps/Qwen-Survivors/human-user-notes_AI-agent-ignore/Qwen%20Survivors%20Progress%20Review%20Next%20Phase%20Recommendation.md)

After you've reviewed this document, please discuss your understanding (or lack thereof) of the revisions which need to be made to my original wording for this new rule.
```

### 2026-08-22 14:05 EDT — Process rule: immediate documentation of all user input (first entry)

**Received:** 2026-08-22 14:05 EDT
**Classification:** `process rule`
**Context:** User established a new project-level rule to be enforced from this point forward across all remaining development sessions; also asked whether any additional information was required before implementation (answer: none).

**Verbatim input:**

```
**IMMEDIATE SINGULAR/SOLE PRIORITY:**
Create a new Zed project-level rule to be enforced from this point forward throughout the remaining development sessions of this project.
**The new rule is as follows:**
**ALL** human-user-provided input/feedback/responses **MUST BE IMMEDIATELY DOCUMENTED IN A COMPLETE AND ACCURATE MANNER *THE MOMENT THE INPUT/FEEDBACK/RESPONSES ARE RECEIVED***.
**DO NOT DO ANY OF THE FOLLOWING AT THE TIME WHEN HUMAN-USER-PROVIDED INPUT/FEEDBACK/RESPONSES IS RECEIVED:**
1. Attempt to troubleshoot, research, or otherwise dig into any issues/problems - **ONLY DOCUMENT THE INPUT/FEEDBACK/RESPONSES** in a complete and accurate manner.
2. Take **ANY ACTION** other than **IMMEDIATELY DOCUMENTING THE HUMAN-USER-PROVIDED INPUT/FEEDBACK/RESPONSES IN A COMPLETE AND ACCURATE MANNER**.
```
