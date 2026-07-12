# Privacy disclosure draft

**DRAFT — owner and legal review required before publication.**

## Current browser prototype behavior

Pocket Potion Works stores a **local gameplay save** in the browser so progress can persist. It separately stores **local consent and simulated-commerce receipt state** used only by fake prototype adapters, a **local sound preference**, and compact Workshop display preferences. These records are versioned and treated as untrusted input on reload.

Optional analytics is off by default. If the player allows it, a fixed set of prototype events is held in **memory only** for the current page session. It is not persisted or transmitted. Turning it off stops further event collection. Event schemas reject arbitrary fields and personal identifiers.

There are **no accounts**, **no ad SDK**, **no billing**, **no cloud** save, no production analytics SDK, no device or advertising identifier collection, and no gameplay-data transmission. Initial use loads the static app files from the chosen web host; after the offline shell is cached, the app is designed to work without a network connection. The service worker may request updated same-origin app files when a connection is available. No third-party runtime asset or service endpoint is configured.

Resetting game data from the Journal removes the local gameplay save and compact Workshop display preferences. It does not currently remove the separate sound or platform-prototype preferences; a production privacy UX must explicitly cover clearing all local records. Browser/site-data controls can remove all four namespaces.

## Before any public or native release

**PLACEHOLDER:** owner-approved privacy policy URL, operator identity, contact method, applicable regions, minimum age, retention language, local-data deletion instructions, store data-safety answers, and legal basis must be supplied. Any future ad, billing, analytics, account, or cloud provider changes this disclosure and requires a new review before activation.
