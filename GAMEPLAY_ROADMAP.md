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
- Welcome Back now states that offline ingredients were already added to the Pantry and returns to the workshop without offering or applying a second claim.
- Daily Goals roll forward safely during an open foreground session: the first post-midnight delivery counts toward the new day, stale previous-day rewards cannot be claimed, and clock rollback cannot reopen rewards.
- Mira's first trust heart now produces one brief inline authored delivery payoff at the Workshop or Orders surface that earned it. It adds no reward or saved state, preserves the unread Journal claim, and remains a one-villager pilot until natural owner play establishes that it improves delivery feel.
- Current and migratable saves now bound hostile numeric values, cap runtime progression at level 10,000, recover unique order IDs, and clear a known active brew when its recipe is above the saved level without granting compensation or unrelated progress.
- All eight achievements now unlock on the action that satisfies them while remaining manual one-time Journal claims. Lifetime coins now prospectively include every non-purchased gameplay coin grant while excluding starting coins, spending, and bundle currency.
- Untargeted charged gathering is now Request Mix: every unlocked ingredient remains possible, while active-request deficits receive a small capped weight after bottled potions and Pantry stock are considered. Exact ingredient targeting, passive gathering, and offline gathering remain unchanged.
- Ordinary order boards now avoid villagers already visible when alternatives remain. Every eligible villager stays possible, while someone one delivery from an unearned trust heart receives a small capped weight. Reserved orders, trust rules, and saved state remain unchanged.
- Ordinary not-ready orders now provide one state-aware route to Gather, Brew, View brew, or Collect brew. These controls navigate and focus the exact existing Workshop action without performing gameplay; ready delivery and unavailable reserved orders remain unchanged.
- Stardust now preserves its original 10% order-coin gain through five, then follows the owner-approved diminishing formula `1.5 + (stardust - 5) / (stardust + 15)`, remaining below a 2.5x Stardust multiplier without changing earned counts or sources.
- The five immutable narrative catalogs now live in the dependency-free `content-data.js` offline module. Browser and CommonJS consumers still receive the same recursively frozen objects through `PPWLogic`, and gameplay behavior is unchanged.
- Mira's permanent three-delivery chapter, **The Village Loaf**, unlocks after level 4, Mira's third heart, and her Flour-Sun Pin Special Request. Each chapter delivery presents an acknowledgement-controlled story scene; completion unlocks the reversible, economy-neutral **Firstlight Bakery** Workshop Look. The chapter shares the existing reserved slot without displacing its two ordinary orders and persists through Starry Rebirth.
- Mira's owner-approved portrait now appears on her orders, Villager Special Request choice, Journal relationship card, and Village Chapter payoff scenes. The original 256x256 source is retained outside deployment; one optimized transparent runtime copy is cached for offline play without changing other villagers' avatars.
- Fern's owner-approved three-heart delivery arc now follows the blue pot continuously from the cauldron to the workshop window and its eventual bloom. The three substantive scenes reuse the existing data-driven originating-surface card, add no reward or saved state, and preserve all separate unread Journal claims.
- Fern's owner-approved portrait now appears on her orders, Villager Special Request choice, Journal relationship card, and first-heart inline payoff through the same illustrated-villager seam as Mira. The original 256x256 source is retained outside deployment; one 96x96 transparent WebP is cached for offline play while the other ten villagers retain their emoji avatars.
- Pure browser presentation helpers now live in the dependency-free `ui-render.js` offline module. `app.js` retains state, DOM, event, focus, storage, audio, save, and gameplay ownership while returning below its fixed per-file cap without changing rendered behavior.
- Owner mobile acceptance passed for the Mira/Fern presentation batch: the installed update, primary views, portraits beside emoji villagers, and normal interactions remained clear without distracting repetition or crowding.
- All three background-music tracks now use the exact owner-approved 192 kbps CBR runtime copies. The three tracks remain intact with unchanged playback behavior and provenance, while the fixed 24,000,000-byte runtime now uses 18,370,083 bytes and retains 5,629,917 bytes of headroom; no further compression is required for the current budget goal.
- GitHub Pages artifact validation now derives from the complete root runtime inventory, preventing a required module such as `content-data.js` from being omitted while static HTML still deploys.
- The owner-approved Task 24 seeded first cycle reaches level 7 in 2,600-2,695 seconds with 31-33 orders. Compared with Task 23, the three-seed averages changed by 1.02% in time and 4.33% in lifetime coins; the exact Task 24 outputs are the current regression lock.
- The charcoal-black and purple interface, supplied Sprixen sprites, local sound effects, three-track music loop, safe areas, reduced motion, 44px targets, and installable update prompt are live in the public tester build.

## Now - Task 49 implement Mira, Old Moss, and Juniper relationship arcs

Task 47 is complete. The exact owner-approved Fern rewrite fits the existing content cap, advances the offline cache to `ppw-shell-v69`, preserves all trigger, reward, save, Journal, portrait, and gameplay behavior, and passes the full automated suite. The owner preview of the exact copy plus the already-proven generic card lifecycle is accepted as sufficient rare-state presentation evidence; no additional hidden-state Fern replay is required.

Task 48 is owner-accepted. Its exact nine-scene Mira, Old Moss, and Juniper copy passed the evidence-only mobile preview at 390x844 and 360x740, including the final object, location, timing, and cause-and-effect continuity review. The accepted copy is locked in the Task 49 execution prompt and must not be rewritten during implementation.

Task 49 implements those nine scenes through the existing heart-boundary fulfillment seam. Because `content-data.js` has only limited file-cap headroom, the task may first extract the existing delivery-narrative catalog into one small offline, dependency-free content module while preserving the public `PPWContent` API, deep-freeze/reference behavior, browser/CommonJS parity, load order, Pages artifact, and service-worker shell. This is a capacity refactor for accepted content, not a new dialogue system. Keep gameplay, heart thresholds, rewards, Journal summaries and claims, saves, fulfillment economics, portraits, focus/timing behavior, and all Fern content unchanged.

## Next - continue remaining relationship arcs in reviewed batches

After the first batch is approved and implemented, continue with Pip, Lady Bramble, and Tink; then Captain Wren, Nell, and Rowan; then Sol and Bea. Do not mass-generate or implement all remaining scenes without staged owner review.

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

## Release boundary

The public GitHub Pages tester build is authorized. Broader promotion, production integrations, native packaging, and store release remain unapproved.
