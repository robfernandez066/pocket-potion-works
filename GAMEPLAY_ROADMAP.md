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
- Three charged harvests recharge every 30 seconds and yield 3 base items. A targeted charged harvest guarantees the selected unlocked ingredient for that harvest; it does not guarantee completion of a recipe or order. Smart Mix remains substantially random. Passive gathering starts after the first delivery at about 5 items per minute; offline gathering uses a slower rate, stops at 60% of Pantry capacity, and retains a four-hour elapsed-time safety cap.
- Daily goals do not use streaks. Rolling request chains do not expire. All recurring and one-time rewards are bounded.
- Seven reversible, economy-neutral Workshop Looks include the original look plus six earned looks.
- After the Stars owner acceptance passed: its post-rebirth tracker and three order cards were clear, Rowan's finale was readable, and Dawnthread could be selected, reversed to Midnight, and selected again without changing the economy.
- Gameplay saves use schema v8 with v1-v7 migration, future-v9 overwrite protection, and frozen-reader rollback coverage.
- Storage failures now fall back to truthful session-only play without overwriting an unreadable or previously valid save. Manual saves report success only after a confirmed write, and reset restarts only after guarded gameplay-save removal succeeds.
- The current seeded first cycle reaches level 7 in 2,540-2,660 seconds with 31-32 orders. New content must keep first-cycle progression inside this tested envelope unless owner playtests justify retuning it.
- The charcoal-black and purple interface, supplied Sprixen sprites, local sound effects, three-track music loop, safe areas, reduced motion, 44px targets, and installable update prompt are live in the public tester build.

## Now - Task 17 truthful Welcome Back recap

Tasks 15 and 16 are complete. Task 17 is the only released implementation task.

The Welcome Back modal currently grants offline ingredients before it appears but labels its dismiss action `Collect ingredients`. Replace that claim-like wording with a truthful recap that says the ingredients were already added to the Pantry and uses a non-claiming return action. Preserve all offline timing, first-delivery, four-hour cap, Pantry soft-cap, and save behavior.

Do not combine this copy-and-contract correction with idle tuning, another reward step, delayed claiming, mobile hierarchy, narrative, content, release, or monetization work.

## Unselected correctness candidates

- **Hostile values and invalid active brews:** bound adversarial numeric save values and restore or reject a saved active brew when its known recipe is above the saved player level. This is separate from storage I/O resilience.
- **Foreground daily rollover:** reset the saved day before any daily mutation or claim and validate the foreground-midnight path.
- **Progression accounting:** evaluate achievements on their triggering actions and use one consistent definition of lifetime coins.

Focus-restoration validation may accompany any future task that rerenders affected controls; it does not need to wait for the full deferred release matrix.

## Confirmed economy risks requiring design and simulation

- **Idle return:** the four-hour value is a safety cap, while the 60% Pantry reserve can stop useful offline gathering after only a few minutes in plausible early-game states. Evaluate a meaningful approximately 60-120 minute target using diminishing or slower accumulation rather than four hours of full-rate linear rewards. Preserve the four-hour elapsed cap and live values until deterministic simulation and owner review support a change.
- **Stardust scaling:** each Stardust currently adds 10% order-coin value, and daily rewards can add Stardust independently of rebirth. Evaluate a cap or reshaped economic effect while preserving earned counts and sources where practical, define save migration, and revalidate the seeded first-cycle envelope. Do not choose or implement a formula without simulation and owner approval.

## Near-term existing-loop and playtest candidates

- **Narrative delivery pilot:** use one villager and one inline heart-completion payoff with existing or code-native presentation. Do not create a dialogue engine, branching narrative system, recurring modal, or large asset pack.
- **Meaningful choice:** run a focused owner playtest or small data-driven experiment around identical same-level recipe timer/value pairs, linear upgrades, substantially random Smart Mix behavior, and uniform customer selection. Do not introduce branches, loadouts, currencies, or another recurring system.
- **Mobile action hierarchy:** measure the full path to ordinary-order delivery at 390x844 and 360x740 before prescribing a redesign. Distinguish onboarding, an ordinary order not ready, an ordinary order ready, Daily Goal completion, and Rolling Request completion; account for the existing Workshop ready-delivery shortcut.
- **Gathering clarity:** Smart Mix may later receive modest need-based weighting or be renamed to describe its randomness honestly. Targeted gathering guarantees only the selected ingredient.

## Unselected content candidates

- A future permanent village-chapter pilot must use approximately three-to-five normal one-bottle deliveries, define unlock timing and reserved-slot arbitration, preserve two ordinary orders, coexist explicitly with Villager Special Requests and After the Stars, grant an economy-neutral reward, and leave invitations untouched unless separately approved.
- A bounded mastery collection endpoint may reuse existing mastery and Journal or collection surfaces with an economy-neutral reward.

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
