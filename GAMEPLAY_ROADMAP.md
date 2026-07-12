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

## Completed - meaningful gathering and a shorter workshop loop

Task 7 implementation is ready for owner feel-testing. Three charged harvests now recharge every 30 seconds and yield 3 base items. The checked-in candidate comparison models 69 charged items per ten minutes, between the 15-second small-yield option (86) and 60-second large-yield option (65); existing first-session milestone simulations still pass. Players may keep Smart mix or target an unlocked Pantry ingredient. A targeted 180-second scarcity run produced 27 Starshards versus 9 from Smart mix.

Offline gathering begins after the first delivered order and stops at 75% of storage capacity. This preserves the four-hour idle benefit without starting or returning players at a full pantry that blocks targeted harvests.

### Gathering redesign

- Validate whether 30-second recharge and 3-item targeted harvests feel meaningful in owner playtesting; adjust only if feel evidence contradicts the passing simulations.
- Keep Smart mix and targeted charged gathering while passive/offline gathering remains random.
- Keep the instant harvest. No optional puzzle was added because targeting supplies the intended decision without another interaction layer.

### Workshop flow

- Keep the four bottom tabs; do not add draggable or collapsible navigation chrome.
- The Workshop now provides inline ready-order delivery while retaining the full Orders noticeboard.
- A sticky brew-status shortcut appears when the cauldron is off-screen or the player is on another tab.
- Pantry and Recipe Book use compact, remembered disclosure state; costs and details remain available on demand and tutorial targeting opens the required section.

Exit gate: gathering creates deliberate ingredient decisions, pantry scarcity remains understandable, and one full loop can be completed with materially less tab and scroll movement.

## Now - progression depth

Task 8 moves starry rebirth to the final recipe unlock at level 7 and grants 3 base stardust. Across seeds 7, 42, and 2026, the checked-in realistic strategy reached level 7 in 2,425-2,730 seconds with 30-33 orders, 36-39 mastery brews, and the normal 1-stardust daily claimed. A counterfactual reset retaining only that daily stardust and the chosen rebirth both recovered to level 3 in 317 seconds with four upgrades, while the chosen grant retained 69 coins versus the baseline's 26. Four reward stardust did not improve that recovery band: it averaged 323 seconds, five upgrades, and 6 unspent coins. This supports 3 as a bounded recovery cushion, not a claimed speed boost; staying at level 7 with the daily stardust remains the stronger immediate option. Rebirth preserves the current daily state so it cannot reset the same-date claim.

Each recipe now has durable mastery ranks at 3, 8, and 15 collected brews. Ranks add 4% matching-order value and survive rebirth. Upgrade cards expose exact current-to-next effects and group the existing five investments into Harvest, Brewing, and Trade paths. Recurring customers gain one trust heart every three deliveries, up to three hearts, with a visible 12-coin favor at each milestone. Trust and mastery normalize safely from existing saves and never block ordinary orders.

The optional brew-start timing interaction was not added; mastery supplies the intended longer goal without precision play.

Exit gate: players have at least two meaningful goals beyond player level, and prestige offers a credible long-term choice without invalidating daily play.

## Later - retention and identity

- Workshop decorations and cosmetic rewards, including a small prestige keepsake.
- Weekly request chains and collection goals that work offline and do not punish missed days.
- Additional recipes, customers, achievements, stories, and prestige goals only when playtests justify them.
- Playtest the implemented effects/music sliders and three-track fades before adding more mix controls or music.
- Audit cross-platform glyph rendering and move critical store-facing icons to local inline SVG where needed.

A second brew slot remains an experiment, not an approved feature. Revisit it only after gathering and timer pacing are stable.

## Simulated monetization rules

- Current placements remain explicitly fake. No production ad or billing SDK is approved.
- Prototype tuning must be bounded enough that tester behavior still produces useful economy evidence.
- `monetization-simulation.cjs` reproduces a fixed scripted-player comparison and is part of automated validation. Its magnitudes are exact for that profile but remain directional for human behavior.
- Charm caps/stacking, bundle value, permanent cosmetics, and contextual offers require simulation plus owner approval. Quick-brew remains on the shared once-per-brew bounded-policy guardrail.
- Prefer optional convenience and cosmetic/supporter value. Do not sell required progression or design punitive timers around ads.

## Release boundary

The public GitHub Pages tester build is authorized. Broader promotion, store submission, native packaging, production ads, billing, transmitted analytics, accounts, cloud saves, notifications, and live operations remain unapproved.
