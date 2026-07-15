"use strict";

// Current-formula regression evidence for the approved frontloaded diminishing
// offline return. The independent reference retains the selected formula while
// the shipped arm exercises grantOfflineIngredients directly.
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const game = require("./game-logic.js");

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => { value = (1664525 * value + 1013904223) >>> 0; return value / 4294967296; };
}

const START = Date.UTC(2026, 6, 12, 12);
const SEEDS = Object.freeze([7, 42, 2026, 99, 1234]);
const LEVELS = Object.freeze([1, 4, 7]);
const GARDEN_LEVELS = Object.freeze([0, 1, 4]);
const SHELVES_LEVELS = Object.freeze([0, 1]);
const STARTING_STATES = Object.freeze(["empty", "half-passive-cap", "one-below-passive-cap"]);
const ELAPSED_MINUTES = Object.freeze([15, 30, 60, 90, 120, 240]);
const INGREDIENT_IDS = Object.freeze(Object.keys(game.INGREDIENTS));
const BASE_CHARGED_HARVEST_ROOM = game.GATHER_CONFIG.maxCharges * game.GATHER_CONFIG.amountPerCharge;
const SELECTED_SEGMENTS = Object.freeze([
  Object.freeze({ seconds: 15 * 60, rateMultiplier: .20 }),
  Object.freeze({ seconds: 105 * 60, rateMultiplier: .10 }),
  Object.freeze({ seconds: 120 * 60, rateMultiplier: .05 }),
]);
const ARMS = Object.freeze([
  Object.freeze({ id: "shipped", label: "Shipped grantOfflineIngredients" }),
  Object.freeze({ id: "selected-reference", label: "Selected-model reference: 20% for 15m, 10% through 120m, 5% through 240m" }),
]);

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function round(value) { return Math.round(value * 1000) / 1000; }
function finite(value, fallback = 0) { return Number.isFinite(Number(value)) ? Number(value) : fallback; }
function emptyIngredients() { return Object.fromEntries(INGREDIENT_IDS.map(id => [id, 0])); }
function pantryStock(state) { return Object.fromEntries(INGREDIENT_IDS.map(id => [id, state.ingredients[id]])); }

function assertFiniteOutcomes(value, path = "report") {
  if (typeof value === "number") {
    const isDelta = path.includes(".delta.");
    assert.ok(Number.isFinite(value) && (isDelta || value >= 0), `${path} must be ${isDelta ? "finite" : "finite and nonnegative"}`);
  } else if (Array.isArray(value)) {
    value.forEach((entry, index) => assertFiniteOutcomes(entry, `${path}[${index}]`));
  } else if (value && typeof value === "object") {
    for (const [key, entry] of Object.entries(value)) assertFiniteOutcomes(entry, `${path}.${key}`);
  }
}

function makeSource({ level, garden, shelves, startingState, seed, delivered = true }) {
  const state = game.defaultState(START);
  state.level = level;
  state.xp = 0;
  state.ingredients = emptyIngredients();
  state.orders = [];
  state.nextOrderId = 1;
  state.upgrades.garden = garden;
  state.upgrades.shelves = shelves;
  state.stats.orders = delivered ? 1 : 0;
  state.lastSeen = START;
  const passiveCap = game.passiveStorageCap(state);
  const target = startingState === "empty" ? 0 : startingState === "half-passive-cap" ? Math.floor(passiveCap / 2) : passiveCap - 1;
  const available = game.unlockedIngredients(state);
  const random = seededRandom((seed ^ 0x9e3779b9) >>> 0);
  for (let index = 0; index < target; index += 1) state.ingredients[available[Math.floor(random() * available.length)]] += 1;
  return state;
}

function elapsedSecondsFor(source, minutes) {
  const state = clone(source);
  state.lastSeen = START - minutes * 60 * 1000;
  return game.offlineElapsedSeconds(state, START);
}

function selectedRequestedUnits(state, elapsedSeconds) {
  let remaining = Math.min(game.OFFLINE_CAP_SECONDS, Math.max(0, finite(elapsedSeconds)));
  let accumulated = 0;
  for (const segment of SELECTED_SEGMENTS) {
    const seconds = Math.min(remaining, segment.seconds);
    accumulated += seconds * game.gatherRate(state) * segment.rateMultiplier;
    remaining -= seconds;
  }
  return Math.floor(accumulated);
}

function selectedReferenceGrant(state, elapsedSeconds, random) {
  if (state.stats.orders < 1) return 0;
  const availableSpace = Math.max(0, game.passiveStorageCap(state) - game.totalIngredients(state));
  return game.grantPassiveIngredients(state, Math.min(availableSpace, selectedRequestedUnits(state, elapsedSeconds)), random);
}

