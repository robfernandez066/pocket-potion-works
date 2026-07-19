# Pocket Potion Works gameplay roadmap

This is the active product roadmap. Completed task reports and superseded planning live in `archive/` and are not sources of current direction.

## Product principles

- Preserve the core loop: gather -> brew -> collect -> fulfill orders -> upgrade -> repeat.
- Add meaningful choices and authored content without adding avoidable currencies, timers, or navigation.
- Keep required play cozy, short, offline-friendly, mobile-first, and accessible.
- Use owner playtests for feel and deterministic tests or simulations for progression and economy.
- Keep production monetization and native packaging on hold until the game has enough content and retention evidence.

## Current shipped baseline

- Seven ingredients, twelve recipes across levels 1-7, one cauldron, three-rank recipe mastery, five upgrades, and level-7 Starry Rebirth.
- Twelve recurring villagers with trust, 36 story beats, one-time Villager Special Requests, twelve keepsakes, and bounded first-read Journal rewards.
- Three charged harvests recharge every 30 seconds and yield 3 base items. A targeted charged harvest guarantees the selected unlocked ingredient for that harvest; it does not guarantee completion of a recipe or order. Request Mix remains substantially random. Passive gathering starts after the first delivery at about 5 items per minute. Offline gathering now uses the approved frontloaded diminishing curve, stops at 60% of Pantry capacity, and retains a four-hour elapsed-time safety cap; the representative level-4 empty Pantry receives 14/36/54 ingredients at 15/60/120 minutes and first reaches its reserve at minute 98.
- Daily goals do not use streaks. Rolling request chains do not expire. All recurring and one-time rewards are bounded.
- Eight reversible, economy-neutral Workshop Looks include the original look plus seven earned looks. Twelvefold Mastery derives completion from all twelve recipes at mastery rank 3 and unlocks the Masterwork Alcove without a claim or economy reward.
- After the Stars owner acceptance passed: its post-rebirth tracker and three order cards were clear, Rowan's finale was readable, and Dawnthread could be selected, reversed to Midnight, and selected again without changing the economy.
- Gameplay saves use schema v9 with v1-v8 migration, future-v10 overwrite protection, and frozen-reader rollback coverage through v8.
- Storage failures now fall back to truthful session-only play without overwriting an unreadable or previously valid save. Manual saves report success only after a confirmed write, and reset restarts only after guarded gameplay-save removal succeeds.
- Welcome Back now confirms that offline ingredients were added to the Pantry, adds one deterministic magical Workshop Diary vignette based on capped elapsed time and the real granted count, and returns to the workshop without offering or applying a second claim. Zero gain remains silent.
- Daily Goals roll forward safely during an open foreground session: the first post-midnight delivery counts toward the new day, stale previous-day rewards cannot be claimed, and clock rollback cannot reopen rewards.
- All twelve recurring villagers now have owner-approved three-heart relationship arcs at the Workshop or Orders surface that earned them. The thirty-six scenes add no reward or saved state, preserve the separate unread Journal claims, and reuse one generic acknowledgement-controlled fulfillment-narrative seam with independent surface queues.
- Current and migratable saves now bound hostile numeric values, cap runtime progression at level 10,000, recover unique order IDs, and clear a known active brew when its recipe is above the saved level without granting compensation or unrelated progress.
- All eight achievements now unlock on the action that satisfies them while remaining manual one-time Journal claims. Lifetime coins now prospectively include every non-purchased gameplay coin grant while excluding starting coins, spending, and bundle currency.
- Untargeted charged gathering is now Request Mix: every unlocked ingredient remains possible, while active-request deficits receive a small capped weight after bottled potions and Pantry stock are considered. Exact ingredient targeting, passive gathering, and offline gathering remain unchanged.
- Ordinary order boards now avoid villagers already visible when alternatives remain. Every eligible villager stays possible, while someone one delivery from an unearned trust heart receives a small capped weight. Reserved orders, trust rules, and saved state remain unchanged.
- Ordinary not-ready orders now provide one state-aware route to Gather, Brew, View brew, or Collect brew. These controls navigate and focus the exact existing Workshop action without performing gameplay; ready delivery and unavailable reserved orders remain unchanged.
- Stardust now preserves its original 10% order-coin gain through five, then follows the owner-approved diminishing formula `1.5 + (stardust - 5) / (stardust + 15)`, remaining below a 2.5x Stardust multiplier without changing earned counts or sources.
- The delivery-narrative catalog now lives in the dependency-free `relationship-content.js` offline module while the other four immutable catalogs remain in `content-data.js`. Browser and CommonJS consumers still receive the same recursively frozen delivery array through `PPWRelationshipContent`, `PPWContent`, and `PPWLogic`, and gameplay behavior is unchanged.
- Mira's permanent three-delivery chapter, **The Village Loaf**, unlocks after level 4, Mira's third heart, and her Flour-Sun Pin Special Request. Each chapter delivery presents an acknowledgement-controlled story scene; completion unlocks the reversible, economy-neutral **Firstlight Bakery** Workshop Look. The chapter shares the existing reserved slot without displacing its two ordinary orders and persists through Starry Rebirth.
- Mira's owner-approved portrait now appears on her orders, Villager Special Request choice, Journal relationship card, and Village Chapter payoff scenes. The original 256x256 source is retained outside deployment; one optimized transparent runtime copy is cached for offline play without changing other villagers' avatars.
- Fern's owner-approved three-heart delivery arc now follows the blue pot continuously from the cauldron to the workshop window and its eventual bloom. The three substantive scenes reuse the existing data-driven originating-surface card, add no reward or saved state, and preserve all separate unread Journal claims.
- Fern's owner-approved portrait now appears on her orders, Villager Special Request choice, Journal relationship card, and first-heart inline payoff through the same illustrated-villager seam as Mira. The original 256x256 source is retained outside deployment; one 96x96 transparent WebP is cached for offline play while the other ten villagers retain their emoji avatars.
- Pure browser presentation helpers now live in the dependency-free `ui-render.js` offline module. `app.js` retains state, DOM, event, focus, storage, audio, save, and gameplay ownership while returning below its fixed per-file cap without changing rendered behavior.
- The Workshop bottle shelf, hanging herbs, and cat now provide three owner-approved optional ambient touches. Each uses one silent transient acknowledgement, visible focus, and a stationary reduced-motion treatment without changing gameplay, rewards, saves, or audio.
- Owner mobile acceptance passed for the Mira/Fern presentation batch: the installed update, primary views, portraits beside emoji villagers, and normal interactions remained clear without distracting repetition or crowding.
- All three background-music tracks now use the exact owner-approved 192 kbps CBR runtime copies. The three tracks remain intact with unchanged playback behavior and provenance, while the fixed 24,000,000-byte runtime now uses 18,387,564 bytes and retains 5,612,436 bytes of headroom; no further compression is required for the current budget goal.
- GitHub Pages artifact validation now derives from the complete root runtime inventory, preventing a required module such as `relationship-content.js` or `content-data.js` from being omitted while static HTML still deploys.
- The owner-approved Task 24 seeded first cycle reaches level 7 in 2,600-2,695 seconds with 31-33 orders. Compared with Task 23, the three-seed averages changed by 1.02% in time and 4.33% in lifetime coins; the exact Task 24 outputs are the current regression lock.
- The charcoal-black and purple interface, supplied Sprixen sprites, local sound effects, three-track music loop, safe areas, reduced motion, 44px targets, and installable update prompt are live in the public tester build.

