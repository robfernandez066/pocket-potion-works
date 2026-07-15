"use strict";

// Development-only Task 30 evidence. Candidate arms use shipped gameplay
// actions; only the Stardust factor presented to fulfillOrder is substituted
// for that one reward calculation, then the saved integer count is restored.
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const game = require("./game-logic.js");

const START = Date.UTC(2026, 6, 15, 12);
const CYCLE_START = Date.UTC(2026, 6, 12, 8);
const SEEDS = Object.freeze([7, 42, 2026, 99, 1234]);
const FIRST_CYCLE_SEEDS = Object.freeze([7, 42, 2026]);
const STARDUST_COUNTS = Object.freeze([0, 1, 3, 5, 10, 20, 30, 40, 90, 180, 100000]);
const RECOVERY_COUNTS = Object.freeze([0, 5, 10, 40, 180]);
const DAILY_PROJECTION_DAYS = Object.freeze([30, 90, 180]);
const ACTIVE_SECONDS = 10 * 60;
const RECOVERY_MAX_SECONDS = 30 * 60;
const TASK_27_IDLE_RETURN_SHA256 = "921B52870E1CB2C78BC1E19A80A3C1699643B4EF99B3AD042D3BB002A3FCF8C8";
const TASK_24_FIRST_CYCLE_LOCKS = Object.freeze({
  7: Object.freeze({ seconds: 2615, orders: 33, coinsEarned: 5997 }),
  42: Object.freeze({ seconds: 2695, orders: 31, coinsEarned: 6501 }),
  2026: Object.freeze({ seconds: 2600, orders: 32, coinsEarned: 6231 }),
});
const ARMS = Object.freeze([
  Object.freeze({ id: "shipped", formula: "1 + 0.10s", bound: "unbounded" }),
  Object.freeze({ id: "hard-cap-10", formula: "1 + 0.10 min(s,10)", maximumMultiplier: 2.0 }),
  Object.freeze({ id: "tiered-2.5", formula: "1 + 0.10 min(s,5) + 0.05 min(max(s-5,0),10) + 0.02 min(max(s-15,0),25)", maximumMultiplier: 2.5 }),
  Object.freeze({ id: "soft-cap-2.5", formula: "s <= 5 ? 1 + 0.10s : 1.5 + (s-5)/(s+15)", maximumMultiplier: 2.5, maximumExclusive: true }),
]);

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => { value = (1664525 * value + 1013904223) >>> 0; return value / 4294967296; };
}

function round(value) { return Math.round(value * 1000000) / 1000000; }
function average(values) { return round(values.reduce((sum, value) => sum + value, 0) / values.length); }
function upgradeCount(state) { return Object.values(state.upgrades).reduce((sum, value) => sum + value, 0); }
function assertStardust(value) { assert.ok(Number.isFinite(value) && value >= 0, `Stardust must be finite and nonnegative: ${value}`); }

function multiplierFor(armId, stardust) {
  assertStardust(stardust);
  if (armId === "shipped") return game.coinMultiplier({ stardust, boostUntil: 0 }, START);
  if (armId === "hard-cap-10") return 1 + .10 * Math.min(stardust, 10);
  if (armId === "tiered-2.5") return 1 + .10 * Math.min(stardust, 5) + .05 * Math.min(Math.max(stardust - 5, 0), 10) + .02 * Math.min(Math.max(stardust - 15, 0), 25);
  if (armId === "soft-cap-2.5") return stardust <= 5 ? 1 + .10 * stardust : 1.5 + (stardust - 5) / (stardust + 15);
  assert.fail(`Unknown simulation arm: ${armId}`);
}

function equivalentShippedStardust(armId, stardust) {
  return (multiplierFor(armId, stardust) - 1) / .10;
}

function orderMultiplierForArm(state, armId, now, recipeId) {
  const savedStardust = state.stardust;
  state.stardust = equivalentShippedStardust(armId, savedStardust);
  try {
    return game.orderMultiplier(state, now, recipeId);
  } finally {
    state.stardust = savedStardust;
  }
}

function fulfillForArm(state, armId, orderId, now, random) {
  const savedStardust = state.stardust;
  state.stardust = equivalentShippedStardust(armId, savedStardust);
  try {
    return game.fulfillOrder(state, orderId, now, random);
  } finally {
    state.stardust = savedStardust;
  }
}