function firstPassiveCapMinute(source) {
  const availableSpace = game.passiveStorageCap(source) - game.totalIngredients(source);
  for (let minute = 1; minute <= game.OFFLINE_CAP_SECONDS / 60; minute += 1) {
    if (selectedRequestedUnits(source, minute * 60) >= availableSpace) return minute;
  }
  return null;
}

function runArm(arm, source, elapsedSeconds, seed) {
  const before = JSON.stringify(source);
  const state = clone(source);
  const passiveCap = game.passiveStorageCap(state);
  const storageCap = game.storageCap(state);
  const rawRequested = selectedRequestedUnits(state, elapsedSeconds);
  const storageLimitedRequest = Math.min(Math.max(0, passiveCap - game.totalIngredients(state)), rawRequested);
  const random = seededRandom(seed);
  const grantedIngredients = arm.id === "shipped"
    ? game.grantOfflineIngredients(state, elapsedSeconds, random)
    : selectedReferenceGrant(state, elapsedSeconds, random);
  assert.equal(JSON.stringify(source), before, `${arm.id} must not mutate its source state`);
  const finalPantryTotal = game.totalIngredients(state);
  const absoluteRoomBelowFullStorage = storageCap - finalPantryTotal;
  const keepsAllBaseChargedHarvestRoom = absoluteRoomBelowFullStorage >= BASE_CHARGED_HARVEST_ROOM;
  assert.ok(finalPantryTotal <= passiveCap, `${arm.id} overflowed the passive reserve`);
  assert.ok(keepsAllBaseChargedHarvestRoom, `${arm.id} removed charged-harvest room`);
  return {
    requestedUnitsBeforeStorageLimiting: rawRequested,
    storageLimitedRequest,
    grantedIngredients,
    finalPantryTotal,
    finalPantry: pantryStock(state),
    passiveCapFillPercent: round(finalPantryTotal / passiveCap * 100),
    absoluteRoomBelowFullStorage,
    keepsAllBaseChargedHarvestRoom,
    firstPassiveCapMinute: firstPassiveCapMinute(source),
  };
}

function assertParity(shipped, selected, context) {
  assert.equal(shipped.grantedIngredients, selected.grantedIngredients, `${context}: granted quantity differs from selected reference`);
  assert.deepEqual(shipped.finalPantry, selected.finalPantry, `${context}: per-ingredient Pantry result differs from selected reference`);
  assert.deepEqual(
    { requestedUnitsBeforeStorageLimiting: shipped.requestedUnitsBeforeStorageLimiting, storageLimitedRequest: shipped.storageLimitedRequest, finalPantryTotal: shipped.finalPantryTotal, absoluteRoomBelowFullStorage: shipped.absoluteRoomBelowFullStorage, keepsAllBaseChargedHarvestRoom: shipped.keepsAllBaseChargedHarvestRoom, firstPassiveCapMinute: shipped.firstPassiveCapMinute },
    { requestedUnitsBeforeStorageLimiting: selected.requestedUnitsBeforeStorageLimiting, storageLimitedRequest: selected.storageLimitedRequest, finalPantryTotal: selected.finalPantryTotal, absoluteRoomBelowFullStorage: selected.absoluteRoomBelowFullStorage, keepsAllBaseChargedHarvestRoom: selected.keepsAllBaseChargedHarvestRoom, firstPassiveCapMinute: selected.firstPassiveCapMinute },
    `${context}: derived result differs from selected reference`,
  );
}

function buildMatrix() {
  const rows = [];
  for (const level of LEVELS) for (const garden of GARDEN_LEVELS) for (const shelves of SHELVES_LEVELS) {
    for (const startingState of STARTING_STATES) for (const minutes of ELAPSED_MINUTES) for (const seed of SEEDS) {
      const source = makeSource({ level, garden, shelves, startingState, seed });
      const sourceSnapshot = JSON.stringify(source);
      const elapsedSeconds = elapsedSecondsFor(source, minutes);
      const arms = Object.fromEntries(ARMS.map(arm => [arm.id, runArm(arm, source, elapsedSeconds, seed)]));
      assert.equal(JSON.stringify(source), sourceSnapshot, "both arms must receive equivalent isolated source states");
      assertParity(arms.shipped, arms["selected-reference"], `matrix ${level}/${garden}/${shelves}/${startingState}/${minutes}/${seed}`);
      rows.push({ level, gardenLevel: garden, shelvesLevel: shelves, startingState, elapsedMinutes: minutes, seed, elapsedSeconds, startingPantry: pantryStock(source), startingPantryTotal: game.totalIngredients(source), arms });
    }
  }
  const expectedRows = LEVELS.length * GARDEN_LEVELS.length * SHELVES_LEVELS.length * STARTING_STATES.length * ELAPSED_MINUTES.length * SEEDS.length;
  assert.equal(rows.length, expectedRows, "matrix coverage must be complete");
  return rows;
}

