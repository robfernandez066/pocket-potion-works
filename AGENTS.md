# Pocket Potion Works agent rules

## Active documentation only

- Treat only files outside `archive/` as current project direction and source of truth.
- Do not open, search, summarize, cite, or use anything under `archive/` during normal development, planning, QA, or handoff work.
- Archived material may be consulted only when the owner explicitly requests a deep audit, historical reconstruction, or comparison with an older decision.
- If active documentation conflicts, stop and surface the conflict instead of consulting the archive for an answer.
- `GAMEPLAY_ROADMAP.md` is the current product roadmap. `coder-tasks.json` is the current bounded execution queue.

## Product boundary

- This repository contains only Pocket Potion Works, a mobile-first cozy idle alchemy game.
- Do not introduce unrelated game concepts, frameworks, external services, or dependencies without explicit approval.
- Preserve the core loop: gather ingredients -> brew -> collect -> fulfill orders -> upgrade -> repeat.
- Real-money purchases, ad SDKs, analytics, cloud saves, and account systems are placeholders until explicitly authorized.

## Implementation rules

- Keep all gameplay values data-driven and deterministic enough to test.
- Preserve versioned saves, the four-hour offline cap, safe-area support, reduced-motion support, and 44px minimum touch targets.
- Treat local saves as untrusted input. Migrate or recover safely rather than crashing.
- Do not claim a monetization reward until the future platform adapter reports success.
- No remote fonts or remotely loaded runtime assets; the prototype must remain usable offline.

## Required implementation validation

1. Run `npm.cmd run check` on Windows.
2. Test gather -> brew -> collect -> deliver -> upgrade in the browser.
3. Test at 390x844 and 360x740 with no horizontal overflow.
4. Check browser console errors and warnings.
5. Report changed files, assumptions, validation, and deferred findings.

## PM and coder workflow

- The PM owns project scope, roadmap sequencing, coder prompts, report review, task status, and Git publication.
- Every newly approved roadmap task defaults to a fresh coder task. Continue the same coder task only for review questions or corrections within that task's unchanged scope.
- Before every coder prompt, state the recommended ChatGPT model, thinking level, and whether to use a fresh or existing coder task.
- Every coder prompt must name the objective, files to inspect first, required behavior, explicit out-of-scope work, acceptance checks, and validation proportional to risk.
- The coder must finish with exactly one overall status: `PASS`, `FAIL`, or `BLOCKED`, followed by its summary, changed files, validation evidence, assumptions, and deferred or out-of-scope findings.
- The PM reviews the report, actual diff, and validation. A failed or incomplete result returns to the same coder task with a focused correction prompt.
- Ask the owner to test only when a meaningful batch is ready or when a critical behavior needs immediate owner confirmation. Give a short procedure and expected result.
- When the PM approves the coder result and owner testing is not needed, the PM commits and pushes the scoped changes.
- Coders must not commit, push, change roadmap scope, or edit `coder-tasks.json` unless the PM explicitly authorizes it.

## Handoff

- Run `npm.cmd run handoff` before starting a roadmap task.
- Work on only the printed task.
- The PM updates task status only after reviewing the coder report, diff, and required evidence.
- Do not begin the next task in the same run unless the user explicitly asks.
