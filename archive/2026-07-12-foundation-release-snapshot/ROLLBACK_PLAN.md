# Rollback plan

## Release identity and ownership

- Candidate branch: `agent/release-candidate-readiness`; package version: `0.1.0`; gameplay save version/key: `1` / `pocket-potion-works-v1`.
- Platform state uses `pocket-potion-works-platform-v1`; sound uses `pocket-potion-works-audio-v1`. Do not rename, clear, merge, or downgrade these keys during a rollback.
- The owner chooses and records any release tag only after QA. Publishing, rollback activation, store actions, and user communication are owner/release-manager decisions.

## Trigger and response

Trigger rollback/forward-fix for startup failure, save loss, duplicate fulfillment/reward, uncapped offline credit, unexpected data transmission, fake integrations appearing real, severe accessibility/overflow regression, CSP breakage, or corrupted cache updates.

1. Stop new distribution or promotion. Do not activate real adapters, credentials, billing, analytics, or cloud services.
2. Record affected version, browser/device, reproduction, save version, service-worker cache name, and whether existing users or only new installs are affected. Never request a user's raw save through an unauthorized channel.
3. Prefer a forward fix with a new service-worker cache version. Re-serving an older worker may not immediately replace an already active worker and can strand mixed cached assets.
4. Preserve forward-compatible saves. The v1 runtime detects a numeric save version above `1`, refuses to normalize it, and blocks gameplay-save writes and pending commerce reconciliation. It presents a protection notice and permits deletion only through the existing explicit Reset game data confirmation. If rollback code cannot read a newer save, keep the guard active and ship a compatible forward fix; never silently normalize, reset, or overwrite progress.
5. Rerun `npm.cmd run check`, then the applicable device/PWA rows before reopening distribution.

## Service-worker considerations

The worker deletes older `ppw-shell-*` caches during activation and claims clients. Every runtime-shell change requires a new cache version and complete shell list. A repair should use the next cache identifier, retain same-origin-only handling and offline HTML fallback, and test old-to-new update plus offline relaunch. Browser site-data clearing is a last-resort user recovery step because it also removes local progress.

## Fake-adapter safeguards and kill strategy

The fake market is safe only while every placement and result is labeled simulated. Before any production-branded distribution, either keep the explicit prototype wording or disable/hide the market entry with a reviewed local feature switch. Do not point fake interfaces at production endpoints. A production adapter may be enabled only after contract tests, receipt/reward verification, consent/legal review, credential isolation, and owner approval. If verification fails, disable the capability; never grant optimistically.

Recovery owners: owner/release manager for distribution and communications; gameplay engineering for saves/offline credit; platform engineering for wrapper, signing, commerce, analytics, or cloud; legal/privacy owner for disclosure changes.

## Tested compatibility evidence

- `fixtures/saves/legacy-pre-release-v1.json` reflects the initial repository save shape before later gather/discovery fields and expanded content. The deterministic compatibility suite verifies durable progression, active brew/orders, stardust, achievements, lifetime stats, and later-field defaults.
- `fixtures/saves/future-version-v2.json` verifies that v1 tooling reports `unsupported-future-version` and preserves the stored bytes instead of creating a downgraded replacement.
- The final release gate statically verifies that the browser adapter applies the future-save write guard and skips startup commerce reconciliation while guarded.
