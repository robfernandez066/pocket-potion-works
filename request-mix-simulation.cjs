"use strict";

// Development-only evidence harness for Task 35. Ingredient selection stays in
// the shipped game-logic module; this file only constructs canonical fixtures
// and measures the resulting states.
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const game = require("./game-logic.js");

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => { value = (1664525 * value + 1013904223) >>> 0; return value / 4294967296; };
}

const START = Date.UTC(2026, 6, 15, 12, 0, 0);
const SEEDS = Object.freeze([7, 42, 2026, 99, 1234]);
const TRIALS_PER_SEED = 512;
const STORAGE_LIMITED_TRIALS = 32;
const INGREDIENT_IDS = Object.freeze(Object.keys(game.INGREDIENTS));
const WINDOWS = Object.freeze([
  Object.freeze({ id: "one-harvest", charges: 1, items: game.GATHER_CONFIG.amountPerCharge }),
  Object.freeze({ id: "three-charge-burst", charges: game.GATHER_CONFIG.maxCharges, items: game.GATHER_CONFIG.maxCharges * game.GATHER_CONFIG.amountPerCharge }),
]);
const ARMS = Object.freeze([
  Object.freeze({ id: "request-mix", label: "Shipped Request Mix charged gathering" }),
  Object.freeze({ id: "uniform", label: "Shipped uniform addRandomIngredients" }),
]);

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function round(value) { return Math.round(value * 1000) / 1000; }
function emptyIngredients() { return Object.fromEntries(INGREDIENT_IDS.map(id => [id, 0])); }
function pantryStock(state) { return Object.fromEntries(INGREDIENT_IDS.map(id => [id, state.ingredients[id]])); }
function integer(value, fallback = 0) { return Number.isFinite(Number(value)) ? Math.max(0, Math.floor(Number(value))) : fallback; }
function sum(values) { return values.reduce((total, value) => total + value, 0); }

function makeCanonicalOrder(recipeId, id, customerIndex, quantity = 1) {
  const recipe = game.recipeById(recipeId);
  assert.ok(recipe, `unknown canonical recipe: ${recipeId}`);
  const builder = game.defaultState(START);
  builder.level = recipe.unlock;
  builder.orders = [];
  builder.nextOrderId = id;
  const newest = game.RECIPES.filter(item => item.unlock === recipe.unlock);
  const recipeIndex = newest.findIndex(item => item.id === recipeId);
  assert.ok(recipeIndex >= 0, `${recipeId} must be in its level unlock pool`);
  const draws = [
    (recipeIndex + .25) / newest.length,
    quantity === 2 ? .99 : 0,
    (customerIndex + .25) / game.CUSTOMERS.length,
    0,
  ];
  const order = game.generateOrder(builder, () => draws.shift() ?? 0);
  assert.ok(order, `canonical order generation failed for ${recipeId}`);
  assert.equal(order.recipeId, recipeId, `canonical order recipe mismatch for ${recipeId}`);
  assert.equal(order.quantity, quantity, `canonical order quantity mismatch for ${recipeId}`);
  assert.equal(order.id, id, `canonical order id mismatch for ${recipeId}`);
  return order;
}

