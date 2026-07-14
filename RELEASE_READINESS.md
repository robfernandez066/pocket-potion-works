# Release readiness

This is a concise target verdict, not authorization to broaden distribution.

## Verdict by target

| Target | Verdict | Current boundary |
| --- | --- | --- |
| Public GitHub Pages tester | **AUTHORIZED FOR TESTING** | Live from `main`; not a production or store release. |
| Broader public promotion | **ON HOLD** | Resume only after owner approval and applicable manual evidence. |
| Installable production PWA | **NO-GO** | Real install, update, offline relaunch, storage, accessibility, and target-device evidence remain pending. |
| Native app stores | **NO-GO** | No wrapper, signing, store accounts, identifiers, legal publication, or packaging approval. |
| Production monetization, analytics, accounts, or cloud | **NO-GO** | Only explicit fake/local contracts exist; no production service is authorized. |

## Current evidence

- `npm.cmd run check` passes automated gameplay, economy, save, platform-boundary, audio, service-worker, security, and budget checks.
- Gameplay save schema is v8 with v1-v7 migration, future-v9 overwrite protection, and frozen-reader rollback coverage.
- Service-worker cache generation is `ppw-shell-v50`.
- Current measured runtime is 23,945,066 of 24,000,000 bytes; `release-budgets.json` is authoritative.
- Manual release status lives only in `release-browser-evidence.json` and `DEVICE_TEST_MATRIX.md`; it remains pending while release work is deferred.
- No production SDK, remote font, third-party runtime asset, account, billing endpoint, analytics endpoint, or cloud endpoint is present.

## Authorization boundary

The owner has authorized the GitHub Pages tester link. Store submission, production PWA promotion, native packaging, pricing, territories, legal publication, credentials, vendors, and production services still require explicit owner approval.

For startup failure, save loss, duplicate rewards, broken updates, unexpected external requests, inaccessible controls, severe overflow, or disruptive audio that cannot be muted, follow `ROLLBACK_PLAN.md`.
