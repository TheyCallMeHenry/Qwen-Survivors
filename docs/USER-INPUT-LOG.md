# USER INPUT LOG

> **RULE (binding — AGENTS.md non-negotiable 8 / D63):** Capture-before-reason. Any non-denylisted human-user message → the FIRST tool call of the turn appends an entry below (insert after the `## Entries (newest first)` line) — no analysis/planning/research/implementation may precede the write; this log is the only durable copy of the user's words (measured: context recall degrades with token position/total length; compaction silently drops critical items). Denylist (never document): the session kick-off prompt (exact text, banner optional — see AGENTS.md #8), bare control words (unless answering a pending agent question), commonly-repeated template prompts, explicit user opt-out (“DO NOT DOCUMENT…”), agent-side content. **Precedence:** denylist match → never document (the doubt tiebreaker does NOT apply to denylist matches); otherwise, when in doubt, document.
>
> **Entry format (newest first):**
> - `### YYYY-MM-DD HH:MM TZ — short title`
> - **Received:** date + time (user-provided time if in the message, else date only)
> - **Classification:** `bug report` | `feature request` | `design decision` | `answer/approval` | `feedback` | `process rule`
> - **Context:** one line (max ~20 words) — what the input responds to / triggers
> - **Verbatim input:** the user's complete message, their words, verbatim, unmodified (fenced block) — no omissions, no meta-line trimming

---

## Entries (newest first)

### 2026-09-04 — Approval: merge to main + publish Pages (explicit rule-7 ask)
- **Received:** 2026-09-04 (no time in message; date only)
- **Classification:** `answer/approval`
- **Context:** Answers the flagged publish decision (Pages staleness = root cause of the garlic/blades-invisible report) — explicit publish request; ff-merge overnight-2026-08-22 -> main + push main.
- **Verbatim input:**

```
Yes, also perform the necessary merge to get the updated version active on Pages.
```


### 2026-09-04 — Approval: push the committed work
- **Received:** 2026-09-04 (no time in message; date only)
- **Classification:** `answer/approval`
- **Context:** Answers the pending push/publish question (rule 7) — push authorized for the work branch; merge to main / Pages publish NOT requested.
- **Verbatim input:**

```
Push the committed work.
```


### 2026-09-04 — Approval: commit the current (partial Phase 22) work
- **Received:** 2026-09-04 (no time in message; date only)
- **Classification:** `answer/approval`
- **Context:** Answers the session's flagged commit/publish decision (rule 7) — commit authorized; push/publish not requested.
- **Verbatim input:**

```
Go ahead and commit.
```


### 2026-09-04 — Approval: proceed with recommended plan (Phase 22, 22.1 first)
- **Received:** 2026-09-04 (no time in message; date only)
- **Classification:** `answer/approval`
- **Context:** Answers the session's pending question — approves Phase 22 (22.1 audit first, then 22.2/22.3/22.4), incl. AGENTS.md restore finding.
- **Verbatim input:**

```
Yes, proceed according to your recommended plan.
```


### 2026-09-04 — Session kick-off + new ask: codebase-improvement assessment alongside next-step proposal
- **Received:** 2026-09-04 (no time in message; date only)
- **Classification:** `process rule`
- **Context:** Kick-off prompt WITH substantive addition — wants improvement areas from a codebase assessment, not just next-step proposal.
- **Verbatim input:**

```
Please review this project's documentation to get up-to-speed on the current status of development and implementation then propose your recommendation for the step(s) we should complete within this new session - including areas of potential improvement based on your assessment of the current codebase.
```


### 2026-08-28 — Research: smarter alternative to the verbatim user-input capture rule
- **Received:** 2026-08-28 (no time in message; date only)
- **Classification:** `process rule`
- **Context:** User requests research for an optimal, intelligent rule capturing important user decisions/feedback without blind verbatim logging.
- **Verbatim input:**

