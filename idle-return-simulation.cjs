"use strict";

// Development-only evidence harness for Task 26. It deliberately leaves the
// shipped offline implementation untouched and models only the three proposed
// accumulation curves before delegating storage and distribution to game logic.
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
const ARMS = Object.freeze([
  Object.freeze({ id: "baseline", label: "Current baseline" }),
  Object.freeze({ id: "flat-10", label: "flat-10" }),
  Object.freeze({ id: "frontloaded-diminishing", label: "frontloaded-diminishing" }),
  Object.freeze({ id: "gentle-diminishing", label: "gentle-diminishing" }),
]);

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function round(value) { return Math.round(value * 1000) / 1000; }
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

function requestedUnits(armId, state, elapsedSeconds) {
  const elapsed = Math.max(0, Math.min(game.OFFLINE_CAP_SECONDS, elapsedSeconds));
  const rate = game.gatherRate(state);
  if (armId === "baseline") return Math.floor(elapsed * rate * .65);
  const minutes = elapsed / 60;
  if (armId === "flat-10") return Math.floor(rate * .10 * elapsed);
  if (armId === "frontloaded-diminishing") {
    return Math.floor(rate * (Math.min(minutes, 15) * 60 * .20 + Math.max(0, Math.min(minutes, 120) - 15) * 60 * .10 + Math.max(0, Math.min(minutes, 240) - 120) * 60 * .05));
  }
  if (armId === "gentle-diminishing") {
    return Math.floor(rate * (Math.min(minutes, 30) * 60 * .15 + Math.max(0, Math.min(minutes, 120) - 30) * 60 * .08 + Math.max(0, Math.min(minutes, 240) - 120) * 60 * .04));
  }
  assert.fail(`Unknown arm: ${armId}`);
}

function firstPassiveCapMinute(armId, source) {
  const availableSpace = game.passiveStorageCap(source) - game.totalIngredients(source);
  for (let minute = 1; minute <= game.OFFLINE_CAP_SECONDS / 60; minute += 1) {
    if (requestedUnits(armId, source, minute * 60) >= availableSpace) return minute;
  }
  return null;
}

function runArm(arm, source, elapsedSeconds, seed) {
  const before = JSON.stringify(source);
  const state = clone(source);
  const passiveCap = game.passiveStorageCap(state);
  const storageCap = game.storageCap(state);
  const availablePassiveSpace = Math.max(0, passiveCap - game.totalIngredients(state));
  const rawRequested = requestedUnits(arm.id, state, elapsedSeconds);
  const storageLimitedRequest = Math.min(availablePassiveSpace, rawRequested);
  const random = seededRandom(seed);
  const grantedIngredients = arm.id === "baseline"
    ? game.grantOfflineIngredients(state, elapsedSeconds, random)
    : game.grantPassiveIngredients(state, storageLimitedRequest, random);
  assert.equal(JSON.stringify(source), before, `${arm.id} must not mutate its source state`);
  const finalPantryTotal = game.totalIngredients(state);
  const absoluteRoomBelowFullStorage = storageCap - finalPantryTotal;
  const keepsAllBaseChargedHarvestRoom = absoluteRoomBelowFullStorage >= BASE_CHARGED_HARVEST_ROOM;
  assert.ok(finalPantryTotal <= passiveCap, `${arm.id} overflowed passive cap`);
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
    firstPassiveCapMinute: firstPassiveCapMinute(arm.id, source),
  };
}

function verifyBaselineParity(source, elapsedSeconds, seed, actual) {
  const expectedState = clone(source);
  const expectedGranted = game.grantOfflineIngredients(expectedState, elapsedSeconds, seededRandom(seed));
  assert.equal(actual.grantedIngredients, expectedGranted, "baseline granted amount must match grantOfflineIngredients");
  assert.deepEqual(actual.finalPantry, pantryStock(expectedState), "baseline final Pantry must match grantOfflineIngredients");
}

