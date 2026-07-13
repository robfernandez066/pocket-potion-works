"use strict";
// Monetization placement simulation for Pocket Potion Works.
//
// Purpose: quantify how each Moonlight Market placement changes an identical
// active play session, so "worth it" claims are reproducible instead of anecdotal.
// Style and determinism follow economy-simulation.cjs (same LCG, fixed start time).
//
// Run: node monetization-simulation.cjs
//
// Profiles:
//   baseline    - never uses the market
//   charm       - re-activates the 2x-order-coins boost whenever it has expired
//   finishBrew  - uses the shared once-per-brew quick-brew policy when eligible
//   bundle      - claims the apprentice bundle after the first order unlocks the market
//   whale       - all three combined
//
// The quick-brew eligibility and consumption rules come only from game-logic.js,
// so simulator and player-facing behavior cannot drift apart.

const assert = require("node:assert/strict");
const game = require("./game-logic.js");

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => { value = (1664525 * value + 1013904223) >>> 0; return value / 4294967296; };
}

const SEEDS = [7, 42, 2026, 99, 1234];
const START = Date.UTC(2026, 6, 12, 12);

function chooseUpgrade(state) {
  const affordable = game.UPGRADES.filter(upgrade => state.upgrades[upgrade.id] < upgrade.max && game.upgradeCost(state, upgrade) <= state.coins);
  return affordable.sort((a, b) => game.upgradeCost(state, a) - game.upgradeCost(state, b))[0] || null;
}

function chooseRecipe(state) {
  if (state.level >= 2 && !state.discovery.delivered.clarity) {
    const clarity = game.recipeById("clarity");
    return game.canAffordRecipe(state, clarity) ? clarity : null;
  }
  const requested = state.orders.map(order => game.recipeById(order.recipeId)).sort((a, b) => b.unlock - a.unlock);
  return [...requested, ...game.RECIPES].find(recipe => recipe.unlock <= state.level && game.canAffordRecipe(state, recipe)) || null;
}

// profile: { charm, finishBrew, bundle }
function simulate(profile, seed, seconds) {
  const random = seededRandom(seed);
  const state = game.defaultState(START);
  let passiveBank = 0;
  let adsWatched = 0;
  game.ensureOrders(state, random);
  for (let second = 0; second <= seconds; second += 1) {
    const now = START + second * 1000;
    passiveBank += game.gatherRate(state);
    if (passiveBank >= 1) {
      const whole = Math.floor(passiveBank);
      game.grantPassiveIngredients(state, whole, random);
      passiveBank -= whole;
    }
    if (second % 3 === 0) game.chargedGather(state, now, random);
    if (second % 5 === 0) {
      const marketUnlocked = state.stats.orders >= 1;
      if (marketUnlocked && profile.bundle && !state.starterClaimed) {
        state.starterClaimed = true;
        state.coins += 100;
        game.addRandomIngredients(state, 10, random);
      }
      if (marketUnlocked && profile.charm && now >= state.boostUntil) { state.boostUntil = now + 5 * 60 * 1000; adsWatched += 1; }
      if (marketUnlocked && profile.finishBrew && game.finishBrewAssistStatus(state, now).available) {
        const result = game.applyFinishBrewAssist(state, now);
        if (result.applied) adsWatched += 1;
      }
      game.collectBrew(state, now);
      for (const order of [...state.orders]) game.fulfillOrder(state, order.id, now, random);
      const upgrade = chooseUpgrade(state);
      if (upgrade) game.buyUpgrade(state, upgrade.id);
      if (!state.brew) {
        const recipe = chooseRecipe(state);
        if (recipe) game.startBrew(state, recipe.id, now);
      }
    }
  }
  return {
    coinsEarned: state.stats.coinsEarned,
    orders: state.stats.orders,
    brewed: state.stats.brewed,
    level: state.level,
    upgrades: Object.values(state.upgrades).reduce((sum, value) => sum + value, 0),
    adsWatched,
  };
}

function averaged(profile, seconds) {
  const runs = SEEDS.map(seed => simulate(profile, seed, seconds));
  const avg = key => runs.reduce((sum, run) => sum + run[key], 0) / runs.length;
  return { coinsEarned: avg("coinsEarned"), orders: avg("orders"), brewed: avg("brewed"), level: avg("level"), upgrades: avg("upgrades"), adsWatched: avg("adsWatched") };
}

const PROFILES = {
  baseline: {},
  charm: { charm: true },
  finishBrew: { finishBrew: true },
  bundle: { bundle: true },
  whale: { charm: true, finishBrew: true, bundle: true },
};

for (const horizon of [600, 1200]) {
  console.log(`\n=== ${horizon / 60}-minute active session (average of seeds ${SEEDS.join(", ")}) ===`);
  let base = null;
  for (const [name, profile] of Object.entries(PROFILES)) {
    const row = averaged(profile, horizon);
    if (name === "baseline") base = row;
    const pct = key => base[key] ? `${((row[key] / base[key] - 1) * 100).toFixed(0)}%` : "-";
    console.log(`${name.padEnd(11)} coins=${row.coinsEarned.toFixed(0).padStart(6)} (${pct("coinsEarned").padStart(6)})  orders=${row.orders.toFixed(1).padStart(5)}  brewed=${row.brewed.toFixed(1).padStart(5)}  level=${row.level.toFixed(1).padStart(4)}  upgrades=${row.upgrades.toFixed(1).padStart(4)}  ads=${row.adsWatched.toFixed(1)}`);
  }
}

// Guardrail assertions:
// 1. The charm should be player-feelable (meaningfully above baseline).
// 2. Quick-brew remains bounded: no more than one use per started brew and it
//    cannot multiply scripted coin output beyond twice baseline.
const baseline10 = averaged(PROFILES.baseline, 600);
const charm10 = averaged(PROFILES.charm, 600);
const finish10 = averaged(PROFILES.finishBrew, 600);
assert.ok(charm10.coinsEarned > baseline10.coinsEarned * 1.3, "charm placement no longer feelable (< +30% coins)");
assert.ok(finish10.adsWatched <= finish10.brewed + 1, "quick-brew exceeded one use per started brew");
assert.ok(finish10.coinsEarned < baseline10.coinsEarned * 2, "quick-brew exceeded the 2x scripted coin-output guardrail");
console.log("\nMonetization simulations passed: scripted charm value is visible and the shared quick-brew policy remains bounded.");
