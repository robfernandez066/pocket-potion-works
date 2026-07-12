# Device and lifecycle test matrix

Automated evidence and real browser/device evidence are separate. The active candidate is the charcoal-black/purple build with local audio and service-worker cache `ppw-shell-v18`.

## Required local/browser candidate gates

`release-browser-evidence.json` is the machine-readable source of truth.

| Gate | Status | Required evidence |
| --- | --- | --- |
| 390x844 mobile loop | Pending | Gather, brew, stable collect across timer ticks, deliver, upgrade, tutorial dismissal, Market access, reload, overflow, contrast, and console. |
| 360x740 mobile loop | Pending | Same complete loop and interaction checks at the narrower target. |
| Keyboard and modal focus | Pending | Essential controls, focus trap, Escape, and focus return. |
| Representative 200% reflow | Pending | Essential controls remain available without page overflow. |
| Sound Off | Pending | Defaults Off, persists, initializes nothing, and never blocks gameplay. |
| Sound On sample mix | Pending owner approval | Correct cues; tap pitch/volume; gathering, brewing, collection, delivery, level-up; capped coin tiers; persistence; graceful fallback. |
| CSP/runtime smoke | Pending | Current shell and local audio load under delivered headers with no CSP, console, or unexpected network errors. |

## Automated coverage

| Area | Status | Evidence |
| --- | --- | --- |
| Core loop and transactions | Pass | Deterministic gather -> brew -> collect -> deliver -> upgrade tests. |
| Economy and content | Pass | Twelve seeded ten-minute simulations and unlock/order invariants. |
| Save and rollback compatibility | Pass | Current, malformed, historical v1, and unsupported future v2 fixtures. |
| Lifecycle/offline progress | Pass | Background suppression, one resume credit, four-hour cap, and future-time zero credit. |
| Platform boundaries | Pass | Fake ad/IAP, consent, local analytics schema, pending fulfillment, and local cloud-conflict contracts. |
| Audio behavior | Pass | Preference safety, sample mapping, tap pitch behavior, capped coin tiers, gathering playback, fallback, and failure isolation. |
| Offline shell | Pass | Install, complete cache list, old-cache removal, cached response, network rejection, and HTML fallback. |
| Static security and budgets | Pass | CSP/header policy, path containment, no production SDK/endpoints, and per-file/total budgets. |

## Public PWA and native coverage

| Area | Status | Required procedure |
| --- | --- | --- |
| Browser lifecycle | Untested | Background/resume/reload and clock-boundary tests in chosen Chromium, WebKit, and Firefox targets. |
| PWA install/update | Untested | Install, standalone launch, update from the previous public candidate `ppw-shell-v17` to `ppw-shell-v18`, offline relaunch, eviction, uninstall/reinstall. |
| Network conditions | Untested | First load, offline reload, interrupted update, recovery, and third-party request inspection. |
| Screen reader | Untested | Owner-approved VoiceOver, TalkBack, NVDA, or equivalent set. |
| Physical iOS/iPadOS | Untested | Safari/PWA lifecycle, safe areas, audio unlock, storage, and orientation. |
| Physical Android | Untested | Chrome/PWA install, lifecycle, back behavior, audio, and storage. |
| Native iOS/Android wrappers | Blocked | Requires authorized wrapper, signing, plugins, and store accounts. |

Public PWA and native targets remain NO-GO until their applicable rows pass with dated browser/OS/device evidence.