## Now - Task 60 design optional cauldron stirring

Task 55 is complete. The exact owner-approved Sol and Bea scenes now ship as entries 31-36 of the frozen relationship catalog. The complete twelve-villager relationship sequence preserves the existing trigger, queue, focus, Journal, reward, save, economy, and offline behavior. Cache identity is ppw-shell-v73 and the runtime remains within its fixed budget.

Task 56 is complete. The owner approved four deterministic magical Workshop Diary vignettes for the existing Welcome Back modal: button-eyed sprites, a floating vial, enchanted bottles, and a patient little broom. Each uses the actual granted ingredient count, followed by the exact factual confirmation "The ingredients have been added to the Pantry." Zero gain remains silent, and the word "already" is removed from this treatment.

Task 57 is complete. The four owner-approved Workshop Diary vignettes now use a frozen pure presentation selector inside the existing truthful Welcome Back modal. Positive returns show the real gained count, the exact Pantry confirmation, the four-hour statement, and Back to workshop; quick and zero-gain returns remain silent. No reward, history, saved field, or gameplay system was added. Cache identity is ppw-shell-v74.

Task 58 is complete. The owner approved three optional, silent Workshop touches using the existing bottle shelf, hanging herbs, and workshop cat. Each uses a 44px-plus native button, one replacing 1.8-second local acknowledgement, visible focus, and a stationary reduced-motion treatment. The exact approved lines are "A bottle gives a tiny clink.", "The hanging herbs give a little wave.", and "The workshop cat gives a slow blink."

