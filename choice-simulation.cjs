"use strict";

// Development-only evidence harness for Task 25. It schedules scenarios but
// deliberately delegates all game behavior to game-logic.js.
const assert = require("node:assert/strict");
const game = require("./game-logic.js");

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => { value = (1664525 * value + 1013904223) >>> 0; return value / 4294967296; };
}

const SEEDS = Object.freeze([7, 42, 2026, 99, 1234]);
const START = Date.UTC(2026, 6, 12, 12);
const ACTIVE_SECONDS = 10 * 60;
const OFFLINE_MINUTES = Object.freeze([60, 120]);
const HARVEST_ATTEMPT_SECONDS = 3;
const REPRESENTATIVE_RECIPE_ID = "sun";
const RECIPE_PAIRS = Object.freeze([
  Object.freeze({ level: 4, ids: Object.freeze(["sun", "lantern"]) }),
  Object.freeze({ level: 5, ids: Object.freeze(["heart", "quiet"]) }),
  Object.freeze({ level: 6, ids: Object.freeze(["dream", "way"]) }),
  Object.freeze({ level: 7, ids: Object.freeze(["starlight", "aurora"]) }),
]);
const UPGRADE_IDS = Object.freeze(["garden", "basket", "cauldron", "shelves", "ledger"]);
const INGREDIENT_IDS = Object.freeze(Object.keys(game.INGREDIENTS));

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function round(value) { return Math.round(value * 1000) / 1000; }
function emptyIngredients() { return Object.fromEntries(INGREDIENT_IDS.map(id => [id, 0])); }
function pantryStock(state) { return Object.fromEntries(INGREDIENT_IDS.map(id => [id, state.ingredients[id]])); }

function assertFiniteNonNegative(value, path = "report") {
  if (typeof value === "number") {
    // Comparison deltas are intentionally signed; every underlying scenario
    // outcome remains finite and nonnegative.
    const isDelta = path.includes(".delta.");
    assert.ok(Number.isFinite(value) && (isDelta || value >= 0), `${path} must be ${isDelta ? "finite" : "finite and nonnegative"}`);
  } else if (Array.isArray(value)) {
    value.forEach((entry, index) => assertFiniteNonNegative(entry, `${path}[${index}]`));
  } else if (value && typeof value === "object") {
    for (const [key, entry] of Object.entries(value)) assertFiniteNonNegative(entry, `${path}.${key}`);
  }
}

function averageNumbers(rows, key) {
  return round(rows.reduce((sum, row) => sum + row[key], 0) / rows.length);
}

function averagePantry(rows) {
  return Object.fromEntries(INGREDIENT_IDS.map(id => [id, round(rows.reduce((sum, row) => sum + row.finalPantry[id], 0) / rows.length)]));
}

function recipeAverage(rows) {
  const keys = ["firstAffordableBrewSeconds", "firstCollectionSeconds", "firstDeliverySeconds", "chargedItemsGranted", "passiveItemsGranted", "finalPantryTotal"];
  return {
    ...Object.fromEntries(keys.map(key => [key, averageNumbers(rows, key)])),
    finalPantry: averagePantry(rows),
    completedWithinTenMinutes: rows.filter(row => row.completedWithinTenMinutes).length === rows.length,
  };
}

function activeAverage(rows) {
  const keys = ["ingredientsGranted", "completedBrews", "completedOrders", "spendableCoins", "lifetimeCoins", "maximumPantryOccupancy", "storageAtCapacitySeconds", "cauldronOccupiedSeconds"];
  return Object.fromEntries(keys.map(key => [key, averageNumbers(rows, key)]));
}

function offlineAverage(rows) {
  const keys = ["grantedIngredients", "finalStock", "capacity"];
  return Object.fromEntries(keys.map(key => [key, averageNumbers(rows, key)]));
}

function delta(left, right, keys) {
  return Object.fromEntries(keys.map(key => [key, round(right[key] - left[key])]));
}

function zeroStockState(level) {
  const state = game.defaultState(START);
  state.level = level;
  state.xp = 0;
  state.coins = 0;
  state.ingredients = emptyIngredients();
  state.potions = Object.fromEntries(game.RECIPES.map(recipe => [recipe.id, 0]));
  state.orders = [];
  state.nextOrderId = 1;
  state.stats.orders = 1; // Enables passive/offline gathering without awarding setup rewards.
  state.stats.brewed = 0;
  state.stats.coinsEarned = 0;
  state.daily.orders = 0;
  state.daily.claimed = false;
  state.gather = { charges: game.GATHER_CONFIG.maxCharges, lastRechargeAt: START, targetId: null };
  return state;
}