function chooseUpgrade(state) {
  const affordable = game.UPGRADES.filter(upgrade => state.upgrades[upgrade.id] < upgrade.max && game.upgradeCost(state, upgrade) <= state.coins);
  const priority = ["cauldron", "garden", "basket", "shelves", "ledger"];
  return affordable.sort((left, right) => priority.indexOf(left.id) - priority.indexOf(right.id) || game.upgradeCost(state, left) - game.upgradeCost(state, right))[0] || null;
}

function chooseRecipe(state) {
  if (state.level >= 2 && !state.discovery.delivered.clarity) {
    const clarity = game.recipeById("clarity");
    return game.canAffordRecipe(state, clarity) ? clarity : null;
  }
  const requested = state.orders.map(order => game.recipeById(order.recipeId)).sort((left, right) => right.unlock - left.unlock);
  return [...requested, ...game.RECIPES].find(recipe => recipe.unlock <= state.level && game.canAffordRecipe(state, recipe)) || null;
}

function runToLevel(state, armId, seed, targetLevel, start, maxSeconds, claimDaily) {
  const random = seededRandom(seed);
  let passiveBank = 0;
  let dailyClaims = 0;
  game.ensureOrders(state, random);
  for (let second = 0; second <= maxSeconds; second += 1) {
    const now = start + second * 1000;
    passiveBank += game.gatherRate(state);
    if (passiveBank >= 1) {
      const whole = Math.floor(passiveBank);
      game.grantPassiveIngredients(state, whole, random);
      passiveBank -= whole;
    }
    if (second % 3 === 0) game.chargedGather(state, now, random);
    if (second % 5 === 0) {
      game.collectBrew(state, now);
      for (const order of [...state.orders]) fulfillForArm(state, armId, order.id, now, random);
      if (claimDaily && state.daily.orders >= 5 && game.claimDaily(state, now)) dailyClaims += 1;
      const upgrade = chooseUpgrade(state);
      if (upgrade) game.buyUpgrade(state, upgrade.id, now);
      if (!state.brew) {
        const recipe = chooseRecipe(state);
        if (recipe) game.startBrew(state, recipe.id, now);
      }
    }
    if (state.level >= targetLevel) {
      return { seconds: second, coins: state.coins, coinsEarned: state.stats.coinsEarned, orders: state.stats.orders, upgrades: upgradeCount(state), level: state.level, dailyClaims, finalStardust: state.stardust };
    }
  }
  assert.fail(`${armId}/${seed} did not reach level ${targetLevel} in ${maxSeconds}s`);
}

function runActiveSession(armId, seed, stardust) {
  const state = game.defaultState(START);
  state.stardust = stardust;
  const random = seededRandom(seed);
  let passiveBank = 0;
  game.ensureOrders(state, random);
  for (let second = 0; second <= ACTIVE_SECONDS; second += 1) {
    const now = START + second * 1000;
    passiveBank += game.gatherRate(state);
    if (passiveBank >= 1) {
      const whole = Math.floor(passiveBank);
      game.grantPassiveIngredients(state, whole, random);
      passiveBank -= whole;
    }
    if (second % 3 === 0) game.chargedGather(state, now, random);
    if (second % 5 === 0) {
      game.collectBrew(state, now);
      for (const order of [...state.orders]) fulfillForArm(state, armId, order.id, now, random);
      const upgrade = chooseUpgrade(state);
      if (upgrade) game.buyUpgrade(state, upgrade.id, now);
      if (!state.brew) {
        const recipe = chooseRecipe(state);
        if (recipe) game.startBrew(state, recipe.id, now);
      }
    }
  }
  return { coins: state.coins, coinsEarned: state.stats.coinsEarned, orders: state.stats.orders, upgrades: upgradeCount(state), level: state.level, dailyClaims: 0 };
}

function buildMultiplierRows() {
  return STARDUST_COUNTS.map(stardust => ({
    stardust,
    arms: Object.fromEntries(ARMS.map(arm => [arm.id, round(multiplierFor(arm.id, stardust))])),
  }));
}

