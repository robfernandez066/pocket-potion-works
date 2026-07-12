# Pocket Potion Works — Consultant Review & Improvement Pass

**Reviewed:** July 12, 2026 · main branch (deployed tester build equivalent)
**Method:** Full source review (`game-logic.js`, `app.js`, `style.css`, `index.html`, `platform-adapters.js`), scripted first-session and seeded late-game playtests at iPhone-13 viewport with screenshots, and deterministic economy simulations (your `economy-simulation.cjs` harness plus new with/without-monetization comparison sims, 5 seeds each).

---

## Executive summary

This is a polished, unusually well-engineered vertical slice. The dark purple cozy aesthetic lands, the CSS-only workshop scene is charming, the tutorial system is state-aware in a way most shipped mobile games never achieve, and accessibility (44px targets, aria-live, reduced motion, focus traps) is genuinely above bar. The bones are good.

The problems are concentrated in three places, and they match your instincts:

1. **Gathering is a non-mechanic.** The 3/3 charge limit refills in 9 seconds total, each tap yields items you'd get passively in ~11 seconds anyway, and the pantry is effectively never scarce after minute two. You never feel the limit because, mathematically, there isn't one.
2. **Monetization boosts are either invisible or game-breaking.** The 2× charm gives a very feelable +114% coins over a 10-minute session (+204 coins from a single ad — about two upgrade purchases early on) but the game never shows it's active. The finish-brew ad has **no cooldown or cap**: simulated ad-spam yields **+3,388% coins and level 9.6 vs level 3.0 in ten minutes**, dissolving the entire brew-timer economy. The bundle is a rounding error (+5%). One placement is too weak to feel, one is felt but invisible, one nukes the game.
3. **Structural friction, not menu count, is the UX issue.** The four-tab layout is fine for this genre. The friction is the brew-here/deliver-there/upgrade-elsewhere tab ping-pong, a very long Workshop scroll, and the tutorial banner physically covering the top bar buttons (it blocked my automated taps on the Market button — a real bug, not a style nit).

The economy also has a quiet structural imbalance worth fixing before any retention push: **prestige at level 8 awards 1 stardust; the daily goal awards 1 stardust for five orders with no reset.** As tuned, rebirth is strictly worse than logging in.

Everything below is evidence, then a prioritized backlog.

---

## 1. Visuals & presentation

**What's working**

- The charcoal/purple palette with gold and green accents is cohesive and reads "cozy night-time alchemy" instantly. Serif display headings ("Your little workshop is *bubbling*") against the rounded UI sans is a strong, distinctive pairing.
- The CSS workshop scene (cauldron, glowing brew, bubbles, shelf bottles, the cat) delivers real personality with zero image assets. The cat is doing heavy lifting; players will screenshot it.
- Cards, chips, and buttons are consistently shaped and spaced; the recipe/order/upgrade card language is uniform. Locked recipes as "Mysterious recipe · Discover at level 2" is good tease copy.
- Empty/ready states are handled ("Your cauldron is ready", green ready-state brew slot with progress bar).

**What needs attention**

- **Toast placement fights the top bar.** Toasts render directly over the resource bar and topbar (screenshots: "Meadow Tonic is bubbling away." covering the brand and coin counts). Coins are exactly what a player wants to watch when a delivery toast fires. Move toasts to bottom-center (above the nav) or make the resource bar the toast (see coin fly-to below).
- **Message redundancy.** After some actions the player simultaneously sees: the fixed tutorial banner, the First Steps card with identical text, and a toast — three stacked messages saying the same thing (screenshot 11b). Pick one surface per event.
- **The workshop scene is static relative to game state.** The brew liquid is always green and bubbling even when the cauldron is idle, and the scene doesn't reflect the potion being brewed (color is right there in `recipe.color`). Cheap, high-value fix: tint `--potion-color` into `.brew-liquid`, pause bubbles when idle, let the cat nap/react on collect.
- **"Gathering 0.18 ingredient/sec · 60 capacity"** is engineering copy leaking into the UI. Nobody feels 0.18/sec. Say "~11 ingredients per minute" or better, show it as garden growth stages.
- Icon glyphs (♧ ⚗ ▤ ●) render inconsistently across platforms/weights — on the tested build they render fine, but Windows/Android fallback fonts will vary. Your `ASSET_PROVENANCE.md` discipline is good; consider committing to inline SVGs for the ~20 icons before store screenshots.

