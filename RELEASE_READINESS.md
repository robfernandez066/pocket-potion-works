# Release readiness

Audit date: 2026-07-12. Candidate version: `0.1.0`. This is an evidence report, not authorization to publish.

## Verdict by target

| Target | Verdict | Current evidence | Blocking work |
| --- | --- | --- | --- |
| Local browser prototype release candidate | **NO-GO pending browser evidence** | Automated gameplay, save, platform, audio, offline-shell, security, and budget checks pass. The current build includes a new dark theme and local audio mix. | Owner listening/playtest approval and refreshed manual gates in `release-browser-evidence.json`. |
| Installable PWA | **NO-GO for public release** | Manifest, icon, cache rotation, offline fallback, and same-origin runtime assets pass deterministic tests. | Real install, update, offline relaunch, storage eviction, and target-browser/device testing. |
| Native app stores | **NO-GO** | No native wrapper or production platform code exists. | Explicit store choices, accounts, identifiers, signing, legal terms, support/privacy URLs, age rating, packaging, and owner authorization. |
| Production monetization, analytics, accounts, or cloud | **NO-GO** | Browser uses explicit fake demonstrations, memory-only analytics, and local fake cloud contracts. | Product/vendor/legal decisions, credentials, production verification, security/privacy review, and explicit owner authorization. |

## Current automated evidence

- `npm.cmd run check` covers deterministic gameplay, economy simulations, save compatibility, fake-platform boundaries, audio mappings and tiers, service-worker behavior, security checks, and release budgets.
- `npm.cmd run release:check` remains blocked while any required manual gate is pending or failed.
- Runtime ceiling: 380,000 uncompressed bytes. The latest measured runtime is approximately 330 KB; `release-budgets.json` is authoritative and fails on material growth.
- Service-worker cache generation is `ppw-shell-v17`, containing the complete local offline shell and seven wired audio files plus the application icon and code assets.
- Gameplay, platform, and sound preferences remain in separate versioned local namespaces.
- Historical and future-save fixtures verify migration and future-version overwrite protection.
- No production SDK, remote font, third-party runtime asset, account, billing endpoint, analytics endpoint, or cloud endpoint is present.

## Current manual gate

The previous foundation-build evidence is archived and cannot establish readiness for the dark-theme/audio candidate. Current evidence must cover:

- complete loops at 390x844 and 360x740;
- keyboard/modal focus and representative 200% reflow;
- sound-Off behavior;
- owner-approved sound-On cue assignment, volume, pitch, capped coin tiers, and persistence;
- delivered CSP, service worker, local audio assets, and console/network smoke.

## Owner-only decisions

Publishing, public hosting, store submission, signing, vendor activation, production credentials, pricing, territories, legal copy, and final screenshots remain owner actions. No passing repository check authorizes them.

## Rollback

Stop distribution or forward-fix for startup failure, save loss, duplicate rewards, uncapped offline credit, broken cache updates, unexpected external requests, fake capability presented as real, inaccessible controls, horizontal overflow, or severe audio failure. Follow `ROLLBACK_PLAN.md`.