function buildRepresentativeOrderEffects() {
  const source = game.defaultState(START);
  source.level = 4;
  source.xp = 0;
  source.stardust = 0;
  const random = seededRandom(7);
  const order = game.generateOrder(source, random);
  assert.ok(order, "representative shipped-generated order is required");
  const sourceSnapshot = JSON.stringify(source);
  const rows = STARDUST_COUNTS.map(stardust => {
    source.stardust = stardust;
    return {
      stardust,
      arms: Object.fromEntries(ARMS.map(arm => {
        const multiplier = orderMultiplierForArm(source, arm.id, START, order.recipeId);
        return [arm.id, { orderMultiplier: round(multiplier), roundedCoins: Math.round(order.reward * multiplier) }];
      })),
    };
  });
  source.stardust = 0;
  assert.equal(JSON.stringify(source), sourceSnapshot, "representative order calculation must not mutate its source state");
  return { definition: "One shipped-generated level-4 order, no boosts, ledger, or recipe mastery; orderMultiplier is called from game-logic.js.", order: { recipeId: order.recipeId, quantity: order.quantity, baseReward: order.reward }, rows };
}

function buildFirstCycle() {
  const rows = FIRST_CYCLE_SEEDS.map(seed => {
    const state = game.defaultState(CYCLE_START);
    const outcome = runToLevel(state, "shipped", seed, game.PRESTIGE_CONFIG.unlockLevel, CYCLE_START, 7200, true);
    const expected = TASK_24_FIRST_CYCLE_LOCKS[seed];
    assert.deepEqual({ seconds: outcome.seconds, orders: outcome.orders, coinsEarned: outcome.coinsEarned }, expected, `Task 24 first-cycle lock changed for seed ${seed}`);
    return { seed, ...outcome, stardustSources: { dailyClaims: outcome.dailyClaims, rebirth: 0 } };
  });
  return { definition: "Current first-cycle regression scenario through level 7 using shipped runtime behavior and the Task 24 strategy.", rows };
}

function buildActiveMatrix() {
  const rows = [];
  for (const seed of SEEDS) for (const stardust of STARDUST_COUNTS) for (const arm of ARMS) {
    rows.push({ seed, stardust, arm: arm.id, ...runActiveSession(arm.id, seed, stardust) });
  }
  const expected = SEEDS.length * STARDUST_COUNTS.length * ARMS.length;
  assert.equal(rows.length, expected, "active seed/count/arm matrix must be complete");
  return rows;
}

function buildRecoveryMatrix() {
  const rows = [];
  for (const seed of SEEDS) for (const carriedStardust of RECOVERY_COUNTS) for (const arm of ARMS) {
    const state = game.defaultState(START);
    state.level = game.PRESTIGE_CONFIG.unlockLevel;
    state.stardust = carriedStardust;
    const reborn = game.performPrestige(state, game.PRESTIGE_CONFIG.baseReward, START);
    assert.ok(reborn, "level-seven recovery source must rebirth");
    const outcome = runToLevel(reborn, arm.id, seed + 10000, 3, START, RECOVERY_MAX_SECONDS, true);
    rows.push({ seed, carriedStardust, arm: arm.id, stardustSources: { carriedIntoRebirth: carriedStardust, rebirthReward: game.PRESTIGE_CONFIG.baseReward, dailyClaimsDuringRecovery: outcome.dailyClaims }, ...outcome });
  }
  const expected = SEEDS.length * RECOVERY_COUNTS.length * ARMS.length;
  assert.equal(rows.length, expected, "recovery seed/count/arm matrix must be complete");
  return rows;
}

function buildDailyOnlyProjections() {
  return DAILY_PROJECTION_DAYS.map(days => ({
    days,
    assumption: "Mathematical scenario only: exactly one successfully claimed Daily Goal per UTC day; it is not a player-behavior forecast.",
    stardustSources: { dailyGoals: days, rebirth: 0, total: days },
    arms: Object.fromEntries(ARMS.map(arm => [arm.id, round(multiplierFor(arm.id, days))])),
  }));
}

