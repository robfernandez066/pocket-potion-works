# Pocket Potion Works gameplay roadmap

This is the active product roadmap. Archived plans and consultant inputs are not sources of truth.

## Product principles

- Preserve the core loop: gather -> brew -> collect -> fulfill orders -> upgrade -> repeat.
- Add meaningful choices before adding more content.
- Keep required play cozy, short, offline, mobile-friendly, and accessible.
- Optional interactions may improve rewards but must never become mandatory skill gates.
- Use owner playtests for subjective feel and deterministic tests/simulations for balance.
- Keep production monetization and native packaging out of scope until retention is proven.

## Completed - interaction blockers and prototype integrity

Task 6 shipped a dismissible, timed tutorial handoff; touch-readable Market lock; visible Prosperity countdown; stable brew controls; non-occluding toasts; readable gathering rate; and idle/brewing/ready scene states. Quick-brew now uses one shared deterministic rule in gameplay and simulation: once per brew, with at least 45 seconds remaining, remove 40% of the remaining time. Automated checks and 390x844 plus 360x740 browser acceptance passed. The broader owner/release gate remains separate.

## Now - meaningful gathering and a shorter workshop loop

### Gathering redesign

- Make charges scarce enough to plan around and valuable enough to matter, but derive recharge and yield through economy simulations rather than hard-coding an untested recommendation.
- Let charged gathering target an ingredient or small ingredient family. Passive/offline gathering may remain random.
- Surface charge stock and recovery clearly.
- Preserve a simple instant action. A short pick-3 foraging interaction may be prototyped only as an optional better-yield path after the base economy works.

### Workshop flow

- Keep the four bottom tabs; do not add draggable or collapsible navigation chrome.
- Add a compact ready-to-deliver order strip in Workshop while retaining the full Orders noticeboard.
- Add a sticky brew-status shortcut when the cauldron is off-screen or the player is on another tab.
- Compact Pantry and Recipes with remembered disclosure state; costs and details remain available on demand.

Exit gate: gathering creates deliberate ingredient decisions, pantry scarcity remains understandable, and one full loop can be completed with materially less tab and scroll movement.

## Then - progression depth

- Rebalance prestige against the daily reward using simulations. The daily reward already resets by local date; the problem is comparative value, not absence of reset.
- Either add a meaningful level-8 unlock or move the prestige gate so progression does not dead-end after level 7.
- Add per-recipe mastery with small recipe-specific improvements, journal entries, or cosmetics.
- Add upgrade previews and a small number of mutually interesting paths.
- Add lightweight recurring-customer progress and short special-request chains.
- Consider a brief optional brew-start timing interaction only if it supports mastery without becoming required precision play.

Exit gate: players have at least two meaningful goals beyond player level, and prestige offers a credible long-term choice without invalidating daily play.

## Later - retention and identity

- Workshop decorations and cosmetic rewards, including a small prestige keepsake.
- Weekly request chains and collection goals that work offline and do not punish missed days.
- Additional recipes, customers, achievements, stories, and prestige goals only when playtests justify them.
- Separate master/effects volume controls if the single sound toggle proves insufficient.
- Audit cross-platform glyph rendering and move critical store-facing icons to local inline SVG where needed.

A second brew slot remains an experiment, not an approved feature. Revisit it only after gathering and timer pacing are stable.

## Simulated monetization rules

- Current placements remain explicitly fake. No production ad or billing SDK is approved.
- Prototype tuning must be bounded enough that tester behavior still produces useful economy evidence.
- `monetization-simulation.cjs` reproduces a fixed scripted-player comparison and is part of automated validation. Its magnitudes are exact for that profile but remain directional for human behavior.
- Charm caps/stacking, bundle value, permanent cosmetics, and contextual offers require simulation plus owner approval. Task 6 must replace the current finish-brew abuse characterization with a shared bounded-policy guardrail.
- Prefer optional convenience and cosmetic/supporter value. Do not sell required progression or design punitive timers around ads.

## Release boundary

The public GitHub Pages tester build is authorized. Broader promotion, store submission, native packaging, production ads, billing, transmitted analytics, accounts, cloud saves, notifications, and live operations remain unapproved.
