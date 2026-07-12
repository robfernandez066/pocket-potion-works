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

- Gather ingredients, brew timed potions, collect bottles, fulfill customer orders, buy upgrades, and prestige.
- Six ingredients, eight recipes, twelve customer variants, five upgrade tracks, daily goals, and eight achievements.
- State-aware First Steps guidance with exact targets and cross-view prompts.
- Versioned local saves, safe recovery, and a four-hour offline-progress cap.
- Charcoal-black and purple mobile interface with safe areas, reduced motion, keyboard support, and 44px touch targets.
- Local offline audio samples for gathering, brewing, collecting, delivery, coins, level-ups, and taps. Sound starts Off and persists locally.
- Coin rewards use capped sound tiers rather than one sound per coin.
- Explicit fake rewarded-ad and purchase demonstrations. No real advertising, billing, analytics transmission, accounts, cloud save, or store integration exists.

## Current direction

- [GAMEPLAY_ROADMAP.md](GAMEPLAY_ROADMAP.md) is the active Now / Next / Later product roadmap.
- `coder-tasks.json` is the active bounded implementation queue.
- `npm.cmd run handoff` validates the workspace and prints the next approved coder task.
- [RELEASE_READINESS.md](RELEASE_READINESS.md) is the current target-by-target release verdict.

## Documentation boundary

Only files outside `archive/` are current. Archived files are historical and must not be consulted during normal development or planning. They may be used only when the owner explicitly requests a deep audit or historical comparison.
