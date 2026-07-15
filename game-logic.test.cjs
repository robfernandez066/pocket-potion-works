"use strict";

const assert = require("node:assert/strict");
const game = require("./game-logic.js");

const NOW = Date.UTC(2026, 6, 12, 12);
let passed = 0;
function test(name, fn) {
  fn(); passed += 1; console.log(`ok ${passed} - ${name}`);
}

test("exact ingredient cost starts a brew and consumes exactly the cost", () => {
  const state = game.defaultState(NOW);
  state.ingredients = { herb: 2, mushroom: 1, crystal: 0, mist: 0, ember: 0, mint: 0, lavender: 0 };
  assert.equal(game.startBrew(state, "tonic", NOW), true);
  assert.deepEqual(state.ingredients, { herb: 0, mushroom: 0, crystal: 0, mist: 0, ember: 0, mint: 0, lavender: 0 });
});

test("insufficient cost cannot start or partially charge a brew", () => {
  const state = game.defaultState(NOW);
  state.ingredients = { herb: 2, mushroom: 0, crystal: 0, mist: 0, ember: 0, mint: 0, lavender: 0 };
  const before = structuredClone(state.ingredients);
  assert.equal(game.startBrew(state, "tonic", NOW), false);
  assert.deepEqual(state.ingredients, before);
});

test("a completed brew can only be collected once", () => {
  const state = game.defaultState(NOW);
  game.startBrew(state, "tonic", NOW);
  assert.ok(game.collectBrew(state, NOW + 30000));
  assert.equal(game.collectBrew(state, NOW + 30000), null);
  assert.equal(state.potions.tonic, 1);
  assert.equal(state.stats.brewed, 1);
});

test("quick-brew assist removes forty percent once without finishing the brew", () => {
  const state = game.defaultState(NOW);
  state.level = 2;
  state.ingredients.herb = 3;
  state.ingredients.crystal = 1;
  assert.equal(game.startBrew(state, "clarity", NOW), true);
  const status = game.finishBrewAssistStatus(state, NOW + 6000);
  assert.equal(status.available, true);
  assert.equal(status.remainingMs, 60000);
  const result = game.applyFinishBrewAssist(state, NOW + 6000);
  assert.equal(result.applied, true);
  assert.equal(result.remainingMs, 36000);
  assert.equal(state.brew.endsAt, NOW + 42000);
  assert.equal(game.collectBrew(state, NOW + 6000), null);
  assert.equal(game.finishBrewAssistStatus(state, NOW + 6000).reason, "already-used");
  assert.equal(game.applyFinishBrewAssist(state, NOW + 6000).applied, false);
  assert.equal(state.brew.endsAt, NOW + 42000);
});

test("quick-brew assist rejects missing, ready, and nearly complete brews", () => {
  const state = game.defaultState(NOW);
  assert.equal(game.finishBrewAssistStatus(state, NOW).reason, "no-active-brew");
  game.startBrew(state, "tonic", NOW);
  assert.equal(game.finishBrewAssistStatus(state, NOW).reason, "too-close-to-ready");
  assert.equal(game.finishBrewAssistStatus(state, NOW + 30000).reason, "brew-ready");
});

test("quick-brew usage survives save normalization", () => {
  const state = game.defaultState(NOW);
  game.startBrew(state, "tonic", NOW);
  state.brew.assistUses = 99;
  const loaded = game.normalizeState(state, NOW);
  assert.equal(loaded.brew.assistUses, game.FINISH_BREW_CONFIG.maxUsesPerBrew);
});

test("an order can only be delivered once", () => {
  const state = game.defaultState(NOW);
  state.orders = [{ id: 1, recipeId: "tonic", quantity: 1, reward: 20, xp: 1 }];
  state.nextOrderId = 2; state.potions.tonic = 1;
  assert.ok(game.fulfillOrder(state, 1, NOW, () => 0));
  assert.equal(game.fulfillOrder(state, 1, NOW, () => 0), null);
  assert.equal(state.stats.orders, 1);
  assert.equal(state.potions.tonic, 0);
});

test("XP overflow crosses multiple levels and keeps the remainder", () => {
  const state = game.defaultState(NOW);
  const total = game.xpNeeded(1) + game.xpNeeded(2) + 7;
  assert.deepEqual(game.addXp(state, total), [2, 3]);
  assert.equal(state.level, 3);
  assert.equal(state.xp, 7);
});

test("data-driven achievement evaluation unlocks every existing threshold once with supplied timestamps", () => {
  const thresholds = {
    firstBrew: [state => { state.stats.brewed = 0; }, state => { state.stats.brewed = 1; }],
    orderFive: [state => { state.stats.orders = 4; }, state => { state.stats.orders = 5; }],
    coin500: [state => { state.stats.coinsEarned = 499; }, state => { state.stats.coinsEarned = 500; }],
    brew25: [state => { state.stats.brewed = 24; }, state => { state.stats.brewed = 25; }],
    rebirth: [state => { state.stats.prestiges = 0; }, state => { state.stats.prestiges = 1; }],
    tap50: [state => { state.stats.taps = 49; }, state => { state.stats.taps = 50; }],
    levelFour: [state => { state.level = 3; }, state => { state.level = 4; }],
    upgradeThree: [state => { state.upgrades.garden = 2; }, state => { state.upgrades.garden = 3; }],
  };
  assert.equal(Object.keys(thresholds).length, game.ACHIEVEMENTS.length);
  for (const achievement of game.ACHIEVEMENTS) {
    const state = game.defaultState(NOW);
    for (const other of game.ACHIEVEMENTS) if (other.id !== achievement.id) state.achievements[other.id] = NOW - 1;
    const [before, reach] = thresholds[achievement.id];
    before(state);
    assert.deepEqual(game.evaluateAchievements(state, NOW), [], `${achievement.id} unlocked before its threshold`);
    reach(state);
    assert.deepEqual(game.evaluateAchievements(state, NOW).map(item => item.id), [achievement.id]);
    assert.equal(state.achievements[achievement.id], NOW);
    assert.deepEqual(game.evaluateAchievements(state, NOW + 1), [], `${achievement.id} announced twice`);
    assert.equal(state.achievements[achievement.id], NOW, `${achievement.id} timestamp changed after re-evaluation`);
  }
});

test("triggering actions evaluate harvest, upgrade, rolling reward, and level-up achievements immediately", () => {
  const pinOtherAchievements = (state, id) => {
    for (const achievement of game.ACHIEVEMENTS) if (achievement.id !== id) state.achievements[achievement.id] = NOW - 1;
  };

  const harvest = game.defaultState(NOW);
  harvest.stats.taps = 49;
  pinOtherAchievements(harvest, "tap50");
  assert.deepEqual(game.chargedGather(harvest, NOW, () => 0).achievements.map(item => item.id), ["tap50"]);
  assert.equal(harvest.achievements.tap50, NOW);

  const upgrade = game.defaultState(NOW);
  upgrade.coins = 1000; upgrade.upgrades.garden = 2;
  pinOtherAchievements(upgrade, "upgradeThree");
  assert.deepEqual(game.buyUpgrade(upgrade, "garden", NOW).achievements.map(item => item.id), ["upgradeThree"]);
  assert.equal(upgrade.achievements.upgradeThree, NOW);

  const rolling = game.defaultState(NOW);
  rolling.stats.coinsEarned = 490; rolling.weekly.progress = 2;
  pinOtherAchievements(rolling, "coin500");
  assert.deepEqual(game.claimWeeklyStep(rolling, NOW).achievements.map(item => item.id), ["coin500"]);
  assert.equal(rolling.achievements.coin500, NOW);

  const levelUp = game.defaultState(NOW);
  levelUp.stats.coinsEarned = 480; levelUp.xp = game.xpNeeded(1) - 1;
  pinOtherAchievements(levelUp, "coin500");
  assert.deepEqual(game.addXp(levelUp, 1, NOW).achievements.map(item => item.id), ["coin500"]);
  assert.equal(levelUp.achievements.coin500, NOW);
});

test("gameplay coin grants update lifetime coins exactly once and exclude starting, spending, and bundle currency", () => {
  const assertGrant = (state, action, expected) => {
    const before = { coins: state.coins, earned: state.stats.coinsEarned };
    const result = action();
    assert.equal(state.coins - before.coins, expected);
    assert.equal(state.stats.coinsEarned - before.earned, expected);
    return result;
  };

  const order = game.defaultState(NOW);
  order.orders = [{ id: 1, customerId: "customer-0", customer: game.CUSTOMERS[0][0], recipeId: "tonic", quantity: 1, reward: 20, xp: 0 }]; order.nextOrderId = 2; order.potions.tonic = 1;
  assert.equal(assertGrant(order, () => game.fulfillOrder(order, 1, NOW, () => 0).reward, 20), 20);

  const favor = game.defaultState(NOW);
  favor.customers["customer-0"] = { deliveries: 2, hearts: 0 };
  favor.orders = [{ id: 1, customerId: "customer-0", customer: game.CUSTOMERS[0][0], recipeId: "tonic", quantity: 1, reward: 20, xp: 0 }]; favor.nextOrderId = 2; favor.potions.tonic = 1;
  const favorResult = game.fulfillOrder(favor, 1, NOW, () => 0);
  assert.equal(favorResult.customerBonus, game.CUSTOMER_CONFIG.heartBonusCoins);
  assert.equal(favorResult.reward, 20 + game.CUSTOMER_CONFIG.heartBonusCoins);
  assert.equal(favor.coins, 30 + favorResult.reward);
  assert.equal(favor.stats.coinsEarned, favorResult.reward);

  const level = game.defaultState(NOW);
  level.xp = game.xpNeeded(1) - 1;
  assertGrant(level, () => game.addXp(level, 1, NOW), 20);

  const daily = game.defaultState(NOW);
  daily.daily.orders = 5;
  assertGrant(daily, () => game.claimDaily(daily, NOW), 50);

  const rolling = game.defaultState(NOW);
  rolling.weekly.progress = 2;
  assertGrant(rolling, () => game.claimWeeklyStep(rolling, NOW), 10);

  const journal = game.defaultState(NOW);
  journal.discovery.brewed.tonic = 1;
  assertGrant(journal, () => game.claimJournalReward(journal, "recipe", "tonic", NOW), game.JOURNAL_REWARDS.recipe);
  journal.achievements.firstBrew = NOW;
  assertGrant(journal, () => game.claimJournalReward(journal, "achievement", "firstBrew", NOW), game.JOURNAL_REWARDS.achievement);

  const excluded = game.defaultState(NOW);
  assert.deepEqual({ coins: excluded.coins, earned: excluded.stats.coinsEarned }, { coins: 30, earned: 0 });
  const earnedBeforeSpend = excluded.stats.coinsEarned;
  excluded.coins = 100;
  assert.ok(game.buyUpgrade(excluded, "garden", NOW));
  assert.equal(excluded.coins, 30);
  assert.equal(excluded.stats.coinsEarned, earnedBeforeSpend);
  excluded.starterClaimed = true; excluded.coins += 100;
  assert.equal(excluded.stats.coinsEarned, earnedBeforeSpend, "simulated apprentice-bundle currency remains excluded");
});

test("existing lifetime coin totals round-trip unchanged before adopting prospective grants", () => {
  const existing = game.defaultState(NOW);
  existing.stats.coinsEarned = 451;
  existing.daily.orders = 5;
  const loaded = game.parseSave(JSON.stringify(existing), NOW).state;
  assert.equal(loaded.version, game.SAVE_VERSION);
  assert.equal(loaded.stats.coinsEarned, 451);
  assert.ok(game.claimDaily(loaded, NOW));
  assert.equal(loaded.stats.coinsEarned, 501);
});

