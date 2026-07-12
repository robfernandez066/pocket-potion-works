# Pocket Potion Works

A mobile-first cozy idle alchemy game vertical slice. It runs without a build step or external dependencies.

## Play locally

```powershell
npm.cmd start
```

Open `http://127.0.0.1:4173`.

## Validate

```powershell
npm.cmd run check
```

This runs syntax and asset checks, deterministic gameplay tests, and six seeded
10-minute economy simulations covering milestone timing, stalls, impossible
orders, storage deadlocks, and runaway rewards.

## Continue with a coder agent

```powershell
npm.cmd run handoff
```

This validates the current workspace and prints the next bounded coder prompt, recommended model, whether to use a fresh chat, and the acceptance checks. The ordered roadmap lives in `coder-tasks.json`; the human-readable strategy is in `CODER_ROADMAP.md`.

## Current prototype

- Three-charge manual gathering with gentle recharge, plus passive gathering
- Six ingredients, eight unlockable recipes, and timed brewing
- Twelve customer variants, XP, levels, daily goals, and eight achievements
- Action-aware First Steps guidance with exact control targeting and cross-view prompts
- Five upgrade tracks and a prestige loop
- Versioned local saves and capped offline progress
- Explicit fake rewarded-ad and fake purchase adapters with verified-result and replay-safe contracts
- Versioned local consent, lifecycle, in-memory analytics, and conflict-safe local cloud-save readiness adapters
- Installable offline web app shell
- Mobile safe areas, reduced motion, keyboard-accessible modal, and responsive layouts

Real advertising, billing, analytics, cloud saves, and app-store packaging are intentionally not connected.
See `PLATFORM_ADAPTERS.md` for the fake-only architecture, privacy event fields, Capacitor decision, and deferred production requirements.
