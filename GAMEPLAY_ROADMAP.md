# Pocket Potion Works gameplay roadmap

This is the active product roadmap. It replaces the completed foundation roadmap stored in `archive/`.

## Product principles

- Preserve the core loop: gather -> brew -> collect -> fulfill orders -> upgrade -> repeat.
- Prefer meaningful depth over large amounts of shallow content.
- Keep the game playable offline and without an account.
- Validate player clarity and enjoyment before adding production monetization or native packaging.
- Use brief owner playtests for subjective feel; automate deterministic and repetitive QA.

## Now - close the current vertical slice

1. Finish owner playtesting of the dark-theme and local-audio build.
2. Tune sound volume, pitch, timing, and cue assignment from owner feedback.
3. Verify the tutorial always targets the exact next actionable control or waiting state.
4. Fix any confusing first-session text, pacing, contrast, or touch issues.
5. Refresh browser evidence, update the current release verdict, and merge the approved build.

Exit gate: the owner can complete gather, brew, collect, deliver, and upgrade without confusion; the sound mix is approved; automated checks and exact-size browser QA pass.

## Next - deepen progression

### Potion mastery and discovery

- Add per-recipe mastery earned by brewing and delivering each potion.
- Use mastery to unlock small recipe-specific improvements, journal entries, or cosmetic bottle variants.
- Make recipe discovery feel earned without creating random dead ends or impossible orders.

### Better upgrade decisions

- Clarify upgrade tradeoffs and show the next-level effect before purchase.
- Add a small number of mutually interesting workshop paths instead of only linear stat increases.
- Preserve deterministic costs and simulation coverage.

### Customer relationships

- Give recurring customers lightweight preference or relationship progress.
- Add short request chains and recognizable customer moments without requiring dialogue generation or online content.

Exit gate: progression creates at least two meaningful player goals beyond simple level gain, with no new first-session stalls.

## Later - retention and identity

- Workshop decorations and cosmetic customization earned through play.
- Weekly request chains and collection goals that work offline and do not punish missed days.
- Additional achievements, recipe sets, customer stories, and prestige goals based on playtest demand.
- Separate master and effects-volume controls if the current single sound toggle is insufficient.
- Optional seasonal content only after a safe offline content-versioning design exists.

## Monetization exploration - after engagement proof

- Keep all current placements simulated until the owner approves vendors, legal terms, and production work.
- Prefer optional rewarded convenience and cosmetic/supporter purchases.
- Do not sell required progression, create punitive timers, or design around ads before retention is proven without them.

## Release path

1. Owner-approved local vertical slice.
2. Public or limited PWA beta with real install/update/offline/device evidence.
3. Privacy, support, age-rating, store-art, and account decisions.
4. Native packaging and production integrations only with explicit owner authorization.

## Not currently approved

Production ads, billing, transmitted analytics, accounts, cloud saves, social systems, notifications, live operations, native wrappers, store submission, and public publishing remain out of scope until separately authorized.