const SCENARIOS = Object.freeze([
  Object.freeze({
    id: "level-1-meadow-tonic", label: "Level 1 · one Meadow Tonic · empty stock", level: 1,
    orders: [{ recipeId: "tonic", customerIndex: 0 }],
  }),
  Object.freeze({
    id: "level-4-bottled-sunrise", label: "Level 4 · one Bottled Sunrise · empty stock", level: 4,
    orders: [{ recipeId: "sun", customerIndex: 0 }],
  }),
  Object.freeze({
    id: "level-7-aurora-nectar", label: "Level 7 · one Aurora Nectar · empty stock", level: 7,
    orders: [{ recipeId: "aurora", customerIndex: 0 }],
  }),
  Object.freeze({
    id: "level-4-overlapping-orders", label: "Level 4 · overlapping Bottled Sunrise and Lantern Sip", level: 4,
    orders: [{ recipeId: "sun", customerIndex: 0 }, { recipeId: "lantern", customerIndex: 1 }],
  }),
  Object.freeze({
    id: "duplicate-same-recipe", label: "Duplicate Bottled Sunrise requests", level: 4,
    orders: [{ recipeId: "sun", customerIndex: 0 }, { recipeId: "sun", customerIndex: 1 }],
  }),
  Object.freeze({
    id: "bottled-potion-covers-one", label: "One Bottled Sunrise bottle covers one of two requests", level: 4,
    orders: [{ recipeId: "sun", customerIndex: 0 }, { recipeId: "sun", customerIndex: 1 }], potions: { sun: 1 },
  }),
  Object.freeze({
    id: "pantry-partially-covers", label: "Pantry partially covers Bottled Sunrise ingredients", level: 4,
    orders: [{ recipeId: "sun", customerIndex: 0 }], ingredients: { herb: 1, ember: 1 },
  }),
  Object.freeze({
    id: "no-valid-deficit-empty-board", label: "No valid active deficit · empty board", level: 7,
    orders: [],
  }),
  Object.freeze({
    id: "no-valid-deficit-locked-malformed", label: "No valid active deficit · locked and malformed orders", level: 2,
    rawOrders: [null, { id: 2, recipeId: "bloom", quantity: 1 }, { id: 3, recipeId: "unknown", quantity: 1 }, { id: 4, recipeId: "clarity", quantity: 0 }],
  }),
]);

function makeSource(scenario) {
  const state = game.defaultState(START);
  state.level = scenario.level;
  state.xp = 0;
  state.ingredients = emptyIngredients();
  for (const [id, count] of Object.entries(scenario.ingredients || {})) state.ingredients[id] = count;
  state.potions = { ...state.potions, ...(scenario.potions || {}) };
  state.orders = scenario.rawOrders ? clone(scenario.rawOrders) : scenario.orders.map((spec, index) => makeCanonicalOrder(spec.recipeId, index + 1, spec.customerIndex, spec.quantity || 1));
  state.nextOrderId = state.orders.length + 1;
  state.stats.orders = 0;
  state.gather.targetId = null;
  state.gather.charges = game.GATHER_CONFIG.maxCharges;
  state.gather.lastRechargeAt = START;
  return state;
}

// Measurement-only observer: it never selects ingredients and is continuously
// checked against the shipped requestMixPool selection boundary below.
function measurementDemand(state) {
  const requested = Object.fromEntries(game.RECIPES.map(recipe => [recipe.id, 0]));
  for (const order of Array.isArray(state.orders) ? state.orders : []) {
    if (!order || typeof order !== "object" || Array.isArray(order)) continue;
    const recipe = game.recipeById(order.recipeId);
    if (!recipe || recipe.unlock > state.level) continue;
    const quantity = integer(order.quantity);
    if (quantity > 0) requested[recipe.id] += Math.min(2, quantity);
  }
  const outstandingRecipes = Object.fromEntries(game.RECIPES.map(recipe => [recipe.id, Math.max(0, requested[recipe.id] - integer(state.potions?.[recipe.id]))]));
  const required = emptyIngredients();
  for (const recipe of game.RECIPES) {
    for (const [id, count] of Object.entries(recipe.ingredients)) required[id] += outstandingRecipes[recipe.id] * count;
  }
  const missing = emptyIngredients();
  for (const id of INGREDIENT_IDS) missing[id] = Math.max(0, required[id] - integer(state.ingredients[id]));
  return {
    requestedRecipes: requested,
    outstandingRecipes,
    requiredIngredients: required,
    missingIngredients: missing,
    totalOutstandingUnits: sum(Object.values(missing)),
    affordableRequestedRecipes: game.RECIPES.filter(recipe => outstandingRecipes[recipe.id] > 0 && game.canAffordRecipe(state, recipe)).map(recipe => recipe.id),
  };
}

