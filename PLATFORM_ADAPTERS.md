# Platform adapter boundary

Pocket Potion Works keeps future platform capabilities behind dependency-free interfaces in `platform-adapters.js`. The browser build instantiates only adapters named `Fake...` or `LocalFake...`; they do not contact an ad network, app store, analytics endpoint, account service, or cloud service.

No native wrapper is approved while release work is on hold. Do not install Capacitor or another wrapper without a new owner decision.

## Current safety contracts

- Rewarded demonstrations grant nothing until the matching fake adapter reports verified success for the exact request and placement. Cancellation, failure, timeout, offline, mismatch, duplicate, or late callbacks grant nothing.
- Fake purchases bind callbacks to the exact request and product, replay-protect transaction IDs, restore only recognized non-consumables, and use a durable idempotent pending-fulfillment outbox.
- Local fake cloud behavior models revision conflicts and never overwrites a newer record. It is memory-only and provides no account or sync behavior.
- Lifecycle handling awards at most one bounded offline interval after a background transition and suppresses overlapping active credit.
- Optional analytics defaults to denied, resets denied for unknown consent versions, accepts only a fixed schema, stores events in memory only, and never transmits them.
- Gameplay, platform state, audio preferences, and compact Workshop preferences use separate versioned local namespaces.

## Production boundary

Production ads, billing, analytics, accounts, cloud saves, notifications, wrappers, signing, credentials, legal terms, age-rating choices, vendor contracts, and store configuration require a newly approved task with provider-specific security, privacy, failure, and rollback review. No fake adapter may be presented as a real capability.
