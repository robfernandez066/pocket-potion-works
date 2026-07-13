# Rollback plan

## Release identity

- Package version: `0.1.0`.
- Gameplay save: version `8`, key `pocket-potion-works-v1`; the unchanged key lets v8 migrate v1-v7 and lets frozen downlevel readers protect newer data instead of silently forking it.
- Platform state: `pocket-potion-works-platform-v1`.
- Sound preference: `pocket-potion-works-audio-v1`.
- Current service-worker cache: `ppw-shell-v44`.
- Record the exact commit and tag at release time; do not rely on a temporary branch name as release identity.

Do not rename, clear, merge, or downgrade versioned storage keys during rollback.

## Rollback triggers

Stop distribution or forward-fix for startup failure, save loss/corruption, future-save overwrite, duplicate fulfillment/reward, uncapped offline credit, broken cache updates, unexpected data transmission, fake integrations appearing real, severe accessibility/overflow regression, CSP failure, or disruptive audio behavior that cannot be muted.

## Response

1. Stop new distribution or promotion. Do not activate production adapters or credentials.
2. Record commit/tag, package version, cache version, browser/device, reproduction, and affected save version. Do not request raw user saves through an unauthorized channel.
3. Prefer a forward fix with a new `ppw-shell-*` cache version. Re-serving an older worker may leave mixed cached assets.
4. Preserve forward-compatible saves. Unsupported future versions must remain write-protected until compatible code returns or the player explicitly confirms a reset.
5. Rerun automated checks and every affected real-browser/device row before reopening distribution.

## Audio rollback

Sound begins On but must always remain immediately mutable and must never block gameplay. If an effect fails, retain the mute path and fall back to synthesized cues or remove the affected mapping in a forward fix. If music fails, skip unavailable tracks and keep gameplay running; music is streamed on demand and must never receive the HTML offline fallback. Keep audio files local and update budgets, delivery policy, and provenance whenever assets change.

## Fake-platform safeguards

The Moonlight Market is safe only while every placement and result is clearly simulated. Do not point fake interfaces at production endpoints. Production capability requires contract tests, receipt/reward verification, consent/legal review, credential isolation, and explicit owner approval.

## Ownership

The owner controls distribution, rollback activation, public communication, and production authorization. Gameplay engineering owns saves and economy; platform engineering owns wrappers and services; the legal/privacy owner approves disclosures.
