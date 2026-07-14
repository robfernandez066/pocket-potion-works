# Pocket Potion Works

Pocket Potion Works is a mobile-first cozy idle alchemy game vertical slice. It runs without a build step, framework, production service, or external dependency.

## Play locally

```powershell
npm.cmd start
```

Open `http://127.0.0.1:4173`.

## Tester build

The public pre-release tester build is deployed from `main` to:

https://robfernandez066.github.io/pocket-potion-works/

This link is for testing and does not represent a store release or production-service approval.

## Validate

```powershell
npm.cmd run check
npm.cmd run release:check
```

The checks cover syntax, deterministic gameplay and economy behavior, scripted monetization comparisons, platform-adapter safety, audio mappings, save compatibility, service-worker behavior, privacy/release boundaries, and runtime budgets. Monetization results are exact for the checked-in scripted profile but directional for human play. The final release check remains blocked while current manual browser evidence is pending.

## Current game

- Use the random, request-weighted Request Mix or target an unlocked ingredient with three charged harvests, then brew timed potions, collect bottles, fulfill customer orders, buy upgrades, and prestige.
- Seven ingredients, twelve recipes with durable three-rank mastery and discovery lore, twelve recurring customers with trust favors and 36 unlockable story beats, five upgrades across three paths, non-streak daily goals, three bounded rolling request chains, and eight achievements.
- State-aware First Steps guidance with exact targets and cross-view prompts.
- Compact remembered Pantry/Recipe sections, inline Workshop delivery, and a contextual brew shortcut reduce tab and scroll movement.
- Gameplay save schema v8 with v1-v7 migration and downlevel overwrite protection, plus four-hour offline progress that begins after the first delivery and preserves targeted-harvest space.
- Level-7 starry rebirth grants at least 3 stardust while preserving mastery, customer trust, achievements, and the current daily boundary.
- Seven code-native workshop looks include the original look plus six earned through collection goals, a rolling request chain, all twelve one-time Villager Special Requests, and After the Stars. They never alter economy or progression.
- Charcoal-black and purple mobile interface with safe areas, reduced motion, keyboard support, and 44px touch targets.
- Local sound effects plus a three-track Pixabay-licensed background playlist credited to Trycja via Pixabay. Sound starts On; effects and music each default to 50% and persist independently.
- Coin rewards use capped sound tiers rather than one sound per coin.
- Journal stories and bottle notes award 5 coins on first read; earned achievements award 10 coins on first claim. Red dots identify only rewards that are ready.
- Explicit fake rewarded-ad and purchase demonstrations. No real advertising, billing, analytics transmission, accounts, cloud save, or store integration exists.

## Current direction

- [GAMEPLAY_ROADMAP.md](GAMEPLAY_ROADMAP.md) is the active product roadmap.
- `coder-tasks.json` is the active bounded implementation queue.
- `npm.cmd run handoff` validates the workspace and prints the next approved coder task.
- [RELEASE_READINESS.md](RELEASE_READINESS.md) is the current target-by-target release verdict.

## Documentation boundary

Only files outside `archive/` are current. Archived files are historical and must not be consulted during normal development or planning. They may be used only when the owner explicitly requests a deep audit or historical comparison.