```
1. Please review the current project rule which dictates the necessity to immediately verbatim document user input, then do the following:

**CRITICAL NOTE:** You **MUST** thoroughly validate **ALL** assumptions by performing **ALL** of the following steps:
2. **BEFORE SEARCHING THE WEB AND/OR PERFORMING WEB RESEARCH YOU *MUST* VERIFY TODAY'S REAL-WORLD ACTUAL DATE TO ENSURE YOUR RESEARCH IS GENUINELY UP-TO-DATE AND ACCURATE. THIS STEP *CANNOT* BE BATCHED WITH THE RESEARCH STEPS, AND IS 100% CRITICAL AND NON-NEGOTIABLE.**
3. Perform targeted web research based on the most up-to-date, evidence-based, data-/outcomes-driven, sources-cited, marketing-claims-aware/marketing-claims-avoidant, hype-aware/hype-avoidant data/best practices as they pertain to effectively, efficiently, optimally, and intelligently establishing an agent rule which achieves a similar effect to the current verbatim user input documentation rule, but which functions more optimally and more intelligently and forces immediate capture and documentation of actionable/important user decisions, key data/information from user responses to agent questions, actionable/important user feedback/added informational context, and any other similar actionable, important, and/or critical user-provided data/information - **BUT** without "blindly" verbatim documenting practically every user-provided/-made input.
4. You must then immediately document your findings within a uniquely/appropriately named documentation file which is purpose-built/-formatted to enable enacting/implementing a solution based on your findings during a later turn/session.
5. Report back to me with a **VERY BRIEF** (*≤ 20 lines*) rundown of your findings.
```

### 2026-08-28 — Full documentation sync: carry determinations/findings/troubleshooting into future sessions
- **Received:** 2026-08-28 (no time in message; date only)
- **Classification:** `process rule`
- **Context:** Post-publish-handoff + BitDefender incident; user wants a complete, accurate docs carry-over before continuing.
- **Verbatim input:**

```
Update all pertinent/relevant project documentation to ensure a complete and accurate representation of the current project, including all determinations, findings, research, testing, troubleshooting approaches/attempts/resolutions, and any-and-all other data which needs to be carried over into future sessions.
```

### 2026-08-28 — BitDefender block report: harness network-diagnostic one-liner flagged "Malicious command line"
- **Received:** 2026-08-28 (no time in message; date only)
- **Classification:** `bug report`
- **Context:** User shares the BitDefender block log for the harness's TLS-diagnostic command; confirms pushes must go via the user's own terminal.
- **Verbatim input:**

```
From within BitDefender mere moments ago: "Malicious command line detected
now

Feature:
Antivirus

The app C:\Program Files\PowerShell\7\pwsh.exe was passed a malicious command line and has been blocked. Your device is now safe.

Command line: "C:\Program Files\PowerShell\7\pwsh.exe" -NoLogo -NoProfile -NonInteractive -Command "[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); $OutputEncoding = [System.Text.UTF8Encoding]::new($false); node -e \"const https=require('https');const r=https.get('https://github.com',res=>{console.log('node TLS OK:',res.statusCode);res.destroy();process.exit(0)});r.on('error',e=>{console.log('node TLS FAIL:',e.message);process.exit(1)});setTimeout(()=>{console.log('node TLS TIMEOUT');process.exit(1)},15000)\"; certutil -urlcache -f -split https://github.com 2>&1 | Select-Object -Last 2""
```

### 2026-08-28 11:09 -04:00 — Playtest defect report (3 items) against the published GitHub Pages build — docs-only turn
- **Received:** 2026-08-28 11:09 -04:00 (no time in message; system time at capture)
- **Classification:** `bug report`
- **Context:** User's only test channel = the published GitHub Pages build; three defect reports; docs-only turn per user instruction.
- **Verbatim input:**

```
**NOTE:** I don't see the features of the updated version in the playable GitHub Pages version of the game - this is how I perform all testing.

**Additional Notes:**
Qwen Survivors Bugs:
1. The visual effects / sprites for some of the weapons are no longer visible (*and possibly not causing damage - uncertain*), including the garlic, aegis blades, and possibly others (*unless confirmed correct sprite appear in the below listed weapons*).
Confirmed still working (*purely based on visuals still appearing correctly - damage/effects should still be carefully reviewed*): Twin Fangs, Spectral Axe, Moonbolt Wand, Sunder Bombs, Pyre Lance

2. If an exp shard gets dropped in a place completely inaccessible/unreachable by the player - i.e.: the middle of the ice pond and/or any other potentially non-player-character-traversable spots - then the shard should get pushed away from the center of the non-player-character-traversable spot until it reaches the outer perimeter/edge of the non-player-character-traversable spot.

3. Exp shards on M03 are too similar in color to the health/heart pick-ups making it difficult for the player to discern the difference while playing.

**UPDATE ALL NECESSARY DOCUMENTATION APPROPRIATELY *ONLY* - DO NOT BEGIN IMPLEMENTING FIXES IN THIS TURN.**
```

