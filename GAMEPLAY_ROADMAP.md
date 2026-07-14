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
- Three charged targeted harvests recharge every 30 seconds and yield 3 base items. Passive and offline gathering start after the first delivery, average about 5 items per minute, stop at 60% of Pantry capacity, and remain capped at four offline hours.
- Daily goals do not use streaks. Rolling request chains do not expire. All recurring and one-time rewards are bounded.
- Seven reversible, economy-neutral Workshop Looks include the original look plus six earned looks.
- Gameplay saves use schema v8 with v1-v7 migration, future-v9 overwrite protection, and frozen-reader rollback coverage.
- The current seeded first cycle reaches level 7 in 2,540-2,660 seconds with 31-32 orders. New content must keep first-cycle progression inside this tested envelope unless owner playtests justify retuning it.
- The charcoal-black and purple interface, supplied Sprixen sprites, local sound effects, three-track music loop, safe areas, reduced motion, 44px targets, and installable update prompt are live in the public tester build.

## Now - After the Stars owner acceptance

Task 15 is implemented and deployed, but remains in review until its post-rebirth presentation is seen in a real rebirthed save.

- The four one-time errands use Mira, Postmaster Pip, Fern, and Rowan in sequence after the first Starry Rebirth.
- The quest shares the reserved Orders slot with Villager Special Requests, preserves two ordinary orders, uses normal one-bottle delivery economics, and never consumes invitations.
- Completion unlocks the reversible Dawnthread Workshop look with no economic effect.
- Automated progression, malformed-save restoration, v8 migration, later-rebirth persistence, and first-cycle invariance checks pass.
- Pre-rebirth concealment and compact layout pass at 390x844 and 360x740. The remaining owner check is the tracker, final completion card, and Workshop Look selection after rebirth.

Exit gate: the post-rebirth tracker and finale are clear, compact, and satisfying in the owner's normal save.

## Next

No additional implementation task is approved yet. Choose the next bounded content expansion after Task 15 owner acceptance and current playtest feedback. Prefer one of:

- additional authored recipe, villager, achievement, prestige-goal, or cosmetic content;
- a small improvement to an existing loop that playtesting identifies as repetitive or unclear;
- visual or audio polish using approved local assets.

Do not extend the level curve, add a second cauldron, or introduce another recurring system without evidence that the current loop needs it.

## On hold

- Task 6 public-release evidence: implementation is shipped; the broader manual release matrix is intentionally deferred.
- Task 10 public beta and monetization decision: no real ads, billing, analytics transmission, accounts, cloud saves, native wrapper, or store submission until the owner resumes release work.

## Later

- Revisit native packaging, public promotion, store materials, privacy/legal publication, production services, and monetization only with explicit owner approval.
- Add mix controls, more music, or large asset sets only when owner listening or device evidence shows a need and the runtime budget permits it.

## Release boundary

The public GitHub Pages tester build is authorized. Broader promotion, production integrations, native packaging, and store release remain unapproved.