test("hostile save numerics normalize to finite bounded gameplay values", () => {
  const state = game.defaultState(NOW);
  state.coins = "499.9";
  state.level = Number.MAX_SAFE_INTEGER;
  state.xp = Number.MAX_VALUE;
  state.stardust = "Infinity";
  state.ingredients = { herb: "12.8", mushroom: -4, crystal: "1e9999", mist: Number.MAX_SAFE_INTEGER, ember: "NaN", mint: Number.MAX_VALUE, lavender: "-0.5" };
  state.potions = Object.fromEntries(game.RECIPES.map((recipe, index) => [recipe.id, ["4.9", -1, "Infinity", Number.MAX_VALUE][index % 4]]));
  state.mastery = Object.fromEntries(game.RECIPES.map((recipe, index) => [recipe.id, [Number.MAX_SAFE_INTEGER, "1e9999", -3, "2.7"][index % 4]]));
  state.customers["customer-0"] = { deliveries: Number.MAX_VALUE, hearts: Number.MAX_SAFE_INTEGER };
  state.daily = { date: game.todayKey(NOW), orders: "1e9999", claimed: false };
  state.weekly = { cycle: Number.MAX_SAFE_INTEGER, progress: Number.MAX_VALUE, claimedSteps: "1e9999" };
  state.gather = { charges: "2.9", lastRechargeAt: "Infinity", targetId: "mint" };
  state.stats = { taps: Number.MAX_VALUE, brewed: "1e9999", orders: -8, coinsEarned: Number.MAX_SAFE_INTEGER, prestiges: "3.7", legacyCounter: "11.4" };
  state.orders = [{ id: Number.MAX_SAFE_INTEGER, recipeId: "tonic", quantity: "1.8", reward: Number.MAX_VALUE, xp: Number.MAX_SAFE_INTEGER }];
  state.brew = { recipeId: "aurora", startedAt: "Infinity", endsAt: Number.MAX_VALUE, durationMs: "1e9999", assistUses: Number.MAX_SAFE_INTEGER };

  const loaded = game.normalizeState(state, NOW);
  assert.equal(loaded.coins, 499, "smaller valid numeric strings retain their value");
  assert.equal(loaded.level, game.SAVE_LIMITS.level);
  assert.ok(loaded.xp < game.xpNeeded(loaded.level));
  assert.equal(loaded.stardust, 0);
  assert.equal(loaded.ingredients.herb, 12);
  assert.equal(loaded.ingredients.mushroom, 0);
  assert.equal(loaded.potions.tonic, 4);
  assert.equal(loaded.mastery.aurora, 2);
  assert.equal(loaded.customers["customer-0"].deliveries, game.SAVE_LIMITS.counter);
  assert.equal(loaded.daily.orders, 0);
  assert.equal(loaded.gather.charges, 2);
  assert.equal(loaded.gather.lastRechargeAt, NOW);
  assert.equal(loaded.stats.legacyCounter, 11);
  assert.equal(loaded.stats.coinsEarned, game.SAVE_LIMITS.currency);
  const tonicOrder = loaded.orders.find(order => order.recipeId === "tonic" && !game.isAfterStarsOrder(order));
  assert.equal(tonicOrder.id, game.SAVE_LIMITS.counter);
  assert.equal(tonicOrder.reward, game.SAVE_LIMITS.currency);
  assert.equal(loaded.brew.assistUses, game.FINISH_BREW_CONFIG.maxUsesPerBrew);
  for (const value of [loaded.coins, loaded.xp, loaded.stardust, ...Object.values(loaded.ingredients), ...Object.values(loaded.potions), ...Object.values(loaded.mastery), loaded.daily.orders, loaded.gather.charges, ...Object.values(loaded.stats), tonicOrder.id, tonicOrder.reward, tonicOrder.xp, loaded.brew.startedAt, loaded.brew.endsAt, loaded.brew.durationMs, loaded.brew.assistUses]) {
    assert.ok(Number.isSafeInteger(value) && value >= 0, `unsafe normalized value: ${value}`);
  }
});

test("save XP normalization preserves reasonable overflow and caps extreme values", () => {
  const reasonable = game.defaultState(NOW);
  reasonable.xp = game.xpNeeded(1) + game.xpNeeded(2) + 7;
  assert.deepEqual(game.normalizeState(reasonable, NOW).level, 3);
  assert.equal(game.normalizeState(reasonable, NOW).xp, 7);

  const extreme = game.defaultState(NOW);
  extreme.xp = Number.MAX_SAFE_INTEGER;
  const loaded = game.normalizeState(extreme, NOW);
  assert.equal(loaded.level, game.SAVE_LIMITS.level);
  assert.ok(loaded.xp >= 0 && loaded.xp < game.xpNeeded(loaded.level));
});

test("maximum-level saves remain capped through collecting, delivering, and direct XP", () => {
  const saved = game.defaultState(NOW);
  saved.xp = Number.MAX_SAFE_INTEGER;
  const state = game.normalizeState(saved, NOW);
  const maxXp = game.xpNeeded(game.SAVE_LIMITS.level) - 1;
  assert.equal(state.level, game.SAVE_LIMITS.level);
  assert.equal(state.xp, maxXp);

  const coinsBeforeCollect = state.coins;
  assert.equal(game.startBrew(state, "tonic", NOW), true);
  const collected = game.collectBrew(state, NOW + 30000);
  assert.deepEqual(collected.levels, []);
  assert.equal(state.level, game.SAVE_LIMITS.level);
  assert.equal(state.xp, maxXp);
  assert.equal(state.coins, coinsBeforeCollect);

  state.orders = [{ id: 17, recipeId: "tonic", quantity: 1, reward: 20, xp: 9999 }];
  state.nextOrderId = 18;
  const coinsBeforeDelivery = state.coins;
  const delivered = game.fulfillOrder(state, 17, NOW + 30000, () => 0);
  assert.ok(delivered);
  assert.deepEqual(delivered.levels, []);
  assert.equal(state.level, game.SAVE_LIMITS.level);
  assert.equal(state.xp, maxXp);
  assert.equal(state.coins, coinsBeforeDelivery + delivered.reward);

  const coinsBeforeDirectXp = state.coins;
  assert.deepEqual(game.addXp(state, Number.MAX_SAFE_INTEGER), []);
  assert.equal(state.level, game.SAVE_LIMITS.level);
  assert.equal(state.xp, maxXp);
  assert.equal(state.coins, coinsBeforeDirectXp);
});

test("order IDs recover uniquely and continue without reuse across reloads", () => {
  const hostile = game.defaultState(NOW);
  hostile.orders = [
    { id: Number.MAX_SAFE_INTEGER, recipeId: "tonic", quantity: 1, reward: 20, xp: 1 },
    { id: Number.MAX_SAFE_INTEGER, recipeId: "tonic", quantity: 1, reward: 21, xp: 1 },
    { id: Number.MAX_SAFE_INTEGER, recipeId: "tonic", quantity: 1, reward: 22, xp: 1 },
  ];
  hostile.nextOrderId = Number.MAX_SAFE_INTEGER;
  const loaded = game.normalizeState(hostile, NOW);
  const initialIds = new Set(loaded.orders.map(order => order.id));
  assert.equal(initialIds.size, loaded.orders.length);
  assert.ok([...initialIds].every(id => id >= 1 && id <= game.SAVE_LIMITS.counter));
  assert.ok(!initialIds.has(loaded.nextOrderId));

  const fulfilledId = loaded.orders[0].id;
  loaded.potions.tonic = 1;
  assert.ok(game.fulfillOrder(loaded, fulfilledId, NOW, () => 0));
  const replacement = loaded.orders.find(order => !initialIds.has(order.id));
  assert.ok(replacement, "fulfillment generates a genuinely new safe order ID");
  assert.notEqual(replacement.id, fulfilledId);
  assert.equal(new Set(loaded.orders.map(order => order.id)).size, loaded.orders.length);
  assert.ok(!loaded.orders.some(order => order.id === loaded.nextOrderId));

  const reloaded = game.normalizeState(loaded, NOW);
  assert.equal(new Set(reloaded.orders.map(order => order.id)).size, reloaded.orders.length);
  assert.deepEqual(new Set(reloaded.orders.map(order => order.id)), new Set(loaded.orders.map(order => order.id)));
  assert.ok(!reloaded.orders.some(order => order.id === reloaded.nextOrderId));
});

test("coins earned uses the currency cap while action counters retain their counter cap", () => {
  const state = game.defaultState(NOW);
  state.stats = {
    taps: Number.MAX_SAFE_INTEGER,
    brewed: Number.MAX_SAFE_INTEGER,
    orders: Number.MAX_SAFE_INTEGER,
    coinsEarned: game.SAVE_LIMITS.counter + 12345,
    prestiges: Number.MAX_SAFE_INTEGER,
  };
  const loaded = game.normalizeState(state, NOW);
  assert.equal(loaded.stats.coinsEarned, game.SAVE_LIMITS.counter + 12345);
  assert.equal(loaded.stats.taps, game.SAVE_LIMITS.counter);
  assert.equal(loaded.stats.brewed, game.SAVE_LIMITS.counter);
  assert.equal(loaded.stats.orders, game.SAVE_LIMITS.counter);
  assert.equal(loaded.stats.prestiges, game.SAVE_LIMITS.counter);
});

test("save normalization clears only a known brew locked above the normalized level", () => {
  const state = game.defaultState(NOW - 1000);
  state.ingredients = { herb: 21, mushroom: 13, crystal: 8, mist: 4, ember: 2, mint: 0, lavender: 0 };
  state.potions.tonic = 3;
  state.mastery.tonic = 2;
  state.stats = { taps: 9, brewed: 2, orders: 1, coinsEarned: 99, prestiges: 0 };
  state.brew = { recipeId: "clarity", startedAt: NOW - 1000, endsAt: NOW + 65000, durationMs: 66000, assistUses: 1 };

  const loaded = game.normalizeState(state, NOW);
  assert.equal(loaded.level, 1);
  assert.equal(loaded.brew, null);
  assert.deepEqual(loaded.ingredients, state.ingredients);
  assert.equal(loaded.potions.tonic, 3);
  assert.equal(loaded.mastery.tonic, 2);
  assert.deepEqual(loaded.stats, state.stats);
});

test("an unlocked completed brew round-trips with its saved timing and assist use", () => {
  const state = game.defaultState(NOW - 100000);
  state.level = 2;
  state.brew = { recipeId: "clarity", startedAt: NOW - 100000, endsAt: NOW - 34000, durationMs: 66000, assistUses: 1 };
  const loaded = game.normalizeState(state, NOW);
  assert.deepEqual(loaded.brew, state.brew);
  assert.ok(game.collectBrew(loaded, NOW));
  assert.equal(loaded.potions.clarity, 1);
});

test("ingredient additions stop exactly at the storage cap", () => {
  const state = game.defaultState(NOW);
  state.ingredients = { herb: 59, mushroom: 0, crystal: 0, mist: 0, ember: 0, mint: 0, lavender: 0 };
  assert.equal(game.addRandomIngredients(state, 50, () => 0), 1);
  assert.equal(game.totalIngredients(state), 60);
  const corrupt = { ...state, ingredients: { herb: 1000, mushroom: 1000, crystal: 1000, mist: 1000, ember: 1000, mint: 1000, lavender: 1000 } };
  assert.equal(game.totalIngredients(game.normalizeState(corrupt, NOW)), 60);
});

test("daily reward is idempotent", () => {
  const state = game.defaultState(NOW); state.daily.orders = 5;
  assert.ok(game.claimDaily(state, NOW));
  assert.equal(game.claimDaily(state, NOW), false);
  assert.equal(state.coins, 80); assert.equal(state.stardust, 1); assert.equal(state.stats.coinsEarned, 50);
  assert.equal(state.commissions.invitations, 1);
  state.daily = { date: game.todayKey(NOW + 86400000), orders: 5, claimed: false };
  state.commissions.invitations = 12;
  assert.ok(game.claimDaily(state, NOW + 86400000));
  assert.equal(state.commissions.invitations, 12, "daily invitations cannot exceed unfinished requests");
  state.daily = { date: game.todayKey(NOW + 2 * 86400000), orders: 5, claimed: false };
  state.commissions.completedIds = game.SIGNATURE_COMMISSIONS.map(item => item.id);
  assert.ok(game.claimDaily(state, NOW + 2 * 86400000));
  assert.equal(state.commissions.invitations, 0, "finishing the collection grants currencies but no invitation");
  assert.equal(state.coins, 180); assert.equal(state.stardust, 3);
});

