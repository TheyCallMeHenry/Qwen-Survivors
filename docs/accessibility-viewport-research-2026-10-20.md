# Accessibility & viewport research — 2026-10-20

Accessed 2026-10-20 (date anchored via shell `date` as its own call). Topic: the three a11y items reported by the session-37 UI sweep (pinch-zoom blocked; arrow keys captured from menus; `role=radiogroup` widgets without the standard keyboard pattern). Search: Brave (primary key); one request in flight. Sources are official (W3C/WCAG/APG) + implementation guides + real project issue trackers; vendor/SEO copy treated as claims only.

## Item A — pinch-zoom blocked by `maximum-scale=1, user-scalable=no` (index.html:5)

Facts (each: claim + source):

1. Disabling user scaling fails WCAG 1.4.4 "Resize Text" (Level AA: text must reach 200% without loss of content/functionality). Named failure technique G175; axe-core's `meta-viewport` rule flags exactly this tag combination as critical. — https://rocketvalidator.com/accessibility-validation/axe/4.12/meta-viewport ; https://accessibilitychecker.org/ace/engine/ace-meta-viewport-scale/ (rule text mirrors axe-core; axe-core is the tool, not fetched this session — inference from two mirrors).
2. A stricter companion rule wants zoom to 500% (`meta-viewport-large`). — https://rocketvalidator.com/accessibility-validation/axe/4.13/meta-viewport-large
3. Browser enforcement is uneven: Chrome (Android) and Firefox (Android) still honor the disable; iOS Safari and Samsung Internet largely ignore it for pinch (Safari's ignore is tied to its accessibility zoom behavior; iOS additionally uses `maximum-scale` to suppress its auto-zoom-on-focus only). HTTP Archive: ~24% desktop / ~29% mobile homepages still try to disable scaling. — https://daily.dev/posts/please-stop-disabling-zoom-k7z4xdp1w ; https://github.com/walletbeat/walletbeat/issues/1422 ; https://github.com/schancel/frank/issues/402 (secondary sources; consistent across three trackers — no official browser doc fetched this session; iOS-version nuance = could not verify against Apple docs directly).
4. The classic *legitimate* reason for the hack — iOS Safari auto-zooming the page when a text input with font < 16 px gets focus — has a clean fix that keeps pinch-zoom: make inputs ≥ 16 px. — https://css-tricks.com/16px-or-larger-text-prevents-ios-form-zoom/ ; https://stackoverflow.com/questions/2989263/disable-auto-zoom-in-input-text-tag-safari-on-iphone

Repo facts (verified this session by read):

- This game has ZERO `<input>` elements (`grep '<input' index.html` → none) → the auto-zoom scenario the hack historically defends cannot occur here.
- `#game` (the whole playfield canvas) already has `touch-action: none` (css/main.css:32) → pinch/double-tap browser gestures are already suppressed *on the game surface itself*, independent of the meta tag. The meta tag's gameplay protection is therefore redundant; removing it would only re-enable zoom on menus/HUD — exactly where low-vision users need it.

Inference (labeled): removing `maximum-scale=1, user-scalable=no` while keeping `width=device-width, initial-scale=1, viewport-fit=cover` should pass the axe `meta-viewport` rules and cannot regress gameplay on the canvas (protected by `touch-action`); gameplay HUD/menu zoom *could* change layout expectations for very high zoom levels (page zoom reflowing our absolute-positioned HUD) — not tested; that's the honest downside, and it's the user's accessibility trade-off to accept, per WCAG it's the *blocked* zoom that's the defect.

## Item B — arrow keys always `preventDefault`'d (js/core/input.js:11,58)

Facts:

1. WCAG 2.1.1 (Keyboard, A): functionality must be operable through a keyboard interface without requiring key timings — if an on-screen scrollable region has no keyboard scroll path and no other access path, it can fail; WCAG 2.1.2 (No Keyboard Trap, A): focus must be movable away using standard keys (Tab, arrows, Escape). — https://wsc.us.org/wcag-212-no-keyboard-trap ; https://www.uxpin.com/studio/blog/wcag-211-keyboard-accessibility-explained/ (guide summarizing the SC; canonical SC text at w3.org/TR/WCAG21 not fetched this session — inference).
2. Arrow keys are the conventional *within-widget* navigation keys (menus, radio groups, sliders); Tab is the between-widgets key; a Tab-only design is WCAG-acceptable when everything reachable is a focusable element. — https://www.reddit.com/r/accessibility/comments/1620orz/... (community guidance, consistent with APG below).

Repo facts: the capture is deliberate game design (arrow keys move the menu backdrop preview / drive the game); keyboard users can Tab to every button (chips, cards) and activate with Enter/Space (Space deferral fixed in sweep). The residual defect is only *scrolling* tall menus with the keyboard — mouse wheel and touch scroll still work. Inference: this is a minor 2.1.1 gap (alternative pointing input exists = mouse wheel), NOT a trap (Tab always moves focus out); leave-or-polish is a taste call, not a compliance red line.

## Item C — `role=radiogroup` without roving tabindex (screens.js duration chips / level cards)

Facts:

1. The W3C ARIA Authoring Practices define the radiogroup pattern: one tab stop for the whole group, arrow keys move selection/focus — implemented via "roving tabindex" (one `tabindex="0"`, rest `-1`) or `aria-activedescendant`. — https://www.w3.org/WAI/ARIA/apg/patterns/radio/examples/radio/ ; https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/
2. Current repo state (verified read): chips are `role=radio` buttons in a `role=radiogroup` container navigated by Tab. Screen readers announce the group/role and state correctly; only the *within-group arrow-key* expectation is unmet. Inference from APG conformance: Tab-through-radios violates the announced pattern's keyboard contract → SR users pressing arrow keys on a radio will silently change selection semantics inconsistently (real SR behavior not tested this session — could not verify without an SR).

Fix cost (inference): roving tabindex + 2 key handlers ≈ 10–15 lines in screens.js; low risk.

## Not verified / open

- Apple/Google official statements on viewport enforcement (used secondary trackers; claims consistent across ≥3 independent sources).
- axe-core rule sources (mirrored, not fetched).
- Screen-reader behavior for the current chip markup (needs manual SR test; flagged, not claimed).

## Bottom line for this repo (decision inputs)

- Item A: remove `maximum-scale=1, user-scalable=no`; keep the rest. Zero inputs + existing `touch-action: none` make the hack's benefits here nil and its a11y cost concrete. Recommendation: strong.
- Item B: keep arrow-key capture (it's the game); optional enhancement = allow wheel-free keyboard scroll via a fallback. Recommendation: keep as-is; logged.
- Item C: adopt roving tabindex for duration/level chip groups. Recommendation: yes (cheap, standard, SR-visible benefit).