function findRow(rows, level, gardenLevel, shelvesLevel, startingState, elapsedMinutes, seed) {
  const row = rows.find(entry => entry.level === level && entry.gardenLevel === gardenLevel && entry.shelvesLevel === shelvesLevel && entry.startingState === startingState && entry.elapsedMinutes === elapsedMinutes && entry.seed === seed);
  assert.ok(row, "required matrix row missing");
  return row;
}

function average(values) { return round(values.reduce((sum, value) => sum + value, 0) / values.length); }

function buildMarginalEffects(rows) {
  const measures = ["grantedIngredients", "finalPantryTotal", "passiveCapFillPercent", "absoluteRoomBelowFullStorage"];
  const effect = (leftConfig, rightConfig) => ELAPSED_MINUTES.filter(minutes => [60, 90, 120].includes(minutes)).map(minutes => {
    const perSeed = SEEDS.map(seed => {
      const left = findRow(rows, 4, leftConfig.garden, leftConfig.shelves, "empty", minutes, seed);
      const right = findRow(rows, 4, rightConfig.garden, rightConfig.shelves, "empty", minutes, seed);
      return {
        seed,
        arms: Object.fromEntries(ARMS.map(arm => [arm.id, { delta: Object.fromEntries(measures.map(key => [key, round(right.arms[arm.id][key] - left.arms[arm.id][key])])) }])),
      };
    });
    return {
      minutes,
      perSeed,
      averages: Object.fromEntries(ARMS.map(arm => [arm.id, { delta: Object.fromEntries(measures.map(key => [key, average(perSeed.map(row => row.arms[arm.id].delta[key]))])) }])),
    };
  });
  return {
    moonlitGardenLevel1Minus0: effect({ garden: 0, shelves: 0 }, { garden: 1, shelves: 0 }),
    pantryShelvesLevel1Minus0: effect({ garden: 0, shelves: 0 }, { garden: 0, shelves: 1 }),
  };
}

function buildBoundaryChecks() {
  const source = makeSource({ level: 4, garden: 0, shelves: 0, startingState: "empty", seed: SEEDS[0] });
  const future = clone(source); future.lastSeen = START + 60_000;
  const beyondCap = clone(source); beyondCap.lastSeen = START - 8 * 60 * 60 * 1000;
  const malformedLastSeen = [["string-last-seen", "not-a-time"], ["null-last-seen", null], ["infinite-last-seen", Infinity]].map(([label, lastSeen]) => {
    const state = clone(source); state.lastSeen = lastSeen;
    const elapsedSeconds = game.offlineElapsedSeconds(state, START);
    assert.ok(Number.isFinite(elapsedSeconds) && elapsedSeconds >= 0 && elapsedSeconds <= game.OFFLINE_CAP_SECONDS, `${label} must remain safe and bounded`);
    return { label, elapsedSeconds, grantedIngredients: game.grantOfflineIngredients(state, elapsedSeconds, seededRandom(SEEDS[0])) };
  });
  const malformedElapsed = [-1, Infinity, NaN, "not-a-duration", {}, null].map((elapsedSeconds, index) => {
    const shipped = runArm(ARMS[0], source, elapsedSeconds, SEEDS[0]);
    const selected = runArm(ARMS[1], source, elapsedSeconds, SEEDS[0]);
    assertParity(shipped, selected, `malformed elapsed ${index}`);
    return { label: String(elapsedSeconds), grantedIngredients: shipped.grantedIngredients };
  });
  const fullReserve = clone(source);
  const cap = game.passiveStorageCap(fullReserve);
  fullReserve.ingredients = emptyIngredients();
  fullReserve.ingredients[game.unlockedIngredients(fullReserve)[0]] = cap;
  const noDelivery = makeSource({ level: 4, garden: 0, shelves: 0, startingState: "empty", seed: SEEDS[0], delivered: false });
  const noDeliveryResults = Object.fromEntries(ARMS.map(arm => [arm.id, runArm(arm, noDelivery, 3600, SEEDS[0]).grantedIngredients]));
  const fullReserveResults = Object.fromEntries(ARMS.map(arm => [arm.id, runArm(arm, fullReserve, 3600, SEEDS[0]).grantedIngredients]));
  assert.ok(Object.values(noDeliveryResults).every(value => value === 0), "first-delivery gate must remain exact");
  assert.ok(Object.values(fullReserveResults).every(value => value === 0), "full passive reserve must block grants");
  const futureElapsedSeconds = game.offlineElapsedSeconds(future, START);
  const cappedElapsedSeconds = game.offlineElapsedSeconds(beyondCap, START);
  assert.equal(futureElapsedSeconds, 0, "future timestamps must earn zero elapsed time");
  assert.equal(cappedElapsedSeconds, game.OFFLINE_CAP_SECONDS, "elapsed time beyond four hours must cap exactly");
  const fourHourResults = Object.fromEntries(ARMS.map(arm => [arm.id, runArm(arm, source, cappedElapsedSeconds, SEEDS[0])]));
  assertParity(fourHourResults.shipped, fourHourResults["selected-reference"], "four-hour cap");
  return { negativeElapsedFromFutureTimestamp: { elapsedSeconds: futureElapsedSeconds }, beyondFourHours: { elapsedSeconds: cappedElapsedSeconds, arms: fourHourResults }, fullPassiveReserve: fullReserveResults, noCompletedDelivery: noDeliveryResults, malformedLastSeen, malformedElapsed };
}

