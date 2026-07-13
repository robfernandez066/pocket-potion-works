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

Owner level-4 playtesting found automatic gathering kept the Pantry full. Live and offline gathering now begin after the first delivered order, use an approximately 5-items-per-minute base rate, and stop at 60% of storage capacity. Charged targeted harvests retain access to the full Pantry, and Clear space lets players intentionally discard 1, 5, or all of an unwanted ingredient without earning coins.

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

## Completed - progression depth

Task 8 moves starry rebirth to the final recipe unlock at level 7 and grants 3 base stardust. Across seeds 7, 42, and 2026, the checked-in realistic strategy reached level 7 in 2,425-2,730 seconds with 30-33 orders, 36-39 mastery brews, and the normal 1-stardust daily claimed. A counterfactual reset retaining only that daily stardust and the chosen rebirth both recovered to level 3 in 317 seconds with four upgrades, while the chosen grant retained 69 coins versus the baseline's 26. Four reward stardust did not improve that recovery band: it averaged 323 seconds, five upgrades, and 6 unspent coins. This supports 3 as a bounded recovery cushion, not a claimed speed boost; staying at level 7 with the daily stardust remains the stronger immediate option. Rebirth preserves the current daily state so it cannot reset the same-date claim.

Each recipe now has durable mastery ranks at 3, 8, and 15 collected brews. Ranks add 4% matching-order value and survive rebirth. Upgrade cards expose exact current-to-next effects and group the existing five investments into Harvest, Brewing, and Trade paths. Recurring customers gain one trust heart every three deliveries, up to three hearts, with a visible 12-coin favor at each milestone. Trust and mastery normalize safely from existing saves and never block ordinary orders.

The optional brew-start timing interaction was not added; mastery supplies the intended longer goal without precision play.

Exit gate: players have at least two meaningful goals beyond player level, and prestige offers a credible long-term choice without invalidating daily play.

## Completed - offline-friendly retention and identity

- Five compact code-native workshop looks are available: the original, two collection-goal looks, one first-prestige Starglass Keepsake, and one rolling-request ribbon. None changes economy or required progression.
- Three deterministic request chains progress only on validated deliveries. Progress and claims never expire, local dates are ignored, and total prototype rewards are capped at 105 coins. This claim-when-ready policy avoids both missed-week punishment and false trust in a device clock.
- The optional daily goal keeps a monotonic saved local-date boundary: rollback or returning to the same high-water date cannot reissue it, while a later date restores ordinary missed-day play without a streak penalty. A fully offline client cannot prevent someone from repeatedly advancing the clock to brand-new future dates.
- Three collection goals reuse approved mastery and prestige evidence: brew 10 potions, collect each recipe, and complete one rebirth. No large content set was added.
- Critical screenshot chrome now uses inline SVG or CSS geometry for the brand, settings, market, resources, and four-tab navigation instead of platform-dependent glyphs.
- Save schema v4 migrates v1/v2/v3, preserves earlier progression and Task 12 content, and is protected from overwrite by frozen v1/v2/v3 readers during downlevel rollback.

The second brew slot remains deferred. Current evidence validates one cauldron plus bounded quick-brew; there is no separate pacing simulation showing that a second concurrent timer preserves ingredient demand, delivery cadence, or upgrade value.

Exit gate: owner playtests whether the rolling-chain cadence and small visual choices feel motivating without turning them into obligations.

## Completed - village stories and order variety

Owner direction is to add more playable content before monetization or broader release work. This bounded expansion deepened the twelve existing villagers and eight existing potions instead of extending timers, currencies, or the level curve.

- Give every recurring customer three short story beats revealed by their existing trust hearts.
- Add deterministic variety to each customer's order-request copy while preserving recipe requirements and rewards.
- Add one compact lore entry for every existing recipe, revealed by existing discovery progress.
- Present locked, newly available, and read story content clearly in the Journal without streaks, urgency, or required rewards.
- Derive unlocks from existing trust and discovery state where possible so current saves remain compatible and the economy is unchanged.

Exit gate: the village feels more authored and worth revisiting, while the core loop, level-7 rebirth timing, and economy remain unchanged.

## Completed - expanded potion book

Task 12 adds Frostmint and four new recipes across the existing level 4-7 progression. This is an optional content expansion inside the proven first-cycle level curve, not a new progression tier: starry rebirth remains available at level 7, no new currency or timer system was introduced, and the existing one-cauldron loop remains intact.

- Deterministic seeds 7, 42, and 2026 reach level 7 in 2,635-2,655 seconds with 31 orders, inside the approved Task 8 envelope.
- Frostmint and the four potions are integrated with Pantry targeting, passive/offline gathering, recipes, orders, mastery, discovery lore, and level-up presentation.
- Mooncloth Shelves remains tied to the original eight-recipe sampler, so adding content cannot revoke the earned cosmetic.
- Save schema v4 migrates v3 with zeroed new content and is protected from downlevel overwrite by a frozen v3 reader. Future v5 saves remain write-protected.
- The full loop, all tabs, and Settings passed 390x844 and 360x740 browser QA without horizontal overflow or console errors.

Exit gate: the new potions create meaningful additional choices within levels 4-7 without materially delaying rebirth, relocking existing rewards, or destabilizing the economy.

## Later

- Further recipes, ingredients, customers, achievements, prestige goals, or cosmetics only when playtests justify another bounded expansion.
- Playtest the implemented effects/music sliders and three-track fades before adding more mix controls or music.

## Simulated monetization rules

- Current placements remain explicitly fake. No production ad or billing SDK is approved.
- Prototype tuning must be bounded enough that tester behavior still produces useful economy evidence.
- `monetization-simulation.cjs` reproduces a fixed scripted-player comparison and is part of automated validation. Its magnitudes are exact for that profile but remain directional for human behavior.
- Charm caps/stacking, bundle value, permanent cosmetics, and contextual offers require simulation plus owner approval. Quick-brew remains on the shared once-per-brew bounded-policy guardrail.
- Prefer optional convenience and cosmetic/supporter value. Do not sell required progression or design punitive timers around ads.

## Release boundary

The public GitHub Pages tester build is authorized. Broader promotion, store submission, native packaging, production ads, billing, transmitted analytics, accounts, cloud saves, notifications, and live operations remain unapproved.