---

## 2. Moment-to-moment gameplay

**First session (scripted playtest, real timings)**

The First Steps quest chain is excellent — every step targeted the exact next control, and the cross-view "Go now" prompt correctly deep-linked and highlighted targets. First brew at ~30s, first delivery inside 90s, first upgrade purchasable around 2 minutes. Your sim harness enforces these windows; they held up in live play. No first-session stalls. This part is ship-quality.

**Where the moment-to-moment sags**

- **The core loop's only real verb is "wait."** Brew timers (30s→125s) are the pacing spine, and while waiting the player has… gathering (see below) and menu browsing. There is exactly one cauldron with no queue, so an engaged player spends most of a session unable to act on the primary system. Options that preserve the cozy pace: a second brew slot as a level-6/prestige unlock, or a short "prep" interaction that banks a head-start on the next brew.
- **Gathering, quantified.** Passive income is 0.18/sec (~11/min). A charged tap gives +2 items; charges refill one per **3 seconds**, full 3/3 in 9 seconds. Sustained tapping is ~40 items/min vs 11/min passive, and Meadow Tonic consumes 3 items per 30s brew (0.1/sec). Ingredients stop being scarce during minute one; the 60-cap pantry fills from passive alone in ~5.5 minutes and the gather button's failure state is "Your pantry is full." The 3/3 limit never binds — you designed a charge system and then tuned it out of existence. (In my scripted run, tap-tap-tap hit "Garden recharging" for all of ~2 seconds before a charge returned.)
- **RNG gathering undermines intent.** `addRandomIngredients` picks uniformly from unlocked ingredients (with a bias assist only for the Clarity tutorial). Post-level-4, needing 2 Sun Ember means mashing a random-loot button. The player has no way to *want* something and act on it — that's the missing satisfaction, more than the tap feel.
- **Collect requires a precision tap that rebuilds under your finger.** `renderBrew` rewrites the slot's innerHTML every tick while brewing; the Collect button is re-created each second, so a tap timed with the tick can miss. Render the button once and update text/disabled state instead.
- **Delivery loop is tab ping-pong.** Brew in Workshop → deliver in Orders → buy in Upgrades → back to Workshop. The order dot helps, but a "Deliver" affordance on the Workshop potion shelf (or a swipe-up order tray) would let a full loop happen without leaving the primary view.

---

## 3. Hooks, retention & complexity

**Present and working:** level unlock ladder (each level 2–7 unlocks a recipe and/or ingredient — good "one more level" pull), daily goal with visible progress, achievements, offline progress with a welcome-back modal, discovery journal seeds, prestige for long-horizon.

**Structural gaps**

- **Content ceiling is level 7; prestige gate is level 8.** The last new thing unlocks at 7 (Starlight Philter), then the player grinds a dead level to reach rebirth. Baseline 20-minute sessions reach ~level 4; level 8 is hours away with nothing new en route. Either move prestige to 7 or put something at 8.
- **Prestige is strictly dominated by the daily goal.** Rebirth at L8 = `floor((8−6)/2)` = **1 stardust**, wiping coins/level/upgrades/recipes. Daily goal = 5 orders → 50 coins + **1 stardust**, wiping nothing. Nobody who does the math will ever prestige. Fix by scaling: e.g. prestige awards `level − 6` stardust plus a keepsake (cosmetic bottle, cat accessory), and/or make daily stardust a rarer weekly reward.
- **Orders have no texture.** Twelve customers with flavor lines is a lovely base, but orders are interchangeable coin faucets — no timers, no rare "special requests," no relationship progression (your roadmap already flags this; I'd promote it, it's the cheapest depth you can add on existing systems).
- **Complexity is well-budgeted overall** — 6 ingredients / 8 recipes / 5 upgrade tracks is right for a cozy idle slice. The upgrade screen, though, is five linear stat buttons; the roadmap's "mutually interesting paths" note is the right instinct. Even one either/or choice per prestige would add decision texture.