function poolMultiplicities(pool) {
  return Object.fromEntries(INGREDIENT_IDS.map(id => [id, pool.filter(entry => entry === id).length]));
}

function assertObserverParity(state, demand, context) {
  const unlocked = game.unlockedIngredients(state);
  const pool = game.requestMixPool(state);
  const multiplicities = poolMultiplicities(pool);
  const unlockedSet = new Set(unlocked);
  assert.ok(pool.every(id => unlockedSet.has(id)), `${context}: Request Mix pool must contain only unlocked ingredients`);
  for (const id of INGREDIENT_IDS) {
    const observedMissing = Math.max(0, integer(demand.missingIngredients[id]));
    const expectedExtra = unlockedSet.has(id) ? Math.min(3, observedMissing) : 0;
    const expectedEntries = unlockedSet.has(id) ? 1 + expectedExtra : 0;
    assert.equal(multiplicities[id], expectedEntries, `${context}: observer/requestMixPool parity mismatch for ${id}`);
    if (!observedMissing) assert.equal(multiplicities[id], unlockedSet.has(id) ? 1 : 0, `${context}: non-deficit ingredient weighting drifted for ${id}`);
  }
  if (Object.values(demand.missingIngredients).every(value => value === 0)) {
    assert.deepEqual(pool, unlocked, `${context}: malformed, locked, covered, or empty demand must fall back uniformly`);
  }
}

function initialScenarioInfo(source) {
  const available = game.unlockedIngredients(source);
  const pool = game.requestMixPool(source);
  const multiplicities = poolMultiplicities(pool);
  assert.deepEqual(available, INGREDIENT_IDS.filter(id => game.INGREDIENTS[id].unlock <= source.level), "unlocked pool must use shipped ingredient data");
  assert.ok(available.every(id => multiplicities[id] >= 1), "every unlocked ingredient must remain possible under Request Mix");
  const demand = measurementDemand(source);
  assertObserverParity(source, demand, "initial scenario state");
  const noDeficit = demand.totalOutstandingUnits === 0;
  if (noDeficit) assert.deepEqual(pool, available, "no valid deficit must fall back to the exact unlocked pool");
  return {
    unlockedIngredients: available,
    requestMixPool: pool,
    requestMixPoolMultiplicities: multiplicities,
    startingDemand: demand,
    positiveDeficit: !noDeficit,
    noDeficitFallback: noDeficit,
  };
}

function assertScenarioCoverage(scenario, info) {
  const demand = info.startingDemand;
  if (scenario.id === "duplicate-same-recipe") assert.equal(demand.outstandingRecipes.sun, 2, "duplicate requests must aggregate by recipe");
  if (scenario.id === "bottled-potion-covers-one") {
    assert.equal(demand.outstandingRecipes.sun, 1, "one bottled Sunrise must cover exactly one duplicate request");
    assert.equal(demand.requiredIngredients.ember, 2, "bottled potion coverage must remove one recipe's ember demand");
  }
  if (scenario.id === "pantry-partially-covers") {
    assert.equal(demand.requiredIngredients.herb, 2, "Pantry coverage must start from the recipe requirement");
    assert.equal(demand.missingIngredients.herb, 1, "Pantry stock must remove one herb unit from outstanding demand");
    assert.equal(demand.missingIngredients.ember, 1, "Pantry coverage must leave one missing ember unit");
  }
  if (scenario.id === "no-valid-deficit-locked-malformed") assert.equal(demand.totalOutstandingUnits, 0, "locked and malformed orders must not create demand");
}

function trialSeed(seed, scenarioIndex, windowIndex, trialIndex) {
  return (seed + scenarioIndex * 1000003 + windowIndex * 10007 + trialIndex) >>> 0;
}

