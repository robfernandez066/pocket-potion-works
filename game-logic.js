"use strict";

(function exposePocketPotionLogic(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.PPWLogic = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createPocketPotionLogic() {
  const SAVE_VERSION = 1;
  const OFFLINE_CAP_SECONDS = 4 * 60 * 60;

  const INGREDIENTS = {
    herb: { name: "Dewleaf", icon: "☘", color: "#dcebd8", unlock: 1 },
    mushroom: { name: "Mooshroom", icon: "♧", color: "#f0d8d5", unlock: 1 },
    crystal: { name: "Starshard", icon: "♦", color: "#dfd9f0", unlock: 2 },
    ember: { name: "Sun Ember", icon: "✹", color: "#f4dfbd", unlock: 4 },
  };

  const RECIPES = [
    { id: "tonic", name: "Meadow Tonic", icon: "⚗", color: "#7ebd87", unlock: 1, seconds: 6, sell: 14, ingredients: { herb: 2, mushroom: 1 } },
    { id: "clarity", name: "Clarity Elixir", icon: "◈", color: "#7faec3", unlock: 2, seconds: 11, sell: 27, ingredients: { herb: 3, crystal: 1 } },
    { id: "moon", name: "Moonmilk", icon: "☾", color: "#8d79bd", unlock: 3, seconds: 17, sell: 46, ingredients: { mushroom: 2, crystal: 2 } },
    { id: "sun", name: "Bottled Sunrise", icon: "☀", color: "#dd9c54", unlock: 4, seconds: 24, sell: 72, ingredients: { herb: 2, crystal: 1, ember: 2 } },
    { id: "dream", name: "Dreamer's Draught", icon: "✦", color: "#c77d9b", unlock: 6, seconds: 38, sell: 118, ingredients: { mushroom: 3, crystal: 2, ember: 2 } },
  ];

  const UPGRADES = [
    { id: "garden", name: "Moonlit Garden", icon: "☘", description: "+30% passive ingredients per level", baseCost: 45, max: 8 },
    { id: "basket", name: "Bottomless Basket", icon: "⌄", description: "+1 ingredient per manual harvest", baseCost: 35, max: 6 },
    { id: "cauldron", name: "Copper Cauldron", icon: "⚗", description: "Brews finish 12% faster per level", baseCost: 65, max: 7 },
    { id: "shelves", name: "Pantry Shelves", icon: "▤", description: "+25 ingredient storage per level", baseCost: 50, max: 6 },
    { id: "ledger", name: "Golden Ledger", icon: "●", description: "+15% order coins per level", baseCost: 80, max: 6 },
  ];

  const CUSTOMERS = [
    ["Mira the Baker", "♨", "Something for an early morning.", "#f1d7c8"],
    ["Old Moss", "♟", "The forest recommended your shop.", "#d7e4d1"],
    ["Juniper", "♫", "A little courage before tonight's show.", "#e1d7ef"],
    ["Postmaster Pip", "✉", "Special delivery—with haste!", "#d6e5ed"],
    ["Lady Bramble", "♛", "Only your finest bottle, dear.", "#efd9df"],
    ["Tink the Smith", "⚒", "For science. Probably.", "#e8ddcc"],
  ];

  const ACHIEVEMENTS = [
    { id: "firstBrew", icon: "⚗", name: "It Didn't Explode!", description: "Collect your first potion", test: s => s.stats.brewed >= 1 },
    { id: "orderFive", icon: "▤", name: "Village Favorite", description: "Complete 5 customer orders", test: s => s.stats.orders >= 5 },
    { id: "coin500", icon: "●", name: "Pocketful of Gold", description: "Earn 500 coins in total", test: s => s.stats.coinsEarned >= 500 },
    { id: "brew25", icon: "✦", name: "Practically an Expert", description: "Brew 25 potions", test: s => s.stats.brewed >= 25 },
    { id: "rebirth", icon: "★", name: "Written in the Stars", description: "Perform a starry rebirth", test: s => s.stats.prestiges >= 1 },
  ];

  const isRecord = value => Boolean(value) && typeof value === "object" && !Array.isArray(value);
  const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const int = (value, fallback = 0, min = 0, max = Number.MAX_SAFE_INTEGER) => Math.min(max, Math.max(min, Math.floor(finite(value, fallback))));
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function todayKey(now = Date.now()) {
    const date = new Date(now);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function defaultState(now = Date.now()) {
    return {
      version: SAVE_VERSION, coins: 30, xp: 0, level: 1, stardust: 0,
      ingredients: { herb: 7, mushroom: 4, crystal: 0, ember: 0 },
      potions: Object.fromEntries(RECIPES.map(recipe => [recipe.id, 0])),
      upgrades: Object.fromEntries(UPGRADES.map(upgrade => [upgrade.id, 0])),
      brew: null, orders: [], nextOrderId: 1,
      daily: { date: todayKey(now), orders: 0, claimed: false },
      boostUntil: 0, starterClaimed: false, tutorialSeen: false,
      achievements: {},
      stats: { taps: 0, brewed: 0, orders: 0, coinsEarned: 0, prestiges: 0 },
      lastSeen: now,
    };
  }

  function recipeById(id) { return RECIPES.find(recipe => recipe.id === id); }
  function upgradeById(id) { return UPGRADES.find(upgrade => upgrade.id === id); }
  function xpNeeded(level) { return Math.round(38 * Math.pow(Math.max(1, int(level, 1, 1)), 1.28)); }
  function storageCap(state) { return 60 + int(state.upgrades?.shelves, 0, 0, 6) * 25; }
  function gatherRate(state) { return .28 * (1 + int(state.upgrades?.garden, 0, 0, 8) * .3); }
  function manualGatherAmount(state) { return 2 + int(state.upgrades?.basket, 0, 0, 6); }
  function coinMultiplier(state, now = Date.now()) { return (1 + state.stardust * .1) * (now < state.boostUntil ? 2 : 1); }
  function orderMultiplier(state, now = Date.now()) { return coinMultiplier(state, now) * (1 + state.upgrades.ledger * .15); }
  function brewSpeedMultiplier(state) { return 1 + state.upgrades.cauldron * .12; }
  function unlockedIngredients(state) { return Object.entries(INGREDIENTS).filter(([, item]) => item.unlock <= state.level).map(([id]) => id); }
  function totalIngredients(state) { return Object.values(state.ingredients).reduce((sum, count) => sum + count, 0); }

  function normalizeState(input, now = Date.now()) {
    const fresh = defaultState(now);
    if (!isRecord(input)) return fresh;
    const state = { ...fresh };
    state.coins = int(input.coins, fresh.coins);
    state.xp = int(input.xp);
    state.level = int(input.level, 1, 1, 10000);
    state.stardust = int(input.stardust);
    state.ingredients = Object.fromEntries(Object.keys(INGREDIENTS).map(id => [id, int(isRecord(input.ingredients) ? input.ingredients[id] : 0)]));
    state.potions = Object.fromEntries(RECIPES.map(recipe => [recipe.id, int(isRecord(input.potions) ? input.potions[recipe.id] : 0)]));
    state.upgrades = Object.fromEntries(UPGRADES.map(upgrade => [upgrade.id, int(isRecord(input.upgrades) ? input.upgrades[upgrade.id] : 0, 0, 0, upgrade.max)]));
    state.nextOrderId = int(input.nextOrderId, 1, 1);
    state.boostUntil = int(input.boostUntil);
    state.starterClaimed = input.starterClaimed === true;
    state.tutorialSeen = input.tutorialSeen === true;
    state.lastSeen = clamp(finite(input.lastSeen, now), 0, now);
    state.achievements = isRecord(input.achievements) ? { ...input.achievements } : {};
    const sourceStats = isRecord(input.stats) ? input.stats : {};
    state.stats = { ...sourceStats };
    for (const id of Object.keys(fresh.stats)) state.stats[id] = int(sourceStats[id]);
    const sourceDaily = isRecord(input.daily) ? input.daily : {};
    state.daily = {
      date: typeof sourceDaily.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sourceDaily.date) ? sourceDaily.date : todayKey(now),
      orders: int(sourceDaily.orders), claimed: sourceDaily.claimed === true,
    };
    const sourceBrew = isRecord(input.brew) ? input.brew : null;
    if (sourceBrew && recipeById(sourceBrew.recipeId)) {
      const startedAt = clamp(finite(sourceBrew.startedAt, now), 0, now);
      const durationMs = int(sourceBrew.durationMs, recipeById(sourceBrew.recipeId).seconds * 1000, 1, OFFLINE_CAP_SECONDS * 1000);
      const endsAt = clamp(finite(sourceBrew.endsAt, startedAt + durationMs), startedAt, startedAt + durationMs);
      state.brew = { recipeId: sourceBrew.recipeId, startedAt, endsAt, durationMs };
    }
    const seenIds = new Set();
    state.orders = (Array.isArray(input.orders) ? input.orders : []).map(order => normalizeOrder(order, state)).filter(order => {
      if (!order || seenIds.has(order.id)) return false;
      seenIds.add(order.id); return true;
    }).slice(0, 3);
    state.nextOrderId = Math.max(state.nextOrderId, ...state.orders.map(order => order.id + 1), 1);
    while (state.xp >= xpNeeded(state.level)) {
      state.xp -= xpNeeded(state.level);
      state.level += 1;
    }
    enforceStorageCap(state);
    return state;
  }

  function normalizeOrder(order, state) {
    if (!isRecord(order)) return null;
    const recipe = recipeById(order.recipeId);
    if (!recipe || recipe.unlock > state.level) return null;
    const id = int(order.id, 0, 1);
    if (!id) return null;
    return {
      id, customer: typeof order.customer === "string" ? order.customer.slice(0, 80) : CUSTOMERS[0][0],
      avatar: typeof order.avatar === "string" ? order.avatar.slice(0, 8) : CUSTOMERS[0][1],
      note: typeof order.note === "string" ? order.note.slice(0, 160) : CUSTOMERS[0][2],
      avatarColor: typeof order.avatarColor === "string" ? order.avatarColor.slice(0, 30) : CUSTOMERS[0][3],
      recipeId: recipe.id, quantity: int(order.quantity, 1, 1, 2),
      reward: int(order.reward, recipe.sell, 1), xp: int(order.xp, 12, 1),
    };
  }

  function parseSave(raw, now = Date.now()) {
    if (typeof raw !== "string" || !raw.trim()) return { state: defaultState(now), recovered: false };
    try { return { state: normalizeState(JSON.parse(raw), now), recovered: false }; }
    catch (_) { return { state: defaultState(now), recovered: true }; }
  }

  function canAffordRecipe(state, recipe) {
    return Boolean(recipe) && Object.entries(recipe.ingredients).every(([id, count]) => state.ingredients[id] >= count);
  }

  function startBrew(state, recipeId, now = Date.now()) {
    const recipe = recipeById(recipeId);
    if (state.brew || !recipe || recipe.unlock > state.level || !canAffordRecipe(state, recipe)) return false;
    for (const [id, count] of Object.entries(recipe.ingredients)) state.ingredients[id] -= count;
    const durationMs = Math.round(recipe.seconds * 1000 / brewSpeedMultiplier(state));
    state.brew = { recipeId, startedAt: now, endsAt: now + durationMs, durationMs };
    return true;
  }

  function addXp(state, amount) {
    const levels = [];
    state.xp += int(amount);
    while (state.xp >= xpNeeded(state.level)) {
      state.xp -= xpNeeded(state.level);
      state.level += 1;
      state.coins += 20 * state.level;
      levels.push(state.level);
    }
    return levels;
  }

  function collectBrew(state, now = Date.now()) {
    if (!state.brew || state.brew.endsAt > now) return null;
    const recipe = recipeById(state.brew.recipeId);
    if (!recipe) { state.brew = null; return null; }
    state.potions[recipe.id] += 1;
    state.stats.brewed += 1;
    state.brew = null;
    return { recipe, levels: addXp(state, 5 + recipe.unlock * 2) };
  }

  function generateOrder(state, random = Math.random) {
    const availableRecipes = RECIPES.filter(recipe => recipe.unlock <= state.level);
    const recipe = availableRecipes[Math.floor(clamp(random(), 0, .999999) * availableRecipes.length)];
    const quantity = state.level >= 4 && random() > .68 ? 2 : 1;
    const customer = CUSTOMERS[Math.floor(clamp(random(), 0, .999999) * CUSTOMERS.length)];
    return {
      id: state.nextOrderId++, customer: customer[0], avatar: customer[1], note: customer[2], avatarColor: customer[3],
      recipeId: recipe.id, quantity,
      reward: Math.round(recipe.sell * quantity * (1.45 + random() * .25)),
      xp: Math.round(12 + recipe.unlock * 5 + quantity * 4),
    };
  }

  function ensureOrders(state, random = Math.random) { while (state.orders.length < 3) state.orders.push(generateOrder(state, random)); }

  function fulfillOrder(state, orderId, now = Date.now(), random = Math.random) {
    const index = state.orders.findIndex(item => item.id === orderId);
    if (index < 0) return null;
    const order = state.orders[index];
    if (state.potions[order.recipeId] < order.quantity) return null;
    state.potions[order.recipeId] -= order.quantity;
    const reward = Math.round(order.reward * orderMultiplier(state, now));
    state.coins += reward; state.stats.coinsEarned += reward; state.stats.orders += 1; state.daily.orders += 1;
    state.orders.splice(index, 1);
    const levels = addXp(state, order.xp);
    state.orders.push(generateOrder(state, random));
    return { reward, levels };
  }

  function upgradeCost(state, upgrade) { return Math.round(upgrade.baseCost * Math.pow(1.72, state.upgrades[upgrade.id])); }
  function buyUpgrade(state, id) {
    const upgrade = upgradeById(id);
    if (!upgrade || state.upgrades[id] >= upgrade.max) return false;
    const cost = upgradeCost(state, upgrade);
    if (state.coins < cost) return false;
    state.coins -= cost; state.upgrades[id] += 1; return true;
  }

  function claimDaily(state) {
    if (state.daily.claimed || state.daily.orders < 5) return false;
    state.daily.claimed = true; state.coins += 50; state.stardust += 1; state.stats.coinsEarned += 50; return true;
  }

  function prestigeReward(state) { return Math.max(1, Math.floor((state.level - 6) / 2)); }
  function performPrestige(state, reward = prestigeReward(state), now = Date.now()) {
    if (state.level < 8) return null;
    const next = defaultState(now);
    next.stardust = state.stardust + int(reward, 1, 1);
    next.achievements = { ...state.achievements };
    next.stats = { ...state.stats, prestiges: state.stats.prestiges + 1 };
    next.tutorialSeen = true;
    next.starterClaimed = state.starterClaimed;
    return next;
  }

  function refreshOrder(state, random = Math.random) {
    if (state.coins < 15 || !state.orders.length) return false;
    state.coins -= 15; state.orders.shift(); state.orders.push(generateOrder(state, random)); return true;
  }

  function resetDailyIfNeeded(state, now = Date.now()) {
    const date = todayKey(now);
    if (state.daily.date !== date) state.daily = { date, orders: 0, claimed: false };
  }

  function enforceStorageCap(state) {
    let excess = Math.max(0, totalIngredients(state) - storageCap(state));
    for (const id of Object.keys(INGREDIENTS).reverse()) {
      const removed = Math.min(state.ingredients[id], excess);
      state.ingredients[id] -= removed; excess -= removed;
    }
  }

  function addRandomIngredients(state, amount, random = Math.random) {
    const available = unlockedIngredients(state), cap = storageCap(state);
    let added = 0;
    for (let i = 0; i < int(amount) && totalIngredients(state) < cap; i += 1) {
      const id = available[Math.floor(clamp(random(), 0, .999999) * available.length)];
      state.ingredients[id] += 1; added += 1;
    }
    return added;
  }

  function offlineElapsedSeconds(state, now = Date.now()) { return clamp((now - finite(state.lastSeen, now)) / 1000, 0, OFFLINE_CAP_SECONDS); }
  function activeElapsedSeconds(lastTickAt, now = Date.now(), hidden = false) {
    return hidden ? 0 : clamp((now - finite(lastTickAt, now)) / 1000, 0, 5);
  }

  return Object.freeze({
    SAVE_VERSION, OFFLINE_CAP_SECONDS, INGREDIENTS, RECIPES, UPGRADES, CUSTOMERS, ACHIEVEMENTS,
    clamp, todayKey, defaultState, normalizeState, parseSave, recipeById, upgradeById, xpNeeded,
    storageCap, gatherRate, manualGatherAmount, coinMultiplier, orderMultiplier, brewSpeedMultiplier,
    unlockedIngredients, totalIngredients, canAffordRecipe, startBrew, collectBrew, addXp,
    generateOrder, ensureOrders, fulfillOrder, upgradeCost, buyUpgrade, claimDaily, prestigeReward, performPrestige, refreshOrder,
    resetDailyIfNeeded, addRandomIngredients, offlineElapsedSeconds, activeElapsedSeconds,
  });
});
