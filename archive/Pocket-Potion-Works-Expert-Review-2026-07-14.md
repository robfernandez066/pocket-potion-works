# Pocket Potion Works: Mobile Cozy Idle Game Expert Review

**Review date:** July 14, 2026  
**Canonical product name:** Pocket Potion Works  
**Repository:** C:\Users\robbi\Documents\Projects\newgame  
**Report status:** Temporary review input for PM evaluation, not a new source of truth

## Scope and method

This review was performed without changing the project. Nothing under **archive/** was opened, searched, summarized, cited, or used. The repository does not currently contain an active **docs/** directory; the active product and release documents are at the repository root.

The review covered:

- active roadmap, execution queue, release, device, privacy, platform, asset, and README documents;
- gameplay, UI, economy, persistence, offline-progress, audio, service-worker, and platform-adapter code;
- the checked-in automated tests and simulations;
- a live playtest of the public tester at https://robfernandez066.github.io/pocket-potion-works/;
- a complete gather → brew → collect → deliver → upgrade pass at 390×844;
- responsive and action-hierarchy checks at both 390×844 and 360×740;
- browser console errors and warnings;
- a small market-positioning sanity check against current official store descriptions for comparable cozy/passive games.

The live test was a focused product review, not a full release-certification pass. It does not clear or replace the pending rows in **release-browser-evidence.json** or **DEVICE_TEST_MATRIX.md**.

## Executive verdict

Pocket Potion Works is a strong, unusually disciplined vertical slice. The core loop is understandable, the game is respectful of the player's time, the first-session guidance works, and the project already contains more authored content and technical safety than many prototypes.

It is not yet a full-length cozy idle game.

The main gap is not a lack of buttons, currencies, timers, or broad systems. The main gap is **durable authored purpose after the modeled first prestige cycle**. The checked-in three-seed simulation reaches it in roughly 42–44 minutes, but that is not established human playtime. Most current meta-progression is either exhausted during that first cycle or becomes mechanically repetitive. The twelve Villager Special Requests and keepsakes provide the best existing multi-day hook, but the game needs a clearer bridge from first rebirth to longer-term village, mastery, and personalization goals.

The strongest proposed direction for PM and owner triage is below. It is not implementation authorization; Task 15 remains the only active next item.

1. Finish the current After the Stars owner acceptance gate.
2. Verify and, if accepted, fix trust-critical save, date, achievement, and progression-accounting defects.
3. If approved, improve the action hierarchy and make Smart Mix, villagers, and orders feel more intentional.
4. After Task 15 and owner scope selection, consider piloting one bounded, non-expiring paired-villager chapter using the existing reserved order slot.
5. Consider bounded mastery and rebirth collection endpoints before another recurring system.

Do not solve the runway problem with another currency, another cauldron, an endless level curve, or expiring events.

## What the game already does well

### A clear and functional core loop

The live loop is coherent:

- charged or targeted gathering;
- deterministic recipe costs;
- timed one-bottle brewing;
- manual collection;
- a three-slot order board;
- upgrades with exact before-and-after previews;
- a level-7 Starry Rebirth.

The seven-step First Steps flow responds to actual game state and provides cross-view prompts rather than assuming a fixed click sequence. The live test successfully advanced from the first Meadow Tonic through two deliveries, level 2, the first upgrade, an improved charged harvest, and the Clarity Elixir prompt.

### Respectful cozy boundaries

The current design avoids several common retention traps:

- no streak punishment;
- no expiring requests;
- no automatic order consumption;
- no real advertising or billing;
- no forced account or cloud dependency;
- bounded Journal, achievement, chain, and special-request rewards;
- reversible, economy-neutral Workshop Looks;
- a four-hour elapsed offline cap;
- passive gathering that preserves room for manual harvests.

These are worth protecting. The game's strongest identity is “a small place I am happy to return to,” not “a dashboard that punishes me for leaving.”

### Strong technical foundations

The project has:

- versioned gameplay saves at schema v8;
- v1–v7 migration coverage;
- future-save overwrite protection;
- rollback-reader fixtures;
- deterministic gameplay and economy simulations;
- reduced-motion behavior;
- safe-area support;
- mostly 44px-or-larger controls;
- local audio and assets;
- no runtime dependency or remote font;
- an explicit boundary around fake platform and monetization adapters.

During this review, **npm.cmd run check** passed all syntax, gameplay, economy, platform, audio, lifecycle, service-worker, save-compatibility, security, and budget checks. The automated release check still correctly reported the manual browser/device gate as pending.

### A useful content foundation

The current build already includes:

- 7 ingredients;
- 12 recipes across levels 1–7;
- 3 mastery ranks per recipe;
- 5 upgrades with 33 total ranks;
- 12 recurring villagers;
- 36 trust story beats;
- 12 one-time Villager Special Requests;
- 12 keepsakes;
- 8 achievements;
- 4 collection goals;
- 3 finite rolling request chains;
- 7 Workshop Looks;
- 4 After the Stars errands.

The issue is not raw feature count. It is how quickly those features resolve and how lightly some of them touch the moment-to-moment play.

Primary evidence: **README.md:30–43**, **GAMEPLAY_ROADMAP.md:13–22**, and **game-logic.js:19–150**.

## Live playtest findings

### What worked

At 390×844:

- the game opened into a fresh, understandable state with 30 coins, three charged harvests, and enough ingredients for Meadow Tonic;
- the first brew consumed the exact ingredients and completed after its displayed 30-second timer;
- collection granted XP and surfaced a ready-delivery shortcut;
- the first delivery activated passive gathering;
- the second delivery reached level 2 and made an upgrade affordable;
- buying Bottomless Basket correctly changed charged harvest output from +3 to +4;
- a subsequent charged harvest visibly granted the improved amount;
- the First Steps prompt kept pointing to the next relevant action;
- no horizontal overflow was observed;
- no browser console errors or warnings were reported.

At 360×740:

- the document width matched the available content width, with no horizontal overflow;
- the fixed bottom navigation remained reachable;
- the game remained operable and readable;
- the active Orders layout showed a hierarchy problem described below.

Audio was turned off in Settings before the gameplay loop.

### Live evidence for F-12 — The opening order board feels generated rather than authored

The first board contained three Meadow Tonic requests, which is expected because Meadow Tonic is the only level-1 recipe. Two requests were from Postmaster Pip with two of his three stock lines. That duplicate customer presentation is legal under the current generator, but it weakens the fantasy immediately: the board reads like randomized reward cards rather than three villagers arriving with distinct needs.

This becomes more noticeable because every villager can request every unlocked recipe, customers are selected uniformly, and each villager has only three ordinary request lines.

Evidence: live playtest; **game-logic.js:90–102** and **642–657**.

### F-08 — Core order actions begin below secondary progress cards

The Orders view places the Daily Goal and Rolling Request Chain ahead of the ordinary orders.

Measured at 360×740:

- the “Customer orders” heading began around y=357;
- the Daily Goal occupied approximately y=441–577;
- the Rolling Request Chain began around y=595 and extended beyond the viewport to approximately y=807;
- no ordinary order card was visible in the initial viewport.

Measured at 390×844:

- the first ordinary order card did not begin until approximately y=771;
- only the top of that card was visible, while its action remained below the fold.

This is the wrong priority for a short-session idle game. The player opens Orders primarily to deliver a bottle. Daily and rolling progress are useful context, but they should not consistently delay the core action.

Recommended direction:

- put ready ordinary orders first;
- collapse secondary progress into compact summary rows;
- expand a card only when it is claimable or explicitly opened;
- keep the active special/quest tracker compact and preserve the two ordinary slots.

#### Related short-height Workshop cost

At 360×740, the top viewport contains the header, resources, First Steps, hero copy, the workshop scene, and gathering. The cauldron and recipe actions require scrolling.

The current First Steps shortcuts mitigate this for a new player, but the underlying hierarchy still matters after onboarding. A short-height layout should compress the decorative hero/scene once the player has completed the tutorial or when a brew/collection action is ready.

This should be validated as a feel question rather than treated as an automatic redesign: the workshop scene carries much of the game's charm. The goal is to preserve atmosphere while keeping the next meaningful action near the thumb.

### The feedback loop is strong, but some state is noisy

The game communicates:

- brew timing;
- ingredient ownership;
- order readiness;
- XP and level changes;
- upgrade deltas;
- achievement readiness;
- collection progress.

That clarity is a strength. The risk is that daily goals, rolling chains, Journal red dots, tutorial prompts, the market, mastery, trust, and cosmetics compete too early. The opening should emphasize one main objective plus one optional secondary objective.

## Current player runway

| Horizon | Current experience | Assessment |
| --- | --- | --- |
| Base recipe times of 30–125 seconds | Gather, wait on one brew, collect, deliver | Clear, but a single one-bottle timer becomes repetitive; upgrades and the fake assist can shorten it |
| Roughly 4–5 modeled active minutes | Complete five orders and claim the daily | Good short-session target, not yet established human timing |
| 42–44 modeled minutes | Reach level 7 and first Starry Rebirth in 31–32 orders | Strong vertical-slice simulation envelope, not established human playtime |
| First cycle | Finish all three rolling chains in as few as 22 deliveries if each parcel is actively claimed; reach most early achievements | Too short to function as medium-term retention |
| 12 successful daily claims | Generate up to twelve invitations; invitations can be banked and requests finished later when their recipes are unlocked | Strongest existing multi-day hook |
| Beyond that | Complete trust, mastery, repeat rebirths, collect remaining Looks | Too little authored payoff; repeated cycles remain structurally similar |

Evidence: **GAMEPLAY_ROADMAP.md:15–22**; **game-logic.js:19–23**, **142–150**, **720–815**.

## Must address or explicitly revisit

The P0/P1/P2 labels below are expert-proposed severity for PM triage, not accepted project priority. Each finding should be reproduced or otherwise verified before it is added to **coder-tasks.json**.

| ID | Proposed severity | Evidence class | Finding |
| --- | --- | --- | --- |
| F-01 | P0 | Code-inspection defect; not live-reproduced | Storage exceptions can stop startup, and adversarial numeric saves can cause long loops/runaway progression |
| F-02 | P1 | Code-inspection defect | Save Now can falsely report success |
| F-03 | P2 | Code-inspection resilience gap | Malformed-save recovery lacks quarantine, and an above-level active brew can normalize |
| F-04 | P1 | Code-inspection defect; narrow foreground condition | Midnight rollover can mis-credit daily progress |
| F-05 | P2 | Code-inspection defect | Some achievements appear after, rather than on, their triggering action |
| F-06 | P2 | Code-inspection defect/definition conflict | “Lifetime coins” excludes level-up coins |
| F-07 | P1 | Code/UI contract mismatch | Smart Mix is not order-aware |
| F-08 | P1 | Live reproduced at both target sizes | Secondary progress cards precede core order actions |
| F-09 | Validation required | Code-inspection risk; not manually confirmed | Ordinary rerenders may lose keyboard focus |
| F-10 | P1 | Calculated product hypothesis | The practical idle window is usually far shorter than four hours |
| F-11 | P1 | Calculated economy risk | Stardust creates unbounded permanent coin inflation |
| F-12 | P1 | Live evidence plus code-backed product hypothesis | Duplicate-looking orders and uniform trust targeting create a random long tail |
| F-13 | P2 | Product-depth hypothesis | Friendship payoff is mostly detached from live play |
| F-14 | P1 | Code-backed product-depth hypothesis | Recipes and upgrades offer limited strategic choice |
| F-15 | P2 | Automated-simulation risk | Fake market boosts distort content/economy evidence |
| F-16 | P2 | Automated release constraint | Runtime capacity is effectively exhausted |
| F-17 | P2 | Code-inspection production caveat | Offline music is opportunistic |

### F-01 (P0 proposed) — Storage and adversarial-save hardening

The project correctly states that local saves are untrusted, but several paths do not fully honor that boundary.

1. **Storage denial can prevent startup.** Gameplay loading calls localStorage.getItem without a guard. The platform-state store also reads and writes without catching storage exceptions.
2. **Several numeric values are effectively unbounded.** Saved XP and ordinary-order XP/reward can normalize up to Number.MAX_SAFE_INTEGER. XP is consumed through while loops, so a hostile or severely corrupted save can cause a long startup/delivery loop or runaway progression.

Recommended acceptance direction:

- guard all storage reads and writes;
- enter a clear “progress cannot be saved in this browser” mode when storage is unavailable;
- cap XP, coins, stardust, stats, order rewards, and order XP to deliberate safe bounds;
- add targeted tests for storage exceptions and adversarial numeric saves.

Evidence: **app.js:77–86**, **130–135**, **987–1007**; **platform-adapters.js:78–92**; **game-logic.js:427–580**, especially **431–433**, **512–533**, and **539–565**.

### F-02 (P1 proposed) — Save Now can falsely report success

saveState catches a failed localStorage.setItem, logs a warning, and still returns true. Settings then shows “Workshop saved.”

Recommended direction:

- return false on a failed write;
- keep the truthful error distinct from future-version overwrite protection;
- add a storage-exception test for the user-facing result.

Evidence: **app.js:130–135**, **987–1007**.

### F-03 (P2 proposed) — Recovery and brew-normalization gaps

- A malformed-save parse starts fresh, and the normal render path schedules a save. There is no quarantined raw backup, second slot, or recovery/export path.
- A saved active brew can reference a known recipe above the saved player level.

Recommended direction:

- reject an active brew whose recipe is not unlocked;
- decide whether the production target needs one raw recovery copy or local export before a malformed value is replaced;
- do not let this resilience enhancement silently broaden into accounts or cloud save.

Evidence: **app.js:210–242**; **game-logic.js:512–580**.

### F-04 (P1 proposed) — Foreground midnight rollover can mis-credit and erase progress

Daily reset occurs during renderAll, not during the one-second tick. If the game remains foregrounded across midnight:

- the old daily card can remain visible;
- the first new-day delivery can increment the old day's counter;
- the following render can reset that counter, effectively losing the delivery;
- an unclaimed previous-day reward may remain claimable briefly.

Recommended direction:

- perform the monotonic date check before any action that reads or changes daily state;
- also run it during the foreground tick;
- add a deterministic test for a delivery and claim across midnight without a reload.

Evidence: **app.js:210–242**, **1114–1132**; **game-logic.js:669–698**, **824–827**.

### F-05 (P2 proposed) — Achievements do not always unlock on the triggering action

Green Thumb increments its statistic in manualGather, but that action does not call checkAchievements. Cozy Improvements has the same problem after buyUpgrade. A weekly parcel that crosses 500 lifetime coins can likewise delay Pocketful of Gold.

The achievements eventually appear after a later checked action or reload, but the celebratory moment is missed and the behavior can look broken.

Recommended direction:

- centralize achievement evaluation in the gameplay mutation layer or call it after every qualifying mutation;
- test each achievement at the exact triggering action, not only after normalization/reload.

Evidence: **game-logic.js:142–150**; **app.js:721–728**, **786–793**, **836–843**, **1089–1111**.

### F-06 (P2 proposed) — “Lifetime coins” is not actually lifetime coins

Level-up coins are added to the wallet but not to stats.coinsEarned. The Journal labels that statistic “Lifetime coins,” and Pocketful of Gold uses it.

Choose and document one definition:

- all coins ever earned, in which case level-up and every other reward source must count; or
- trade/reward income only, in which case the label and achievement wording should change.

Evidence: **game-logic.js:618–626**; **app.js:645–649**.

### F-07 (P1 proposed) — Smart Mix does not consistently do what its label promises

The UI describes Smart Mix as gathering “needed” or “useful” ingredients. In normal play it samples unlocked ingredients uniformly. Near the passive cap, it protects the Clarity tutorial requirement and then falls back to the first unlocked recipe, Meadow Tonic. It does not inspect current orders, a pinned recipe, or ingredient deficits across the board.

Recommended direction:

- weight ingredients missing from ready/current orders;
- weight the tutorial target when one exists;
- preserve targeted harvesting as the stronger guaranteed choice rather than making Smart Mix automatically optimal;
- use a transparent fallback that maintains a small balanced reserve;
- update the label if the behavior remains random.

This is a high-value improvement because it makes offline and charged gathering more likely to enable a meaningful return action without adding another system.

Evidence: **game-logic.js:837–847**; **app.js:262–269**, **343–348**.

### F-09 (manual validation required) — Keyboard focus may be vulnerable after ordinary gameplay actions

Most views are rebuilt with innerHTML after brewing, delivering, upgrading, and claiming. That creates a code-backed risk that the focused control is removed without a general focus-restoration strategy. Modal focus behavior is stronger, but focus loss was not reproduced in this review and remains a targeted manual validation question.

Recommended direction:

- restore focus to the replaced card, next logical action, or view heading;
- preserve expanded/collapsed state;
- test ready delivery, upgrade purchase, achievement claim, and order refresh with keyboard only.

Evidence: **app.js:210–241**, **474–497**, **622–698**, **730–810**; pending manual scope in **DEVICE_TEST_MATRIX.md:15–21**.

### F-10 (P1 proposed) — The practical idle window is far shorter than four hours

The four-hour value caps elapsed time, but the 60% Pantry soft cap usually stops progress first.

At base offline efficiency:

- offline gain is approximately 3.12 items per minute;
- an empty level-7 Pantry without shelf upgrades reaches its 72-item passive cap in about 23 minutes;
- even an empty level-7 Pantry with maximum shelf upgrades at base garden speed reaches its 162-item passive cap in about 52 minutes;
- garden upgrades make the cap arrive sooner.

This means a one-hour and a four-hour absence often produce the same result. The game is technically four-hour capped but functionally a short-check-in idle game.

The PM should make an explicit product decision:

- If that short cadence is intentional, change the player-facing promise from “up to four hours” to language centered on a Pantry reserve.
- If longer absences should matter, decouple offline accumulation from the current soft cap, use a diminishing curve, or reserve order-aware ingredient bundles at meaningful intervals. Do not simply inflate the Pantry with four hours of linear output.

Required simulation:

- 15 minutes, 1 hour, and 4 hours;
- empty and half-full Pantry;
- levels 2, 4, and 7;
- low and high Garden/Shelves combinations;
- percentage of returns that enable at least one current order.

Evidence: **game-logic.js:9–12**, **405–410**, **851–906**.

### F-11 (P1 proposed) — Stardust creates unbounded permanent economy inflation

Every daily claim grants one stardust, every rebirth grants at least three, and each stardust adds 10% to order coins. There is no cap, sink, diminishing return, or competing use.

Thirty daily claims alone produce +300% order coins before rebirth rewards. Fixed upgrade costs then become progressively trivial, and Starry Rebirth loses its distinct economic identity.

Recommended direction:

- simulate 14, 30, and 90 daily claims plus 1, 3, 5, and 10 rebirths;
- cap the multiplier contribution or use a transparent bounded milestone curve;
- strongly consider making permanent stardust primarily a rebirth reward;
- after all invitations are earned, keep any replacement modest and bounded; do not gate unique story or mastery progress behind calendar attendance;
- preserve the daily as optional and non-streak-based.

Evidence: **game-logic.js:18**, **410–421**, **720–726**, **798–815**.

### F-12 (P1 proposed) — Trust completion has an avoidable random long tail

Full trust requires at least 108 deliveries: nine per villager across twelve villagers. Signature and After the Stars deliveries can contribute to that total, but ordinary customer selection is uniform even when some villagers are already at maximum trust. A 15-coin refresh replaces only the first ordinary order and there is no pity, favorite-villager, or under-trust weighting.

Recommended direction:

- test a bounded preference for under-trusted villagers rather than removing randomness;
- avoid exact-looking duplicate customer-plus-recipe cards when enough alternatives are eligible, while still allowing meaningful repeat visits;
- add recipe-aware and trust-aware request lines;
- consider one low-friction “pin this villager” choice after the first rebirth;
- retain randomness for texture, not as the sole gate on collection completion.

Evidence: **game-logic.js:15**, **75–102**, **642–682**, **818–821**.

### F-13 (P2 proposed) — Friendship and narrative rewards are too detached from play

Trust stories are one-sentence Journal entries and a small coin claim. A heart gain does produce a friendship-favor toast, and After the Stars is an existing shared four-villager sequence, but there is no authored heart scene or recurring visible villager reaction during normal play.

Recommended direction:

- show a short, skippable two- or three-beat moment when a trust heart is earned;
- keep the full text in the Journal afterward;
- add recipe-aware reactions and paired-villager chapters;
- use cosmetic Workshop changes to make relationships visible.

### F-14 (P1 proposed) — The core economy offers limited strategic choice

The game presents recipe and upgrade progression clearly, but choice is shallow:

- the paired recipes at levels 4–7 share identical base time and sell-value economics within each level;
- orders determine which potion is useful, so the player rarely chooses a recipe for a distinct strategic property;
- the five upgrades are linear ranks without branches, loadouts, tradeoffs, or persistent specialization;
- “Harvest,” “Brewing,” and “Trade” are category labels rather than build paths.

Before committing to prestige albums or multiple new chapters, owner playtesting should determine whether players feel they are making a build or merely buying the cheapest affordable upgrade.

Recommended direction:

- compare cheapest-first, theme-first, and balanced upgrade play in simulations and owner playtests;
- prototype one meaningful but reversible choice inside an existing system before creating a new progression layer;
- keep recipe choice deterministic and cozy—no hidden quality odds or failed brews.

Evidence: **game-logic.js:43–73** and the checked-in economy strategy simulations.

### F-15 (P2 proposed) — The fake market should not shape content or retention evidence

The fake market is clearly labeled. Its top-bar button is visible from the beginning with a locked explanation, and its offers unlock after the first delivery. It occupies prime attention before the game has a durable endgame.

Current simulations show large balance distortion:

- the five-minute 2× charm raises scripted coins by about 124% at 10 minutes and 158% at 20 minutes;
- quick finish raises coins by about 79% and 103%;
- the 20-minute quick-finish script invokes more than twenty simulated ads.

These are prototype contract tests, not healthy product targets.

Recommended direction:

- evaluate content depth and economy only on the no-boost baseline;
- keep market work on hold;
- if monetization is revisited, do not sell stardust, trust, invitations, basic idle comfort, or relief from deliberately created friction.

Evidence: automated output from **monetization-simulation.cjs**; hold boundary in **GAMEPLAY_ROADMAP.md:46–54**.

### F-16 (P2 proposed) — Runtime capacity is effectively exhausted

The current runtime is 23,945,066 of 24,000,000 bytes, leaving only 54,934 bytes. The music dominates the footprint.

Implications:

- new text and data-driven quests are feasible;
- palette variants and code-native decorations are feasible;
- more large raster art or audio is not feasible without compression, removal, or an explicit budget revision; remote streaming is not an ordinary workaround because it conflicts with the current local/offline runtime boundary;
- new content planning must include footprint before art production begins.

Evidence: **RELEASE_READINESS.md:15–22** and **release-budgets.json**.

### F-17 (P2 proposed) — Offline music is opportunistic rather than guaranteed

The game shell is install-cached, but the three music tracks are not in the install shell. A track works offline only if a successful non-Range response entered the runtime cache; the service worker deliberately does not cache Range responses, which browser audio commonly uses. The game remains usable, but “offline music” varies by request and prior cache history.

This is acceptable for the tester if documented. It should be an explicit production decision later.

Evidence: **audio-feedback.js:8–12** and **service-worker.js:1–25**.

## Recommended content and system direction

All C-series items are proposals for PM feedback and owner selection. None is approved work.

### C-01 — Best next content expansion: one Village Chapter pilot

If selected after Task 15 acceptance, create one permanent, non-expiring paired-villager chapter that reuses:

- the existing reserved Orders slot;
- existing villagers;
- existing recipes;
- normal one-bottle economics;
- the Journal;
- one economy-neutral cosmetic reward.

Suggested pilot: **The Moonfair Supper**

- featured villagers: Mira the Baker and Nell of the Mill;
- unlock: After the Stars complete plus a modest combined-trust requirement;
- length: four to six authored deliveries;
- structure: short dialogue beat → request → normal delivery → visible village consequence;
- board rule: preserve two ordinary order slots;
- arbitration: offer the chapter only when the reserved slot is free; never evict an active Villager Special Request or After the Stars step, never consume an invitation, and let the player explicitly choose when to begin;
- reward: one reversible shelf dressing, window detail, or Journal spread;
- timing: no expiration and no calendar lock;
- economy: no effect on the first-cycle level-7 envelope.

Why this is the strongest next bet:

- it deepens existing characters instead of adding a thirteenth shallow villager;
- it gives the player a medium-term post-rebirth purpose;
- it uses the safest low-footprint content format;
- it tests whether authored village arcs improve return intent before a large content commitment.

If the pilot works, a six-chapter set can use all twelve villagers:

1. Mira + Nell — The Moonfair Supper
2. Old Moss + Fern — The Rainpath Garden
3. Juniper + Bea — The Moonmoth Honey Concert
4. Pip + Captain Wren — The Kind Roads Map
5. Lady Bramble + Tink — The Conservatory Contraption
6. Rowan + Archivist Sol — The Patchwork Archive

Do not approve all six at once. Build and owner-playtest one bounded chapter first.

### C-02 — Make trust milestones feel like events

When a villager earns a heart:

- pause only long enough for an optional compact moment;
- show a distinct portrait mark, line, or Workshop visit;
- preview the next relationship reward;
- archive the scene in the Journal;
- avoid turning the moment into a large modal every time.

This strengthens the emotional reward without creating a new progression system.

### C-03 — Add mastery projects using the existing mastery data

Recipe mastery already survives rebirth and has three ranks. Give it visible collection endpoints:

- every recipe at rank 1;
- three recipes at rank 3;
- all original eight recipes at rank 3;
- all twelve recipes at rank 3.

Suitable rewards:

- bottle labels;
- shelf dressing;
- Journal illustrations;
- a favorite-potion badge;
- cosmetic cauldron steam or bottle glints.

Avoid large coin rewards. The point is identity and completion.

### C-04 — Later candidate: a bounded Constellation Album for rebirth milestones

Rebirth needs authored endpoints beyond “more multiplier.”

Possible milestones such as rebirths 1, 3, 5, and 8 should be treated as examples, not tuning. Do not require eight structurally identical cycles until multi-rebirth playtests prove that the cycle itself stays interesting.

Each milestone unlocks:

- a short story page;
- one visual layer or Workshop decoration;
- a new paired-villager chapter or mastery project;
- a clear completion state.

This creates a long-term spine without endless prestige scaling. It can be represented by durable flags rather than a new spendable currency.

### C-05 — Later candidate: turn Workshop Looks into mixable expression

The seven current looks are mutually exclusive whole-workshop presets. A later personalization pass could split them into a few reversible slots:

- palette/window;
- shelf dressing;
- hanging charm;
- counter keepsake.

The player should be able to display several earned relationships and accomplishments at once.

A local **Workshop Postcard** can then combine the selected décor, favorite potion, mastery badges, and favorite villager into a shareable image. This creates social feeling without accounts, leaderboards, or a backend.

### C-06 — Later experiment: mastered-potion finishing notes

The current alchemy is recipe selection, not experimentation. A safe, cozy way to add choice is an optional mastered-potion “finishing note”:

- unlock only after a recipe reaches a mastery threshold;
- choose one extra existing ingredient;
- add a deterministic tag such as Bright, Calm, or Steady;
- certain authored villagers prefer a tag;
- no failed potion, hidden odds, or wasted rare material;
- use primarily for dialogue, chapter routing, or cosmetic Journal variants rather than a large power multiplier.

This should be a later prototype, not the next implementation task. It requires careful mobile UI and content authoring.

### C-07 — Conditional quality-of-life: small batch brewing

If owner playtesting confirms that repeated one-bottle brewing becomes the main post-rebirth annoyance, allow a mastered recipe to brew two or three bottles in the same cauldron:

- ingredient cost scales linearly;
- time scales transparently;
- no second cauldron;
- no endless auto-queue;
- no premium bypass;
- unlock through mastery or a bounded rebirth milestone.

Do not build this based only on theory. First confirm the repetition problem in owner playtests.

## Hooks that encourage return without pressure

| Return horizon | Hook | Cozy implementation |
| --- | --- | --- |
| Seconds to 2 minutes | Brew/charge ready | Clear local notification state inside the game; no urgency |
| 3–5 minutes | Next deliverable order or trust heart | Show “one bottle until Pip's next heart” and the exact recipe |
| 15–60 minutes | Meaningful garden return | Order-aware ingredient recap and a clear first action |
| Daily | Five-order goal and special-request invitation | No streak, no missed-day loss, bounded rewards |
| Several days | Village Chapter steps and keepsakes | Permanent chapters; resume exactly where the player stopped |
| Weeks | Mastery projects, Constellation Album, all-trust goal | Visible endpoints and cosmetic/narrative rewards |
| Long-term expression | Workshop décor and postcard | Local, reversible, no backend required |

### Specific return-hook improvements

1. **R-01 — Homecoming recap**  
   After a meaningful absence, show one compact, non-blocking recap rather than another mandatory claim screen. It can cover:
   - finished brew;
   - gathered ingredients;
   - orders now ready;
   - new Journal items;
   - clearest next action.

2. **R-02 — Heart-earned highlight**  
   Current cards already show trust progress. Add a stronger preview only when this specific delivery will earn a heart, including what that heart unlocks.

3. **R-03 — Pinned project**  
   Let the player pin one mastery goal, chapter, or villager objective. The Workshop then shows one unobtrusive progress line.

4. **R-04 — Order-aware garden**  
   Make a return more likely to enable one current order instead of merely increasing total stock.

5. **R-05 — Visible consequences**  
   Completed chapters and keepsakes should change small Workshop details, request text, or villager greetings.

6. **R-06 — Non-expiring festival albums, only if themed updates are later approved**  
   Release them as permanent albums that can be started at any time. Do not use countdowns or one-time missable rewards.

## Suggested sequencing

This is a proposed decision sequence only. It does not authorize work after Task 15, change any queue status, resume Tasks 6 or 10, or replace the owner's selection of the next bounded scope.

### Phase 0 — Finish and harden

- Complete Task 15 owner acceptance for After the Stars.
- Reproduce or otherwise verify F-01 through F-07.
- Prioritize any accepted trust-critical save/storage and midnight fixes.
- Resolve lower-severity achievement and Lifetime coins semantics in proportion to confirmed impact.
- Validate keyboard focus only when an accepted change or targeted accessibility task makes it relevant; do not turn deferred release evidence into a content blocker.

Exit condition: no trust-critical correctness issue remains, and the current active gate is closed.

### Phase 1 — Deepen the existing loop

- Put ready orders above secondary meta cards.
- Gently weight Smart Mix toward board deficits or rename it honestly, while preserving targeted harvesting as the guaranteed focused option.
- Avoid exact-looking duplicate customer-plus-recipe cards when alternatives exist.
- Test a bounded under-trust customer weighting without eliminating random variety.
- Add recipe-aware/trust-aware request lines.
- Add compact trust-heart moments.
- Add a richer, non-blocking Homecoming recap.
- Add the first mastery collection endpoint.

Exit condition: a first-cycle and early post-rebirth playtest feels like helping villagers, not cycling anonymous reward cards.

### Phase 2 — Pilot one Village Chapter

- If the owner approves it after Task 15, build The Moonfair Supper or another owner-selected paired-villager pilot.
- Reuse the reserved slot and preserve two ordinary orders.
- Keep it permanent, compact, low-footprint, and economy-neutral.

Exit condition: owner and observed playtesters can explain the chapter goal, want to see the next beat, and understand the cosmetic consequence.

### Phase 3 — Choose one evidence-dependent long-term candidate

- Consider a Constellation Album, later mastery projects, all-trust recognition, or mixable Workshop expression only after the pilot and repeated-cycle playtests establish the actual retention gap.
- Select one bounded candidate rather than approving the whole set.

Exit condition: after rebirth, the player can name a goal for tomorrow and a goal for the next several weeks.

### Phase 4 — Only if evidence supports it

- small batch brewing;
- mastered-potion finishing notes;
- a larger set of paired-villager chapters.

## What not to add now

- a second cauldron;
- another recurring currency;
- an endless level curve;
- randomized recipe failure;
- competitive leaderboards;
- fake guilds;
- account, cloud, analytics, or backend dependencies;
- expiring events, login streaks, or missed-day penalties;
- ad-gated idle comfort;
- asset-heavy music or art packs without a runtime-budget decision;
- a large navigation layer for a single small feature.

## Recommended validation before roadmap approval

### Risk-proportionate validation for accepted gameplay work

#### Product and economy

- Run 14/30/90-day stardust simulations.
- Run 1/3/5/10-rebirth simulations.
- Measure first-cycle and post-rebirth time-to-goal without fake market boosts.
- Simulate all-trust completion across many seeds, including worst-case villager distribution.
- Test offline returns at 15 minutes, 1 hour, and 4 hours from empty and half-full Pantries.
- Track whether a return enables a current order, not just how many ingredients it grants.

#### Mobile UX

- Re-run the full loop at 390×844 and 360×740 after any hierarchy change.
- Count scrolls/taps to gather, brew, collect, and deliver.
- Confirm the first ready order action appears without searching.
- Test short-height devices, not only narrow widths.
- Re-check keyboard focus when an accepted change affects focus or list rerendering.

#### Qualitative owner/observed playtest questions

- After ten minutes, what does the player believe the long-term goal is?
- After first rebirth, can the player name what they want to do tomorrow?
- Which villager does the player remember, and why?
- Does the player understand what stardust changes?
- Does returning after an hour feel meaningfully different from returning after fifteen minutes?
- Is the first desired action visible without searching?

Do not add production analytics to answer these questions. Owner playtests, observed sessions, deterministic simulation, and structured notes are sufficient at this stage.

### Deferred release-only evidence

The following remain Task 6 release gates and should not become prerequisites for the next content task unless the owner explicitly resumes release work:

- representative 200% reflow;
- broad keyboard/modal and screen-reader evidence beyond any targeted gameplay-fix check;
- installed-PWA update and offline relaunch;
- delivered CSP, service-worker update, storage, and network smoke;
- representative iOS/iPadOS and Android browser or installed-PWA lifecycle checks.

Task 10 public beta, monetization, native packaging, production services, and store work also remains on hold.

## Market-positioning sanity check

Current official store descriptions for successful cozy/passive games repeatedly combine three pillars:

- idle or passive production;
- character/friendship or authored world texture;
- visible collection and decoration.

Examples:

- Cats & Soup foregrounds idle resource production, new recipes/facilities, character interaction, costumes, and photos: https://play.google.com/store/apps/details?id=com.hidea.cat
- Tsuki's Odyssey foregrounds passive play, oddball villagers, friendship, discovery, and home decoration: https://apps.apple.com/us/app/tsukis-odyssey/id1564146071
- Campfire Cat Cafe foregrounds idle earnings, recipes, guests, unlockable décor, and pace-your-own narrative: https://play.google.com/store/apps/details?id=com.skybornegames.travellerscafe

Pocket Potion Works already has the beginnings of all three pillars. Its best differentiation is not feature volume; it is a **small, deterministic, non-predatory village alchemy game where every return visibly helps someone and changes the workshop**.

## Evidence index

Key active sources used:

- **README.md**
- **GAMEPLAY_ROADMAP.md**
- **coder-tasks.json**
- **RELEASE_READINESS.md**
- **DEVICE_TEST_MATRIX.md**
- **release-browser-evidence.json**
- **PRIVACY_DISCLOSURE_DRAFT.md**
- **ASSET_PROVENANCE.md**
- **PLATFORM_ADAPTERS.md**
- **game-logic.js**
- **app.js**
- **style.css**
- **index.html**
- **platform-adapters.js**
- **audio-feedback.js**
- **service-worker.js**
- checked-in tests and economy/monetization simulations

No archived source was consulted.

## Prompt for the PM agent

Copy the prompt below into the Pocket Potion Works PM task and attach or reference this report.

> You are the PM agent for Pocket Potion Works. Review the temporary expert report at:
>
> C:\tmp\Pocket-Potion-Works-Expert-Review-2026-07-14.md
>
> Treat it as review input, not as current product truth and not as automatic implementation authorization. Use only active repository files outside archive/ to validate it. Do not open or use any other archived material while deciding.
>
> This is a documentation and triage pass only. Do not implement code.
>
> Your first job is to give explicit feedback on the report. Produce a verdict table covering every numbered finding F-01 through F-17, content proposal C-01 through C-07, and return-hook proposal R-01 through R-06. For each item, state one of:
>
> - Agree
> - Partly agree / modify
> - Disagree
> - Needs owner evidence
>
> Give a concise reason grounded in the active roadmap, current code, live behavior, current acceptance state, or product principles. Push back where the report overreaches, duplicates an existing system, conflicts with the runtime budget, introduces unnecessary recurrence, or lacks playtest evidence. Do not simply endorse the report.
>
> Then:
>
> 1. Preserve Task 15 After the Stars owner acceptance as the current gate unless the owner has actually completed and accepted it.
> 2. Do not make a new coder task next until Task 15 is owner-accepted and the owner selects the following bounded scope.
> 3. Separate confirmed defects from product hypotheses and content ideas.
> 4. Decide what belongs in Now, Next, Later, and On Hold.
> 5. Preserve Tasks 6 and 10 as onHold unless the owner explicitly resumes their release or monetization scope.
> 6. Prefer deepening the existing gather → brew → collect → fulfill orders → upgrade → repeat loop before adding a new currency, timer, cauldron, navigation layer, backend, or monetization system.
> 7. Ask the owner only for decisions that materially change product direction, such as the intended idle-return window, stardust's long-term role, and which bounded content pilot to prioritize.
> 8. Update active product documents only where a decision is accepted and current. Likely candidates are GAMEPLAY_ROADMAP.md and coder-tasks.json. Change release/readiness documents only when factual release evidence, runtime identity, or owner authorization actually changes and the corresponding validation has run. Do not create coder tasks for rejected or unvalidated ideas.
> 9. Keep any later implementation task bounded, with acceptance checks and explicit mobile/browser evidence proportional to risk.
> 10. Report which active files you changed, your assumptions, validation, and deferred findings.
>
> This expert report is temporary. Once PM evaluation is complete—even if every recommendation is rejected—and any accepted decisions have been transferred into active documents, stop citing or using the report as project direction. The active documents must become the sole source of current truth. Move this exact file to archive/Pocket-Potion-Works-Expert-Review-2026-07-14.md and remove the C:\tmp working copy as part of that move. Do not inspect existing archive contents to perform the move. In the PM handoff, report the final archive path and confirm that C:\tmp\Pocket-Potion-Works-Expert-Review-2026-07-14.md no longer exists. Archiving is retention only; do not consult this report or other archived files during normal future planning unless the owner explicitly requests a historical audit or comparison.

## Final recommendation in one sentence

Finish the current acceptance gate, repair trust-critical correctness, make the existing village loop feel intentional, then prove one permanent paired-villager chapter before expanding the game's system count.
