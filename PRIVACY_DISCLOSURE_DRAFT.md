# Privacy disclosure draft

**DRAFT — owner and legal review required before production, native, or store publication.**

## Current public tester behavior

Pocket Potion Works stores a **local gameplay save**, **local consent and simulated-commerce receipt state**, a **local sound preference**, and compact Workshop display preferences in separate versioned browser namespaces. These records are treated as untrusted input when reloaded.

Optional analytics is off by default. If allowed, a fixed set of prototype events is held in **memory only** for the current page session. It is not persisted or transmitted. Event schemas reject arbitrary fields and personal identifiers.

There are **no accounts**, **no ad SDK**, **no billing**, **no cloud** save, no production analytics SDK, no device or advertising identifier collection, and no gameplay-data transmission by the game. The tester loads static files from GitHub Pages; the hosting provider may process ordinary connection metadata under its own policy. The service worker may request updated same-origin app files while connected, and no third-party runtime asset or service endpoint is configured.

Resetting game data from the Journal removes the gameplay save and compact Workshop preferences. It does not currently remove separate sound or platform-prototype preferences. Browser site-data controls can remove all local namespaces.

## Before production, native, or store release

The owner must supply an approved privacy-policy URL, operator identity, contact method, applicable regions, minimum age, retention and deletion language, store data-safety answers, and legal basis. Any production ad, billing, analytics, account, cloud, notification, or support provider requires a new disclosure review before activation.