test("daily rollover resets before a post-midnight delivery", () => {
  const yesterday = NOW;
  const midnight = NOW + 86400000;
  const state = game.defaultState(yesterday);
  state.daily.orders = 4;
  state.orders = [{ id: 1, customerId: "customer-0", customer: game.CUSTOMERS[0][0], recipeId: "tonic", quantity: 1, reward: 20, xp: 1 }];
  state.potions.tonic = 1;
  assert.ok(game.fulfillOrder(state, 1, midnight, () => 0));
  assert.deepEqual(state.daily, { date: game.todayKey(midnight), orders: 1, claimed: false });
});

test("stale daily completion cannot be claimed after rollover", () => {
  const state = game.defaultState(NOW);
  state.daily.orders = 5;
  const coins = state.coins, stardust = state.stardust, invitations = state.commissions.invitations;
  assert.equal(game.claimDaily(state, NOW + 86400000), false);
  assert.deepEqual(state.daily, { date: game.todayKey(NOW + 86400000), orders: 0, claimed: false });
  assert.equal(state.coins, coins); assert.equal(state.stardust, stardust); assert.equal(state.commissions.invitations, invitations);
});

test("same-day daily delivery and claim behavior is unchanged", () => {
  const state = game.defaultState(NOW);
  state.daily.orders = 4;
  state.orders = [{ id: 1, customerId: "customer-0", customer: game.CUSTOMERS[0][0], recipeId: "tonic", quantity: 1, reward: 20, xp: 1 }];
  state.potions.tonic = 1;
  assert.ok(game.fulfillOrder(state, 1, NOW, () => 0));
  assert.equal(state.daily.orders, 5);
  assert.ok(game.claimDaily(state, NOW));
  assert.equal(state.daily.claimed, true);
});

test("foreground rollover refreshes and schedules once, then stays quiet", () => {
  const state = game.defaultState(NOW);
  let renders = 0, saveSchedules = 0;
  const refresh = () => { renders += 1; saveSchedules += 1; };
  assert.equal(game.foregroundDailyTransition(state, NOW + 86400000, true, refresh), true);
  assert.equal(game.foregroundDailyTransition(state, NOW + 86400000, true, refresh), false);
  assert.equal(game.foregroundDailyTransition(state, NOW - 86400000, true, refresh), false);
  assert.equal(renders, 1);
  assert.equal(saveSchedules, 1);
});

test("stale claim orchestration rolls over before checking eligibility", () => {
  const state = game.defaultState(NOW);
  state.daily.orders = 5;
  const before = { coins: state.coins, stardust: state.stardust, invitations: state.commissions.invitations };
  let renders = 0, saveSchedules = 0;
  const refresh = () => { renders += 1; saveSchedules += 1; };
  const claimFromBrowser = now => {
    if (game.foregroundDailyTransition(state, now, true, refresh)) return false;
    return game.claimDaily(state, now);
  };
  assert.equal(claimFromBrowser(NOW + 86400000), false);
  assert.deepEqual(state.daily, { date: game.todayKey(NOW + 86400000), orders: 0, claimed: false });
  assert.deepEqual({ coins: state.coins, stardust: state.stardust, invitations: state.commissions.invitations }, before);
  assert.equal(renders, 1);
  assert.equal(saveSchedules, 1);
});

test("foreground transition seam is the tick boundary", () => {
  const state = game.defaultState(NOW);
  const tickAt = now => game.foregroundDailyTransition(state, now, true, () => {});
  assert.equal(tickAt(NOW + 86400000), true);
  assert.equal(state.daily.date, game.todayKey(NOW + 86400000));
  assert.equal(tickAt(NOW + 86400000 + 1000), false);
  assert.equal(tickAt(NOW - 86400000), false);
});

test("recipe mastery has bounded milestones and raises only matching order value", () => {
  const state = game.defaultState(NOW);
  state.mastery.tonic = 3;
  assert.deepEqual(game.recipeMasteryProgress(state, "tonic"), { count: 3, rank: 1, next: 8 });
  assert.equal(game.orderMultiplier(state, NOW, "tonic"), 1.04);
  assert.equal(game.orderMultiplier(state, NOW, "clarity"), 1);
  state.mastery.tonic = 999;
  assert.deepEqual(game.recipeMasteryProgress(state, "tonic"), { count: 999, rank: 3, next: null });
});

test("recurring customers gain trust and grant a deterministic non-blocking favor", () => {
  const state = game.defaultState(NOW);
  state.customers["customer-0"] = { deliveries: 2, hearts: 0 };
  state.orders = [{ id: 1, customerId: "customer-0", customer: game.CUSTOMERS[0][0], recipeId: "tonic", quantity: 1, reward: 20, xp: 1 }];
  state.nextOrderId = 2; state.potions.tonic = 1;
  const result = game.fulfillOrder(state, 1, NOW, () => 0);
  assert.equal(result.customerBonus, game.CUSTOMER_CONFIG.heartBonusCoins);
  assert.equal(result.reward, 20 + game.CUSTOMER_CONFIG.heartBonusCoins);
  assert.deepEqual(state.customers["customer-0"], { deliveries: 3, hearts: 1 });
  assert.deepEqual(result.narrative, { customerId: "customer-0", fromHearts: 0, toHearts: 1, kicker: "MIRA · FIRST TRUST HEART", title: "A warmer morning", body: "Mira leaves a warm bun beside your coins. \"Mornings are kinder with a friend.\"", footer: "1 of 3 trust hearts · New story ready in Journal" });
  assert.equal(game.journalClaimableCounts(state).story, 1);
  assert.equal(game.customerStoryStatus(state, "customer-0", 0).read, false);
});

test("Mira's narrative pilot is transition-only and preserves shared fulfillment results", () => {
  const deliver = (customerId, deliveries, hearts, extra = {}) => {
    const state = game.defaultState(NOW);
    state.customers[customerId] = { deliveries, hearts };
    state.orders = [{ id: 1, customerId, customer: game.CUSTOMERS[Number(customerId.slice(9))][0], recipeId: "tonic", quantity: 1, reward: 20, xp: 1 }];
    state.nextOrderId = 2;
    state.potions.tonic = extra.ready === false ? 0 : 1;
    return { state, result: game.fulfillOrder(state, 1, NOW, () => 0) };
  };
  assert.equal(deliver("customer-0", 1, 0).result.narrative, null, "Mira needs the third delivery");
  assert.equal(deliver("customer-0", 3, 1).result.narrative, null, "later hearts cannot replay the pilot");
  assert.equal(deliver("customer-1", 2, 0).result.narrative, null, "other villagers are ineligible");
  assert.equal(deliver("customer-0", 2, 0, { ready: false }).result, null, "failed deliveries have no payload");
  const replay = deliver("customer-0", 2, 0);
  assert.equal(game.fulfillOrder(replay.state, 1, NOW, () => 0), null, "a repeated order ID cannot replay the pilot");

  const commissionState = game.defaultState(NOW);
  commissionState.commissions.invitations = 1;
  const commissionOrder = game.selectSignatureCommission(commissionState, "mira-dawn");
  commissionState.customers["customer-0"] = { deliveries: 2, hearts: 0 };
  commissionState.potions.tonic = 1;
  const commissionResult = game.fulfillOrder(commissionState, commissionOrder.id, NOW, () => 0);
  assert.equal(commissionResult.commission.id, "mira-dawn");
  assert.ok(commissionResult.narrative, "a special request retains its completion result and adds the pilot");

  const afterStarsState = game.defaultState(NOW);
  afterStarsState.stats.prestiges = 1;
  game.ensureOrders(afterStarsState, () => 0);
  const afterStarsOrder = afterStarsState.orders.find(game.isAfterStarsOrder);
  afterStarsState.customers["customer-0"] = { deliveries: 2, hearts: 0 };
  afterStarsState.potions.tonic = 1;
  const afterStarsResult = game.fulfillOrder(afterStarsState, afterStarsOrder.id, NOW, () => 0);
  assert.deepEqual(afterStarsResult.afterStars, { step: 0, title: "The Oven Remembers", complete: false });
  assert.ok(afterStarsResult.narrative, "a post-rebirth After the Stars delivery remains eligible");

  const rebirthState = game.defaultState(NOW);
  rebirthState.level = game.PRESTIGE_CONFIG.unlockLevel;
  rebirthState.customers["customer-0"] = { deliveries: 3, hearts: 1 };
  const reborn = game.performPrestige(rebirthState, 3, NOW);
  assert.deepEqual(reborn.customers["customer-0"], { deliveries: 3, hearts: 1 }, "rebirth preserves the already-earned first heart instead of replaying a delivery result");
  assert.equal(Object.hasOwn(reborn, "narrative"), false, "rebirth alone cannot produce a fulfillment payload");
});

test("all villagers have three distinct trust stories and deterministic request variety", () => {
  assert.equal(game.CUSTOMERS.length, 12);
  assert.equal(game.CUSTOMER_CONTENT.length, game.CUSTOMERS.length);
  for (let index = 0; index < game.CUSTOMERS.length; index += 1) {
    const content = game.CUSTOMER_CONTENT[index];
    assert.equal(content.stories.length, 3);
    assert.equal(new Set(content.stories).size, 3);
    assert.equal(content.orderLines.length, 3);
    assert.equal(new Set(content.orderLines).size, 3);
    const customerId = `customer-${index}`;
    const firstPass = [1, 2, 3].map(id => game.customerOrderLine(customerId, id, "tonic", 1));
    const secondPass = [1, 2, 3].map(id => game.customerOrderLine(customerId, id, "tonic", 1));
    assert.deepEqual(firstPass, secondPass);
    assert.equal(new Set(firstPass).size, 3);
  }
});

test("journal stories unlock from trust and safely record read state", () => {
  const state = game.defaultState(NOW);
  state.customers["customer-0"] = { deliveries: 6, hearts: 2 };
  assert.equal(game.customerStoryStatus(state, "customer-0", 0).unlocked, true);
  assert.equal(game.customerStoryStatus(state, "customer-0", 1).unlocked, true);
  assert.equal(game.customerStoryStatus(state, "customer-0", 2).unlocked, false);
  assert.equal(game.markJournalRead(state, "story", "customer-0:3"), false);
  assert.equal(game.markJournalRead(state, "story", "customer-0:2"), true);
  assert.equal(game.customerStoryStatus(state, "customer-0", 1).read, true);
  assert.equal(game.markJournalRead(state, "story", "not-a-story"), false);
});

test("all recipe lore unlocks from existing discovery without changing gameplay", () => {
  assert.equal(Object.keys(game.RECIPE_LORE).length, game.RECIPES.length);
  const state = game.defaultState(NOW);
  const before = { coins: state.coins, xp: state.xp, ingredients: structuredClone(state.ingredients), potions: structuredClone(state.potions) };
  for (const recipe of game.RECIPES) {
    assert.ok(game.RECIPE_LORE[recipe.id]);
    assert.equal(game.recipeLoreStatus(state, recipe.id).unlocked, false);
    state.discovery.delivered[recipe.id] = 1;
    assert.equal(game.recipeLoreStatus(state, recipe.id).unlocked, true);
    assert.equal(game.markJournalRead(state, "recipe", recipe.id), true);
    assert.equal(game.recipeLoreStatus(state, recipe.id).read, true);
  }
  assert.deepEqual({ coins: state.coins, xp: state.xp, ingredients: state.ingredients, potions: state.potions }, before);
});

test("expanded potion book adds exactly one ingredient and four authored recipes across levels four to seven", () => {
  const expansionIds = ["lantern", "quiet", "way", "aurora"];
  assert.equal(Object.keys(game.INGREDIENTS).length, 7);
  assert.equal(game.INGREDIENTS.mint.unlock, 4);
  assert.equal(game.RECIPES.length, 12);
  assert.deepEqual(expansionIds.map(id => game.recipeById(id).unlock), [4, 5, 6, 7]);
  for (const id of expansionIds) {
    const recipe = game.recipeById(id);
    assert.ok(recipe.name && recipe.description && game.RECIPE_LORE[id]);
    assert.ok(recipe.ingredients.mint > 0, `${id} should make Frostmint useful`);
    assert.ok(recipe.seconds > 0 && recipe.sell > 0);
  }
  assert.equal(game.PRESTIGE_CONFIG.unlockLevel, 7);
  assert.deepEqual([4, 5, 6, 7].map(level => game.unlocksAtLevel(level).recipes.filter(recipe => expansionIds.includes(recipe.id)).map(recipe => recipe.id)), [["lantern"], ["quiet"], ["way"], ["aurora"]]);
  assert.equal(game.unlocksAtLevel(4).ingredients.some(item => item.name === "Frostmint"), true);
});

