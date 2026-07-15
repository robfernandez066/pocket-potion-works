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
- Gameplay saves use schema v8 with v1-v7 migration, future-v9 overwrite protection, and frozen-reader rollback coverage.
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
- The owner-approved Task 24 seeded first cycle reaches level 7 in 2,600-2,695 seconds with 31-33 orders. Compared with Task 23, the three-seed averages changed by 1.02% in time and 4.33% in lifetime coins; the exact Task 24 outputs are the current regression lock.
- The charcoal-black and purple interface, supplied Sprixen sprites, local sound effects, three-track music loop, safe areas, reduced motion, 44px targets, and installable update prompt are live in the public tester build.

## Now - Task 32 content catalog boundary

Tasks 15 through 31 are complete. `game-logic.js` and `app.js` are both within 100 bytes of their existing file caps, so adding the planned permanent village chapter directly would force compressed code or an unapproved budget increase.

Extract only the existing immutable narrative catalogs into one small offline runtime module while preserving the current public game-logic API and every behavior. Keep the 24,000,000-byte total cap unchanged and use the freed `game-logic.js` headroom for the bounded village-chapter pilot in the following task. This is a prerequisite refactor, not authorization to add or rewrite content yet.

## Near-term existing-loop and playtest candidates

- **Meaningful choice:** Task 25 did not support a broad recipe retune, and Task 27 resolved the overlapping idle-return behavior. Revisit an upgrade-path change only after owner play evidence identifies a concrete weak choice; do not introduce branches, loadouts, currencies, or another recurring system.
- **Gathering clarity:** validate whether Request Mix feels useful without obscuring its randomness. Targeted gathering continues to guarantee only the selected ingredient.

## Unselected content candidates

- A future permanent village-chapter pilot must use approximately three-to-five normal one-bottle deliveries, define unlock timing and reserved-slot arbitration, preserve two ordinary orders, coexist explicitly with Villager Special Requests and After the Stars, grant an economy-neutral reward, and leave invitations untouched unless separately approved.

Do not extend the level curve, add a second cauldron, introduce another recurring system, or produce new raster or audio packs without evidence and an explicit runtime-budget decision.

## On hold

- Task 6 public-release evidence: implementation is shipped; the broader manual release matrix is intentionally deferred.
- Task 10 public beta and monetization decision: no real ads, billing, analytics transmission, accounts, cloud saves, native wrapper, or store submission until the owner resumes release work.

## Later

- Batch brewing is evidence-triggered Later work. Revisit it only if post-rebirth playtesting confirms one-bottle repetition is a material problem.
- Permanent collection albums are Later work rather than rejected. Rolling request chains are finite and do not provide permanent collection progression.
- Revisit native packaging, public promotion, store materials, privacy/legal publication, production services, and monetization only with explicit owner approval.
- Add mix controls, more music, or large asset sets only when owner listening or device evidence shows a need and the runtime budget permits it.

## Release boundary

The public GitHub Pages tester build is authorized. Broader promotion, production integrations, native packaging, and store release remain unapproved.