### 2026-08-28 — Approve commit + push of the DSH workspace access doc fixes

**Received:** 2026-08-28 (no time in message; date only)
**Classification:** `answer/approval`
**Context:** Approves committing and pushing the AGENTS.md/PROGRESS.md/input-log changes from the malformed-cwd investigation.
**Verbatim input:**

```
yes
```

### 2026-08-28 — Malformed workspace cwd report (duplicated C:\Users\ajbro prefix) from a separate DSH session

**Received:** 2026-08-28 (no time in message; date only)
**Classification:** `bug report`
**Context:** User pasted a separate DSH session's report that its working directory does not exist on disk.
**Verbatim input:**

```
The following is from a separate session where I attempted to perform development work within this DeepSeek Harness on the linked project:

The reported working directory doesn't actually exist on disk — the path has a duplicated `C:\Users\ajbro\` segment, which looks malformed. Let me find where the project actually lives.
```

### 2026-08-28 09:18 EDT — DSH environment documentation request (junction access + future-session docs)

**Received:** 2026-08-28 09:18 EDT
**Classification:** `process rule`
**Context:** Junction to the D: project created; user wants durable docs so future DSH sessions work the project correctly.
**Verbatim input:**

```
Please generate instructional/informative documentation - whatever would be necessary to ensure future sessions within DeepSeek Harness will automatically understand how to correctly, effectively, and optimally perform the necessary development and implementation work.
```

### 2026-08-23 — 11.9 rescope: mute reposition dropped (mute lives in Pause Settings)

**Received:** 2026-08-23 (no time in message; date only)
**Classification:** `design decision`
**Context:** Co-op minimap task rescope — mute already moved to Pause-menu Settings (13.8/D48), so only the pause button moves near the minimap.
**Verbatim input:**

```
since the mute button is now in the settings menu disregard the original request to move it for multiplayer as this no longer applies
```

### 2026-08-22 — Unsupervised overnight development mandate

**Received:** 2026-08-22 (no time in message; date only)
**Classification:** `process rule`
**Context:** User going to bed; agent develops overnight unsupervised with backup/branch/commit cadence.
**Verbatim input:**

```
I - the human user - am going to be going to bed for tonight. I need you - the Zed IDE AI agent - to perform ongoing development according to / following the existing plan documentation throughout the night without any supervision and/or approval required from me.
**YOU MUST IMMEDIATELY CREATE A CATASTROPHY-PROOF FULL-PROJECT BACKUP AND ZIP IT BEFORE PERFORMING ANY FURTHER DEVELOPMENT/IMPLEMENTATION WORK. DO THIS RIGHT NOW.**

#1 ONGOING PRIORITY: **ALWAYS** update documentation **BEFORE** considering **ANY** task as complete. This will be your greatest defense against context-drift / context-compressions.

**When in doubt, refer to the following (listed in order of reliability):**
1. This project's existing documentation and/or the verbatim user notes.
2. Web searches/research into whatever topic you're uncertain about.
3. Your own judgement.

If you encounter a situation that would require my input in order to complete the task(s) and/or proceed simply implement placeholder and flag it for future user review/revision.

Create a new working branch for this project **IMMEDIATELY AFTER CREATING THE LOCALLY SAVED FULL-PROJECT RECOVERY BACKUP ZIP**. Upon completion of each task+documentation update, proceed to stage, commit, and push your updates to this new branch. **DO NOT OVERWRITE, EDIT, UPDATE, OR OTHERWISE MAKE CHANGES TO THE MAIN BRANCH FROM THIS POINT ON UNTIL I - the human user - REJOIN YOU / CHECK-IN WITH YOU TOMORROW.**
```

### 2026-08-22 — VS DOES have skip/reroll/banish on the level-up screen (user correction)

**Received:** 2026-08-22 (no time in message; date only)
**Classification:** feedback
**Context:** Corrects my research assumption: VS has skip/reroll/banish on the level-up screen, not as level-up cards.
**Verbatim input:**

```
As someone who has played literal hundreds of hours of Vampire Survivors, I can tell you with 100% certainty that VS **DOES** have "Reroll", "Banish", "Skip" features.
The Banish, Reroll, and Skips are **NOT LEVEL-UP SELECTIONS THEMSELVES** they are added features present on the level-up screen which enable the player to skip the current level-up (and gain ~66% EXP towards the next level-up), reroll their level-up card options, or banish a select level-up card to ensure it does not reappear in the level-up card options for the remainder of that run.
```

