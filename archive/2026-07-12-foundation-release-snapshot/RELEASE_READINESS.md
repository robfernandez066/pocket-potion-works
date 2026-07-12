# Release readiness

Audit date: 2026-07-12. Candidate version: `0.1.0`. This is an evidence report, not authorization to publish.

## Verdict by target

| Target | Verdict | Evidence | Blocking work and owner |
| --- | --- | --- | --- |
| Local browser prototype release candidate | **GO** | Dependency-free static shell; deterministic gameplay, historical/future-save compatibility, lifecycle, offline fallback, fake-platform, security, and size checks pass. All six dated local/browser gates in `release-browser-evidence.json` passed in the Codex in-app Chromium browser on Windows. | Publishing remains an owner-only action. This GO does not extend to public PWA distribution, physical devices, native stores, or production services. |
| Installable PWA | **NO-GO for public release** | Manifest, icon, service worker, cache rotation, same-origin fetch handling, and offline fallback pass static/deterministic tests. | Installation, update, offline relaunch, storage eviction, and real browser lifecycle behavior are untested. Required raster/icon and screenshot variants must be confirmed against chosen distribution targets. Release QA and owner. |
| Native app stores | **NO-GO** | No native wrapper or production platform code exists, by design. | Owner must choose stores, identifiers, accounts, signing, legal terms, support/privacy URLs, age rating, devices, and packaging authorization. Owner plus legal/release engineering. |
| Production monetization, analytics, or cloud | **NO-GO** | Browser uses explicit fake ad/IAP/lifecycle adapters, memory-only consent-gated analytics, and memory-only fake cloud. No production dependency or endpoint is present. | Vendor/legal choices, credentials, receipt verification, consent basis, data contracts, security review, incident response, and explicit owner authorization. Owner plus legal/platform engineering. |

## Automated evidence

- `npm.cmd run check` and `npm.cmd run release:check:automated` are pre-evidence automated gates. `npm.cmd run release:check` is the final local/browser gate and intentionally fails while required manual evidence is pending or failed.
- The release gate checks all offline-shell entries and manifest essentials; absence of remote runtime URLs, fonts, endpoints, production SDKs/dependencies, and unrelated product references; explicit fake adapters; exact disclosure wording; asset provenance; versioned gameplay/platform/audio namespaces; security headers/path containment; release documents; and per-file/total size ceilings.
- A service-worker harness exercises install, old-cache rotation, cached responses, network failure, and `index.html` fallback. This is deterministic code evidence, not a real browser/device result.
- A lifecycle/migration suite proves shared-storage reload compatibility, corrupt-namespace isolation, background suppression, one resume credit, the four-hour cap, and future-time zero credit.
- Checked-in fixtures reproduce the initial pre-release v1 save shape and an unsupported future v2 shape. Tests preserve legacy progression, stardust, achievements, lifetime stats, active brew/orders, and safe defaults. A future version is rejected before normalization, and the runtime blocks autosave, commerce reconciliation, page-hide save, and manual save until the player explicitly resets or returns to a newer build.
- Runtime shell budget: 155,000 bytes uncompressed total. Actual measured output is printed by the release gate. Budgets live in `release-budgets.json` and fail on material growth.
- Static-server defense includes CSP, no-referrer, no-sniff, denied camera/microphone/geolocation/payment, frame denial, same-origin resource policy, GET/HEAD-only handling, and path containment. The matching CSP meta policy protects hosts that do not supply headers, except frame controls which require the server header.

## Severity and ownership

- **P0 / owner:** no native or production-service release without accounts, legal choices, credentials, policies, and an explicit publish decision.
- **P1 / release QA:** local/browser gates are complete. PWA install/update/offline lifecycle and broader device rows remain separate NO-GO evidence and do not become passed through this local/browser gate.
- **P1 / owner and design:** approve truthful listing copy, final screenshots, age rating, privacy/support/legal URLs, pricing, and territories.
- **P2 / platform engineering:** produce target-specific raster icons and wrappers only after targets are authorized.

## Rollback criteria

Stop distribution or forward-fix immediately for save loss/corruption, failure to block a future save from overwrite, duplicate reward/fulfillment, uncapped offline credit, shell boot failure, unexpected external requests, fake capability presented as real, a CSP-caused gameplay/audio failure, horizontal overflow, inaccessible essential controls, or a runtime budget gate bypass. Follow `ROLLBACK_PLAN.md`.

Publishing, store submission, signing, vendor activation, and production credential use are owner-only actions. No passing check in this repository authorizes them.