function buildMatrix() {
  const rows = [];
  for (const level of LEVELS) for (const garden of GARDEN_LEVELS) for (const shelves of SHELVES_LEVELS) {
    for (const startingState of STARTING_STATES) for (const minutes of ELAPSED_MINUTES) for (const seed of SEEDS) {
      const source = makeSource({ level, garden, shelves, startingState, seed });
      const sourceSnapshot = JSON.stringify(source);
      const elapsedSeconds = elapsedSecondsFor(source, minutes);
      const arms = Object.fromEntries(ARMS.map(arm => [arm.id, runArm(arm, source, elapsedSeconds, seed)]));
      assert.equal(JSON.stringify(source), sourceSnapshot, "all arms must receive equivalent isolated source states");
      verifyBaselineParity(source, elapsedSeconds, seed, arms.baseline);
      rows.push({ level, gardenLevel: garden, shelvesLevel: shelves, startingState, elapsedMinutes: minutes, seed, elapsedSeconds, startingPantry: pantryStock(source), startingPantryTotal: game.totalIngredients(source), arms });
    }
  }
  const expectedRows = LEVELS.length * GARDEN_LEVELS.length * SHELVES_LEVELS.length * STARTING_STATES.length * ELAPSED_MINUTES.length * SEEDS.length;
  assert.equal(rows.length, expectedRows, "matrix coverage must be complete");
  return rows;
}

function findRow(rows, level, gardenLevel, shelvesLevel, startingState, elapsedMinutes, seed) {
  const row = rows.find(candidate => candidate.level === level && candidate.gardenLevel === gardenLevel && candidate.shelvesLevel === shelvesLevel && candidate.startingState === startingState && candidate.elapsedMinutes === elapsedMinutes && candidate.seed === seed);
  assert.ok(row, "required matrix row missing");
  return row;
}

function average(values) { return round(values.reduce((sum, value) => sum + value, 0) / values.length); }

function buildMarginalEffects(rows) {
  const measures = ["grantedIngredients", "finalPantryTotal", "passiveCapFillPercent", "absoluteRoomBelowFullStorage"];
  const effect = (name, leftConfig, rightConfig) => ELAPSED_MINUTES.filter(minutes => [60, 90, 120].includes(minutes)).map(minutes => {
    const perSeed = SEEDS.map(seed => {
      const left = findRow(rows, 4, leftConfig.garden, leftConfig.shelves, "empty", minutes, seed);
      const right = findRow(rows, 4, rightConfig.garden, rightConfig.shelves, "empty", minutes, seed);
      return {
        seed,
        arms: Object.fromEntries(ARMS.map(arm => {
          const delta = Object.fromEntries(measures.map(key => [key, round(right.arms[arm.id][key] - left.arms[arm.id][key])]));
          return [arm.id, { delta }];
        })),
      };
    });
    return {
      minutes,
      perSeed,
      averages: Object.fromEntries(ARMS.map(arm => [arm.id, { delta: Object.fromEntries(measures.map(key => [key, average(perSeed.map(row => row.arms[arm.id].delta[key]))])) }])),
    };
  });
  return {
    moonlitGardenLevel1Minus0: effect("garden", { garden: 0, shelves: 0 }, { garden: 1, shelves: 0 }),
    pantryShelvesLevel1Minus0: effect("shelves", { garden: 0, shelves: 0 }, { garden: 0, shelves: 1 }),
  };
}

