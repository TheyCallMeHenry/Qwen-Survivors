# Radiogroup keyboard accessibility (a11y item C) — current-state research (2026-10-23)

Date verified first as its own call: `date` → Fri, Oct 23, 2026 22:44 local. Topic: the correct keyboard behavior for our menu pickers (duration chips, level cards, character cards) which are marked `role=radiogroup`/`role=radio` (custom, non-native widgets). Prior local basis: `docs/accessibility-viewport-research-2026-10-20.md` item C (3 days old; still valid, extended here). Access date for all URLs below: 2026-10-23. Recency: primary sources fetched are current (the W3C APG example page reports Last-Modified 2026-10-23 10:05 GMT — same day); supporting sources from Brave `freshness=py` (past year) plus GitHub issue trackers; nothing load-bearing older than 90 days is used.

## A. What the standard requires (FACT — primary sources)

1. W3C ARIA APG, "Radio Group Example Using Roving tabindex" (page served with Last-Modified 2026-10-23): https://www.w3.org/WAI/ARIA/apg/patterns/radio/examples/radio/
   - Tab enters the group at exactly ONE radio: tabindex="0" on one item (checked; first if none checked), "-1" on all others; the tab stop "moves with focus inside the group" (roving).
   - Keyboard table (FACT, quoted behavior): Tab → focus moves to the checked radio (first if none). Space → checks the focused radio if unchecked. Down/Right arrow → "Moves focus to AND CHECKS the next radio… wraps to first"; Up/Left → same in reverse; the previously checked radio becomes unchecked.
   - "selection follows focus" for arrow keys is the radio contract (unlike tabs/toolbar where arrows only move focus).
2. W3C APG Radio Group pattern page: https://www.w3.org/WAI/ARIA/apg/patterns/radio/ — same contract; notes native-browser differences only for Shift+Tab-into-unselected-group (focus lands last in some browsers — non-normative note). FACT: the pattern page does NOT specify behavior for disabled radios — our locked-card handling is therefore a design call, not a spec requirement (see D).
3. MDN, "ARIA: radiogroup role": https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/radiogroup_role — "User interactions for radiogroups MUST replicate… a group of same-named HTML radio buttons. Keyboard events for tabs, space, and arrow keys MUST be captured." Arrow wrapping is described the same way. FACT: this is the normative-shaped restatement; it explicitly names roving tabindex as "one method" of managing arrow keys.
4. Two equivalent implementation methods are sanctioned: roving tabindex vs `aria-activedescendant` (FACT: both linked from the same APG pages; MDN lists both). Our pick: roving tabindex — FACT (from the same example's own note) that APG presents roving as its primary example; inference (ours): roving fits our re-render-per-selection code better than activedescendant (no id bookkeeping; focus is real, so scroll/visual focus rings work unchanged).

## B. The failure mode this fixes (FACT — issue trackers, past-year)

- Same defect reported independently across projects in 2025–2026: custom `role=radio` pickers where "every preset is a separate Tab stop and arrow keys do nothing" — [Lilstanie/AI_TRIP_PLANNER #516], [yakew7/DesignHub #27], [EV-invest/lib #33] (a library that broke its own ARIA contract by omitting tabindex management), [cjohnstoniv/wardyn #2611], [ubugeeei-prod/uf #279]. This was precisely our state before today's implementation (2026-10-20 doc, verified read).
- Trap (FACT from [uf #279]): if nothing is checked, the tab stop must be on the FIRST item or the group is keyboard-unreachable. Inference (ours): cannot occur in our three groups — a selection always exists (persisted defaults); `moveRadio` still falls back to the first item defensively.

## C. Counter-/anti-research (FACT — what argues AGAINST what we did)

1. Alternative A — native `<input type=radio>`: browsers provide the keyboard behavior for free. Not adopted: our chips/cards are bespoke visual components (72 px canvas-labeled cards); restyling native radios across them is a bigger, riskier diff than ~40 lines of roving code. Inference (ours), consistent with APG's "Read This First" caveat that no example is drop-in production code either way.
2. Alternative B — drop the radio semantics entirely and expose the pickers as toggle buttons (`aria-pressed`) in a plain group — explicitly proposed in [AI_TRIP_PLANNER #516] and [wardyn #2494] as the honest fallback when you won't implement the keyboard contract. Not adopted: the single-choice semantics + announced checked state are genuinely what these pickers are; with the keyboard contract now implemented, keeping `role=radio` is the correct, richer announcement (FACT that both are acceptable designs; inference that radio semantics serve our SR users better).
3. No current source disputes roving tabindex for radiogroups (bounded negative: three searches, past-year freshness; nothing found arguing against it — only the two alternatives above).
4. Vendor/blog sources agreeing with APG were found ([phoca.cz a11y component lab], [equalweb academy], [client-side-form], [accessibility.arizona.edu]) but add nothing beyond the primary sources — treated as corroboration only.

## D. Design calls NOT dictated by the spec (labelled, with reasoning)

- Locked level/character cards (FACT: spec silent — pattern page never discusses disabled radios). Practice observed in [uf #279]: "aria-disabled for a choice that exists but is unavailable" (FACT that the idiom exists; adoption here is our inference). Decision: keep locked cards focusable (they carry unlock-requirement text an SR user should be able to read), mark them `aria-disabled="true"`, and keep our existing deny/shake UX if they're activated. Arrow keys DO land on them (contrast: native disabled radios are skipped by browsers — APG silent; inference: landing is better than skipping because the card is the only place the unlock requirement is stated).
- Home/End keys: FACT — not part of the APG radio keyboard table. We added them (jump to first/last chip) as a labeled superset extension; inference: harmless, useful on 5-chip rows, no source forbids extra keys.
- Space vs Enter on div-based radios: FACT — APG specifies Space (Enter is not in the table). We keep our pre-existing Enter handler as an additional activation key (superset, same inference as Home/End).

## E. What could NOT be verified

- Real screen-reader behavior on our build (no NVDA/VoiceOver on this machine; [qapractices] and [accessibility.build] guides confirm SR testing is the only true check). Keyboard-mechanics pins in test-boot prove handler logic, not announcements. Follow-up owed: a manual SR pass if the user wants certification (NVDA is free on Windows — a local sign-off step, not an agent one).
- Whether any current browser's native radiogroup differs from the APG contract in ways that matter to our users (not re-measured; no source this pass needed).

## F. Implementation deltas this research mandates (applied same turn)

1. Match the confirmed APG keyboard table (our drafted pass already had: one tab stop, arrows move focus AND selection, wrapping, roving follows re-render). [FACT compliance vs sources above]
2. ADD `aria-disabled="true"` on locked cards (level + character selects) so SRs announce "unavailable" — practice from [uf #279]. [design call, documented above]
3. Keep Home/End + Enter as documented superset extensions (labelled here, not silently).
4. No `aria-activedescendant` (single method chosen: roving). [decision + reasoning in A4]