function assertFormulaContracts(multiplierRows, activeMatrix, recoveryMatrix) {
  for (const stardust of STARDUST_COUNTS) {
    const shipped = multiplierFor("shipped", stardust);
    assert.equal(shipped, 1 + .10 * stardust, `shipped parity changed at ${stardust}`);
    for (const arm of ARMS) assert.ok(Number.isFinite(multiplierFor(arm.id, stardust)) && multiplierFor(arm.id, stardust) >= 0, `${arm.id} must be finite and nonnegative at ${stardust}`);
  }
  for (const arm of ARMS) {
    let previous = -Infinity;
    for (let stardust = 0; stardust <= 100000; stardust += 1) {
      const value = multiplierFor(arm.id, stardust);
      assert.ok(value >= previous, `${arm.id} must be monotonic at ${stardust}`);
      previous = value;
    }
  }
  for (let stardust = 0; stardust <= 5; stardust += 1) {
    const shipped = multiplierFor("shipped", stardust);
    for (const arm of ARMS.filter(arm => arm.id !== "shipped")) assert.equal(multiplierFor(arm.id, stardust), shipped, `${arm.id} must match shipped through ${stardust} Stardust`);
  }
  assert.equal(multiplierFor("hard-cap-10", 10), 2, "hard-cap-10 must reach 2.0x at 10");
  assert.ok(multiplierFor("hard-cap-10", 100000) <= 2, "hard-cap-10 must not exceed 2.0x");
  assert.equal(multiplierFor("tiered-2.5", 40), 2.5, "tiered-2.5 must reach 2.5x at 40");
  assert.ok(multiplierFor("tiered-2.5", 100000) <= 2.5, "tiered-2.5 must not exceed 2.5x");
  assert.ok(multiplierFor("soft-cap-2.5", 100000) < 2.5, "soft-cap-2.5 must remain below 2.5x at the save cap");
  assert.ok(activeMatrix.filter(row => row.stardust === 100000).every(row => Number.isFinite(row.coins) && row.coins >= 0), "save-cap active outcomes must remain safe");
  assert.ok(recoveryMatrix.every(row => Number.isFinite(row.coins) && row.coins >= 0), "recovery outcomes must remain safe");
  assert.ok(multiplierRows.every(row => Object.keys(row.arms).length === ARMS.length), "each multiplier row must include every arm");
  return {
    shippedFormulaParity: true,
    finiteNonnegativeOutputs: true,
    monotonicCandidates: true,
    exactParityThroughFive: true,
    hardCap10Maximum: 2.0,
    tiered25Maximum: 2.5,
    softCap25BelowMaximumAtSaveCap: true,
    saveCap: 100000,
    completeActiveMatrix: activeMatrix.length,
    completeRecoveryMatrix: recoveryMatrix.length,
  };
}

function buildRanking(activeMatrix) {
  const distortionCounts = [10, 20, 30, 40, 90, 180];
  const candidates = ARMS.filter(arm => arm.id !== "shipped").map(arm => {
    const ratios = [];
    for (const seed of SEEDS) for (const stardust of distortionCounts) {
      const shipped = activeMatrix.find(row => row.seed === seed && row.stardust === stardust && row.arm === "shipped");
      const candidate = activeMatrix.find(row => row.seed === seed && row.stardust === stardust && row.arm === arm.id);
      assert.ok(shipped && candidate && shipped.coinsEarned > 0, `missing measured distortion row for ${arm.id}/${seed}/${stardust}`);
      ratios.push(candidate.coinsEarned / shipped.coinsEarned);
    }
    const positiveThrough = arm.id === "hard-cap-10" ? 10 : arm.id === "tiered-2.5" ? 40 : 100000;
    return {
      arm: arm.id,
      earlyParityThroughFive: true,
      longRunMultiplierBound: arm.maximumMultiplier,
      continuedPostFiveValueThroughStardust: positiveThrough,
      measuredEconomyDistortion: { activeSessionCounts: distortionCounts, meanCoinsEarnedPercentOfShipped: round(average(ratios) * 100), samples: ratios.length },
    };
  });
  const ordered = [...candidates].sort((left, right) => right.continuedPostFiveValueThroughStardust - left.continuedPostFiveValueThroughStardust || right.measuredEconomyDistortion.meanCoinsEarnedPercentOfShipped - left.measuredEconomyDistortion.meanCoinsEarnedPercentOfShipped || left.longRunMultiplierBound - right.longRunMultiplierBound);
  return {
    method: "All candidates first qualify on exact parity through five and a bounded long-run multiplier. Ordering then prefers continued diminishing post-five value, lower measured active-session distortion from shipped at 10-180 Stardust, then the lower stated ceiling. This is evidence ranking only, not product approval.",
    rows: candidates,
    order: ordered.map(row => row.arm),
    productDirectionSelected: false,
  };
}