function addOneBottleOrder(state, recipeId) {
  // The shipped generator supplies a valid ordinary customer, order id, reward,
  // and xp. At levels 4-7, a zero random draw chooses the first newest recipe;
  // only the scenario's named recipe is then substituted.
  const order = game.generateOrder(state, () => 0);
  assert.ok(order && order.quantity === 1, "representative order should be valid and one bottle");
  order.recipeId = recipeId;
  state.orders = [order];
  return order;
}

function makeRecipeSource(recipeId, level) {
  const state = zeroStockState(level);
  addOneBottleOrder(state, recipeId);
  return state;
}

function makeUpgradeSource() {
  const state = zeroStockState(4);
  addOneBottleOrder(state, REPRESENTATIVE_RECIPE_ID);
  return state;
}

function comparableRecipeSource(state) {
  const result = clone(state);
  result.orders[0].recipeId = "named-recipe";
  return result;
}

function comparableUpgradeSource(state, upgradeId) {
  const result = clone(state);
  result.upgrades[upgradeId] = 0;
  return result;
}

function runRecipeScenario(recipeId, level, seed, suppliedState = null) {
  const state = suppliedState || makeRecipeSource(recipeId, level);
  const random = seededRandom(seed);
  const recipe = game.recipeById(recipeId);
  let passiveBank = 0;
  let chargedItemsGranted = 0;
  let passiveItemsGranted = 0;
  let firstAffordableBrewSeconds = ACTIVE_SECONDS + 1;
  let firstCollectionSeconds = ACTIVE_SECONDS + 1;
  let firstDeliverySeconds = ACTIVE_SECONDS + 1;

  for (let second = 0; second <= ACTIVE_SECONDS; second += 1) {
    const now = START + second * 1000;
    passiveBank += game.gatherRate(state);
    if (passiveBank >= 1) {
      const amount = Math.floor(passiveBank);
      passiveItemsGranted += game.grantPassiveIngredients(state, amount, random);
      passiveBank -= amount;
    }
    if (second % HARVEST_ATTEMPT_SECONDS === 0) chargedItemsGranted += game.chargedGather(state, now, random).added;

    if (!state.brew && game.canAffordRecipe(state, recipe)) {
      if (firstAffordableBrewSeconds > ACTIVE_SECONDS) firstAffordableBrewSeconds = second;
      assert.ok(game.startBrew(state, recipeId, now), `${recipeId}/${seed} should start once affordable`);
    }
    if (game.collectBrew(state, now) && firstCollectionSeconds > ACTIVE_SECONDS) firstCollectionSeconds = second;
    const order = state.orders[0];
    if (order && game.fulfillOrder(state, order.id, now, random)) {
      firstDeliverySeconds = second;
      break;
    }
  }

  return {
    seed,
    firstAffordableBrewSeconds,
    firstCollectionSeconds,
    firstDeliverySeconds,
    chargedItemsGranted,
    passiveItemsGranted,
    finalPantry: pantryStock(state),
    finalPantryTotal: game.totalIngredients(state),
    completedWithinTenMinutes: firstDeliverySeconds <= ACTIVE_SECONDS,
  };
}

function runActiveUpgradeScenario(upgradeId, upgradeLevel, seed, suppliedState = null) {
  const state = suppliedState || makeUpgradeSource();
  state.upgrades[upgradeId] = upgradeLevel;
  const random = seededRandom(seed);
  const recipe = game.recipeById(REPRESENTATIVE_RECIPE_ID);
  const startingOrders = state.stats.orders;
  const startingBrews = state.stats.brewed;
  const startingCoins = state.coins;
  const startingLifetimeCoins = state.stats.coinsEarned;
  let passiveBank = 0;
  let ingredientsGranted = 0;
  let maximumPantryOccupancy = game.totalIngredients(state);
  let storageAtCapacitySeconds = 0;
  let cauldronOccupiedSeconds = 0;

  for (let second = 0; second <= ACTIVE_SECONDS; second += 1) {
    const now = START + second * 1000;
    if (game.totalIngredients(state) >= game.storageCap(state)) storageAtCapacitySeconds += 1;
    if (state.brew) cauldronOccupiedSeconds += 1;
    passiveBank += game.gatherRate(state);
    if (passiveBank >= 1) {
      const amount = Math.floor(passiveBank);
      ingredientsGranted += game.grantPassiveIngredients(state, amount, random);
      passiveBank -= amount;
    }
    if (second % HARVEST_ATTEMPT_SECONDS === 0) ingredientsGranted += game.chargedGather(state, now, random).added;
    maximumPantryOccupancy = Math.max(maximumPantryOccupancy, game.totalIngredients(state));

    game.collectBrew(state, now);
    for (const order of [...state.orders]) {
      if (game.fulfillOrder(state, order.id, now, random)) {
        // Keep one deterministic, shipped-generated ordinary order as the loop's only request.
        addOneBottleOrder(state, REPRESENTATIVE_RECIPE_ID);
      }
    }
    if (!state.brew && game.canAffordRecipe(state, recipe)) game.startBrew(state, recipe.id, now);
    maximumPantryOccupancy = Math.max(maximumPantryOccupancy, game.totalIngredients(state));
  }

  return {
    seed,
    ingredientsGranted,
    completedBrews: state.stats.brewed - startingBrews,
    completedOrders: state.stats.orders - startingOrders,
    spendableCoins: state.coins - startingCoins,
    lifetimeCoins: state.stats.coinsEarned - startingLifetimeCoins,
    maximumPantryOccupancy,
    storageAtCapacitySeconds,
    cauldronOccupiedSeconds,
  };
}