test("new recipes participate in brewing, mastery, discovery, and eligible orders", () => {
  const state = game.defaultState(NOW);
  state.level = 4;
  Object.assign(state.ingredients, game.recipeById("lantern").ingredients);
  assert.equal(game.setGatherTarget(state, "mint"), true);
  assert.equal(game.startBrew(state, "lantern", NOW), true);
  const result = game.collectBrew(state, NOW + game.recipeById("lantern").seconds * 1000);
  assert.equal(result.recipe.id, "lantern");
  assert.equal(state.potions.lantern, 1);
  assert.equal(state.mastery.lantern, 1);
  assert.equal(state.discovery.brewed.lantern, 1);
  assert.equal(game.recipeLoreStatus(state, "lantern").unlocked, true);

  const generated = new Set();
  for (let index = 0; index < 100; index += 1) generated.add(game.generateOrder(state, () => (index % 97) / 97).recipeId);
  assert.equal(generated.has("lantern"), true);
  assert.equal([...generated].some(id => game.recipeById(id).unlock > state.level), false);
});

test("Frostmint participates in smart passive and offline gathering after unlock", () => {
  const state = game.defaultState(NOW);
  state.level = 4;
  state.ingredients = Object.fromEntries(Object.keys(game.INGREDIENTS).map(id => [id, 0]));
  state.stats.orders = 1;
  assert.equal(game.grantPassiveIngredients(state, 1, () => .999999), 1);
  assert.equal(state.ingredients.mint, 1);
  state.ingredients = Object.fromEntries(Object.keys(game.INGREDIENTS).map(id => [id, 0]));
  assert.equal(game.grantOfflineIngredients(state, 63, () => .999999), 1);
  assert.equal(state.ingredients.mint, 1);
});

test("Potion Sampler remains the durable original-eight Mooncloth goal", () => {
  const state = game.defaultState(NOW);
  for (const id of game.SAMPLER_IDS) state.mastery[id] = 1;
  assert.deepEqual(game.collectionGoalProgress(state, "sampler"), { current: 8, target: 8 });
  assert.equal(state.mastery.lantern, 0);
  assert.equal(state.mastery.quiet, 0);
  assert.equal(state.mastery.way, 0);
  assert.equal(state.mastery.aurora, 0);
  assert.equal(game.cosmeticUnlocked(state, "mooncloth"), true);
  state.customization.selected = "mooncloth";
  assert.equal(game.normalizeState(state, NOW).customization.selected, "mooncloth");
});

test("version-three and malformed saves zero new content keys without losing prior progress", () => {
  const existing = game.defaultState(NOW - 1000);
  existing.version = 3;
  existing.coins = 345;
  existing.mastery.tonic = 8;
  existing.discovery.brewed.tonic = 4;
  delete existing.ingredients.mint;
  for (const id of ["lantern", "quiet", "way", "aurora"]) {
    delete existing.potions[id];
    delete existing.mastery[id];
    delete existing.discovery.brewed[id];
    delete existing.discovery.delivered[id];
  }
  existing.potions.unknown = 99;
  existing.mastery.lantern = "broken";
  existing.discovery.delivered.aurora = -50;
  const loaded = game.normalizeState(existing, NOW);
  assert.equal(loaded.coins, 345);
  assert.equal(loaded.mastery.tonic, 8);
  assert.equal(loaded.discovery.brewed.tonic, 4);
  assert.equal(loaded.ingredients.mint, 0);
  for (const id of ["lantern", "quiet", "way", "aurora"]) {
    assert.equal(loaded.potions[id], 0);
    assert.equal(loaded.mastery[id], 0);
    assert.equal(loaded.discovery.brewed[id], 0);
    assert.equal(loaded.discovery.delivered[id], 0);
  }
  assert.equal("unknown" in loaded.potions, false);
});

test("malformed journal state normalizes to known unique content ids", () => {
  const state = game.defaultState(NOW);
  state.achievements = { firstBrew: NOW, orderFive: "invalid", unknown: NOW };
  state.journal = { readStories: ["customer-0:1", "customer-0:1", "customer-99:3", null], readRecipes: ["tonic", "tonic", "unknown", {}], claimedAchievements: ["firstBrew", "firstBrew", "unknown", null] };
  const loaded = game.normalizeState(state, NOW);
  assert.deepEqual(loaded.achievements, { firstBrew: NOW });
  assert.deepEqual(loaded.journal, { readStories: ["customer-0:1"], readRecipes: ["tonic"], claimedAchievements: ["firstBrew"] });
  const recovered = game.normalizeState({ ...state, journal: "broken" }, NOW);
  assert.deepEqual(recovered.journal, { readStories: [], readRecipes: [], claimedAchievements: [] });
});

test("journal rewards are bounded, one-time, and clear their claimable counts", () => {
  const state = game.defaultState(NOW);
  state.customers["customer-0"] = { deliveries: 3, hearts: 1 };
  state.discovery.brewed.tonic = 1;
  state.achievements.firstBrew = NOW;
  const before = { coins: state.coins, earned: state.stats.coinsEarned };
  assert.deepEqual(game.journalClaimableCounts(state), { story: 1, recipe: 1, achievement: 1, total: 3 });
  assert.deepEqual(game.claimJournalReward(state, "story", "customer-0:1"), { kind: "story", id: "customer-0:1", reward: 5 });
  assert.equal(game.claimJournalReward(state, "story", "customer-0:1"), null);
  assert.deepEqual(game.claimJournalReward(state, "recipe", "tonic"), { kind: "recipe", id: "tonic", reward: 5 });
  assert.equal(game.claimJournalReward(state, "recipe", "tonic"), null);
  assert.deepEqual(game.claimJournalReward(state, "achievement", "firstBrew"), { kind: "achievement", id: "firstBrew", reward: 10 });
  assert.equal(game.claimJournalReward(state, "achievement", "firstBrew"), null);
  assert.equal(game.claimJournalReward(state, "story", "customer-0:2"), null);
  assert.equal(game.claimJournalReward(state, "recipe", "unknown"), null);
  assert.equal(game.claimJournalReward(state, "achievement", "unknown"), null);
  assert.deepEqual(game.journalClaimableCounts(state), { story: 0, recipe: 0, achievement: 0, total: 0 });
  assert.equal(state.coins, before.coins + 20);
  assert.equal(state.stats.coinsEarned, before.earned + 20);
});

test("the complete Journal has a fixed 320-coin lifetime reward ceiling", () => {
  const state = game.defaultState(NOW);
  for (let index = 0; index < game.CUSTOMERS.length; index += 1) state.customers[`customer-${index}`] = { deliveries: 9, hearts: 3 };
  for (const recipe of game.RECIPES) state.discovery.brewed[recipe.id] = 1;
  for (const achievement of game.ACHIEVEMENTS) state.achievements[achievement.id] = NOW;
  const before = state.coins;
  for (let customer = 0; customer < game.CUSTOMERS.length; customer += 1) {
    for (let story = 1; story <= 3; story += 1) assert.ok(game.claimJournalReward(state, "story", `customer-${customer}:${story}`));
  }
  for (const recipe of game.RECIPES) assert.ok(game.claimJournalReward(state, "recipe", recipe.id));
  for (const achievement of game.ACHIEVEMENTS) assert.ok(game.claimJournalReward(state, "achievement", achievement.id));
  assert.equal(state.coins - before, 320);
  assert.deepEqual(game.journalClaimableCounts(state), { story: 0, recipe: 0, achievement: 0, total: 0 });
});

test("prestige opens with the final recipe and preserves durable goals plus the daily boundary", () => {
  const state = game.defaultState(NOW);
  state.level = game.PRESTIGE_CONFIG.unlockLevel;
  state.stardust = 2; state.daily = { date: game.todayKey(NOW), orders: 5, claimed: true };
  state.mastery.tonic = 8; state.customers["customer-0"] = { deliveries: 4, hearts: 1 };
  state.journal = { readStories: ["customer-0:1"], readRecipes: ["tonic"], claimedAchievements: ["firstBrew"] };
  assert.ok(game.unlocksAtLevel(state.level).recipes.length > 0, "prestige level must also unlock content");
  assert.equal(game.prestigeReward(state), 3);
  const next = game.performPrestige(state, undefined, NOW + 1000);
  assert.equal(next.level, 1); assert.equal(next.stardust, 5);
  assert.equal(next.mastery.tonic, 8); assert.deepEqual(next.customers["customer-0"], { deliveries: 4, hearts: 1 });
  assert.deepEqual(next.journal, state.journal);
  assert.deepEqual(next.daily, state.daily); assert.equal(game.claimDaily(next, NOW + 1000), false, "rebirth cannot reclaim today's reward");
  assert.equal(next.stats.prestiges, 1); assert.equal(game.cosmeticUnlocked(next, "starglass"), true);
  assert.equal(game.beginnerQuest(next, NOW + 1000), null, "rebirth cannot restart First Steps");
  assert.deepEqual(next.weekly, state.weekly); assert.deepEqual(next.customization, state.customization);
});

test("daily reset uses a monotonic saved date across alternating clock changes", () => {
  const state = game.defaultState(NOW);
  state.daily.orders = 5;
  assert.ok(game.claimDaily(state, NOW));
  const firstDate = state.daily.date;
  assert.equal(game.resetDailyIfNeeded(state, NOW - 86400000), false);
  assert.deepEqual(state.daily, { date: firstDate, orders: 5, claimed: true }, "clock rollback cannot reopen the saved date");

  assert.equal(game.resetDailyIfNeeded(state, NOW + 86400000), true);
  const laterDate = game.todayKey(NOW + 86400000);
  assert.deepEqual(state.daily, { date: laterDate, orders: 0, claimed: false }, "a genuinely later local date opens one fresh goal");
  state.daily.orders = 5;
  assert.ok(game.claimDaily(state, NOW + 86400000));
  assert.equal(game.resetDailyIfNeeded(state, NOW - 86400000), false);
  assert.equal(game.resetDailyIfNeeded(state, NOW + 86400000), false);
  assert.deepEqual(state.daily, { date: laterDate, orders: 5, claimed: true }, "alternating backward and forward to the saved high-water date cannot reissue rewards");
  assert.equal(state.coins, 130);
  assert.equal(state.stardust, 2);
});

test("rolling weekly chains ignore calendar time, never expire progress, and cap rewards", () => {
  const state = game.defaultState(NOW);
  const deliverAt = now => {
    state.orders = [{ id: state.nextOrderId++, customerId: "customer-0", customer: game.CUSTOMERS[0][0], recipeId: "tonic", quantity: 1, reward: 20, xp: 1 }];
    state.potions.tonic = 1;
    assert.ok(game.fulfillOrder(state, state.orders[0].id, now, () => 0));
  };
  deliverAt(NOW + 365 * 86400000);
  deliverAt(NOW - 365 * 86400000);
  assert.equal(game.weeklyChainStatus(state).progress, 2, "forward and rollback clocks only record validated deliveries");
  assert.equal(game.weeklyChainStatus(state).ready, true);
  const before = state.coins;
  assert.deepEqual(game.claimWeeklyStep(state), { reward: 10, chainCompleted: false, cycle: 0 });
  assert.equal(state.coins, before + 10);
  assert.equal(game.claimWeeklyStep(state), null, "a parcel cannot be claimed twice");

  while (!game.weeklyChainStatus(state).complete) {
    const status = game.weeklyChainStatus(state);
    while (!game.weeklyChainStatus(state).ready) deliverAt(NOW);
    game.claimWeeklyStep(state);
    assert.ok(state.weekly.cycle > status.cycle || state.weekly.claimedSteps > status.claimedSteps);
  }
  assert.equal(state.weekly.cycle, game.WEEKLY_CHAINS.length);
  assert.equal(game.recordWeeklyDelivery(state), false);
  assert.equal(game.claimWeeklyStep(state), null);
});

