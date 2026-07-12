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

This runs syntax and asset checks, deterministic gameplay tests, and twelve seeded
10-minute economy simulations covering milestone timing, stalls, impossible
orders, storage deadlocks, and runaway rewards. It also runs the release gate:
offline-shell behavior, lifecycle/save compatibility, security posture, privacy
copy, fake-adapter boundaries, and runtime performance budgets.

For the automated release audit before browser evidence is recorded:

```powershell
npm.cmd run release:check:automated
```

The final local/browser release-candidate gate is:

```powershell
npm.cmd run release:check
```

That final command intentionally fails until every required real-browser check
in `release-browser-evidence.json` has a dated environment and `passed` status.

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

## Release status

The dependency-free browser build is a local release candidate, not a native or
monetized production app. Its gameplay, local persistence, offline shell, fake
platform boundaries, and deterministic release checks are ready for browser QA.
It is not GO until the final release gate accepts the recorded browser evidence.
Physical-device PWA installation, native wrappers, store submission, production
SDKs, legal approval, and publishing are not complete and are not represented as
complete. See `RELEASE_READINESS.md` for the target-by-target verdict and open
owner actions; the privacy, store, device, rollback, and screenshot documents are
draft release materials linked there.