### 2026-08-22 — Batch design input: gameplay/weapon/item/character ideas + 3 bug reports (document only)

**Received:** 2026-08-22 (no time in message; date only)
**Classification:** `feature request` / `bug report`
**Context:** Batch of design input to be folded into planning docs only (no implementation this round) + three in-game bugs.
**Verbatim input:**

```
**DOCUMENT THE FOLLOWING *ONLY* - DO NOT BEGIN DEVELOPMENT/IMPLEMENTATION THIS ROUND. INCORPORATE THESE INTO PLANNING DOCUMENTATION BASED ON MODERN DEVELOPMENT BEST PRACTICES AND SENSIBLE FEATURE CLUSTERING.** Additional specifics can/will be determined/decided upon at a later time - document as-is for now.
**Additional Gameplay Ideas:**
1. Display currently equipped weapon and item icons beneath character XP bar. Include a number next to each weapon's icon which displays that weapon's current level at all times throughout the run.
2. Display Pyre Lance ammo/fuel beneath the player character (currently appears above the player character).
3. Passive items should **NOT** default to level 1 for the player upon starting a new run. The player should need to select them from the level-up offerings. This also ensures multiplayer sessions do not encounter issues with overlapping passives/items.
4. Incorporate selectable run durations: 5 mins (default), 10 mins, 15 mins, 20 mins (max set-time duration), and "ENDLESS" (play "forever" until the player dies). Depending on the selected run duration the player(s) should encounter a boss event at 4:00, 9:00, 14:00, 19:00, and every 5 minutes during ENDLESS runs. To ensure I'm explaining this sufficiently clearly - based on this approach, players would experience 3 boss events during a 15 minute run - one at 4:00, one at 9:00, and one at 14:00. The same pattern applies to all of the listed potentially selectable run durations.
5. "SKIP", "BANISH", and "RE-ROLL" options available on level-up screen (after each has been initially unlocked via the meta-progression store in the Main Menu). Can also be upgraded within the meta-progression store to grant additional uses during runs (maximum of 5 uses per run *each*). **THESE ARE *NOT* EQUIPPABLE ITEMS** and are **NOT SELECTABLE CARDS** during level-ups and **CANNOT BE LEVELED-UP** mid-run/during level-up screens. Perform web research into how similar "bullet-heaven"-style games incorporate these SKIP, BANISH, and RE-ROLL features for additional insight/context into their functionalities.
 
**Additional Weapon Ideas:**
1. Tank Cannon - straight-line explosive shell weapon with big-damage but small AoE; pierces through 1st targeted enemy it hits then terminates with small AoE explosive blast upon contact with a 2nd enemy.
2. Continuous laser beam - medium-range continuous beam; damages all enemies that contact the continuous beam; has a long cool-down between shots.
3. Wolf "summon"/companion (counts as a weapon slot) - **MUST** stay within 3 character-spans distance from the player character that summoned it (*selected it in the level-up cards*) at all times; autonomously dashes/pounces on the nearest enemy; cannot pounce more frequently than once every 2 seconds; high single-target damage; causes DoT "bleed" effect for 3 seconds on pounced enemy.
4. Rolling Boulder - spherical boulder (limitation: can only roll in cardinal directions) - long cool-down between releases; automatic instant kill on the smallest sized enemies when they're hit by the boulder; rolls in a straight line and damages all enemies hit, but does less and less damage to each subsequent enemy hit after the first; max enemies hit before projectile terminates: 6; has a "crumble" effect upon projectile termination; no more than 1 boulder on-screen at a time (even if the cooldown has ended, if the previously released boulder projectile is still present on-screen then must wait until it terminates before the next boulder can be released).
5. Web-slingers - (*Spider-man influenced*) shoot strands of web which burst into a small AoE web and briefly hold in-place enemies hit by the burst of web.
6. Gatling Gun - *very* high rate-of-fire but *very* low damage per bullet weapon with moderate "reload" time (3 second long reload); fires 40 bullets per reload.
7. Baseball Bat - very close-range (melee) weapon; very brief pause between swings; has very high knock-back effect on enemies; has a 1-in-500 chance to perform a "Homerun" hit which 1-hit-KO's any single enemy other than level bosses; "Homerun" hit causes aesthetic-/visual-only (no damage) firework to pop up and burst over the player character's head.
8. Frog Tongue - lashes out at enemies, latching onto them and dragging them close to the player character; imparts a very small DoT "poison" effect; enemies killed by the initial damage from getting hit by the tongue are eaten/consumed by the player character and this restores an amount of HP determined by the size/max health of the consumed enemy.
9. Cannonball - the player's character quickly tucks into a ball-esque shape, then is propelled very rapidly at the nearest enemy. The player's character's position becomes wherever they impacted the enemy. Can only "fire" once every 10 seconds. Each level of upgrade to the Cannonball attack enables the player's character to bounce/ricochet to an additional nearby enemy, doing very slightly less and less damage to each subsequent enemy hit after the first; max enemies hit before projectile terminates: 6. The player's character is invulnerable during the Cannonball attack/animation(s).


**Additional Run-Equip-able Item Ideas:**
1. Mirror Shield: (ricochets enemy projectiles back at them - maximum blocked/ricocheted projectiles = 3-projectiles-every-5-seconds.
2. Ice Skates: player's movement becomes "slippery" similar to older games like the original DOOM and others where the player continues to "slide"/move a short distance after releasing the movement direction key(s). Positive effect of the Ice Skates: Increased player character movement speed (and increased inertia/sliding of the player character based on the level of the Ice Skates). If/when the player's character slides into an enemy while the Ice Skates are equipped, both the enemy and the player take a small amount of damage proportionate to the current level of the Ice Skates - maximum impact damage for the player and enemy = 6 HP (at max-level Ice Skates).


**Additional Playable Character Ideas:**
1. Werewolf - default weapon: Wolf summon
2. Stone Golem - default weapon: Rolling Boulder
3. Baseball Player - default weapon: Baseball Bat
4. Giant Toad - default weapon: Frog Tongue
5. Wild West Gunslinger - default weapon: Twin Fangs


**Errors, Issues, Bugs, etc.:**
1. I'm not seeing the falling snow effect in Map01 anymore.
2. Player weapon projectiles appear to originate from the player character's feet - they should originate from a higher point somewhere closer to the mid-torso region of the player's character.
3. Pyre Lance's flame length needs to be extended by approximately +33%. Additionally, when the player character is moving while the Pyre Lance is firing the flame ends up appearing as though it's a trail behind (opposite the current movement direction) the player's character - I'm uncertain what the best method to improve/resolve this would be; perhaps imparting directional momentum/inertia upon the flame based on the player's character's direction? I don't know - you would likely know better than I would how to effectively improve/resolve this. Additionally, the flame needs to extend out/flow toward enemies at least 2-times as fast as it currently does - currently it often barely appears before it has killed the enemy it was flowing towards.
```