test("malformed fully claimed weekly state advances to a reachable next chain", () => {
  const state = game.defaultState(NOW);
  state.weekly = { cycle: 0, progress: 6, claimedSteps: 3 };
  const normalized = game.normalizeState(state, NOW);
  assert.deepEqual(normalized.weekly, { cycle: 1, progress: 0, claimedSteps: 0 });
  game.recordWeeklyDelivery(normalized);
  game.recordWeeklyDelivery(normalized);
  assert.equal(game.weeklyChainStatus(normalized).ready, true);
  assert.deepEqual(game.claimWeeklyStep(normalized), { reward: 10, chainCompleted: false, cycle: 1 });
});

test("all villagers have one distinct authored signature commission and keepsake", () => {
  assert.equal(game.SIGNATURE_COMMISSIONS.length, game.CUSTOMERS.length);
  assert.equal(new Set(game.SIGNATURE_COMMISSIONS.map(item => item.id)).size, game.CUSTOMERS.length);
  assert.equal(new Set(game.SIGNATURE_COMMISSIONS.map(item => item.customerId)).size, game.CUSTOMERS.length);
  assert.equal(new Set(game.SIGNATURE_COMMISSIONS.map(item => item.title)).size, game.CUSTOMERS.length);
  assert.equal(new Set(game.SIGNATURE_COMMISSIONS.map(item => item.keepsake.name)).size, game.CUSTOMERS.length);
  assert.equal(new Set(game.SIGNATURE_COMMISSIONS.map(item => item.keepsake.mark)).size, game.CUSTOMERS.length);
  for (const commission of game.SIGNATURE_COMMISSIONS) {
    assert.ok(game.recipeById(commission.recipeId));
    assert.ok(commission.request.length >= 20);
    assert.ok(commission.keepsake.description.length >= 20);
  }
});

test("special-request choices include every unfinished request with an unlocked potion", () => {
  const state = game.defaultState(NOW);
  state.level = 1;
  game.ensureOrders(state, () => 0);
  assert.deepEqual(game.refreshCommissionChoices(state).map(item => item.id), ["mira-dawn"], "no prior random delivery is required");
  state.level = 3;
  const choices = game.refreshCommissionChoices(state);
  assert.ok(choices.some(item => item.id === "moss-rainpath"));
  state.commissions.completedIds.push("moss-rainpath");
  assert.ok(!game.refreshCommissionChoices(state).some(item => item.id === "moss-rainpath"));
});

test("choosing a special request consumes one invitation and preserves normal delivery rules", () => {
  const state = game.defaultState(NOW);
  state.level = 7;
  game.ensureOrders(state, () => 0);
  assert.equal(game.selectSignatureCommission(state, "mira-dawn"), null, "an earned invitation is required");
  state.commissions.invitations = 2;
  const chosen = game.selectSignatureCommission(state, "mira-dawn");
  assert.equal(chosen.commissionId, "mira-dawn");
  assert.equal(state.commissions.invitations, 1);
  assert.equal(state.orders.length, 3);
  assert.equal(state.orders.filter(game.isSignatureOrder).length, 1);
  assert.equal(state.orders.filter(order => !game.isSignatureOrder(order)).length, 2);
  assert.equal(game.selectSignatureCommission(state, "moss-rainpath"), null, "only one request may be active");
  assert.equal(state.commissions.invitations, 1, "a rejected selection cannot consume an invitation");
  state.daily.orders = 5;
  assert.ok(game.claimDaily(state, NOW));
  assert.equal(state.commissions.invitations, 2, "a daily invitation waits safely behind an active request");
  const before = { coins: state.coins, orders: state.stats.orders, daily: state.daily.orders, weekly: state.weekly.progress, delivered: state.discovery.delivered.tonic };
  state.potions.tonic = 1;
  const result = game.fulfillOrder(state, chosen.id, NOW, () => 0);
  assert.equal(result.commission.id, "mira-dawn");
  assert.equal(result.customerBonus, 0);
  assert.equal(result.reward, Math.round(chosen.reward * game.orderMultiplier(state, NOW, "tonic")));
  assert.equal(state.coins, before.coins + result.reward);
  assert.equal(state.stats.orders, before.orders + 1);
  assert.equal(state.daily.orders, before.daily + 1);
  assert.equal(state.weekly.progress, before.weekly + 1);
  assert.equal(state.discovery.delivered.tonic, before.delivered + 1);
  assert.deepEqual(state.commissions.completedIds, ["mira-dawn"]);
  assert.equal(state.commissions.selectedId, null);
  assert.equal(game.fulfillOrder(state, chosen.id, NOW, () => 0), null, "signature payout cannot repeat");
  assert.equal(state.orders.filter(game.isSignatureOrder).length, 0);
  assert.equal(state.orders.filter(order => !game.isSignatureOrder(order)).length, 3);
});

test("special-request invitations normalize safely and survive dates, reload, and prestige", () => {
  const malformed = game.defaultState(NOW);
  malformed.level = 7;
  malformed.commissions = { invitations: 999, selectedId: "unknown", completedIds: ["juniper-encore", "juniper-encore", "bad"] };
  malformed.orders = [{ id: 90, commissionId: "mira-dawn", customerId: "customer-3", recipeId: "tonic", quantity: 1, reward: 999, xp: 1 }];
  const normalized = game.normalizeState(malformed, NOW);
  assert.deepEqual(normalized.commissions, { invitations: 11, selectedId: null, completedIds: ["juniper-encore"] });
  assert.equal(normalized.orders.some(game.isSignatureOrder), false);
  const reloaded = game.parseSave(JSON.stringify(normalized), NOW + 1000).state;
  game.resetDailyIfNeeded(reloaded, NOW + 86400000);
  game.resetDailyIfNeeded(reloaded, NOW - 86400000);
  assert.equal(reloaded.commissions.invitations, 11);

  const state = reloaded;
  state.level = game.PRESTIGE_CONFIG.unlockLevel;
  state.commissions.completedIds = ["mira-dawn", "moss-rainpath"];
  state.commissions.selectedId = "juniper-encore";
  state.commissions.invitations = 4;
  const reborn = game.performPrestige(state, 3, NOW + 1000);
  assert.deepEqual(reborn.commissions, { invitations: 4, selectedId: null, completedIds: ["mira-dawn", "moss-rainpath"] });
  assert.equal(reborn.orders.length, 0);
});

test("completion cards stay readable before fading and reduced motion skips only the fade", () => {
  const shownAt = NOW;
  assert.equal(game.completionCardPhase(shownAt, shownAt + 2999), "readable");
  assert.equal(game.completionCardPhase(shownAt, shownAt + 3000), "fading");
  assert.equal(game.completionCardPhase(shownAt, shownAt + 3000, true), "hidden");
  assert.equal(game.completionCardPhase(shownAt, shownAt + 3300), "hidden");
});

test("collection cosmetics are few, durable, and have no economy effects", () => {
  const state = game.defaultState(NOW);
  const baseline = { order: game.orderMultiplier(state, NOW, "tonic"), brew: game.brewSpeedMultiplier(state), gather: game.manualGatherAmount(state) };
  state.stats.brewed = 10;
  assert.equal(game.cosmeticUnlocked(state, "fern"), true);
  assert.equal(game.selectCosmetic(state, "fern"), true);
  assert.equal(game.selectCosmetic(state, "mooncloth"), false);
  assert.deepEqual({ order: game.orderMultiplier(state, NOW, "tonic"), brew: game.brewSpeedMultiplier(state), gather: game.manualGatherAmount(state) }, baseline);
  Object.keys(state.mastery).forEach(id => { state.mastery[id] = game.MASTERY_CONFIG.thresholds.at(-1); });
  state.stats.prestiges = 1;
  state.weekly.cycle = 1;
  state.commissions.completedIds = game.SIGNATURE_COMMISSIONS.map(commission => commission.id);
  state.afterStars.step = game.AFTER_STARS_STEPS.length;
  const visualStates = {};
  for (const cosmetic of game.COSMETICS) {
    assert.equal(game.selectCosmetic(state, cosmetic.id), true);
    visualStates[cosmetic.id] = game.workshopDecorationState(state);
  }
  assert.deepEqual(visualStates.midnight, { selected: "midnight", keepsake: false, ribbon: false, dawnthread: false, masterwork: false });
  assert.deepEqual(visualStates.starglass, { selected: "starglass", keepsake: true, ribbon: false, dawnthread: false, masterwork: false });
  assert.deepEqual(visualStates.guild, { selected: "guild", keepsake: false, ribbon: true, dawnthread: false, masterwork: false });
  assert.equal(new Set(Object.values(visualStates).map(visual => JSON.stringify(visual))).size, game.COSMETICS.length, "each advertised selection yields a distinct reversible visual state");
  assert.equal(game.selectCosmetic(state, "midnight"), true);
  assert.equal(game.selectCosmetic(state, "midnight"), false, "selecting the current look is a no-op");
  const reloaded = game.normalizeState(state, NOW);
  assert.equal(reloaded.customization.selected, "midnight");
  assert.ok(game.COSMETICS.length <= 8);
});

test("Twelvefold Mastery unlocks only at the twelfth rank-three recipe and stays cosmetic", () => {
  const state = game.defaultState(NOW);
  const goal = game.COLLECTION_GOALS.find(item => item.id === "mastery");
  const maxCount = game.MASTERY_CONFIG.thresholds.at(-1);
  const rankTwoCount = game.MASTERY_CONFIG.thresholds.at(-2);
  assert.deepEqual(goal, { id: "mastery", name: "Twelvefold Mastery", target: game.RECIPES.length, cosmeticId: "masterwork" });
  assert.deepEqual(game.collectionGoalProgress(state, "mastery"), { current: 0, target: 12 });
  state.mastery.tonic = rankTwoCount;
  assert.deepEqual(game.collectionGoalProgress(state, "mastery"), { current: 0, target: 12 });
  state.mastery.tonic = maxCount;
  assert.deepEqual(game.collectionGoalProgress(state, "mastery"), { current: 1, target: 12 });
  assert.equal(game.cosmeticUnlocked(state, "masterwork"), false);
  state.mastery.tonic = "malformed";
  assert.deepEqual(game.collectionGoalProgress(state, "mastery"), { current: 0, target: 12 });
  game.RECIPES.forEach(recipe => { state.mastery[recipe.id] = maxCount; });
  state.mastery.aurora = maxCount - 1;
  assert.deepEqual(game.collectionGoalProgress(state, "mastery"), { current: 11, target: 12 });
  assert.equal(game.cosmeticUnlocked(state, "masterwork"), false);
  assert.equal(game.selectCosmetic(state, "masterwork"), false);
  state.mastery.aurora = maxCount;
  assert.deepEqual(game.collectionGoalProgress(state, "mastery"), { current: 12, target: 12 });
  assert.equal(game.cosmeticUnlocked(state, "masterwork"), true);
  const baseline = { coins: state.coins, xp: state.xp, stardust: state.stardust, order: game.orderMultiplier(state, NOW, "tonic"), brew: game.brewSpeedMultiplier(state), gather: game.manualGatherAmount(state) };
  assert.equal(game.selectCosmetic(state, "masterwork"), true);
  assert.deepEqual(game.workshopDecorationState(state), { selected: "masterwork", keepsake: false, ribbon: false, dawnthread: false, masterwork: true });
  assert.deepEqual({ coins: state.coins, xp: state.xp, stardust: state.stardust, order: game.orderMultiplier(state, NOW, "tonic"), brew: game.brewSpeedMultiplier(state), gather: game.manualGatherAmount(state) }, baseline);
  assert.equal(game.selectCosmetic(state, "midnight"), true);
  assert.equal(game.selectCosmetic(state, "masterwork"), true);
  const reloaded = game.normalizeState(state, NOW + 1);
  assert.equal(reloaded.customization.selected, "masterwork");
  const forged = game.defaultState(NOW);
  forged.customization.selected = "masterwork";
  assert.equal(game.normalizeState(forged, NOW).customization.selected, "midnight");
  reloaded.level = game.PRESTIGE_CONFIG.unlockLevel;
  const reborn = game.performPrestige(reloaded, 3, NOW + 2);
  assert.equal(game.cosmeticUnlocked(reborn, "masterwork"), true);
  assert.equal(reborn.customization.selected, "masterwork");
});