function assertFiniteNonnegative(value, path = "report") {
  if (typeof value === "number") {
    assert.ok(Number.isFinite(value) && value >= 0, `${path} must be finite and nonnegative`);
  } else if (Array.isArray(value)) {
    value.forEach((entry, index) => assertFiniteNonnegative(entry, `${path}[${index}]`));
  } else if (value && typeof value === "object") {
    for (const [key, entry] of Object.entries(value)) assertFiniteNonnegative(entry, `${path}.${key}`);
  }
}

function buildReport() {
  assert.deepEqual(SEEDS, [7, 42, 2026, 99, 1234]);
  assert.deepEqual(STARDUST_COUNTS, [0, 1, 3, 5, 10, 20, 30, 40, 90, 180, 100000]);
  assert.deepEqual(DAILY_PROJECTION_DAYS, [30, 90, 180]);
  const multipliers = buildMultiplierRows();
  const representativeOrderEffects = buildRepresentativeOrderEffects();
  const firstCycle = buildFirstCycle();
  const activeMatrix = buildActiveMatrix();
  const recoveryMatrix = buildRecoveryMatrix();
  const assertions = assertFormulaContracts(multipliers, activeMatrix, recoveryMatrix);
  const ranking = buildRanking(activeMatrix);
  const report = {
    harness: "stardust-simulation",
    fixedUtcStart: new Date(START).toISOString(),
    seeds: SEEDS,
    stardustCounts: STARDUST_COUNTS,
    arms: ARMS,
    multipliers,
    representativeOrderEffects,
    firstCycle,
    activeSession: { definition: "Ten-minute fixed active session from a fresh shipped state. Daily Goal is deliberately not claimed so each row isolates its listed fixed Stardust count.", seconds: ACTIVE_SECONDS, rows: activeMatrix },
    postRebirthRecovery: { definition: "Level-seven state rebirths with the shipped base reward, then follows the fixed shipped recovery loop to level 3. Daily claims during recovery remain enabled and are reported separately.", targetLevel: 3, representativeCarriedStardustCounts: RECOVERY_COUNTS, rows: recoveryMatrix },
    dailyOnlyProjections: buildDailyOnlyProjections(),
    ranking,
    migrationNote: {
      existingSaveField: "stardust is already a preserved integer count; formula selection changes its interpretation only.",
      perArm: ARMS.map(arm => ({ arm: arm.id, requiresSaveSchemaMigration: false, reason: "The existing nonnegative integer Stardust count remains sufficient input for this formula." })),
      implementationStatus: "No migration is implemented by this development-only harness.",
    },
    assertions,
    regressionLocks: { task24FirstCycle: TASK_24_FIRST_CYCLE_LOCKS, task27IdleReturnSha256: TASK_27_IDLE_RETURN_SHA256 },
  };
  assertFiniteNonnegative(report);
  return report;
}

const firstSerialized = JSON.stringify(buildReport());
const secondSerialized = JSON.stringify(buildReport());
assert.equal(secondSerialized, firstSerialized, "second in-process report must serialize byte-for-byte identically");
const sha256 = crypto.createHash("sha256").update(firstSerialized).digest("hex").toUpperCase();
if (process.argv.includes("--check")) {
  const report = JSON.parse(firstSerialized);
  const summary = JSON.stringify({
    harness: report.harness,
    activeScenarios: report.activeSession.rows.length,
    recoveryScenarios: report.postRebirthRecovery.rows.length,
    candidateBounds: Object.fromEntries(report.arms.filter(arm => arm.id !== "shipped").map(arm => [arm.id, arm.maximumMultiplier])),
    ranking: report.ranking.order,
    sha256,
  });
  assert.ok(Buffer.byteLength(summary) <= 1000, "check summary must stay concise");
  console.log(summary);
} else {
  console.log(firstSerialized);
}
