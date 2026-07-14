# Platform adapter decision

Pocket Potion Works keeps platform capabilities behind dependency-free interfaces in `platform-adapters.js`. The browser build instantiates only adapters named `Fake...` or `LocalFake...`; they do not contact an ad network, app store, analytics endpoint, account service, or cloud service. The existing gameplay save remains at `pocket-potion-works-v1`. Consent and fake commerce receipts use a separate, normalized `pocket-potion-works-platform-v1` namespace.

## Packaging decision

Capacitor is the preferred future native wrapper because this prototype is already a static, offline-first web app and its platform interfaces can be implemented by native plugins without replacing the game layer. Do not install Capacitor yet. Packaging should wait until the owner chooses stores, legal terms, vendors, and production capabilities. A future native adapter must pass the same deterministic contract tests before replacing a fake adapter.

## Security and commerce contracts

- A rewarded request starts with zero reward. The coordinator grants exactly once only after the selected adapter recognizes the callback as its own confirmed success for the exact request ID and placement ID. Cancellation, failure, timeout, offline, unavailable inventory, mismatched context, duplicate callbacks, and late callbacks grant nothing.
- Production ad verification should use the vendor's server-side verification where available. The fake adapter's recognition mechanism is test-only and is not represented as production authentication.
- `apprentice_bundle` is a one-time non-consumable demo entitlement and may be restored idempotently. `keepsake_cauldron` is a second non-consumable test contract. The browser UI makes no price, real ownership, or billing claim.
- Purchase callbacks are bound to the exact request ID and product ID. Restore records must contain a recognized product and non-empty transaction ID and must pass adapter verification for that product.
- Verified transaction IDs are normalized and replay-protected in a newest-preserving bounded local ledger. The newest receipt always survives normalization. A production billing implementation must validate store receipts and entitlement state with the relevant store.
- Gameplay delivery uses a durable pending-fulfillment outbox. The verified receipt and pending delivery are persisted together; fulfillment updates the idempotent gameplay marker, persists the gameplay save, and only then acknowledges the outbox entry. Startup retries pending work, so crashes before gameplay save or before acknowledgement cannot permanently lose or duplicate the bundle.
- Cloud readiness defines `saveVersion`, monotonically increasing `revision`, `baseRevision`, `success`, `not-found`, `conflict`, and `error`. A stale base revision returns the newer record and never overwrites it. The local fake uses memory only, so offline play remains authoritative; there is no sync or account behavior.
- Lifecycle state accepts foreground, background, and resume. Only one foreground transition can award a background interval, while active timer credit is suppressed in the background.

## Privacy-impacting events and fields

Optional analytics defaults to denied. The setting uses equally direct allow/off controls and persists a versioned choice locally. A missing, older, or future consent version resets analytics to denied rather than carrying permission forward. When allowed, the browser adapter stores schema-approved events in memory only; it never transmits or persists them.

| Event | Allowed fields | Purpose |
| --- | --- | --- |
| `reward_attempt` | `placementId` | Count a simulated placement start |
| `reward_result` | `placementId`, `status` | Diagnose simulated completion outcomes |
| `purchase_result` | `productId`, `status` | Diagnose fake purchase outcomes |
| `consent_changed` | `analytics` | Record the local choice in the current memory session only |
| `lifecycle` | `phase` | Diagnose local foreground/background behavior |

Unknown events, missing or extra fields, values over 120 characters, raw save objects, email addresses, advertising identifiers, device identifiers, account identifiers, names, and other direct personal identifiers are outside the schema and rejected. Reward and purchase IDs are fixed placement/product identifiers, not user identifiers.

## Deferred production requirements

Before any production integration, the owner must explicitly choose and supply:

- target app stores, developer accounts, application/bundle IDs, signing teams, certificates/keys, provisioning profiles, and CI signing-secret handling;
- ad vendor account, application and placement IDs, test-device policy, server-side verification keys/endpoints, age rating, child-directed treatment, regional availability, frequency limits, and reward copy;
- Apple App Store Connect and Google Play Console products, pricing/tax regions, merchant agreements, banking/tax setup, receipt-validation design, refund/revocation behavior, restore UX, and support policy;
- analytics vendor/project credentials, data-processing agreement, retention/deletion rules, regional routing, event review, consent lawful basis, privacy policy, and opt-out/deletion UX;
- consent-management requirements by region, minimum-age policy, ATT decision and usage description if applicable, and store privacy/data-safety disclosures;
- cloud/account provider, authentication model, encryption and key management, quotas/cost limits, conflict-resolution UX, deletion/export/recovery policy, incident response, and terms of service;
- Capacitor/native versions, supported OS/device matrix, plugin choices and licenses, deep-link/notification/background-mode decisions, accessibility review, and release/rollback ownership.

No production credential, SDK, dependency, account, transmission, purchase, or publishing action is part of this task.