test("upgrade previews expose exact current and next effects across three paths", () => {
  const state = game.defaultState(NOW);
  assert.deepEqual(game.upgradePreview(state, game.upgradeById("basket")), { path: "Harvest", current: "3 items/harvest", next: "4 items/harvest", maxed: false });
  assert.deepEqual(game.upgradePreview(state, game.upgradeById("cauldron")), { path: "Brewing", current: "100% brew speed", next: "110% brew speed", maxed: false });
  assert.deepEqual(game.upgradePreview(state, game.upgradeById("ledger")), { path: "Trade", current: "+0% order coins", next: "+12% order coins", maxed: false });
  assert.deepEqual(new Set(game.UPGRADES.map(upgrade => upgrade.path)), new Set(["Harvest", "Brewing", "Trade"]));
});

test("offline elapsed time is capped at four hours and future timestamps earn zero", () => {
  const state = game.defaultState(NOW);
  state.lastSeen = NOW - 24 * 60 * 60 * 1000;
  assert.equal(game.offlineElapsedSeconds(state, NOW), game.OFFLINE_CAP_SECONDS);
  state.lastSeen = NOW + 60_000;
  assert.equal(game.offlineElapsedSeconds(state, NOW), 0);
});

test("hidden timer ticks do not overlap offline progress", () => {
  const hiddenFor = 90 * 60 * 1000;
  assert.equal(game.activeElapsedSeconds(NOW, NOW + hiddenFor, true), 0);
  const state = game.defaultState(NOW);
  state.lastSeen = NOW;
  assert.equal(game.offlineElapsedSeconds(state, NOW + hiddenFor), 90 * 60);
});

test("malformed JSON safely recovers to a fresh state", () => {
  const result = game.parseSave("{bad json", NOW);
  assert.equal(result.recovered, true); assert.equal(result.state.level, 1); assert.equal(result.state.coins, 30);
});

test("structurally corrupted saves normalize without losing durable valid progress", () => {
  const result = game.parseSave(JSON.stringify({
    version: 0, level: "6", xp: "oops", coins: -5, stardust: 9,
    ingredients: null, potions: [], upgrades: { garden: 999 }, orders: "bad",
    daily: null, brew: { recipeId: "unknown" }, achievements: { firstBrew: 1234, legacyBadge: 5678 },
    stats: { brewed: 22, orders: 11, coinsEarned: 800, prestiges: 2, legacyCounter: 44 },
    lastSeen: NOW + 999999,
  }), NOW).state;
  assert.equal(result.stardust, 9);
  assert.deepEqual(result.achievements, { firstBrew: 1234 });
  assert.equal(result.stats.brewed, 22); assert.equal(result.stats.prestiges, 2); assert.equal(result.stats.legacyCounter, 44);
  assert.equal(result.upgrades.garden, 8); assert.equal(result.brew, null); assert.equal(result.lastSeen, NOW);
});

test("a versioned existing save retains stardust, achievements, and lifetime stats", () => {
  const existing = game.defaultState(NOW - 1000);
  existing.stardust = 17;
  existing.achievements = { firstBrew: 111, rebirth: 222 };
  existing.stats = { taps: 90, brewed: 30, orders: 14, coinsEarned: 912, prestiges: 3 };
  existing.mastery.tonic = 12;
  existing.customers["customer-0"] = { deliveries: 5, hearts: 1 };
  const loaded = game.parseSave(JSON.stringify(existing), NOW).state;
  assert.equal(loaded.stardust, 17);
  assert.deepEqual(loaded.achievements, existing.achievements);
  assert.deepEqual(loaded.stats, existing.stats);
  assert.equal(loaded.mastery.tonic, 12);
  assert.deepEqual(loaded.customers["customer-0"], { deliveries: 5, hearts: 1 });
});

test("generated orders only request recipes unlocked at the current level", () => {
  for (let level = 1; level <= 8; level += 1) {
    const state = game.defaultState(NOW); state.level = level;
    for (let index = 0; index < 100; index += 1) {
      const order = game.generateOrder(state, () => (index % 97) / 97);
      assert.ok(game.recipeById(order.recipeId).unlock <= level);
    }
  }
});

test("the first post-level order includes a newly unlocked recipe", () => {
  const state = game.defaultState(NOW);
  state.level = 2;
  state.orders = [
    { id: 1, recipeId: "tonic", quantity: 1 },
    { id: 2, recipeId: "tonic", quantity: 1 },
  ];
  assert.equal(game.generateOrder(state, () => 0).recipeId, "clarity");
});

test("ordinary order boards use distinct known villagers and replacements avoid visible customers", () => {
  const fresh = game.defaultState(NOW);
  game.ensureOrders(fresh, () => 0);
  const freshCustomers = fresh.orders.map(order => order.customerId);
  assert.equal(freshCustomers.length, 3);
  assert.equal(new Set(freshCustomers).size, 3);
  assert.ok(freshCustomers.every(id => /^customer-(?:[0-9]|1[01])$/.test(id)));

  const replacement = game.defaultState(NOW);
  replacement.orders = [
    { id: 1, customerId: "customer-0", customer: game.CUSTOMERS[0][0], recipeId: "tonic" },
    { id: 2, customerId: "customer-1", customer: game.CUSTOMERS[1][0], recipeId: "tonic" },
  ];
  replacement.nextOrderId = 3;
  const next = game.generateOrder(replacement, () => 0);
  assert.equal(next.customerId, "customer-2");
  assert.ok(!replacement.orders.some(order => order.customerId === next.customerId));
});

test("ordinary customer selection avoids reserved villagers without changing their order", () => {
  const state = game.defaultState(NOW);
  const reserved = { id: 1, afterStarsStep: 0, customerId: "customer-0", customer: game.CUSTOMERS[0][0], recipeId: "tonic" };
  state.orders = [reserved];
  state.nextOrderId = 2;
  const generated = game.generateOrder(state, () => 0);
  assert.equal(generated.customerId, "customer-1");
  assert.equal(state.orders[0], reserved);
  assert.equal(state.orders[0].customerId, "customer-0");
});

test("ordinary customer selection gives every eligible villager base weight and heart-ready villagers total weight three", () => {
  const state = game.defaultState(NOW);
  state.orders = [{ id: 1, customerId: "customer-0", customer: game.CUSTOMERS[0][0], recipeId: "tonic" }];
  let pool = game.ordinaryOrderCustomerPool(state);
  for (let index = 1; index < game.CUSTOMERS.length; index += 1) assert.equal(pool.filter(id => id === `customer-${index}`).length, 1);
  assert.equal(pool.includes("customer-0"), false);

  state.orders = [];
  state.customers["customer-2"] = { deliveries: 2, hearts: 0 };
  pool = game.ordinaryOrderCustomerPool(state);
  assert.equal(pool.filter(id => id === "customer-2").length, 3);
  for (let index = 0; index < game.CUSTOMERS.length; index += 1) {
    if (index !== 2) assert.equal(pool.filter(id => id === `customer-${index}`).length, 1);
  }
  state.customers["customer-2"] = { deliveries: 3, hearts: 1 };
  state.customers["customer-3"] = { deliveries: 8, hearts: 2 };
  state.customers["customer-4"] = { deliveries: 9, hearts: 3 };
  state.customers["customer-5"] = { deliveries: 11, hearts: 3 };
  pool = game.ordinaryOrderCustomerPool(state);
  assert.equal(pool.filter(id => id === "customer-2").length, 1, "other delivery counts have only base weight");
  assert.equal(pool.filter(id => id === "customer-3").length, 3, "the next unearned heart gets exactly two extra entries");
  assert.equal(pool.filter(id => id === "customer-4").length, 1, "max-heart villagers get no extra weight");
  assert.equal(pool.filter(id => id === "customer-5").length, 1, "extra deliveries after max hearts get no extra weight");
});

test("ordinary customer selection uses deterministic weighted boundaries and one customer draw", () => {
  const generatedFor = customerDraw => {
    const state = game.defaultState(NOW);
    state.customers["customer-0"] = { deliveries: 2, hearts: 0 };
    const draws = [0, customerDraw, 0];
    const order = game.generateOrder(state, () => draws.shift());
    assert.equal(draws.length, 0, "level-one generation keeps one customer draw before the existing reward draw");
    return order;
  };
  assert.equal(generatedFor(0).customerId, "customer-0");
  assert.equal(generatedFor(3 / 14 - Number.EPSILON).customerId, "customer-0");
  assert.equal(generatedFor(3 / 14).customerId, "customer-1");
  assert.equal(generatedFor(.999999).customerId, "customer-11");
});

test("ordinary customer selection safely falls back for malformed and fully represented boards", () => {
  const malformed = game.defaultState(NOW);
  malformed.orders = [{ id: 1, customerId: "not-a-villager", customer: game.CUSTOMERS[0][0], recipeId: "tonic" }];
  malformed.customers = null;
  assert.deepEqual(game.ordinaryOrderCustomerPool(malformed), game.CUSTOMERS.map((_, index) => `customer-${index}`));
  assert.equal(game.generateOrder(malformed, () => 0).customerId, "customer-0");

  const forged = game.defaultState(NOW);
  forged.orders = game.CUSTOMERS.map((customer, index) => ({ id: index + 1, customerId: `customer-${index}`, customer: customer[0], recipeId: "tonic" }));
  forged.nextOrderId = game.CUSTOMERS.length + 1;
  assert.equal(game.ordinaryOrderCustomerPool(forged).length, game.CUSTOMERS.length);
  assert.equal(game.generateOrder(forged, () => 0).customerId, "customer-0");
});

test("charged gathering limits bursts and recharges forgivingly", () => {
  const state = game.defaultState(NOW);
  assert.equal(game.chargedGather(state, NOW, () => 0).added, game.GATHER_CONFIG.amountPerCharge);
  assert.equal(game.chargedGather(state, NOW, () => 0).added, game.GATHER_CONFIG.amountPerCharge);
  assert.equal(game.chargedGather(state, NOW, () => 0).added, game.GATHER_CONFIG.amountPerCharge);
  assert.equal(game.chargedGather(state, NOW, () => 0).added, 0);
  assert.equal(game.chargedGather(state, NOW + game.GATHER_CONFIG.rechargeSeconds * 1000, () => 0).added, game.GATHER_CONFIG.amountPerCharge);
});

test("offline ingredients wait for the first delivery and preserve harvest space", () => {
  const state = game.defaultState(NOW);
  assert.equal(game.grantOfflineIngredients(state, 3600, () => 0), 0);
  assert.equal(game.totalIngredients(state), 11);
  state.stats.orders = 1;
  assert.equal(game.grantOfflineIngredients(state, 3600, () => 0), 25);
  assert.equal(game.totalIngredients(state), game.passiveStorageCap(state));
  assert.equal(game.grantOfflineIngredients(state, 3600, () => 0), 0);
});