function buildRegressionLocks(rows, boundaryChecks) {
  const at = (garden, minutes) => SEEDS.map(seed => findRow(rows, 4, garden, 0, "empty", minutes, seed).arms.shipped);
  const representative = {
    grantedAt15Minutes: at(0, 15)[0].grantedIngredients,
    grantedAt60Minutes: at(0, 60)[0].grantedIngredients,
    grantedAt120Minutes: at(0, 120)[0].grantedIngredients,
    firstPassiveCapMinute: at(0, 60)[0].firstPassiveCapMinute,
    gardenLevel1GrantedAt60Minutes: at(1, 60)[0].grantedIngredients,
  };
  assert.deepEqual(representative, { grantedAt15Minutes: 14, grantedAt60Minutes: 36, grantedAt120Minutes: 54, firstPassiveCapMinute: 98, gardenLevel1GrantedAt60Minutes: 45 });
  for (const minutes of [15, 60, 120]) assert.ok(at(0, minutes).every(row => row.grantedIngredients === representative[`grantedAt${minutes}Minutes`]), `all seeds must lock the ${minutes}-minute representative result`);
  assert.ok(at(1, 60).every(row => row.grantedIngredients === 45), "all seeds must lock the Garden level-one result");
  assert.ok(rows.every(row => row.arms.shipped.keepsAllBaseChargedHarvestRoom), "every matrix result must retain all three base charged harvests");
  assert.ok(Object.values(boundaryChecks.noCompletedDelivery).every(value => value === 0), "first delivery must gate every arm");
  assert.equal(boundaryChecks.beyondFourHours.elapsedSeconds, game.OFFLINE_CAP_SECONDS, "four-hour cap must stay locked");
  return { representative, retainedChargedHarvestRoom: true, firstDeliveryGate: true, fourHourCapSeconds: game.OFFLINE_CAP_SECONDS };
}

function buildReport() {
  assert.deepEqual(SEEDS, [7, 42, 2026, 99, 1234]);
  assert.deepEqual(LEVELS, [1, 4, 7]);
  assert.deepEqual(GARDEN_LEVELS, [0, 1, 4]);
  assert.deepEqual(SHELVES_LEVELS, [0, 1]);
  assert.deepEqual(ELAPSED_MINUTES, [15, 30, 60, 90, 120, 240]);
  const matrix = buildMatrix();
  const boundaryChecks = buildBoundaryChecks();
  const report = {
    harness: "idle-return-simulation",
    fixedUtcStart: new Date(START).toISOString(),
    seeds: SEEDS,
    arms: ARMS,
    selectedModel: { segments: SELECTED_SEGMENTS, floorAfterCompleteSum: true, elapsedCapSeconds: game.OFFLINE_CAP_SECONDS },
    matrixDefinition: { levels: LEVELS, moonlitGardenLevels: GARDEN_LEVELS, pantryShelvesLevels: SHELVES_LEVELS, startingPantryStates: STARTING_STATES, elapsedMinutes: ELAPSED_MINUTES, rowsPerArm: matrix.length },
    scenarios: matrix,
    marginalEffects: buildMarginalEffects(matrix),
    boundaryChecks,
    regressionLocks: buildRegressionLocks(matrix, boundaryChecks),
  };
  assertFiniteOutcomes(report);
  return report;
}

const firstSerialized = JSON.stringify(buildReport());
const secondSerialized = JSON.stringify(buildReport());
assert.equal(secondSerialized, firstSerialized, "second in-process run must serialize byte-for-byte identically");
const sha256 = crypto.createHash("sha256").update(firstSerialized).digest("hex").toUpperCase();
if (process.argv.includes("--check")) {
  const report = JSON.parse(firstSerialized);
  const summary = JSON.stringify({ harness: report.harness, scenariosPerArm: report.matrixDefinition.rowsPerArm, arms: report.arms.map(arm => arm.id), regressionLocks: report.regressionLocks, sha256 });
  assert.ok(Buffer.byteLength(summary) <= 1000, "check summary must stay within 1,000 bytes");
  console.log(summary);
} else {
  console.log(firstSerialized);
}
