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
  assert.equal(game.claimDaily(state), true);
  assert.equal(game.claimDaily(state), false);
  assert.equal(state.coins, 80); assert.equal(state.stardust, 1); assert.equal(state.stats.coinsEarned, 50);
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
  assert.equal(game.grantOfflineIngredients(state, 31, () => .999999), 1);
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
  assert.deepEqual(next.daily, state.daily); assert.equal(game.claimDaily(next), false, "rebirth cannot reclaim today's reward");
  assert.equal(next.stats.prestiges, 1); assert.equal(game.cosmeticUnlocked(next, "starglass"), true);
  assert.deepEqual(next.weekly, state.weekly); assert.deepEqual(next.customization, state.customization);
});

test("daily reset uses a monotonic saved date across alternating clock changes", () => {
  const state = game.defaultState(NOW);
  state.daily.orders = 5;
  assert.equal(game.claimDaily(state), true);
  const firstDate = state.daily.date;
  game.resetDailyIfNeeded(state, NOW - 86400000);
  assert.deepEqual(state.daily, { date: firstDate, orders: 5, claimed: true }, "clock rollback cannot reopen the saved date");

  game.resetDailyIfNeeded(state, NOW + 86400000);
  const laterDate = game.todayKey(NOW + 86400000);
  assert.deepEqual(state.daily, { date: laterDate, orders: 0, claimed: false }, "a genuinely later local date opens one fresh goal");
  state.daily.orders = 5;
  assert.equal(game.claimDaily(state), true);
  game.resetDailyIfNeeded(state, NOW - 86400000);
  game.resetDailyIfNeeded(state, NOW + 86400000);
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

test("collection cosmetics are few, durable, and have no economy effects", () => {
  const state = game.defaultState(NOW);
  const baseline = { order: game.orderMultiplier(state, NOW, "tonic"), brew: game.brewSpeedMultiplier(state), gather: game.manualGatherAmount(state) };
  state.stats.brewed = 10;
  assert.equal(game.cosmeticUnlocked(state, "fern"), true);
  assert.equal(game.selectCosmetic(state, "fern"), true);
  assert.equal(game.selectCosmetic(state, "mooncloth"), false);
  assert.deepEqual({ order: game.orderMultiplier(state, NOW, "tonic"), brew: game.brewSpeedMultiplier(state), gather: game.manualGatherAmount(state) }, baseline);
  Object.keys(state.mastery).forEach(id => { state.mastery[id] = 1; });
  state.stats.prestiges = 1;
  state.weekly.cycle = 1;
  const visualStates = {};
  for (const cosmetic of game.COSMETICS) {
    assert.equal(game.selectCosmetic(state, cosmetic.id), true);
    visualStates[cosmetic.id] = game.workshopDecorationState(state);
  }
  assert.deepEqual(visualStates.midnight, { selected: "midnight", keepsake: false, ribbon: false });
  assert.deepEqual(visualStates.starglass, { selected: "starglass", keepsake: true, ribbon: false });
  assert.deepEqual(visualStates.guild, { selected: "guild", keepsake: false, ribbon: true });
  assert.equal(new Set(Object.values(visualStates).map(visual => JSON.stringify(visual))).size, game.COSMETICS.length, "each advertised selection yields a distinct reversible visual state");
  assert.equal(game.selectCosmetic(state, "midnight"), true);
  assert.equal(game.selectCosmetic(state, "midnight"), false, "selecting the current look is a no-op");
  const reloaded = game.normalizeState(state, NOW);
  assert.equal(reloaded.customization.selected, "midnight");
  assert.ok(game.COSMETICS.length <= 5);
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

test("the deterministic gather-brew-collect-deliver-upgrade loop succeeds", () => {
  const state = game.defaultState(NOW);
  game.ensureOrders(state, () => 0);
  game.addRandomIngredients(state, 1, () => 0);
  assert.equal(game.startBrew(state, "tonic", NOW), true);
  assert.ok(game.collectBrew(state, NOW + 30000));
  state.orders[0] = { ...state.orders[0], recipeId: "tonic", quantity: 1, reward: 20, xp: 20 };
  assert.ok(game.fulfillOrder(state, state.orders[0].id, NOW + 30000, () => 0));
  state.coins = 70;
  assert.equal(game.buyUpgrade(state, "garden"), true);
  assert.equal(state.upgrades.garden, 1);
});

console.log(`All ${passed} game logic tests passed.`);