---

## 4. Monetization review — is it "worth it"?

Setup per `showMarket`: **Prosperity charm** (rewarded ad → 2× order coins, 5 min), **Finish current brew** (rewarded ad, offered when ≥30s remain), **Apprentice bundle** (one-time IAP → 100 coins + 10 ingredients). All simulated placements — correct call at this stage, and the honest labeling is good.

I ran the same active-player script through five monetization profiles, 5 seeds, 10- and 20-minute sessions:

| Profile (10 min) | Coins earned | Orders | Level | Upgrades | Ads |
|---|---|---|---|---|---|
| Baseline | 449 | 9.6 | 3.0 | 5.2 | 0 |
| Charm (re-watch on expiry) | 962 (**+114%**) | 9.8 | 3.0 | 8.8 | 3 |
| Finish-brew (uncapped) | 15,648 (**+3,388%**) | 66.8 | 9.6 | 26.8 | 76 |
| Bundle only | 472 (+5%) | 9.8 | 3.0 | 6.2 | 0 |
| All three ("whale") | 31,733 (**+6,974%**) | 67.2 | 9.2 | 32.0 | 76 |

Single-ad marginal value: one charm at t=0 → **+204 coins over the session (+46%)** — roughly two early upgrades from one ad.

**Verdicts per placement**

- **Prosperity charm: felt, fairly priced, but invisible and effectively permanent.** +46% per ad is a boost the player will notice in their coin counter — this one passes your "worth it" test. Two flaws: (a) after activation there is **no boost indicator anywhere** outside re-opening the market modal ("Active now") — no countdown, no 2× badge on order rewards, no glow on the coin counter, so the player can't *see* the thing they watched an ad for; (b) it can be re-watched the moment it expires, making it a de-facto permanent 2× that devalues the Golden Ledger upgrade (+12%/level) and stardust (+10% each). Add a visible countdown pill in the resource bar and a soft cap (e.g. 3–4 charms/day) or escalating durations instead of unlimited re-watch.
- **Finish-brew: economy-breaking as specified.** No cooldown, no cap, available on any brew with ≥30s left. Even at a self-limited 1-ad-per-3-minutes it's +40% coins and +1 level over baseline; a determined player collapses the timer system entirely (level 9.6 in 10 minutes vs 3.0). Since brew timers are the game's only pacing mechanism, this placement sells the removal of the game. Fix: cap (e.g. 3/day), or convert to "halve remaining time," or restrict to brews ≥60s remaining with a per-brew once rule. Note also the modal lists it as "available while brewing" but the action button silently vanishes when <30s remain — the offer row and the button disagree.
- **Apprentice bundle: too weak to feel.** 100 coins ≈ 4–5 minutes of baseline play, and the 10 random ingredients are under a minute of passive income. +5% session impact will not register as a purchase moment. Starter bundles earn their keep by selling a *moment* (e.g. "unlock your second cauldron slot early + a cosmetic cat bandana + 150 coins"). If it stays coins-only, it needs to be sized against upgrade costs (enough for the first two upgrades at once, ~135–155 coins minimum) and shown at a moment of want (player short on an upgrade).
- **Discovery problem:** the Market lives behind an unlabeled ✦ icon that is *disabled* until the first order — and the explanation is a `title` tooltip, which doesn't exist on touch. (The in-code toast explaining the lock is unreachable because the disabled button can't fire it.) Players may never learn the market exists. Keep it enabled and show the "complete your first order" explainer inside.
- **Modal layout:** offers are listed as three info rows, then the actual actions are separate stacked buttons below — the offer card isn't the button. Make each offer row the tappable CTA with its own button inline.

