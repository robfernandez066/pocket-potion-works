"use strict";

const assert = require("node:assert/strict");
const game = require("./game-logic.js");

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => { value = (1664525 * value + 1013904223) >>> 0; return value / 4294967296; };
}

const STRATEGIES = [
  { id: "manual-light", gatherEvery: 15, actEvery: 10, buy: "none", range: { level: [3, 3], orders: [8, 10], upgrades: [0, 0], recipes: [4, 4] } },
  { id: "realistic-active", gatherEvery: 3, actEvery: 5, buy: "balanced", range: { level: [3, 4], orders: [6, 12], upgrades: [2, 4], recipes: [3, 5] } },
  { id: "cheapest-upgrades", gatherEvery: 3, actEvery: 5, buy: "cheapest", range: { level: [3, 4], orders: [8, 12], upgrades: [4, 7], recipes: [3, 5] } },
  { id: "cauldron-garden", gatherEvery: 3, actEvery: 5, buy: "priority", range: { level: [3, 4], orders: [8, 12], upgrades: [4, 7], recipes: [3, 5] } },
];

function inRange(value, [min, max], label) { assert.ok(value >= min && value <= max, `${label}: ${value} outside ${min}-${max}`); }

function chooseUpgrade(state, strategy) {
  if (strategy.buy === "none") return null;
  const total = Object.values(state.upgrades).reduce((sum, value) => sum + value, 0);
  if (strategy.buy === "balanced" && total >= 4) return null;
  const affordable = game.UPGRADES.filter(upgrade => state.upgrades[upgrade.id] < upgrade.max && game.upgradeCost(state, upgrade) <= state.coins);
  if (strategy.buy === "priority") {
    const priority = ["cauldron", "garden", "basket", "shelves", "ledger"];
    return affordable.sort((a, b) => priority.indexOf(a.id) - priority.indexOf(b.id) || game.upgradeCost(state, a) - game.upgradeCost(state, b))[0] || null;
  }
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

function simulate(strategy, seed) {
  const random = seededRandom(seed);
  const start = Date.UTC(2026, 6, 12, 12);
  const state = game.defaultState(start);
  const milestones = { firstBrew: null, firstDelivery: null, firstUpgrade: null, level2: null, dailyFive: null };
  let passiveBank = 0;
  let lastProgress = 0;
  let longestStall = 0;
  let maxOrderReward = 0;
  game.ensureOrders(state, random);

  for (let second = 0; second <= 600; second += 1) {
    const now = start + second * 1000;
    const before = `${state.level}:${state.stats.brewed}:${state.stats.orders}:${Object.values(state.upgrades).join(",")}`;

    passiveBank += game.gatherRate(state);
    if (passiveBank >= 1) {
      const whole = Math.floor(passiveBank);
      game.addRandomIngredients(state, whole, random);
      passiveBank -= whole;
    }
    if (second % strategy.gatherEvery === 0) game.chargedGather(state, now, random);

    if (second % strategy.actEvery === 0) {
      const collected = game.collectBrew(state, now);
      if (collected && milestones.firstBrew === null) milestones.firstBrew = second;

      for (const order of [...state.orders]) {
        const result = game.fulfillOrder(state, order.id, now, random);
        if (result) {
          maxOrderReward = Math.max(maxOrderReward, result.reward);
          if (milestones.firstDelivery === null) milestones.firstDelivery = second;
          if (state.daily.orders >= 5 && milestones.dailyFive === null) milestones.dailyFive = second;
        }
      }

      const upgrade = chooseUpgrade(state, strategy);
      if (upgrade && game.buyUpgrade(state, upgrade.id) && milestones.firstUpgrade === null) milestones.firstUpgrade = second;
      if (milestones.level2 === null && state.level >= 2) milestones.level2 = second;

      if (!state.brew) {
        const recipe = chooseRecipe(state);
        if (recipe) game.startBrew(state, recipe.id, now);
      }
    }

    const after = `${state.level}:${state.stats.brewed}:${state.stats.orders}:${Object.values(state.upgrades).join(",")}`;
    if (after !== before) lastProgress = second;
    longestStall = Math.max(longestStall, second - lastProgress);

    const unlocked = game.RECIPES.filter(recipe => recipe.unlock <= state.level);
    if (game.totalIngredients(state) >= game.storageCap(state)) assert.ok(unlocked.some(recipe => game.canAffordRecipe(state, recipe)), `${strategy.id}/${seed}: storage deadlock at ${second}s`);
    for (const order of state.orders) assert.ok(game.recipeById(order.recipeId).unlock <= state.level, `${strategy.id}/${seed}: impossible order`);
  }

  const upgrades = Object.values(state.upgrades).reduce((sum, value) => sum + value, 0);
  const maxBranch = Math.max(...Object.values(state.upgrades));
  const recipes = game.RECIPES.filter(recipe => recipe.unlock <= state.level).length;
  const label = `${strategy.id}/${seed}`;
  inRange(state.level, strategy.range.level, `${label} level`);
  inRange(state.stats.orders, strategy.range.orders, `${label} deliveries`);
  inRange(upgrades, strategy.range.upgrades, `${label} upgrades`);
  inRange(recipes, strategy.range.recipes, `${label} recipes`);
  assert.ok(state.coins < 1000 && maxOrderReward < 300, `${label}: runaway rewards`);
  assert.ok(maxBranch <= 3, `${label}: nearly maxed an upgrade branch`);
  assert.ok(longestStall <= (strategy.id === "manual-light" ? 180 : 120), `${label}: stalled ${longestStall}s`);
  assert.ok(milestones.firstBrew !== null && milestones.firstBrew <= 30, `${label}: first brew ${milestones.firstBrew}s`);
  assert.ok(milestones.firstDelivery >= 30 && milestones.firstDelivery <= 90, `${label}: first delivery ${milestones.firstDelivery}s`);
  if (strategy.buy !== "none") assert.ok(milestones.firstUpgrade >= 45 && milestones.firstUpgrade <= 120, `${label}: first upgrade ${milestones.firstUpgrade}s`);
  assert.ok(milestones.level2 >= 60 && milestones.level2 <= 150, `${label}: level 2 ${milestones.level2}s`);
  assert.ok(milestones.dailyFive >= 240 && milestones.dailyFive <= 480, `${label}: daily five ${milestones.dailyFive}s`);
  return { strategy: strategy.id, seed, milestones, level: state.level, deliveries: state.stats.orders, upgrades, recipes, coins: state.coins, maxBranch, longestStall };
}

function simulateToLevel(state, seed, targetLevel, start, maxSeconds = 7200) {
  const random = seededRandom(seed);
  let passiveBank = 0;
  game.ensureOrders(state, random);
  for (let second = 0; second <= maxSeconds; second += 1) {
    const now = start + second * 1000;
    passiveBank += game.gatherRate(state);
    if (passiveBank >= 1) {
      const whole = Math.floor(passiveBank);
      game.addRandomIngredients(state, whole, random);
      passiveBank -= whole;
    }
    if (second % 3 === 0) game.chargedGather(state, now, random);
    if (second % 5 === 0) {
      game.collectBrew(state, now);
      for (const order of [...state.orders]) game.fulfillOrder(state, order.id, now, random);
      if (state.daily.orders >= 5) game.claimDaily(state);
      const upgrade = chooseUpgrade(state, { buy: "priority" });
      if (upgrade) game.buyUpgrade(state, upgrade.id);
      if (!state.brew) {
        const recipe = chooseRecipe(state);
        if (recipe) game.startBrew(state, recipe.id, now);
      }
    }
    if (state.level >= targetLevel) {
      return {
        seconds: second, level: state.level, orders: state.stats.orders, coins: state.coins,
        upgrades: Object.values(state.upgrades).reduce((sum, value) => sum + value, 0),
        mastery: Object.values(state.mastery).reduce((sum, value) => sum + value, 0),
        customerDeliveries: Object.values(state.customers).reduce((sum, customer) => sum + customer.deliveries, 0),
      };
    }
  }
  assert.fail(`seed ${seed} did not reach level ${targetLevel} in ${maxSeconds}s`);
}

for (const recipe of game.RECIPES) {
  for (const ingredientId of Object.keys(recipe.ingredients)) {
    assert.ok(game.INGREDIENTS[ingredientId], `${recipe.id}: unknown ingredient ${ingredientId}`);
    assert.ok(game.INGREDIENTS[ingredientId].unlock <= recipe.unlock, `${recipe.id}: ingredient unlocks after recipe`);
  }
}

function tenMinuteChargedYield(config) {
  return (config.maxCharges + Math.floor(600 / config.rechargeSeconds)) * config.amountPerCharge;
}

const gatherCandidates = [
  { id: "frequent-small", maxCharges: 3, rechargeSeconds: 15, amountPerCharge: 2 },
  { id: "chosen-balanced", ...game.GATHER_CONFIG },
  { id: "scarce-large", maxCharges: 3, rechargeSeconds: 60, amountPerCharge: 5 },
];
const gatherCandidateRows = gatherCandidates.map(config => ({ ...config, tenMinuteItems: tenMinuteChargedYield(config) }));
const chosenGather = gatherCandidateRows.find(row => row.id === "chosen-balanced");
assert.ok(chosenGather.rechargeSeconds >= 20 && chosenGather.rechargeSeconds <= 45, "chosen recharge should create a decision without a minute-long first-session wait");
assert.ok(chosenGather.tenMinuteItems >= 60 && chosenGather.tenMinuteItems <= 75, "chosen charged yield should stay in the modeled non-stalling band");

const pressureStart = Date.UTC(2026, 6, 12, 13);
const targeted = game.defaultState(pressureStart);
const smart = game.defaultState(pressureStart);
targeted.level = smart.level = 2;
targeted.ingredients = { herb: 0, mushroom: 0, crystal: 0, mist: 0, ember: 0, lavender: 0 };
smart.ingredients = { ...targeted.ingredients };
game.setGatherTarget(targeted, "crystal");
const pressureRandom = seededRandom(42);
for (let second = 0; second <= 180; second += 5) {
  game.chargedGather(targeted, pressureStart + second * 1000, pressureRandom);
  game.chargedGather(smart, pressureStart + second * 1000, pressureRandom);
}
assert.ok(targeted.ingredients.crystal >= 24, "targeted pressure run should reliably stock a scarce unlocked ingredient");
assert.ok(targeted.ingredients.crystal > smart.ingredients.crystal * 2, "targeting should materially outperform smart mix for a chosen scarce ingredient");
const nearCap = game.defaultState(pressureStart);
nearCap.ingredients = { herb: game.storageCap(nearCap) - 1, mushroom: 0, crystal: 0, mist: 0, ember: 0, lavender: 0 };
game.setGatherTarget(nearCap, "herb");
assert.equal(game.chargedGather(nearCap, pressureStart, () => 0).added, 1, "targeted harvest should stop exactly at storage capacity");
assert.equal(game.totalIngredients(nearCap), game.storageCap(nearCap));
const offlinePressure = game.defaultState(pressureStart);
assert.equal(game.grantOfflineIngredients(offlinePressure, game.OFFLINE_CAP_SECONDS, () => 0), 0, "offline gathering must not erase first-session scarcity before a delivery");
offlinePressure.stats.orders = 1;
game.grantOfflineIngredients(offlinePressure, game.OFFLINE_CAP_SECONDS, () => 0);
assert.equal(game.totalIngredients(offlinePressure), Math.floor(game.storageCap(offlinePressure) * .75));
assert.ok(game.storageCap(offlinePressure) - game.totalIngredients(offlinePressure) >= game.GATHER_CONFIG.maxCharges * game.GATHER_CONFIG.amountPerCharge, "offline soft cap must leave room for a full targeted charge stock");
assert.ok(Object.keys(game.INGREDIENTS).length >= 6);
assert.ok(game.RECIPES.length >= 8);
assert.ok(game.CUSTOMERS.length >= 12);
assert.ok(game.ACHIEVEMENTS.length >= 8);

const progressionSeeds = [7, 42, 2026];
const prestigeRewards = [1, 2, 3, 4];
const progressionRows = [];
const recoveryRows = [];
for (const seed of progressionSeeds) {
  const cycleStart = Date.UTC(2026, 6, 12, 8);
  const cycleState = game.defaultState(cycleStart);
  const cycle = simulateToLevel(cycleState, seed, game.PRESTIGE_CONFIG.unlockLevel, cycleStart);
  assert.equal(cycleState.daily.claimed, true, "a realistic first cycle should preserve the worthwhile daily claim");
  assert.ok(cycle.mastery >= cycleState.stats.brewed && cycle.customerDeliveries === cycleState.stats.orders);
  progressionRows.push({ seed, ...cycle, dailyStardust: cycleState.stardust });
  const recoveryStart = cycleStart + (cycle.seconds + 60) * 1000;
  const dailyOnlyReset = game.defaultState(recoveryStart);
  dailyOnlyReset.stardust = cycleState.stardust;
  dailyOnlyReset.mastery = { ...cycleState.mastery };
  dailyOnlyReset.customers = structuredClone(cycleState.customers);
  dailyOnlyReset.daily = { ...cycleState.daily };
  const dailyOnly = simulateToLevel(dailyOnlyReset, seed + 10000, 3, recoveryStart, 1800);
  for (const reward of prestigeRewards) {
    const reborn = game.performPrestige(cycleState, reward, recoveryStart);
    assert.deepEqual(reborn.mastery, cycleState.mastery, "rebirth recovery must carry mastery");
    assert.deepEqual(reborn.customers, cycleState.customers, "rebirth recovery must carry customer trust");
    const recovery = simulateToLevel(reborn, seed + 10000, 3, recoveryStart, 1800);
    recoveryRows.push({ seed, reward, ...recovery, dailyOnlySeconds: dailyOnly.seconds, dailyOnlyCoins: dailyOnly.coins, dailyOnlyUpgrades: dailyOnly.upgrades, stardust: reborn.stardust });
  }
}
const average = values => Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
const candidateRows = prestigeRewards.map(reward => {
  const rows = recoveryRows.filter(row => row.reward === reward);
  return { reward, recoverySeconds: average(rows.map(row => row.seconds)), recoveryCoins: average(rows.map(row => row.coins)), recoveryUpgrades: average(rows.map(row => row.upgrades)) };
});
const chosenPrestige = candidateRows.find(candidate => candidate.reward === game.PRESTIGE_CONFIG.baseReward);
const dailyOnlyRecoverySeconds = average(recoveryRows.filter(row => row.reward === 1).map(row => row.dailyOnlySeconds));
const dailyOnlyRecoveryCoins = average(recoveryRows.filter(row => row.reward === 1).map(row => row.dailyOnlyCoins));
const dailyOnlyRecoveryUpgrades = average(recoveryRows.filter(row => row.reward === 1).map(row => row.dailyOnlyUpgrades));
assert.equal(game.PRESTIGE_CONFIG.unlockLevel, 7, "prestige must meet the final recipe instead of leaving a dead level");
assert.ok(game.unlocksAtLevel(game.PRESTIGE_CONFIG.unlockLevel).recipes.length > 0, "prestige gate must share a content unlock level");
for (const row of progressionRows) {
  assert.ok(row.seconds >= 2300 && row.seconds <= 3000, `seed ${row.seed}: first prestige cycle outside observed 38-50 minute band`);
  assert.ok(row.orders >= 28 && row.orders <= 36 && row.mastery >= 34 && row.mastery <= 42, `seed ${row.seed}: cycle progression outside observed band`);
  assert.equal(row.dailyStardust, 1, `seed ${row.seed}: daily alternative should remain a meaningful permanent gain`);
}
assert.ok(chosenPrestige.recoverySeconds <= dailyOnlyRecoverySeconds, "chosen prestige should not recover slower than a daily-only reset baseline");
assert.ok(chosenPrestige.recoverySeconds >= 300 && chosenPrestige.recoverySeconds <= 340, "chosen recovery should remain in the observed five-to-six-minute band");
assert.ok(chosenPrestige.recoveryCoins > dailyOnlyRecoveryCoins && chosenPrestige.recoveryCoins >= 40 && chosenPrestige.recoveryCoins <= 100, "chosen prestige should leave a bounded coin advantage after matching daily-only recovery");
assert.equal(chosenPrestige.recoveryUpgrades, dailyOnlyRecoveryUpgrades, "chosen prestige should not require extra upgrades to match recovery");
assert.ok(chosenPrestige.recoverySeconds <= candidateRows.find(row => row.reward === 4).recoverySeconds, "four stardust should not improve the observed recovery band enough to justify the larger grant");

const results = STRATEGIES.flatMap(strategy => [7, 42, 2026].map(seed => simulate(strategy, seed)));
console.log("10-minute economy strategy simulations passed:");
for (const result of results) console.log(JSON.stringify(result));
console.log("Charged-gather tuning candidates:");
for (const row of gatherCandidateRows) console.log(JSON.stringify(row));
console.log(JSON.stringify({ targetedCrystal180s: targeted.ingredients.crystal, smartCrystal180s: smart.ingredients.crystal, storageCap: game.storageCap(nearCap), offlineSoftCap: game.totalIngredients(offlinePressure) }));
console.log("Seeded first-cycle progression to level 7:");
for (const row of progressionRows) console.log(JSON.stringify(row));
console.log(`Seeded post-rebirth recovery to level 3 (daily-only reset baseline ${dailyOnlyRecoverySeconds}s, ${dailyOnlyRecoveryCoins} coins, ${dailyOnlyRecoveryUpgrades} upgrades):`);
for (const row of candidateRows) console.log(JSON.stringify({ ...row, chosen: row.reward === chosenPrestige.reward }));