function runOfflineUpgradeScenario(upgradeId, upgradeLevel, minutes, seed, suppliedState = null) {
  const state = suppliedState || makeUpgradeSource();
  state.upgrades[upgradeId] = upgradeLevel;
  const now = START + minutes * 60 * 1000;
  const elapsed = game.offlineElapsedSeconds(state, now);
  assert.equal(elapsed, minutes * 60, `${upgradeId}/${minutes}: fixed offline interval should be intact`);
  const grantedIngredients = game.grantOfflineIngredients(state, elapsed, seededRandom(seed));
  return { seed, grantedIngredients, finalStock: game.totalIngredients(state), capacity: game.storageCap(state) };
}

function buildRecipeReport(pair) {
  const [leftId, rightId] = pair.ids;
  const leftSource = makeRecipeSource(leftId, pair.level);
  const rightSource = makeRecipeSource(rightId, pair.level);
  assert.notStrictEqual(leftSource, rightSource, "recipe arms must not share a source state");
  assert.notStrictEqual(leftSource.ingredients, rightSource.ingredients, "recipe arm ingredient state must be isolated");
  assert.deepEqual(comparableRecipeSource(leftSource), comparableRecipeSource(rightSource), `${leftId}/${rightId} sources must differ only by named recipe/order`);
  const arm = recipeId => {
    const recipe = game.recipeById(recipeId);
    const rows = SEEDS.map(seed => runRecipeScenario(recipeId, pair.level, seed, clone(recipeId === leftId ? leftSource : rightSource)));
    return {
      id: recipe.id,
      name: recipe.name,
      timerSeconds: recipe.seconds,
      baseSellValue: recipe.sell,
      totalIngredientUnits: Object.values(recipe.ingredients).reduce((sum, amount) => sum + amount, 0),
      ingredientIdentities: Object.keys(recipe.ingredients),
      rows,
      average: recipeAverage(rows),
    };
  };
  return { level: pair.level, arms: [arm(leftId), arm(rightId)] };
}

function buildUpgradeReport(upgradeId) {
  const upgrade = game.upgradeById(upgradeId);
  const baselineSource = makeUpgradeSource();
  const upgradedSource = makeUpgradeSource();
  upgradedSource.upgrades[upgradeId] = 1;
  assert.notStrictEqual(baselineSource, upgradedSource, "upgrade arms must not share a source state");
  assert.notStrictEqual(baselineSource.ingredients, upgradedSource.ingredients, "upgrade arm ingredient state must be isolated");
  assert.deepEqual(comparableUpgradeSource(baselineSource, upgradeId), comparableUpgradeSource(upgradedSource, upgradeId), `${upgradeId} sources must differ only by named upgrade`);
  const activeKeys = ["ingredientsGranted", "completedBrews", "completedOrders", "spendableCoins", "lifetimeCoins", "maximumPantryOccupancy", "storageAtCapacitySeconds", "cauldronOccupiedSeconds"];
  const activeRows = SEEDS.map(seed => {
    const baseline = runActiveUpgradeScenario(upgradeId, 0, seed, clone(baselineSource));
    const upgraded = runActiveUpgradeScenario(upgradeId, 1, seed, clone(upgradedSource));
    return { seed, baseline: Object.fromEntries(activeKeys.map(key => [key, baseline[key]])), upgraded: Object.fromEntries(activeKeys.map(key => [key, upgraded[key]])), delta: delta(baseline, upgraded, activeKeys) };
  });
  const offlineKeys = ["grantedIngredients", "finalStock", "capacity"];
  const offline = OFFLINE_MINUTES.map(minutes => {
    const rows = SEEDS.map(seed => {
      const baseline = runOfflineUpgradeScenario(upgradeId, 0, minutes, seed, clone(baselineSource));
      const upgraded = runOfflineUpgradeScenario(upgradeId, 1, minutes, seed, clone(upgradedSource));
      return { seed, baseline: Object.fromEntries(offlineKeys.map(key => [key, baseline[key]])), upgraded: Object.fromEntries(offlineKeys.map(key => [key, upgraded[key]])), delta: delta(baseline, upgraded, offlineKeys) };
    });
    return {
      minutes,
      rows,
      average: {
        baseline: offlineAverage(rows.map(row => row.baseline)),
        upgraded: offlineAverage(rows.map(row => row.upgraded)),
        delta: offlineAverage(rows.map(row => row.delta)),
      },
    };
  });
  return {
    id: upgrade.id,
    name: upgrade.name,
    activeScenario: {
      definition: "Level 4, zero Pantry and potions, one shipped-generated Bottled Sunrise ordinary order repeated after delivery; passive gathering is enabled, Request Mix is attempted every 3 seconds, and brew/collect/deliver actions are attempted every second.",
      rows: activeRows,
      average: {
        baseline: activeAverage(activeRows.map(row => row.baseline)),
        upgraded: activeAverage(activeRows.map(row => row.upgraded)),
        delta: activeAverage(activeRows.map(row => row.delta)),
      },
      blockedTimeDefinition: "storageAtCapacitySeconds counts seconds at full Pantry capacity before actions; cauldronOccupiedSeconds counts seconds with an active shipped brew before actions.",
    },
    offline,
  };
}