function runGather(state, armId, window, random) {
  if (armId === "request-mix") {
    let added = 0;
    for (let charge = 0; charge < window.charges; charge += 1) added += game.chargedGather(state, START, random).added;
    return added;
  }
  return game.addRandomIngredients(state, window.items, random);
}

function outcome(source, armId, window, random, storageLimited = false) {
  const state = clone(source);
  if (storageLimited) {
    state.ingredients = emptyIngredients();
    const available = game.unlockedIngredients(state);
    state.ingredients[available[0]] = game.storageCap(state) - 1;
  }
  const demandBefore = measurementDemand(state);
  assertObserverParity(state, demandBefore, `${armId}/${window.id}/before`);
  const beforePantry = pantryStock(state);
  const added = runGather(state, armId, window, random);
  const afterPantry = pantryStock(state);
  const received = Object.fromEntries(INGREDIENT_IDS.map(id => [id, afterPantry[id] - beforePantry[id]]));
  const initiallyNeededReceived = sum(INGREDIENT_IDS.map(id => Math.min(received[id], demandBefore.missingIngredients[id])));
  const demandAfter = measurementDemand(state);
  assertObserverParity(state, demandAfter, `${armId}/${window.id}/after`);
  const affordableBefore = demandBefore.affordableRequestedRecipes.length > 0;
  const affordableAfter = demandAfter.affordableRequestedRecipes.length > 0;
  assert.ok(game.totalIngredients(state) <= game.storageCap(state), "gathering outcome must stay within storage cap");
  return {
    added,
    received,
    neededItemHit: initiallyNeededReceived > 0,
    initiallyNeededItemsReceived: initiallyNeededReceived,
    deficitReduction: Math.max(0, demandBefore.totalOutstandingUnits - demandAfter.totalOutstandingUnits),
    requestedPotionAffordable: !affordableBefore && affordableAfter,
    finalPantry: afterPantry,
    storageLimited,
    storageCap: game.storageCap(state),
    finalPantryTotal: game.totalIngredients(state),
  };
}

function newAccumulator() {
  return {
    trials: 0, neededItemHits: 0, initiallyNeededItemsReceived: 0, deficitReduction: 0,
    requestedPotionAffordable: 0, totalAdded: 0, finalPantry: emptyIngredients(),
    storageLimitedTrials: 0, storageLimitedAdded: 0, storageLimitedFinalPantry: emptyIngredients(),
  };
}

function record(accumulator, result, storageLimited = false) {
  accumulator.trials += 1;
  accumulator.neededItemHits += result.neededItemHit ? 1 : 0;
  accumulator.initiallyNeededItemsReceived += result.initiallyNeededItemsReceived;
  accumulator.deficitReduction += result.deficitReduction;
  accumulator.requestedPotionAffordable += result.requestedPotionAffordable ? 1 : 0;
  accumulator.totalAdded += result.added;
  for (const id of INGREDIENT_IDS) accumulator.finalPantry[id] += result.finalPantry[id];
  if (storageLimited) {
    accumulator.storageLimitedTrials += 1;
    accumulator.storageLimitedAdded += result.added;
    for (const id of INGREDIENT_IDS) accumulator.storageLimitedFinalPantry[id] += result.finalPantry[id];
  }
}

function averagePantry(totals, count) {
  return Object.fromEntries(INGREDIENT_IDS.map(id => [id, round(totals[id] / count)]));
}

function summarizeAccumulator(accumulator) {
  assert.ok(accumulator.trials > 0, "each result needs trials");
  return {
    trials: accumulator.trials,
    neededItemHitProbability: round(accumulator.neededItemHits / accumulator.trials),
    averageInitiallyNeededItemsReceived: round(accumulator.initiallyNeededItemsReceived / accumulator.trials),
    averageDeficitReduction: round(accumulator.deficitReduction / accumulator.trials),
    requestedPotionAffordableProbability: round(accumulator.requestedPotionAffordable / accumulator.trials),
    averageItemsAdded: round(accumulator.totalAdded / accumulator.trials),
    averageFinalPantry: averagePantry(accumulator.finalPantry, accumulator.trials),
  };
}