test("offline ingredients use the frontloaded diminishing curve and preserve Pantry safeguards", () => {
  const makeState = ({ garden = 0, shelves = 0, stock = 0, delivered = true } = {}) => {
    const state = game.defaultState(NOW);
    state.level = 4;
    state.ingredients = Object.fromEntries(Object.keys(game.INGREDIENTS).map(id => [id, 0]));
    state.ingredients.herb = stock;
    state.upgrades.garden = garden;
    state.upgrades.shelves = shelves;
    state.stats.orders = delivered ? 1 : 0;
    return state;
  };
  const quantity = seconds => game.offlineIngredientQuantity(makeState(), seconds);

  assert.deepEqual(
    [899, 900, 901, 7199, 7200, 7201, 14399, 14400, 14401].map(seconds => [seconds, quantity(seconds)]),
    [[899, 14], [900, 14], [901, 14], [7199, 64], [7200, 64], [7201, 64], [14399, 93], [14400, 93], [14401, 93]],
    "the bounded 15-, 120-, and 240-minute segment edges must remain exact",
  );
  assert.equal(quantity(17 * 60), 15, "segment fractions must be summed before one final floor");
  assert.equal(quantity(game.OFFLINE_CAP_SECONDS), quantity(game.OFFLINE_CAP_SECONDS * 2), "over-four-hour values must not increase the requested quantity");
  for (const malformed of [-1, Infinity, NaN, "not-a-duration", {}, null]) assert.equal(quantity(malformed), 0, "malformed elapsed values must safely grant zero");

  for (const [minutes, expected] of [[15, 14], [60, 36], [120, 54]]) {
    const state = makeState();
    assert.equal(game.grantOfflineIngredients(state, minutes * 60, () => 0), expected, `level-four empty Pantry must grant ${expected} at ${minutes} minutes`);
  }
  let firstReserveMinute = null;
  for (let minute = 1; minute <= 240; minute += 1) {
    const state = makeState();
    if (game.grantOfflineIngredients(state, minute * 60, () => 0) === game.passiveStorageCap(state)) { firstReserveMinute = minute; break; }
  }
  assert.equal(firstReserveMinute, 98, "the representative passive reserve must first fill at minute 98");

  const garden = makeState({ garden: 1 });
  assert.equal(game.grantOfflineIngredients(garden, 60 * 60, () => 0), 45, "Moonlit Garden level one must retain its gather-rate benefit");
  const shelves = makeState({ shelves: 1 });
  assert.equal(game.grantOfflineIngredients(shelves, 120 * 60, () => 0), 64, "Pantry Shelves must extend the passive reserve without changing the curve");
  assert.equal(game.grantOfflineIngredients(makeState({ shelves: 1 }), 240 * 60, () => 0), 69, "Pantry Shelves must still respect their enlarged passive reserve");

  const partial = makeState({ stock: 20 });
  assert.equal(game.grantOfflineIngredients(partial, 60 * 60, () => 0), 34, "existing Pantry stock must only reduce the available grant");
  assert.ok(partial.ingredients.herb >= 20, "existing ingredient stock must never be overwritten");
  const nearReserve = makeState({ stock: 53 });
  assert.equal(game.grantOfflineIngredients(nearReserve, 240 * 60, () => 0), 1);
  assert.equal(game.grantOfflineIngredients(makeState({ stock: 54 }), 240 * 60, () => 0), 0);
  assert.equal(game.grantOfflineIngredients(makeState({ delivered: false }), 240 * 60, () => 0), 0, "offline gathering must still wait for a completed delivery");
});

test("automatic gathering is slow, waits for a delivery, and never fills manual harvest space", () => {
  const state = game.defaultState(NOW);
  assert.equal(Math.round(game.gatherRate(state) * 600) / 10, 4.8);
  assert.equal(game.grantPassiveIngredients(state, 100, () => 0), 0);
  state.stats.orders = 1;
  assert.equal(game.grantPassiveIngredients(state, 100, () => 0), game.passiveStorageCap(state) - 11);
  assert.equal(game.totalIngredients(state), game.passiveStorageCap(state));
  assert.equal(game.grantPassiveIngredients(state, 1, () => 0), 0);
  assert.equal(game.chargedGather(state, NOW, () => 0).added, game.GATHER_CONFIG.amountPerCharge);
});

test("Request Mix gives one active request deficit a capped random weight", () => {
  const state = game.defaultState(NOW);
  state.level = 2;
  state.ingredients = { herb: 0, mushroom: 0, crystal: 0, mist: 0, ember: 0, mint: 0, lavender: 0 };
  state.orders = [{ id: 1, recipeId: "clarity", quantity: 1 }];
  const pool = game.requestMixPool(state);
  assert.equal(pool.filter(id => id === "herb").length, 4);
  assert.equal(pool.filter(id => id === "crystal").length, 2);
  assert.equal(pool.filter(id => id === "mushroom").length, 1);
});

test("Request Mix aggregates duplicate requests and allocates bottled potions by recipe", () => {
  const state = game.defaultState(NOW);
  state.level = 3;
  state.ingredients = { herb: 0, mushroom: 0, crystal: 0, mist: 0, ember: 0, mint: 0, lavender: 0 };
  state.potions = { ...state.potions, clarity: 1, moon: 1 };
  state.orders = [
    { id: 1, recipeId: "clarity", quantity: 1 },
    { id: 2, recipeId: "clarity", quantity: 2 },
    { id: 3, recipeId: "moon", quantity: 1 },
    { id: 4, recipeId: "tonic", quantity: 1 },
  ];
  const pool = game.requestMixPool(state);
  assert.equal(pool.filter(id => id === "herb").length, 4);
  assert.equal(pool.filter(id => id === "crystal").length, 3);
  assert.equal(pool.filter(id => id === "mushroom").length, 2);
  assert.equal(pool.filter(id => id === "mist").length, 1);
});

test("Request Mix subtracts Pantry stock before adding deficit weight", () => {
  const state = game.defaultState(NOW);
  state.level = 2;
  state.ingredients = { herb: 2, mushroom: 0, crystal: 1, mist: 0, ember: 0, mint: 0, lavender: 0 };
  state.orders = [{ id: 1, recipeId: "clarity", quantity: 1 }];
  const pool = game.requestMixPool(state);
  assert.equal(pool.filter(id => id === "herb").length, 2);
  assert.equal(pool.filter(id => id === "crystal").length, 1);
  assert.equal(pool.filter(id => id === "mushroom").length, 1);
});

test("Request Mix ignores locked and malformed orders and falls back uniformly without a deficit", () => {
  const state = game.defaultState(NOW);
  state.level = 2;
  state.ingredients = { herb: 0, mushroom: 0, crystal: 0, mist: 0, ember: 0, mint: 0, lavender: 0 };
  state.orders = [null, { id: 1, recipeId: "bloom", quantity: 1 }, { id: 2, recipeId: "unknown", quantity: 1 }, { id: 3, recipeId: "clarity", quantity: 0 }];
  assert.deepEqual(game.requestMixPool(state), ["herb", "mushroom", "crystal"]);
  state.orders = [{ id: 4, recipeId: "clarity", quantity: 1 }];
  state.potions.clarity = 1;
  assert.deepEqual(game.requestMixPool(state), ["herb", "mushroom", "crystal"]);
});

test("Request Mix uses deterministic weighted boundaries and recomputes between rolls", () => {
  const state = game.defaultState(NOW);
  state.level = 2;
  state.ingredients = { herb: 0, mushroom: 0, crystal: 0, mist: 0, ember: 0, mint: 0, lavender: 0 };
  state.orders = [{ id: 1, recipeId: "clarity", quantity: 1 }];
  assert.deepEqual(game.requestMixPool(state), ["herb", "mushroom", "crystal", "herb", "herb", "herb", "crystal"]);
  const draws = [2 / 7, .999999];
  assert.equal(game.addRequestMixIngredients(state, 2, () => draws.shift()), 2);
  assert.deepEqual(state.ingredients, { herb: 1, mushroom: 0, crystal: 1, mist: 0, ember: 0, mint: 0, lavender: 0 });
});

test("Request Mix respects storage while exact targeting remains unchanged", () => {
  const state = game.defaultState(NOW);
  state.level = 2;
  state.ingredients = { herb: game.storageCap(state) - 1, mushroom: 0, crystal: 0, mist: 0, ember: 0, mint: 0, lavender: 0 };
  state.orders = [{ id: 1, recipeId: "clarity", quantity: 1 }];
  assert.equal(game.chargedGather(state, NOW, () => 0).added, 1);
  assert.equal(game.totalIngredients(state), game.storageCap(state));
  const targeted = game.defaultState(NOW);
  targeted.level = 2;
  game.setGatherTarget(targeted, "crystal");
  assert.equal(game.chargedGather(targeted, NOW, () => 0).targetId, "crystal");
  assert.equal(targeted.ingredients.crystal, game.GATHER_CONFIG.amountPerCharge);
});

test("passive and offline gathering stay on their uniform random path", () => {
  const passive = game.defaultState(NOW);
  passive.level = 2;
  passive.stats.orders = 1;
  passive.ingredients = { herb: 0, mushroom: 0, crystal: 0, mist: 0, ember: 0, mint: 0, lavender: 0 };
  passive.orders = [{ id: 1, recipeId: "clarity", quantity: 1 }];
  assert.equal(game.grantPassiveIngredients(passive, 1, () => .5), 1);
  assert.deepEqual(passive.ingredients, { herb: 0, mushroom: 1, crystal: 0, mist: 0, ember: 0, mint: 0, lavender: 0 });
  const offline = game.defaultState(NOW);
  offline.level = 2;
  offline.stats.orders = 1;
  offline.ingredients = { herb: 0, mushroom: 0, crystal: 0, mist: 0, ember: 0, mint: 0, lavender: 0 };
  offline.orders = [{ id: 1, recipeId: "clarity", quantity: 1 }];
  assert.equal(game.grantOfflineIngredients(offline, 63, () => .5), 1);
  assert.deepEqual(offline.ingredients, { herb: 0, mushroom: 1, crystal: 0, mist: 0, ember: 0, mint: 0, lavender: 0 });
});

test("charged gathering can intentionally target an unlocked ingredient", () => {
  const state = game.defaultState(NOW);
  state.level = 2;
  assert.equal(game.setGatherTarget(state, "crystal"), true);
  const before = state.ingredients.crystal;
  const result = game.chargedGather(state, NOW, () => 0);
  assert.equal(result.targetId, "crystal");
  assert.equal(state.ingredients.crystal - before, game.GATHER_CONFIG.amountPerCharge);
  assert.equal(game.setGatherTarget(state, "mist"), false);
  assert.equal(state.gather.targetId, "crystal");
  assert.equal(game.setGatherTarget(state, null), true);
  assert.equal(state.gather.targetId, null);
});

test("discarding ingredients safely clears stock and an unwanted harvest target", () => {
  const state = game.defaultState(NOW);
  state.level = 4;
  state.ingredients.mint = 12;
  assert.equal(game.setGatherTarget(state, "mint"), true);
  assert.equal(game.discardIngredient(state, "mint", 5), 5);
  assert.equal(state.ingredients.mint, 7);
  assert.equal(state.gather.targetId, null);
  assert.equal(game.discardIngredient(state, "mint", 99), 7);
  assert.equal(game.discardIngredient(state, "mint", 1), 0);
  assert.equal(game.discardIngredient(state, "unknown", 1), 0);
});

test("gather target migrates safely and rejects locked or unknown values", () => {
  const state = game.defaultState(NOW);
  state.gather.targetId = "crystal";
  assert.equal(game.normalizeState(state, NOW).gather.targetId, null);
  state.level = 2;
  assert.equal(game.normalizeState(state, NOW).gather.targetId, "crystal");
  state.gather.targetId = "bogus";
  assert.equal(game.normalizeState(state, NOW).gather.targetId, null);
});

test("tutorial maps exact tonic actions to precise targets", () => {
  const state = game.defaultState(NOW);
  game.ensureOrders(state, () => 0);
  assert.deepEqual(
    { status: game.beginnerQuest(state, NOW).status, selector: game.beginnerQuest(state, NOW).targetSelector },
    { status: "available-to-start", selector: '[data-brew="tonic"]' },
  );
  game.startBrew(state, "tonic", NOW);
  assert.deepEqual(
    { status: game.beginnerQuest(state, NOW + 1000).status, selector: game.beginnerQuest(state, NOW + 1000).targetSelector },
    { status: "in-progress", selector: "#brewSlot" },
  );
  assert.deepEqual(
    { status: game.beginnerQuest(state, NOW + 30000).status, selector: game.beginnerQuest(state, NOW + 30000).targetSelector },
    { status: "ready-to-collect", selector: "#collectBrewButton" },
  );
  game.collectBrew(state, NOW + 30000);
  assert.deepEqual(
    { status: game.beginnerQuest(state, NOW + 30000).status, selector: game.beginnerQuest(state, NOW + 30000).targetSelector },
    { status: "needs-delivery", selector: '[data-quick-deliver="1"]' },
  );
});