Your roadmap's "no production monetization before retention is proven" stance is right. The work above is still worth doing now, because you're using the prototype to learn whether boosts *feel* worth it — and currently the answer is distorted by one broken placement and one invisible one.

---

## 5. Your three developer questions

**1. "Gathering needs a rework — the 3/3 limit is never felt and tapping isn't satisfying." — Confirmed, with data.**
See §2: the limit mathematically never binds (9s full refill vs 30–125s brew timers) and taps are worth ~11s of passive income. But I'd push back on one framing: the problem isn't tap *feedback* (the +2 particle and sound are fine), it's that **no decision or scarcity exists**. A rework should make charges rare and meaningful rather than making taps flashier:

- Recharge one charge per **60–90s** (not 3s), raise yield to be worth a brew's worth of ingredients (+6–10, scaling with Basket), and make the charge counter a visible resource in the workshop header. Now 3/3 is a stock you spend deliberately.
- **Let the player aim.** Charged gather targets an ingredient of choice (or a location: Garden = herbs/mushrooms, Cave = crystal/ember…), while passive stays random. This single change converts gathering from filler into planning, and directly serves "I need 2 Sun Ember for this order."
- Offline/passive stays as is — it's tuned fine.

**2. "Can we add simple puzzle mechanics, maybe in gathering?" — Yes, and gathering is the right site, with one caution.**
The caution: this is a cozy idle game; a *mandatory* skill gate breaks the contract. Make the puzzle the *charged* gather (optional, better yield), keep a plain instant gather available. Options in ascending effort:

- **Pick-3 foraging patch (recommended):** spending a charge opens a 3×3 patch of face-down cards seeded from a deterministic RNG; player flips 3. Shown briefly face-up first (memory), or with one "peek" — matching pairs double that ingredient. 5–8 seconds, thumb-only, fits the fiction, trivially skippable. Reuses your ingredient icons/colors wholesale.
- **Stir-the-cauldron timing ring** on brew start (tap inside the moving arc → 10% brew speed bonus, "Perfect!" gives a quality star). Adds a micro-skill moment to the loop's other dead spot. Pairs beautifully with the roadmap's per-recipe mastery.
- **Order-matching micro-puzzle** (arrange 3 potions to satisfy overlapping customer preferences) — save this for the customer-relationship phase; don't build it now.

Avoid anything requiring precision drag or >10s attention; those fight the genre.

**3. "Menu-based by design, but can menus be moved/collapsed?" — Keep the tabs; fix the flow.**
Four bottom tabs is the correct skeleton for this game and I would not turn it into draggable/collapsible chrome — that's complexity players don't ask for. Do this instead:

- **Collapse within Workshop:** Pantry and Recipes as collapsible sections (remember state), with the pantry defaulting to a single-row summary strip (icons + counts) that expands on tap. The Workshop's long scroll is the real "menu problem."
- **Bring delivery to the workshop:** when any order is fulfillable, show a compact "Ready to deliver: Mira · Meadow Tonic · +22●" strip under the cauldron with a Deliver button. The Orders tab remains the full noticeboard; the loop stops requiring it every cycle.
- **Sticky cauldron status:** when scrolled past the brew slot (or on other tabs), show a mini brew timer chip in the top bar — tap to jump. This also gives the boost countdown a home.
- Recipe list: default to a compact row (icon, name, time, Brew) with tap-to-expand for costs, instead of every card full-height.

---

## 6. Bugs & defects found while testing