function summarizeStorage(accumulator) {
  assert.ok(accumulator.trials > 0, "each storage-limited result needs trials");
  return {
    trials: accumulator.trials,
    averageItemsAdded: round(accumulator.totalAdded / accumulator.trials),
    averageFinalPantry: averagePantry(accumulator.finalPantry, accumulator.trials),
  };
}

function absolutePercentagePoints(requestMix, uniform, key) {
  return round(Math.abs(requestMix[key] - uniform[key]) * 100);
}

function absoluteDifferences(requestMix, uniform) {
  return {
    neededItemHitProbability: absolutePercentagePoints(requestMix, uniform, "neededItemHitProbability"),
    requestedPotionAffordableProbability: absolutePercentagePoints(requestMix, uniform, "requestedPotionAffordableProbability"),
    averageInitiallyNeededItemsReceived: round(Math.abs(requestMix.averageInitiallyNeededItemsReceived - uniform.averageInitiallyNeededItemsReceived)),
    averageDeficitReduction: round(Math.abs(requestMix.averageDeficitReduction - uniform.averageDeficitReduction)),
  };
}

function runScenario(scenario, scenarioIndex) {
  const source = makeSource(scenario);
  const sourceSnapshot = JSON.stringify(source);
  const info = initialScenarioInfo(source);
  assertScenarioCoverage(scenario, info);
  const windows = WINDOWS.map((window, windowIndex) => {
    const perArm = ARMS.map(arm => {
      const perSeed = SEEDS.map(seed => {
        const normalAccumulator = newAccumulator();
        const storageAccumulator = newAccumulator();
        for (let trial = 0; trial < TRIALS_PER_SEED; trial += 1) {
          const seedValue = trialSeed(seed, scenarioIndex, windowIndex, trial);
          record(normalAccumulator, outcome(source, arm.id, window, seededRandom(seedValue)));
          const storageSeed = trialSeed(seed, scenarioIndex, windowIndex + WINDOWS.length, trial);
          const limited = outcome(source, arm.id, window, seededRandom(storageSeed), true);
          assert.ok(limited.finalPantryTotal <= limited.storageCap, `${scenario.id}/${arm.id}/${window.id} exceeded storage cap`);
          assert.ok(limited.added <= 1, `${scenario.id}/${arm.id}/${window.id} storage-limited trial added too many items`);
          record(storageAccumulator, limited);
        }
        return { seed, ...summarizeAccumulator(normalAccumulator), storageLimited: summarizeStorage(storageAccumulator) };
      });
      const average = Object.fromEntries([
        ["neededItemHitProbability", round(sum(perSeed.map(row => row.neededItemHitProbability)) / perSeed.length)],
        ["averageInitiallyNeededItemsReceived", round(sum(perSeed.map(row => row.averageInitiallyNeededItemsReceived)) / perSeed.length)],
        ["averageDeficitReduction", round(sum(perSeed.map(row => row.averageDeficitReduction)) / perSeed.length)],
        ["requestedPotionAffordableProbability", round(sum(perSeed.map(row => row.requestedPotionAffordableProbability)) / perSeed.length)],
        ["averageItemsAdded", round(sum(perSeed.map(row => row.averageItemsAdded)) / perSeed.length)],
      ]);
      average.averageFinalPantry = Object.fromEntries(INGREDIENT_IDS.map(id => [id, round(sum(perSeed.map(row => row.averageFinalPantry[id])) / perSeed.length)]));
      average.storageLimited = {
        trialsPerSeed: STORAGE_LIMITED_TRIALS,
        averageItemsAdded: round(sum(perSeed.map(row => row.storageLimited.averageItemsAdded)) / perSeed.length),
        averageFinalPantry: Object.fromEntries(INGREDIENT_IDS.map(id => [id, round(sum(perSeed.map(row => row.storageLimited.averageFinalPantry[id])) / perSeed.length)])),
      };
      return { id: arm.id, label: arm.label, perSeed, average };
    });
    return { id: window.id, items: window.items, arms: perArm };
  });

  // Rebuild the window list as arm-paired records; the prior map keeps the
  // per-seed accumulation isolated while this shape makes the complete matrix
  // and its deltas straightforward to inspect.
  const pairedWindows = WINDOWS.map((window, windowIndex) => {
    const arms = windows.map(() => null);
    for (const arm of ARMS) {
      const sourceArm = windows[windowIndex].arms.find(entry => entry.id === arm.id);
      arms[ARMS.indexOf(arm)] = sourceArm;
    }
    const requestMix = arms.find(arm => arm.id === "request-mix");
    const uniform = arms.find(arm => arm.id === "uniform");
    assert.ok(requestMix && uniform, `${scenario.id}/${window.id} must have both arms`);
    const deltas = {
      average: {
        neededItemHitProbability: round(requestMix.average.neededItemHitProbability - uniform.average.neededItemHitProbability),
        averageInitiallyNeededItemsReceived: round(requestMix.average.averageInitiallyNeededItemsReceived - uniform.average.averageInitiallyNeededItemsReceived),
        averageDeficitReduction: round(requestMix.average.averageDeficitReduction - uniform.average.averageDeficitReduction),
        requestedPotionAffordableProbability: round(requestMix.average.requestedPotionAffordableProbability - uniform.average.requestedPotionAffordableProbability),
      },
      absolutePercentagePoints: absoluteDifferences(requestMix.average, uniform.average),
      perSeedAbsolutePercentagePoints: SEEDS.map(seed => {
        const requestSeed = requestMix.perSeed.find(row => row.seed === seed);
        const uniformSeed = uniform.perSeed.find(row => row.seed === seed);
        return {
          seed,
          neededItemHitProbability: absolutePercentagePoints(requestSeed, uniformSeed, "neededItemHitProbability"),
          requestedPotionAffordableProbability: absolutePercentagePoints(requestSeed, uniformSeed, "requestedPotionAffordableProbability"),
        };
      }),
    };
    if (info.noDeficitFallback && windowIndex < 2) {
      assert.deepEqual(requestMix.perSeed.map(row => row.averageFinalPantry), uniform.perSeed.map(row => row.averageFinalPantry), `${scenario.id}/${window.id} no-deficit output must be exactly uniform`);
      assert.deepEqual(requestMix.averageFinalPantry, uniform.averageFinalPantry, `${scenario.id}/${window.id} no-deficit average must be exactly uniform`);
    }
    return { id: window.id, items: window.items, arms, deltas };
  });
  assert.equal(JSON.stringify(source), sourceSnapshot, `${scenario.id}: source state must remain unchanged after cloned arms`);
  return { id: scenario.id, label: scenario.label, level: scenario.level, ...info, windows: pairedWindows };
}