test("tutorial recognizes coin, ingredient, upgrade, and new unlock states", () => {
  const state = game.defaultState(NOW);
  state.stats.orders = 1;
  state.coins = 40;
  state.ingredients = { herb: 0, mushroom: 0, crystal: 0, mist: 0, ember: 0, mint: 0, lavender: 0 };
  let quest = game.beginnerQuest(state, NOW);
  assert.equal(quest.blockedBy, "insufficient-coins");
  assert.equal(quest.status, "insufficient-ingredients");
  assert.equal(quest.targetSelector, "#gatherButton");
  state.coins = 65;
  quest = game.beginnerQuest(state, NOW);
  assert.equal(quest.status, "affordable-upgrade");
  assert.equal(quest.targetSelector, '[data-upgrade="basket"]');
  state.upgrades.garden = 1;
  state.level = 2;
  quest = game.beginnerQuest(state, NOW);
  assert.equal(quest.status, "choose-gather-target");
  assert.equal(quest.targetSelector, '[data-gather-target="crystal"]');
  game.setGatherTarget(state, "crystal");
  quest = game.beginnerQuest(state, NOW);
  assert.equal(quest.status, "gather-new-ingredient");
  assert.equal(quest.targetKind, "gather-and-pantry");
  assert.equal(quest.targetSelector, "#gatherButton");
  state.ingredients.crystal = 1;
  state.ingredients.herb = 3;
  quest = game.beginnerQuest(state, NOW);
  assert.equal(quest.status, "available-to-start");
  assert.equal(quest.targetSelector, '[data-brew="clarity"]');
});

test("tutorial maps Clarity waiting, collection, delivery, and completion", () => {
  const state = game.defaultState(NOW);
  state.stats.orders = 2;
  state.level = 2;
  state.upgrades.garden = 1;
  state.ingredients.crystal = 1;
  state.ingredients.herb = 3;
  state.orders = [{ id: 44, recipeId: "clarity", quantity: 1, reward: 40, xp: 10 }];
  game.startBrew(state, "clarity", NOW);
  assert.equal(game.beginnerQuest(state, NOW + 1000).targetSelector, "#brewSlot");
  assert.equal(game.beginnerQuest(state, NOW + 66000).targetSelector, "#collectBrewButton");
  game.collectBrew(state, NOW + 66000);
  assert.equal(game.beginnerQuest(state, NOW + 66000).targetSelector, '[data-quick-deliver="44"]');
  state.discovery.delivered.clarity = 1;
  assert.equal(game.beginnerQuest(state), null);
});

test("cross-view tutorial prompts only when the next target changes views", () => {
  const before = { id: "collect", view: "workshop" };
  const deliver = { id: "deliver", title: "Deliver", detail: "Use Deliver", view: "orders", targetSelector: '[data-order="1"]', targetKind: "control" };
  const sameView = { ...deliver, id: "brew", view: "workshop" };
  assert.equal(game.tutorialTransitionPrompt(before, sameView, "workshop"), null);
  assert.deepEqual(game.tutorialTransitionPrompt(before, deliver, "workshop"), {
    key: "collect->deliver", title: "Deliver", detail: "Use Deliver", view: "orders", targetSelector: '[data-order="1"]', targetKind: "control",
  });
  assert.equal(game.tutorialTransitionPrompt(before, null, "workshop"), null);
});

test("After the Stars is a dormant ordered four-step post-rebirth quest", () => {
  assert.deepEqual(game.AFTER_STARS_STEPS.map(step => [step.customerId, step.recipeId, step.title]), [
    ["customer-0", "tonic", "The Oven Remembers"],
    ["customer-3", "clarity", "A New Route"],
    ["customer-6", "bloom", "Roots After Starlight"],
    ["customer-9", "sun", "The Dawnthread Hem"],
  ]);
  const firstCycle = game.defaultState(NOW);
  firstCycle.level = 7;
  game.ensureOrders(firstCycle, () => 0);
  assert.equal(game.afterStarsStatus(firstCycle).active, false);
  assert.equal(firstCycle.orders.some(game.isAfterStarsOrder), false);
  assert.equal(game.cosmeticUnlocked(firstCycle, "dawnthread"), false);

  const state = game.defaultState(NOW);
  state.stats.prestiges = 1;
  game.ensureOrders(state, () => 0);
  assert.equal(state.orders.filter(game.isAfterStarsOrder).length, 1);
  assert.equal(state.orders.filter(order => !game.isReservedOrder(order)).length, 2);
  for (let stepIndex = 0; stepIndex < game.AFTER_STARS_STEPS.length; stepIndex += 1) {
    const authored = game.AFTER_STARS_STEPS[stepIndex];
    const recipe = game.recipeById(authored.recipeId);
    state.level = Math.max(state.level, recipe.unlock);
    game.ensureOrders(state, () => 0);
    const order = state.orders.find(game.isAfterStarsOrder);
    assert.equal(order.afterStarsStep, stepIndex);
    assert.deepEqual({ customerId: order.customerId, recipeId: order.recipeId, quantity: order.quantity, reward: order.reward, xp: order.xp }, {
      customerId: authored.customerId, recipeId: authored.recipeId, quantity: 1,
      reward: Math.round(recipe.sell * 1.55), xp: Math.round(11 + recipe.unlock * 3),
    });
    state.potions[recipe.id] = 1;
    const before = { orders: state.stats.orders, daily: state.daily.orders, weekly: state.weekly.progress, delivered: state.discovery.delivered[recipe.id] };
    const result = game.fulfillOrder(state, order.id, NOW + stepIndex * 1000, () => 0);
    assert.equal(result.afterStars.step, stepIndex);
    assert.equal(state.afterStars.step, stepIndex + 1);
    assert.deepEqual({ orders: state.stats.orders, daily: state.daily.orders, weekly: state.weekly.progress, delivered: state.discovery.delivered[recipe.id] }, {
      orders: before.orders + 1, daily: before.daily + 1, weekly: before.weekly + 1, delivered: before.delivered + 1,
    });
    assert.ok(state.orders.filter(order => !game.isReservedOrder(order)).length >= 2);
    assert.equal(game.fulfillOrder(state, order.id, NOW, () => 0), null, "a delivered quest step cannot repeat");
  }
  assert.equal(game.afterStarsStatus(state).complete, true);
  assert.equal(state.orders.some(game.isAfterStarsOrder), false);
  assert.equal(game.cosmeticUnlocked(state, "dawnthread"), true);
  assert.equal(game.selectCosmetic(state, "dawnthread"), true);
  assert.equal(game.selectCosmetic(state, "midnight"), true, "the final look remains reversible");
});

test("After the Stars shares the reserved slot and canonicalizes missing or forged orders", () => {
  const specialFirst = game.defaultState(NOW);
  specialFirst.level = 4;
  specialFirst.commissions.invitations = 1;
  game.ensureOrders(specialFirst, () => 0);
  assert.ok(game.selectSignatureCommission(specialFirst, "mira-dawn"));
  specialFirst.stats.prestiges = 1;
  game.ensureOrders(specialFirst, () => 0);
  assert.equal(specialFirst.orders.filter(game.isSignatureOrder).length, 1);
  assert.equal(specialFirst.orders.filter(game.isAfterStarsOrder).length, 0);
  assert.equal(specialFirst.orders.filter(order => !game.isReservedOrder(order)).length, 2);
  assert.equal(specialFirst.commissions.invitations, 0);

  const questFirst = game.defaultState(NOW);
  questFirst.level = 4;
  questFirst.stats.prestiges = 1;
  questFirst.commissions.invitations = 2;
  game.ensureOrders(questFirst, () => 0);
  assert.equal(game.selectSignatureCommission(questFirst, "moss-rainpath"), null);
  assert.equal(questFirst.commissions.invitations, 2, "a quest order never consumes saved invitations");

  const forged = game.defaultState(NOW);
  forged.level = 4;
  forged.stats.prestiges = 1;
  forged.afterStars = { step: 0 };
  forged.orders = [{ id: 77, afterStarsStep: 0, customerId: "customer-11", customer: "Forgery", avatar: "X", avatarColor: "hotpink", recipeId: "sun", quantity: 2, reward: 999999, xp: 999999 }];
  const restored = game.normalizeState(forged, NOW);
  const order = restored.orders.find(game.isAfterStarsOrder);
  assert.ok(order, "an eligible missing canonical order restores deterministically");
  assert.deepEqual({ customerId: order.customerId, recipeId: order.recipeId, quantity: order.quantity, reward: order.reward, xp: order.xp }, {
    customerId: "customer-0", recipeId: "tonic", quantity: 1, reward: Math.round(game.recipeById("tonic").sell * 1.55), xp: 14,
  });
  assert.deepEqual({ customer: order.customer, avatar: order.avatar, avatarColor: order.avatarColor }, { customer: game.CUSTOMERS[0][0], avatar: game.CUSTOMERS[0][1], avatarColor: game.CUSTOMERS[0][3] });
  assert.equal(restored.orders.filter(order => !game.isReservedOrder(order)).length, 0, "normalization restores only the missing quest order and does not invent saved ordinary orders");
});

test("After the Stars progress survives temporal changes, reload, and later rebirths", () => {
  const state = game.defaultState(NOW);
  state.level = 7;
  state.stats.prestiges = 2;
  state.afterStars.step = 2;
  state.customization.selected = "midnight";
  game.ensureOrders(state, () => 0);
  const activeId = state.orders.find(game.isAfterStarsOrder).id;
  const reloaded = game.parseSave(JSON.stringify(state), NOW + 86400000).state;
  assert.equal(reloaded.afterStars.step, 2);
  assert.equal(reloaded.orders.find(game.isAfterStarsOrder).id, activeId);
  game.resetDailyIfNeeded(reloaded, NOW - 86400000);
  assert.equal(reloaded.afterStars.step, 2);
  const reborn = game.performPrestige(reloaded, 3, NOW + 2000);
  assert.equal(reborn.afterStars.step, 2);
  assert.equal(reborn.orders.length, 0);
  assert.equal(game.afterStarsStatus(reborn).recipeLocked, true);
  reborn.level = game.recipeById("bloom").unlock;
  game.ensureOrders(reborn, () => 0);
  assert.equal(reborn.orders.find(game.isAfterStarsOrder).afterStarsStep, 2);
  assert.equal(reborn.orders.filter(order => !game.isReservedOrder(order)).length, 2);

  const malformed = game.normalizeState({ ...state, afterStars: { step: -999 } }, NOW);
  assert.equal(malformed.afterStars.step, 0);
  const oversized = game.normalizeState({ ...state, afterStars: { step: 999 } }, NOW);
  assert.equal(oversized.afterStars.step, 4);
});

test("the deterministic gather-brew-collect-deliver-upgrade loop succeeds", () => {
  const state = game.defaultState(NOW);
  game.ensureOrders(state, () => 0);
  game.addRandomIngredients(state, 1, () => 0);
  assert.equal(game.startBrew(state, "tonic", NOW), true);
  assert.ok(game.collectBrew(state, NOW + 30000));
  state.orders[0] = { ...state.orders[0], recipeId: "tonic", quantity: 1, reward: 20, xp: 20 };
  assert.ok(game.fulfillOrder(state, state.orders[0].id, NOW + 30000, () => 0));
  state.coins = 70;
  assert.ok(game.buyUpgrade(state, "garden"));
  assert.equal(state.upgrades.garden, 1);
});

test("ordinary order actions are state-aware and never mutate gameplay", () => {
  const state = game.defaultState(NOW);
  state.orders = [{ id: 41, recipeId: "tonic", quantity: 1, reward: 20, xp: 11 }];
  const order = state.orders[0];
  const expectAction = (expected, candidate = order) => {
    const snapshot = JSON.stringify(state);
    assert.equal(game.orderAction(state, candidate, NOW), expected);
    assert.equal(JSON.stringify(state), snapshot, `${expected || "no"} action decision must not mutate gameplay state`);
  };

  state.potions.tonic = 1;
  expectAction("deliver");
  state.potions.tonic = 0;
  state.brew = { recipeId: "clarity", startedAt: NOW, endsAt: NOW + 1, durationMs: 1000, assisted: false };
  expectAction("view-brew");
  state.brew.endsAt = NOW;
  expectAction("collect-brew");
  state.brew = null;
  state.ingredients = { herb: 3, mushroom: 1, crystal: 0, mist: 0, ember: 0, mint: 0, lavender: 0 };
  expectAction("brew");
  state.ingredients.mushroom = 0;
  expectAction("gather");

  const reserved = { ...order, commissionId: "mira-dawn" };
  expectAction(null, reserved);
  expectAction(null, { id: "stale", recipeId: "unknown", quantity: 1 });
});

console.log(`All ${passed} game logic tests passed.`);