Task 59 is complete and owner accepted. The approved three-touch batch now ships through the existing static Workshop presentation and a small transient handler. It adds no gameplay value, save state, reward, audio, new screen, or generic interaction engine. Cache identity is ppw-shell-v75.

Task 60 begins F03 as an evidence-only interaction audit and owner-review preview. It must compare a very small set of optional cauldron-stirring treatments, include an equivalent native-button alternative to any gesture, and preserve idle play without reward or penalty.

## Next - implement only an owner-approved F03 treatment

After Task 60 passes PM review and owner acceptance, create a separate bounded implementation task for only the approved optional stirring treatment. Do not implement F03 during the evidence-only design task.

## Near-term existing-loop and playtest candidates

- **Meaningful choice:** Task 25 did not support a broad recipe retune, and Task 27 resolved the overlapping idle-return behavior. Revisit an upgrade-path change only after owner play evidence identifies a concrete weak choice; do not introduce branches, loadouts, currencies, or another recurring system.
- **Gathering clarity:** Task 35 measured a modest but uneven Request Mix advantage: no measured positive-deficit scenario was worse, the average one-harvest hit-rate improvement was 8.957 percentage points, and the predeclared 10-point “noticeable” threshold was not met. The strict “favors” classification also failed because level 1 was already at a 100% uniform hit ceiling. Keep the shipped weights and truthful random/favoring explanation unchanged pending owner feel evidence. Targeted gathering continues to guarantee only the selected ingredient.

Do not extend the level curve, add a second cauldron, introduce another recurring system, or produce new raster or audio packs without evidence and an explicit runtime-budget decision.

## On hold

- Task 6 public-release evidence: implementation is shipped; the broader manual release matrix is intentionally deferred.
- Task 10 public beta and monetization decision: no real ads, billing, analytics transmission, accounts, cloud saves, native wrapper, or store submission until the owner resumes release work.

### Owner-preferred monetization concept - not implementation authorization

- A future second brewing slot may be offered temporarily through an optional rewarded ad so free players can experience the feature before deciding whether to purchase it. The working duration is approximately 30 minutes, but duration, stacking, cooldowns, daily limits, and whether time pauses outside active play remain unselected tuning inputs.
- A one-time **Master Alchemist Upgrade** may permanently unlock the second brewing slot and replace existing rewarded-ad watches with immediate ad-free bonus claims that retain their normal caps and cooldowns. It must be a restorable entitlement; it must not grant every bonus continuously or introduce exclusive recipes.
- If temporary access expires during a brew, that potion must remain safe and collectible while the second slot refuses a new brew until access returns. A free earnable route to the permanent slot remains preferred, and Stardust must not become purchasable premium currency.
- Before selection or implementation, simulate the effect of two simultaneous brews on ingredients, orders, coins, trust, mastery, and progression; establish truthful purchase restoration beyond a fragile local-only entitlement; and validate that the second slot improves later play without erasing the meaningful choice of what to brew next.
- This concept does not select a price, duration, store, billing implementation, ad provider, release date, or Task 10 scope. Task 10 remains on hold until the owner explicitly resumes it.

## Later

- Batch brewing is evidence-triggered Later work. Revisit it only if post-rebirth playtesting confirms one-bottle repetition is a material problem.
- Permanent collection albums are Later work rather than rejected. Rolling request chains are finite and do not provide permanent collection progression.
- Revisit native packaging, public promotion, store materials, privacy/legal publication, production services, and monetization only with explicit owner approval.
- Add mix controls, more music, or large asset sets only when owner listening or device evidence shows a need and the runtime budget permits it.

## Future content sequence - approved roadmap additions

