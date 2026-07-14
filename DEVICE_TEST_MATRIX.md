# Device and lifecycle test matrix

Automated evidence and real browser or device evidence are separate. `release-browser-evidence.json` is the machine-readable source of truth for manual status and must identify the runtime cache generation it applies to.

## Current automated coverage

`npm.cmd run check` covers deterministic gameplay and economy, save migration and rollback protection, offline progress, fake platform boundaries, audio behavior, service-worker installation and fallback, static security, and runtime budgets.

Current runtime identity: gameplay save v8 and service-worker cache `ppw-shell-v50`.

## Deferred manual release gates

These remain pending while public-release work is on hold:

- complete mobile loop at 390x844 and 360x740, including reload, overflow, and console review;
- keyboard and modal focus behavior;
- representative 200% reflow;
- Sound Off behavior and owner-approved Sound On mix on physical hardware;
- delivered CSP, service-worker update, offline relaunch, storage, and network smoke;
- screen-reader checks on an owner-approved assistive-technology target;
- representative iOS/iPadOS and Android browser or installed-PWA lifecycle checks.

Native-wrapper checks remain blocked because no wrapper, signing setup, store account, or production plugin is approved.

## Evidence rules

- Do not mark evidence passed unless its `runtimeCache` matches the current service-worker cache.
- Record browser, OS or device, date, tested dimensions, and concise notes.
- A focused gameplay-task browser check does not automatically satisfy the broader release matrix.
- Re-run an affected row after changes to saves, caching, lifecycle, layout, input, audio, privacy behavior, or production boundaries.
