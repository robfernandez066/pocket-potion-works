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

This runs syntax and asset checks plus deterministic gameplay tests for brewing,
orders, progression, storage, daily rewards, offline time, and save recovery.

## Continue with a coder agent

```powershell
npm.cmd run handoff
```

This validates the current workspace and prints the next bounded coder prompt, recommended model, whether to use a fresh chat, and the acceptance checks. The ordered roadmap lives in `coder-tasks.json`; the human-readable strategy is in `CODER_ROADMAP.md`.

## Current prototype

- Manual and passive ingredient gathering
- Five unlockable recipes and timed brewing
- Customer orders, XP, levels, daily goals, and achievements
- Five upgrade tracks and a prestige loop
- Versioned local saves and capped offline progress
- Simulated rewarded-ad and starter-bundle placements
- Installable offline web app shell
- Mobile safe areas, reduced motion, keyboard-accessible modal, and responsive layouts

Real advertising, billing, analytics, cloud saves, and app-store packaging are intentionally not connected.