These additions begin only after the current relationship-arc sequence is complete. They are ordered by game fit and estimated coding complexity, with dependency order taking priority where it reduces duplicate systems or migrations. `F` numbers are roadmap slots, not coder-task numbers. Estimates include the bounded design/evidence, implementation, and validation tasks currently expected; the PM must still issue and approve each exact coder task. Placement here does not pre-approve economy values, new currencies, new assets, or production integrations.

| Roadmap | Short description | Fit | Estimated coding tasks | Dependency or scope gate |
| --- | --- | --- | ---: | --- |
| F01 | While-you-were-away diary | High | 2 | Reuse the truthful Welcome Back and offline-progress seam; begin with narrative-only lines and no extra rewards. |
| F02 | Ambient workshop touch layer | High | 3 | Begin with toy interactions and occasional acknowledgement; do not add a hidden economy or uncapped recurring reward. |
| F03 | Optional cauldron stirring | High | 3 | Provide an accessible non-gesture alternative; the interaction must remain optional and never penalize idle play. |
| F04 | Local window weather | High | 3 | Ship and validate cosmetic local weather first; any gathering modifier requires a separate economy and clock-manipulation decision. |
| F05 | Folk recipe variants | High | 3 | Reuse existing trust, mastery, recipe, and delivery surfaces; approve exact recipes and copy before implementation. |
| F06 | Cauldron moods and friendship arc | High | 4 | Build after the twelve villager arcs so it can reuse the proven content seam without redefining villager trust. |
| F07 | Workshop familiar | High | 4 | Requires an approved creature choice and art/runtime-budget plan before behavior work; rare ingredient finds must be bounded. |
| F08 | Villager workshop visits | High | 4 | Reuse completed villager characterization and generic presentation; avoid a second dialogue engine or required visit timer. |
| F09 | Torn recipe pages and forgotten recipe | High | 4 | Define the bounded fragment track and recipe reward, then simulate progression and storage impact before shipping. |
| F10 | Simmer versus quick-boil | High | 4 | Treat as the first major brewing-choice candidate; simulate timing, order value, overnight play, and assist interactions. |
| F11 | Memory garden | High | 4 | Requires a small durable rebirth-state addition and a clear one-keepsake rule without weakening the clean-cycle reset. |
| F12 | Infused potion variants | High | 5 | Follow the simpler brew-style decision; constrain combinations and validate ingredients, orders, mastery, and villager preferences. |
| F13 | Occasional ingredient peddler | Medium | 4 | Keep swaps local, bounded, offline-safe, and non-expiring; approve the visitor treatment before adding art. |
| F14 | Unprompted villager gifting | Medium | 5 | Define bounded inventory, reactions, trust exclusions, and micro-story ownership before implementation. |
| F15 | Double-pour gift bottle | Medium | 2 | Implement only after F14 supplies the safe gifting destination; it must not become a saleable or farmable economy reward. |
| F16 | Living potion shelf | Medium | 5 | Establish the shared collection/display surface before curiosities; separate rearrangement toys from any trust or economy effect. |
| F17 | Experimental brews and curiosities | Medium | 5 | Reuse F16's shelf and collection model; constrain ingredient loss, combinations, discovery, saves, and content volume. |
| F18 | Local festival days | Medium | 5 | Build on F04's local-calendar handling; festivals must remain offline-safe, non-punitive, and testable under clock changes. |
| F19 | Rebirth sky omens | Conditional | 4 | Keep choices reversible and bounded; reject any version that becomes a branching build system or dominant economy path. |
| F20 | Constellation comfort charms | Conditional | 4 | Define a bounded Stardust sink only after post-rebirth play evidence; comfort perks must not undermine the approved multiplier. |
| F21 | Dream wisps | Conditional | 4 | Prefer collectible cosmetic outputs over a new currency; do not reward players more for leaving the cauldron unused. |
| F22 | Moon brews | Conditional | 5 | Requires rigorous offline, clock-change, active-brew, accessibility, and failure-recovery rules; closing the app cannot be mandatory progression. |
| F23 | Potion cellar and vintages | Conditional | 6 | Last because it adds a screen, multi-day aging, a new order class, save state, economy tuning, and substantial mobile QA. |

## Release boundary

The public GitHub Pages tester build is authorized. Broader promotion, production integrations, native packaging, and store release remain unapproved.