function buildBoundaryChecks() {
  const source = makeSource({ level: 4, garden: 0, shelves: 0, startingState: "empty", seed: SEEDS[0] });
  const future = clone(source); future.lastSeen = START + 60_000;
  const beyondCap = clone(source); beyondCap.lastSeen = START - 8 * 60 * 60 * 1000;
  const malformedCases = [
    ["string-last-seen", "not-a-time"],
    ["null-last-seen", null],
    ["infinite-last-seen", Infinity],
  ].map(([label, lastSeen]) => {
    const state = clone(source); state.lastSeen = lastSeen;
    const elapsedSeconds = game.offlineElapsedSeconds(state, START);
    const grantedIngredients = game.grantOfflineIngredients(state, elapsedSeconds, seededRandom(SEEDS[0]));
    assert.ok(Number.isFinite(elapsedSeconds) && elapsedSeconds >= 0 && elapsedSeconds <= game.OFFLINE_CAP_SECONDS, `${label} must remain a safe elapsed value`);
    return { label, elapsedSeconds, grantedIngredients };
  });
  const fullReserve = makeSource({ level: 4, garden: 0, shelves: 0, startingState: "one-below-passive-cap", seed: SEEDS[0] });
  const cap = game.passiveStorageCap(fullReserve);
  for (const id of INGREDIENT_IDS) fullReserve.ingredients[id] = 0;
  fullReserve.ingredients[game.unlockedIngredients(fullReserve)[0]] = cap;
  const noDelivery = makeSource({ level: 4, garden: 0, shelves: 0, startingState: "empty", seed: SEEDS[0], delivered: false });
  const noDeliveryBefore = JSON.stringify(noDelivery);
  const noDeliveryResults = Object.fromEntries(ARMS.map(arm => [arm.id, runArm(arm, noDelivery, 3600, SEEDS[0]).grantedIngredients]));
  assert.equal(JSON.stringify(noDelivery), noDeliveryBefore, "first-delivery gate check must preserve source");
  assert.ok(Object.values(noDeliveryResults).every(value => value === 0), "first-delivery gate must remain exact");
  const fullReserveResults = Object.fromEntries(ARMS.map(arm => [arm.id, runArm(arm, fullReserve, 3600, SEEDS[0]).grantedIngredients]));
  assert.ok(Object.values(fullReserveResults).every(value => value === 0), "full passive reserve must block grants");
  const futureElapsedSeconds = game.offlineElapsedSeconds(future, START);
  const cappedElapsedSeconds = game.offlineElapsedSeconds(beyondCap, START);
  assert.equal(futureElapsedSeconds, 0, "future timestamps must earn zero elapsed time");
  assert.equal(cappedElapsedSeconds, game.OFFLINE_CAP_SECONDS, "elapsed time beyond four hours must cap exactly");
  const fourHourResults = Object.fromEntries(ARMS.map(arm => [arm.id, runArm(arm, source, cappedElapsedSeconds, SEEDS[0])])) ;
  const beyondCapResults = Object.fromEntries(ARMS.map(arm => [arm.id, runArm(arm, source, game.offlineElapsedSeconds(beyondCap, START), SEEDS[0])])) ;
  assert.deepEqual(beyondCapResults, fourHourResults, "beyond-cap elapsed results must match four-hour results");
  return { negativeElapsedFromFutureTimestamp: { elapsedSeconds: futureElapsedSeconds }, beyondFourHours: { elapsedSeconds: cappedElapsedSeconds, arms: fourHourResults }, fullPassiveReserve: fullReserveResults, noCompletedDelivery: noDeliveryResults, malformedInputs: malformedCases };
}