function allZero(object) { return Object.values(object).every(value => value === 0); }

function buildSummary(recipePairs, upgrades) {
  const exactTies = [];
  const measurableDifferences = [];
  const zeroMeasuredMarginalEffect = [];
  for (const pair of recipePairs) {
    const [left, right] = pair.arms;
    const comparisons = left.rows.map((row, index) => {
      const other = right.rows[index];
      return [
        other.firstAffordableBrewSeconds - row.firstAffordableBrewSeconds,
        other.firstCollectionSeconds - row.firstCollectionSeconds,
        other.firstDeliverySeconds - row.firstDeliverySeconds,
        other.chargedItemsGranted - row.chargedItemsGranted,
        other.passiveItemsGranted - row.passiveItemsGranted,
        other.finalPantryTotal - row.finalPantryTotal,
      ];
    });
    const label = `${left.name} / ${right.name}`;
    if (comparisons.every(values => values.every(value => value === 0))) exactTies.push(label);
    else measurableDifferences.push(label);
  }
  for (const upgrade of upgrades) {
    const activeDelta = upgrade.activeScenario.average.delta;
    const offlineDeltas = upgrade.offline.map(window => window.average.delta);
    const label = upgrade.name;
    if (allZero(activeDelta) && offlineDeltas.every(allZero)) {
      exactTies.push(label);
      zeroMeasuredMarginalEffect.push(label);
    } else measurableDifferences.push(label);
  }
  return { exactTies, measurableDifferences, zeroMeasuredMarginalEffect, interpretation: "Numeric differences are measured only in these fixed scenarios. This harness makes no balance, quality, or dominance claim." };
}

function buildReport() {
  assert.deepEqual(RECIPE_PAIRS.map(pair => pair.ids), [["sun", "lantern"], ["heart", "quiet"], ["dream", "way"], ["starlight", "aurora"]]);
  assert.deepEqual(UPGRADE_IDS, ["garden", "basket", "cauldron", "shelves", "ledger"]);
  assert.deepEqual(SEEDS, [7, 42, 2026, 99, 1234]);
  assert.equal(ACTIVE_SECONDS, 600);
  assert.deepEqual(OFFLINE_MINUTES, [60, 120]);
  const recipePairs = RECIPE_PAIRS.map(buildRecipeReport);
  const upgrades = UPGRADE_IDS.map(buildUpgradeReport);
  const report = {
    harness: "choice-simulation",
    fixedUtcStart: new Date(START).toISOString(),
    seeds: SEEDS,
    activeWindowSeconds: ACTIVE_SECONDS,
    offlineWindowsMinutes: OFFLINE_MINUTES,
    recipePairs,
    upgrades,
    summary: buildSummary(recipePairs, upgrades),
  };
  assertFiniteNonNegative(report);
  return report;
}

const firstSerialized = JSON.stringify(buildReport());
const secondSerialized = JSON.stringify(buildReport());
assert.equal(secondSerialized, firstSerialized, "second in-process run must serialize byte-for-byte identically");
console.log(firstSerialized);