function assertFinite(value, path = "report") {
  if (typeof value === "number") assert.ok(Number.isFinite(value), `${path} must be finite`);
  else if (Array.isArray(value)) value.forEach((entry, index) => assertFinite(entry, `${path}[${index}]`));
  else if (value && typeof value === "object") for (const [key, entry] of Object.entries(value)) assertFinite(entry, `${path}.${key}`);
}

function buildClassification(scenarios) {
  const positive = scenarios.filter(scenario => scenario.positiveDeficit);
  const fallback = scenarios.filter(scenario => scenario.noDeficitFallback);
  const oneHarvestDeltas = positive.map(scenario => {
    const window = scenario.windows.find(entry => entry.id === "one-harvest");
    const requestMix = window.arms.find(arm => arm.id === "request-mix");
    const uniform = window.arms.find(arm => arm.id === "uniform");
    return { scenario: scenario.id, deltaPercentagePoints: round((requestMix.average.neededItemHitProbability - uniform.average.neededItemHitProbability) * 100) };
  });
  const allStrictlyHigher = oneHarvestDeltas.every(entry => entry.deltaPercentagePoints > 0);
  const noDeficitExactParity = fallback.every(scenario => scenario.windows.every(window => window.deltas.average.neededItemHitProbability === 0));
  const averageDelta = round(sum(oneHarvestDeltas.map(entry => entry.deltaPercentagePoints)) / oneHarvestDeltas.length);
  const noPositiveScenarioWorse = oneHarvestDeltas.every(entry => entry.deltaPercentagePoints >= 0);
  return {
    thresholds: {
      favors: "strictly higher one-harvest needed-item hit probability in every positive-deficit scenario and exact parity in every no-deficit fallback scenario",
      noticeableInThisHarness: "average positive-deficit one-harvest hit probability improves by at least 10 percentage points and no positive-deficit scenario becomes worse",
    },
    calculations: {
      positiveDeficitScenarioCount: positive.length,
      fallbackScenarioCount: fallback.length,
      oneHarvestDeltas,
      averagePositiveDeficitOneHarvestDeltaPercentagePoints: averageDelta,
      allPositiveDeficitScenariosStrictlyHigher: allStrictlyHigher,
      noDeficitFallbackExactParity: noDeficitExactParity,
      noPositiveDeficitScenarioWorse: noPositiveScenarioWorse,
      favorsSupported: allStrictlyHigher && noDeficitExactParity,
      noticeableInThisHarness: averageDelta >= 10 && noPositiveScenarioWorse,
    },
  };
}