### 2026-08-22 — Tailscale-on-NAS (DS124) chosen for multiplayer hosting

**Received:** 2026-08-22 (no time in message; date only)
**Classification:** design decision
**Context:** Selects Tailscale on the user's Synology DS124 as the hosting solution for multiplayer sessions.
**Verbatim input:**

```
I just downloaded and connected to my Tailscale network on my Synology DS124 NAS. Please document that I want to use that solution for hosting multiplayer sessions of this game.
```

### 2026-08-22 — 11.6.1 O stat values approved with 3 revisions

**Received:** 2026-08-22 (no time in message; date only)
**Classification:** answer/approval
**Context:** Approves the proposed per-character stat values for the 11.6.1 roster with three numeric revisions (mage/ranger HP+speed, warden speed).
**Verbatim input:**

```
I approve your recommended character stat values with only the following revisions:
1. Mage HP: 60; SPD: 275
2. Ranger HP: 110; SPD: 320
3. Warden SPD: 230
```

### 2026-08-22 16:05 EDT — Denylist addition: session kick-off prompt (rule #8)

**Received:** 2026-08-22 16:05 EDT
**Classification:** `process rule`
**Context:** User extends the rule #8 denylist — adds the session kick-off prompt as a never-verbatim-document template (first turn the capture-before-reason rule is live).

**Verbatim input:**

```
Add the following to the *do not verbatim document this user input*:
**IMMEDIATE INSTRUCTIONS:**
Please review this project's documentation to get up-to-speed on the current status of development and implementation then propose your recommendation for the phase(s)/step(s) we should complete within this new session.
```

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
