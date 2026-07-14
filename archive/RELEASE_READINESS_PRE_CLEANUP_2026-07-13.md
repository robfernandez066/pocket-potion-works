# Release readiness

Audit date: 2026-07-12. Candidate version: `0.1.0`. This is an evidence report, not authorization to publish.

## Verdict by target

| Target | Verdict | Current evidence | Blocking work |
| --- | --- | --- | --- |
| Local browser prototype release candidate | **NO-GO pending browser evidence** | Automated checks pass. Task 6 interaction/economy acceptance passed at 390x844 and 360x740 with no overflow or console errors. | Complete the short owner playtest, listening approval, and remaining refreshed manual gates before treating this candidate as release-ready. |
| Installable PWA | **NO-GO for public release** | Manifest, icon, cache rotation, offline fallback, and same-origin runtime assets pass deterministic tests. | Real install, update, offline relaunch, storage eviction, and target-browser/device testing. |
| Native app stores | **NO-GO** | No native wrapper or production platform code exists. | Explicit store choices, accounts, identifiers, signing, legal terms, support/privacy URLs, age rating, packaging, and owner authorization. |
| Production monetization, analytics, accounts, or cloud | **NO-GO** | Browser uses explicit fake demonstrations, memory-only analytics, and local fake cloud contracts. | Product/vendor/legal decisions, credentials, production verification, security/privacy review, and explicit owner authorization. |

## Current automated evidence

- `npm.cmd run check` covers deterministic gameplay, economy and scripted monetization simulations, save compatibility, fake-platform boundaries, sound/music mappings and persistence, service-worker behavior, security checks, and release budgets. Monetization magnitudes are exact for the checked-in scripted profile but directional for human play.
- `npm.cmd run release:check` remains blocked while any required manual gate is pending or failed.
- Runtime ceiling: 24,000,000 bytes including streamed music. The latest measured runtime is 23,944,888 bytes; `release-budgets.json` is authoritative and fails on material growth.
- Service-worker cache generation is `ppw-shell-v48`. The install shell contains all code, eight sound effects, twenty-two supplied static/utility sprites, and the optimized Aurora animation sheet; the three large music tracks stream from the same origin on demand so they do not block installation. Existing installs show a clear restart prompt when the new worker takes control.
- Gameplay, platform, sound, and compact Workshop UI preferences remain in separate versioned local namespaces.
- Historical v1 through v7 saves migrate to current v8; future v9 coverage verifies overwrite protection, and frozen v1-v7 readers prove downlevel builds preserve newer saves.
- Progression tests cover level-7 rebirth, same-date daily preservation, durable mastery/customer migration, exact upgrade previews, and deterministic trust favors.
- Retention tests cover calendar-independent rolling chains, capped one-time rewards, a 320-coin lifetime ceiling across current Journal claims, monotonic daily rollback handling, malformed-chain recovery, reversible cosmetic selection, collection goals, and economy-neutral workshop looks. A fully offline client still cannot prevent arbitrary repeated advances to new future dates. Critical screenshot chrome uses code-native SVG/CSS icons.
- No production SDK, remote font, third-party runtime asset, account, billing endpoint, analytics endpoint, or cloud endpoint is present.

## Current manual gate

The previous foundation-build evidence is archived and cannot establish readiness for the dark-theme/audio candidate. Current evidence must cover:

- complete loops at 390x844 and 360x740;
- keyboard/modal focus and representative 200% reflow;
- sound-Off behavior;
- owner-approved sound-On cue assignment, volume, pitch, capped coin tiers, and persistence;
- delivered CSP, service worker, local audio assets, and console/network smoke.
- tutorial prompts never blocking Market, Settings, resources, or navigation;
- bounded simulated finish-brew behavior, visible charm state, touch-readable Market locking, and stable Collect across timer ticks.
- mastery, customer trust, upgrade previews, and level-7 rebirth copy remain readable and non-overflowing at both target sizes.
- rolling request claims, collection goals, cosmetic selection, and the prestige keepsake remain readable and non-overflowing at both target sizes.

## Owner-only decisions

Publishing, public hosting, store submission, signing, vendor activation, production credentials, pricing, territories, legal copy, and final screenshots remain owner actions. No passing repository check authorizes them.

## Rollback

Stop distribution or forward-fix for startup failure, save loss, duplicate rewards, uncapped offline credit, broken cache updates, unexpected external requests, fake capability presented as real, inaccessible controls, horizontal overflow, or severe audio failure. Follow `ROLLBACK_PLAN.md`.
