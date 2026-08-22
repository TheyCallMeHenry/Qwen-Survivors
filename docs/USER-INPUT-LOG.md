# USER INPUT LOG

> **RULE (binding — AGENTS.md non-negotiable 8 / D63):** Ask-first. When SUBSTANTIVE human-user input/feedback/responses arrive (directives; decisions/approvals incl. corrections/rejections; answers to agent questions; bug reports + corrections; playtest feedback; phase recommendations), the agent IMMEDIATELY — before ANY additional action — asks the user whether to immediately document it. **Yes** → an entry is added below, COMPLETELY AND ACCURATELY (the user's words, verbatim, unmodified), then the agent acts on the input. **No** → no entry, proceed. NEVER documented: trivial messages (e.g. “continue”), commonly-repeated template prompts (session kick-off / session closing-handoff prompts, “Stage, commit, push.”, “proceed”-family and similar), agent-side content (thinking/tool output).
>
> **Entry format (newest first):**
> - `### YYYY-MM-DD HH:MM TZ — short title`
> - **Received:** date + time (time as received, else date only)
> - **Classification:** `bug report` | `feature request` | `design decision` | `answer/approval` | `feedback` | `process rule`
> - **Context:** one line — what the input responds to / triggers
> - **Verbatim input:** the user's substantive input/feedback/responses, their words, verbatim, unmodified (fenced block); conversational/meta lines omitted

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