function buildReport() {
  assert.deepEqual(SEEDS, [7, 42, 2026, 99, 1234]);
  assert.equal(WINDOWS[0].items, 3);
  assert.equal(WINDOWS[1].items, 9);
  const scenarios = SCENARIOS.map((scenario, index) => runScenario(scenario, index));
  assert.equal(scenarios.length, SCENARIOS.length, "all required scenarios must be present");
  for (const scenario of scenarios) {
    assert.equal(scenario.windows.length, WINDOWS.length, `${scenario.id}: complete harvest-window matrix required`);
    for (const window of scenario.windows) {
      assert.equal(window.arms.length, ARMS.length, `${scenario.id}/${window.id}: complete arm matrix required`);
      for (const arm of window.arms) assert.equal(arm.perSeed.length, SEEDS.length, `${scenario.id}/${window.id}/${arm.id}: complete seed matrix required`);
    }
  }
  const report = {
    harness: "request-mix-simulation",
    fixedUtcStart: new Date(START).toISOString(),
    seeds: SEEDS,
    trialsPerSeed: TRIALS_PER_SEED,
    storageLimitedTrialsPerSeed: STORAGE_LIMITED_TRIALS,
    arms: ARMS.map(arm => ({ id: arm.id, label: arm.label })),
    harvestWindows: WINDOWS,
    scenarios,
    classification: buildClassification(scenarios),
  };
  assertFinite(report);
  return report;
}

const firstSerialized = JSON.stringify(buildReport());
const secondSerialized = JSON.stringify(buildReport());
assert.equal(secondSerialized, firstSerialized, "repeated in-process serialization must be byte-identical");
const sha256 = crypto.createHash("sha256").update(firstSerialized).digest("hex").toUpperCase();
if (process.argv.includes("--check")) {
  const report = JSON.parse(firstSerialized);
  const summary = JSON.stringify({
    harness: report.harness,
    scenarios: report.scenarios.length,
    seeds: report.seeds,
    trialsPerSeed: report.trialsPerSeed,
    classification: report.classification.calculations,
    sha256,
  });
  assert.ok(Buffer.byteLength(summary) <= 1000, "compact check output must stay within 1,000 bytes");
  console.log(summary);
} else {
  console.log(firstSerialized);
}
