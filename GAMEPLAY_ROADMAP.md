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
- Three charged harvests recharge every 30 seconds and yield 3 base items. A targeted charged harvest guarantees the selected unlocked ingredient for that harvest; it does not guarantee completion of a recipe or order. Request Mix remains substantially random. Passive gathering starts after the first delivery at about 5 items per minute; offline gathering uses a slower rate, stops at 60% of Pantry capacity, and retains a four-hour elapsed-time safety cap.
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
- The owner-approved Task 24 seeded first cycle reaches level 7 in 2,600-2,695 seconds with 31-33 orders. Compared with Task 23, the three-seed averages changed by 1.02% in time and 4.33% in lifetime coins; the exact Task 24 outputs are the current regression lock.
- The charcoal-black and purple interface, supplied Sprixen sprites, local sound effects, three-track music loop, safe areas, reduced motion, 44px targets, and installable update prompt are live in the public tester build.

## Now - owner decision gate for idle return

Tasks 15 through 26 are complete. No coder task is queued until the owner selects or rejects an idle-return candidate.

Task 25 found no broad same-level recipe-pair failure: all eight measured recipes completed their request within ten minutes, with average delivery times from 109.0 to 175.8 seconds. In its representative active loop, Copper Cauldron and Golden Ledger produced clear throughput or coin effects, while ingredient upgrades mainly increased stock. Moonlit Garden added 2.8 active ingredients on average but no orders and no additional 60- or 120-minute offline ingredients because both cases reached the existing reserve cap.

Task 26 confirmed that the current formula fills the representative passive reserve in 18 minutes. Two candidates met every printed criterion: frontloaded-diminishing reached the reserve in 98 minutes with 14/36/54 ingredients at 15/60/120 minutes and a 25% Garden level-1 benefit at 60 minutes; gentle-diminishing reached it in 115 minutes with 10/33/54 ingredients and a 24.242% Garden benefit. The PM recommendation is frontloaded-diminishing because it is closer to the stated 90-minute target while remaining bounded by the existing first-delivery gate, 60% reserve, manual-harvest room, and four-hour elapsed cap.

The live formula remains unchanged. Implement frontloaded-diminishing only if the owner approves that direction; otherwise retain the current formula or request a different candidate study.

## Confirmed economy risks requiring design and simulation

- **Idle return:** the four-hour value remains a safety cap. Task 26 measured the current representative reserve filling in 18 minutes and identified two bounded candidates for a 60-120 minute useful window. Preserve live values until the owner selects or rejects the recommended frontloaded-diminishing curve.
- **Stardust scaling:** each Stardust currently adds 10% order-coin value, and daily rewards can add Stardust independently of rebirth. Evaluate a cap or reshaped economic effect while preserving earned counts and sources where practical, define save migration, and revalidate the seeded first-cycle envelope. Do not choose or implement a formula without simulation and owner approval.

## Near-term existing-loop and playtest candidates

- **Meaningful choice:** Task 25 did not support a broad recipe retune. Revisit an upgrade-path change only after Task 26 resolves the overlapping idle-return evidence; do not introduce branches, loadouts, currencies, or another recurring system.
- **Mobile action hierarchy:** measure the full path to ordinary-order delivery at 390x844 and 360x740 before prescribing a redesign. Distinguish onboarding, an ordinary order not ready, an ordinary order ready, Daily Goal completion, and Rolling Request completion; account for the existing Workshop ready-delivery shortcut.
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