function buildCriteria(rows, boundaryChecks) {
  const results = ARMS.map(arm => {
    const at = minutes => SEEDS.map(seed => findRow(rows, 4, 0, 0, "empty", minutes, seed).arms[arm.id]);
    const atGardenOne = minutes => SEEDS.map(seed => findRow(rows, 4, 1, 0, "empty", minutes, seed).arms[arm.id]);
    const at15 = at(15), at60 = at(60), at120 = at(120), at240 = at(240), garden60 = atGardenOne(60);
    const gardenAdvantages = garden60.map((row, index) => round((row.grantedIngredients - at60[index].grantedIngredients) / at60[index].grantedIngredients * 100));
    const baseline240 = SEEDS.map(seed => findRow(rows, 4, 0, 0, "empty", 240, seed).arms.baseline.grantedIngredients);
    const criteria = {
      belowPassiveCapAt15Minutes: at15.every(row => row.finalPantryTotal < game.passiveStorageCap(makeSource({ level: 4, garden: 0, shelves: 0, startingState: "empty", seed: SEEDS[0] }))),
      granted24To45At60Minutes: at60.every(row => row.grantedIngredients >= 24 && row.grantedIngredients <= 45),
      granted45To54At120Minutes: at120.every(row => row.grantedIngredients >= 45 && row.grantedIngredients <= 54),
      passiveCapReached60To120Minutes: at60.every(row => row.firstPassiveCapMinute !== null && row.firstPassiveCapMinute >= 60 && row.firstPassiveCapMinute <= 120),
      nineSpacesRemainBelowFullStorage: at120.every(row => row.absoluteRoomBelowFullStorage >= BASE_CHARGED_HARVEST_ROOM),
      gardenLevel1AdvantagePositiveAndAtMost25PercentAt60Minutes: gardenAdvantages.every(value => value > 0 && value <= 25),
      noMoreAtFourHoursThanCurrentBaseline: at240.every((row, index) => row.grantedIngredients <= baseline240[index]),
      firstDeliveryGatingExact: Object.values(boundaryChecks.noCompletedDelivery).every(value => value === 0),
      fourHourCappingExact: boundaryChecks.beyondFourHours.elapsedSeconds === game.OFFLINE_CAP_SECONDS,
    };
    return {
      arm: arm.id,
      criteria,
      satisfiesEveryCriterion: Object.values(criteria).every(Boolean),
      representative: {
        grantedAt15Minutes: at15[0].grantedIngredients,
        grantedAt60Minutes: at60[0].grantedIngredients,
        grantedAt120Minutes: at120[0].grantedIngredients,
        grantedAt240Minutes: at240[0].grantedIngredients,
        firstPassiveCapMinute: at60[0].firstPassiveCapMinute,
        gardenLevel1AdvantagePercentAt60Minutes: gardenAdvantages[0],
      },
    };
  });
  const passing = results.filter(result => result.satisfiesEveryCriterion);
  const rankedCandidates = passing.sort((left, right) => Math.abs(left.representative.firstPassiveCapMinute - 90) - Math.abs(right.representative.firstPassiveCapMinute - 90) || left.representative.grantedAt15Minutes - right.representative.grantedAt15Minutes).map((result, index) => ({ rank: index + 1, arm: result.arm, distanceFrom90MinuteCap: Math.abs(result.representative.firstPassiveCapMinute - 90), grantedAt15Minutes: result.representative.grantedAt15Minutes }));
  return { criteriaByArm: results, satisfiesEveryCriterion: passing.map(result => result.arm), rankedRecommendation: rankedCandidates, interpretation: "Ranking is a transparent simulation recommendation only and is not implementation authorization." };
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
    matrixDefinition: { levels: LEVELS, moonlitGardenLevels: GARDEN_LEVELS, pantryShelvesLevels: SHELVES_LEVELS, startingPantryStates: STARTING_STATES, elapsedMinutes: ELAPSED_MINUTES, rowsPerArm: matrix.length },
    scenarios: matrix,
    marginalEffects: buildMarginalEffects(matrix),
    boundaryChecks,
    productCriteria: buildCriteria(matrix, boundaryChecks),
  };
  assertFiniteOutcomes(report);
  return report;
}

const firstSerialized = JSON.stringify(buildReport());
const secondSerialized = JSON.stringify(buildReport());
assert.equal(secondSerialized, firstSerialized, "second in-process run must serialize byte-for-byte identically");
if (process.argv.includes("--check")) {
  const report = JSON.parse(firstSerialized);
  const summary = JSON.stringify({
    harness: report.harness,
    scenariosPerArm: report.matrixDefinition.rowsPerArm,
    passingCandidates: report.productCriteria.satisfiesEveryCriterion,
    rankedRecommendation: report.productCriteria.rankedRecommendation,
    sha256: crypto.createHash("sha256").update(firstSerialized).digest("hex").toUpperCase(),
  });
  assert.ok(Buffer.byteLength(summary) <= 1000, "check summary must stay within 1,000 bytes");
  console.log(summary);
} else {
  console.log(firstSerialized);
}