1. **Tutorial banner blocks the top bar (P0).** The fixed banner overlays Market/Settings and intercepts taps; it has no close control and only dismisses via "Go now" or navigating to its target view. My automation could not click `#marketButton` through it; a human thumb can't either. Give it an ✕, auto-dismiss after ~6s, and/or move it below the resource bar (`style.css` `.tutorial-banner`, `app.js` `showTutorialTransition`).
2. **Market lock reason is unreachable on touch (P1).** Disabled button + `title` tooltip only; the explanatory toast in `showMarket` can never fire because disabled buttons don't click. Keep the button enabled; explain the lock in the modal.
3. **Finish-brew offer row/button mismatch (P1).** Modal lists "available while brewing" but the action disappears when remaining <30s; no cooldown/cap exists at all (see §4).
4. **Collect button rebuilt every tick (P2).** `renderBrew` innerHTML rewrite while brewing can eat taps; also re-attaches a listener every second.
5. **Boost has no active-state UI (P1).** `state.boostUntil` is only reflected inside the market modal.
6. **Toasts occlude the resource bar (P2).** Delivery toasts cover the coin counter at the moment coins change.
7. **Not a bug, flagging intent:** `GATHER_CONFIG.rechargeSeconds = 3` looks like a debug value that shipped; if it was meant to be 30–90s, that alone explains your "never feel the limit" note.

---

## 7. Prioritized action list

**P0 — before the next playtest round**
1. Tutorial banner: add dismiss ✕ + auto-hide + reposition below resource bar (blocks core buttons).
2. Cap the finish-brew ad (3/day or once per brew, ≥60s remaining) — it currently invalidates every economy conclusion drawn from testers who find it.
3. Add an active-boost countdown chip to the resource bar (gold ●2× 4:32) so the charm is visibly worth it.

**P1 — core feel (one focused sprint)**
4. Gathering rework: 60–90s recharge per charge, +6–10 yield, targeted gathering (choose ingredient or location); keep passive as is. Surface charges as a first-class resource in the header.
5. Pick-3 foraging patch as the optional charged-gather interaction (the puzzle answer that fits the fiction).
6. Deliverable-order strip in Workshop + sticky brew-timer chip; collapse Pantry/Recipes sections.
7. Move toasts to bottom-center; one message surface per event (retire the duplicate banner/card/toast overlap).
8. Prestige rebalance: reward `level − 6` stardust (L8→2, L10→4) + a cosmetic keepsake; reconsider daily stardust → weekly.

**P2 — depth & monetization tuning (next)**
9. Charm: 3–4/day soft cap or escalating durations; consider stacking rule vs Ledger so the upgrade isn't dead during boosts.
10. Bundle: resize to a felt moment (≥150 coins + something permanent/cosmetic); surface contextually when the player is 1 upgrade short, not only via the ✦ icon.
11. Stir-timing micro-interaction on brew start, feeding per-recipe mastery (roadmap "Next" item — this is the right one to build first).
12. Tint `.brew-liquid` with the active recipe's color; idle cauldron stops bubbling; cat reactions on collect/level.
13. Move prestige gate to level 7 or add a level-8 unlock so the ladder doesn't dead-end before its capstone.
14. Second brew slot as prestige/level unlock (adds decision without breaking pacing).
15. Replace "0.18 ingredient/sec" with human units; audit glyph rendering (consider inline SVG icon set).

---

## Appendix — simulation detail

- Harness: your `game-logic.js` consumed directly (same functions the app calls); active-player script gathers every 3s, acts every 5s, buys cheapest affordable upgrade; 5 seeds (7, 42, 2026, 99, 1234); deterministic LCG matching `economy-simulation.cjs`.
- 20-minute horizon: baseline 1,197 coins / L4.2; charm 2,807 (+134%); finish-brew uncapped 30,656 (+2,461%, L12.6, 148 ads); bundle 1,295 (+8%); all three 61,172 (+5,010%).
- Finish-brew with self-imposed cooldowns (10 min): every ≥180s → 627 coins (+40%), ≥120s → 802 (+79%), ≥60s → 1,073 (+139%). Even "polite" usage of the placement outpaces the charm.
- Your existing `economy-simulation.cjs` (12 runs) and `verify.cjs` pass on the reviewed build; first-brew/first-delivery/level-2 milestone windows reproduced in live scripted play.
- Live playtest: local serve of the reviewed commit (github.io unreachable from the sandbox; build is byte-identical to deployed main), Playwright, iPhone-13 viewport, fresh save + seeded level-8 save. 20 screenshots captured across tutorial, all four tabs, market, boost activation, prestige confirm, and settings.
