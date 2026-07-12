# Device and lifecycle test matrix

Automated evidence and physical/browser evidence are intentionally separate. “Pass” below never means a real device was tested unless named.

## Local/browser release-candidate gate

`release-browser-evidence.json` is the machine-readable source of truth. The final `npm.cmd run release:check` requires every row below to be `passed` with a valid date and non-empty environment. Automated-only success cannot satisfy these rows.

| Gate ID | Required evidence | Current status |
| --- | --- | --- |
| `mobile-loop-390x844` | Full loop, reload, overflow, and console at exactly 390×844 | Passed 2026-07-12; see evidence JSON |
| `mobile-loop-360x740` | Full loop, reload, overflow, and console at exactly 360×740 | Passed 2026-07-12; see evidence JSON |
| `keyboard-modal-focus` | Essential keyboard operation, modal focus trap, Escape, and focus return | Passed 2026-07-12; see evidence JSON |
| `zoom-200-reflow` | Representative 200% reflow with essential controls available and no page overflow | Passed 2026-07-12; see evidence JSON |
| `sound-off-behavior` | Default/muted core loop without audible output, audio initialization, or gameplay blockage | Passed 2026-07-12; see evidence JSON |
| `csp-runtime-smoke` | Shell, service worker, gameplay, and Web Audio toggle under delivered CSP with no console/CSP errors | Passed 2026-07-12; see evidence JSON |

These gates are the manual subset for the only eligible GO target. PWA, physical-device, assistive-technology, and native evidence below remains separately NO-GO and is not waived when the local/browser gate passes.

| Area | Environment | Status | Evidence or required procedure |
| --- | --- | --- | --- |
| Core loop | Deterministic Node model | Pass | Gather → brew → collect → deliver → upgrade transaction test. |
| Save reload | Deterministic Node storage | Pass | Gameplay, platform/receipt/consent, and audio namespaces reload together without key changes. |
| Save recovery | Deterministic Node storage | Pass | Malformed gameplay and malformed platform/audio shapes recover independently. |
| Lifecycle | Deterministic coordinator | Pass | Background suppresses active time; resume awards once; duplicate resume does not credit. |
| Offline time | Deterministic game/coordinator | Pass | Four-hour cap and future timestamp zero-credit cases. |
| Offline shell | Service-worker harness | Pass | Install, cache coverage, old-cache removal, cached response, network rejection, and HTML fallback. Not a browser result. |
| Static security | Node release gate | Pass | Header policy, path containment, runtime URL/SDK scan, fake-boundary scan. |
| 390×844 browser | Codex in-app Chromium on Windows | Pass | Full loop, reload, overflow inspection, and console check completed 2026-07-12. |
| 360×740 browser | Codex in-app Chromium on Windows | Pass | Full loop, reload, overflow inspection, and console check completed 2026-07-12. |
| Browser lifecycle | Chromium/WebKit/Firefox targets | Untested | Background ≥20s, resume once, reload, future clock correction, four-hour cap boundary. |
| PWA install/update | Chosen desktop/mobile browsers | Untested | Install, standalone launch, offline relaunch, update from cache v10 to v11, storage eviction, uninstall/reinstall. |
| Network conditions | Real browser | Untested | First load online; reload offline; slow/interrupted shell update; recover online; verify no third-party requests. |
| Keyboard/zoom/motion | Codex in-app Chromium plus broader targets | Local keyboard and zoom gates passed; reduced-motion multi-browser row untested | Essential loop, focus trap/return, and representative 200% reflow passed locally. Broader browser and assistive-technology coverage remains outstanding. |
| Screen reader | VoiceOver, TalkBack, NVDA or owner-approved set | Untested | Names, roles, live brew status, modal navigation, order and upgrade states. |
| Physical iOS/iPadOS | Owner-chosen minimum/current OS | Untested | Safari/PWA lifecycle, safe areas, audio unlock, storage persistence, orientation policy. |
| Physical Android | Owner-chosen minimum/current OS | Untested | Chrome/PWA install, lifecycle, back behavior, audio, storage persistence. |
| Native iOS/Android wrappers | None exist | Blocked | Requires authorized wrapper, signing, plugins, and store accounts. |

Public PWA and native verdicts remain NO-GO until the applicable untested rows pass and evidence is recorded with browser/OS/device versions, date, result, console/network observations, and issue links.
