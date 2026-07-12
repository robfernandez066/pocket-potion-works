"use strict";

(function exposePocketPotionLogic(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.PPWLogic = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createPocketPotionLogic() {
  const SAVE_VERSION = 1;
  const OFFLINE_CAP_SECONDS = 4 * 60 * 60;
  const GATHER_CONFIG = Object.freeze({ maxCharges: 3, rechargeSeconds: 30, amountPerCharge: 3 });
  const FINISH_BREW_CONFIG = Object.freeze({ minRemainingSeconds: 45, remainingMultiplier: .6, maxUsesPerBrew: 1 });

  const INGREDIENTS = {
    herb: { name: "Dewleaf", icon: "☘", color: "#dcebd8", unlock: 1 },
    mushroom: { name: "Mooshroom", icon: "♧", color: "#f0d8d5", unlock: 1 },
    crystal: { name: "Starshard", icon: "♦", color: "#dfd9f0", unlock: 2 },
    mist: { name: "Mist Pearl", icon: "◌", color: "#d7e9ea", unlock: 3 },
    ember: { name: "Sun Ember", icon: "✹", color: "#f4dfbd", unlock: 4 },
    lavender: { name: "Dream Lavender", icon: "❀", color: "#e7dbef", unlock: 5 },
  };

  const RECIPES = [
    { id: "tonic", name: "Meadow Tonic", icon: "⚗", color: "#7ebd87", unlock: 1, seconds: 30, sell: 14, ingredients: { herb: 2, mushroom: 1 } },
    { id: "clarity", name: "Clarity Elixir", icon: "◈", color: "#7faec3", unlock: 2, seconds: 66, sell: 27, ingredients: { herb: 3, crystal: 1 } },
    { id: "moon", name: "Moonmilk", icon: "☾", color: "#8d79bd", unlock: 3, seconds: 75, sell: 46, ingredients: { mushroom: 2, crystal: 2 } },
    { id: "bloom", name: "Cloudbloom Tea", icon: "☁", color: "#80b8b3", unlock: 3, seconds: 78, sell: 52, ingredients: { herb: 2, mist: 2 } },
    { id: "sun", name: "Bottled Sunrise", icon: "☀", color: "#dd9c54", unlock: 4, seconds: 88, sell: 72, ingredients: { herb: 2, crystal: 1, ember: 2 } },
    { id: "heart", name: "Kindheart Cordial", icon: "♥", color: "#cc7f91", unlock: 5, seconds: 100, sell: 91, ingredients: { herb: 2, crystal: 1, lavender: 2 } },
    { id: "dream", name: "Dreamer's Draught", icon: "✦", color: "#c77d9b", unlock: 6, seconds: 112, sell: 118, ingredients: { mushroom: 3, crystal: 2, ember: 2 } },
    { id: "starlight", name: "Starlight Philter", icon: "☆", color: "#7569b4", unlock: 7, seconds: 125, sell: 156, ingredients: { mist: 2, ember: 2, lavender: 2 } },
  ];

  const UPGRADES = [
    { id: "garden", name: "Moonlit Garden", icon: "☘", description: "+25% passive ingredients per level", baseCost: 70, max: 8 },
    { id: "basket", name: "Bottomless Basket", icon: "⌄", description: "+1 ingredient per charged harvest", baseCost: 65, max: 6 },
    { id: "cauldron", name: "Copper Cauldron", icon: "⚗", description: "Brews finish 10% faster per level", baseCost: 90, max: 7 },
    { id: "shelves", name: "Pantry Shelves", icon: "▤", description: "+25 ingredient storage per level", baseCost: 85, max: 6 },
    { id: "ledger", name: "Golden Ledger", icon: "●", description: "+12% order coins per level", baseCost: 110, max: 6 },
  ];

  const CUSTOMERS = [
    ["Mira the Baker", "♨", "Something for an early morning.", "#f1d7c8"],
    ["Old Moss", "♟", "The forest recommended your shop.", "#d7e4d1"],
    ["Juniper", "♫", "A little courage before tonight's show.", "#e1d7ef"],
    ["Postmaster Pip", "✉", "Special delivery—with haste!", "#d6e5ed"],
    ["Lady Bramble", "♛", "Only your finest bottle, dear.", "#efd9df"],
    ["Tink the Smith", "⚒", "For science. Probably.", "#e8ddcc"],
    ["Fern the Gardener", "❀", "My seedlings could use a little encouragement.", "#dbe8cf"],
    ["Captain Wren", "⚑", "A steady hand for the road ahead.", "#d8dfec"],
    ["Nell of the Mill", "≈", "The night shift could use some sparkle.", "#e8dec7"],
    ["Rowan the Tailor", "✂", "Something bright for a difficult hem.", "#ead7e2"],
    ["Archivist Sol", "⌘", "For a particularly stubborn footnote.", "#d9d5e9"],
    ["Bee Keeper Bea", "✿", "The hives have been unusually dramatic.", "#f0e0b8"],
  ];

  const ACHIEVEMENTS = [
    { id: "firstBrew", icon: "⚗", name: "It Didn't Explode!", description: "Collect your first potion", test: s => s.stats.brewed >= 1 },
    { id: "orderFive", icon: "▤", name: "Village Favorite", description: "Complete 5 customer orders", test: s => s.stats.orders >= 5 },
    { id: "coin500", icon: "●", name: "Pocketful of Gold", description: "Earn 500 coins in total", test: s => s.stats.coinsEarned >= 500 },
    { id: "brew25", icon: "✦", name: "Practically an Expert", description: "Brew 25 potions", test: s => s.stats.brewed >= 25 },
    { id: "rebirth", icon: "★", name: "Written in the Stars", description: "Perform a starry rebirth", test: s => s.stats.prestiges >= 1 },
    { id: "tap50", icon: "☘", name: "Green Thumb", description: "Gather by hand 50 times", test: s => s.stats.taps >= 50 },
    { id: "levelFour", icon: "✧", name: "Village Alchemist", description: "Reach level 4", test: s => s.level >= 4 },
    { id: "upgradeThree", icon: "⌂", name: "Cozy Improvements", description: "Buy 3 workshop upgrades", test: s => Object.values(s.upgrades).reduce((sum, level) => sum + level, 0) >= 3 },
  ];

  const BEGINNER_QUESTS = Object.freeze({ steps: 7, finalRecipe: "clarity" });

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
      ingredients: { herb: 7, mushroom: 4, crystal: 0, mist: 0, ember: 0, lavender: 0 },
      potions: Object.fromEntries(RECIPES.map(recipe => [recipe.id, 0])),
      upgrades: Object.fromEntries(UPGRADES.map(upgrade => [upgrade.id, 0])),
      brew: null, orders: [], nextOrderId: 1,
      daily: { date: todayKey(now), orders: 0, claimed: false },
      gather: { charges: GATHER_CONFIG.maxCharges, lastRechargeAt: now, targetId: null },
      discovery: { brewed: {}, delivered: {} },
      boostUntil: 0, starterClaimed: false, tutorialSeen: false,
      achievements: {},
      stats: { taps: 0, brewed: 0, orders: 0, coinsEarned: 0, prestiges: 0 },
      lastSeen: now,
    };
  }

  function recipeById(id) { return RECIPES.find(recipe => recipe.id === id); }
  function upgradeById(id) { return UPGRADES.find(upgrade => upgrade.id === id); }
  function tutorialQuest({ id, step, status, title, detail, view, targetSelector, targetKind = "control", buttonLabel = "Show me" }) {
    return { id, step, status, label: `First steps · ${step} of ${BEGINNER_QUESTS.steps}`, title, detail, view, targetSelector, targetKind, buttonLabel };
  }

  function recipeTutorialState(state, recipeId, step, purpose, now) {
    const recipe = recipeById(recipeId);
    if (state.brew) {
      const matching = state.brew.recipeId === recipeId;
      if (state.brew.endsAt <= now) return tutorialQuest({ id: `${purpose}-collect`, step, status: "ready-to-collect", title: `Collect ${matching ? recipe.name : "the finished potion"}`, detail: "The brew is ready. Use the Collect button in the cauldron panel.", view: "workshop", targetSelector: "#collectBrewButton", buttonLabel: "Show Collect" });
      return tutorialQuest({ id: `${purpose}-waiting`, step, status: "in-progress", title: `${recipeById(state.brew.recipeId).name} is brewing`, detail: matching ? "The cauldron is working. Return when the timer reaches zero." : `Finish the current brew before starting ${recipe.name}.`, view: "workshop", targetSelector: "#brewSlot", targetKind: "status", buttonLabel: "Show timer" });
    }
    if (state.potions[recipeId] > 0) {
      const order = state.orders.find(item => item.recipeId === recipeId && state.potions[recipeId] >= item.quantity);
      if (order) return tutorialQuest({ id: `${purpose}-deliver`, step: purpose === "clarity" ? 7 : step, status: "needs-delivery", title: `Deliver ${recipe.name}`, detail: "The matching order is ready in your Workshop. Deliver it without changing tabs.", view: "workshop", targetSelector: `[data-quick-deliver="${order.id}"]`, buttonLabel: "Show Deliver" });
    }
    if (canAffordRecipe(state, recipe)) return tutorialQuest({ id: `${purpose}-start`, step, status: "available-to-start", title: `Brew ${recipe.name}`, detail: "Every required ingredient is ready. Use this recipe's Brew button.", view: "workshop", targetSelector: `[data-brew="${recipeId}"]`, buttonLabel: "Show Brew" });
    const missing = Object.entries(recipe.ingredients).filter(([id, count]) => state.ingredients[id] < count).map(([id, count]) => `${count - state.ingredients[id]} ${INGREDIENTS[id].name}`).join(" and ");
    return tutorialQuest({ id: `${purpose}-ingredients`, step, status: "insufficient-ingredients", title: `Gather for ${recipe.name}`, detail: `Still needed: ${missing}. Use a charged harvest.`, view: "workshop", targetSelector: "#gatherButton", buttonLabel: "Show Gather" });
  }

  function beginnerQuest(state, now = Date.now()) {
    if (state.discovery.delivered.clarity) return null;
    if (state.stats.orders < 1) {
      const quest = recipeTutorialState(state, "tonic", 1, "first-tonic", now);
      return quest.status === "needs-delivery" ? { ...quest, step: 2, label: `First steps · 2 of ${BEGINNER_QUESTS.steps}` } : quest;
    }
    const upgradesBought = Object.values(state.upgrades).reduce((sum, level) => sum + level, 0);
    if (!upgradesBought) {
      const affordable = UPGRADES.filter(upgrade => upgradeCost(state, upgrade) <= state.coins).sort((a, b) => upgradeCost(state, a) - upgradeCost(state, b))[0];
      if (affordable) return tutorialQuest({ id: "first-upgrade-affordable", step: 4, status: "affordable-upgrade", title: `Buy ${affordable.name}`, detail: "You have enough coins. Use this upgrade's purchase button.", view: "upgrades", targetSelector: `[data-upgrade="${affordable.id}"]`, buttonLabel: "Show Upgrade" });
      const earnCoins = recipeTutorialState(state, "tonic", 3, "fund-upgrade", now);
      const cheapest = Math.min(...UPGRADES.map(upgrade => upgradeCost(state, upgrade)));
      return { ...earnCoins, blockedBy: "insufficient-coins", detail: `Need ${Math.max(0, cheapest - state.coins)} more coins for an upgrade. ${earnCoins.detail}` };
    }
    if (state.level < 2) return recipeTutorialState(state, "tonic", 4, "reach-level-two", now);
    if (state.ingredients.crystal < 1 && !state.brew && !state.potions.clarity) {
      if (state.gather.targetId !== "crystal") return tutorialQuest({ id: "focus-starshard", step: 5, status: "choose-gather-target", title: "Focus on Starshard", detail: "Open the Pantry and choose Starshard so your next charged harvest finds exactly what you need.", view: "workshop", targetSelector: '[data-gather-target="crystal"]', buttonLabel: "Show Starshard" });
      return tutorialQuest({ id: "gather-starshard", step: 5, status: "gather-new-ingredient", title: "Gather your first Starshard", detail: "Starshard is selected. Use one charged harvest.", view: "workshop", targetSelector: "#gatherButton", targetKind: "gather-and-pantry", buttonLabel: "Show Gather" });
    }
    return recipeTutorialState(state, "clarity", 6, "clarity", now);
  }

  function tutorialTransitionPrompt(before, after, currentView) {
    if (!before || !after || before.id === after.id || after.view === currentView) return null;
    return { key: `${before.id}->${after.id}`, title: after.title, detail: after.detail, view: after.view, targetSelector: after.targetSelector, targetKind: after.targetKind };
  }
  function unlocksAtLevel(level) {
    return {
      ingredients: Object.values(INGREDIENTS).filter(item => item.unlock === level),
      recipes: RECIPES.filter(recipe => recipe.unlock === level),
    };
  }
  function xpNeeded(level) { return Math.round(38 * Math.pow(Math.max(1, int(level, 1, 1)), 1.28)); }
  function storageCap(state) { return 60 + Math.max(0, state.level - 1) * 10 + int(state.upgrades?.shelves, 0, 0, 6) * 25; }
  function gatherRate(state) { return .18 * (1 + int(state.upgrades?.garden, 0, 0, 8) * .25); }
  function manualGatherAmount(state) { return GATHER_CONFIG.amountPerCharge + int(state.upgrades?.basket, 0, 0, 6); }
  function coinMultiplier(state, now = Date.now()) { return (1 + state.stardust * .1) * (now < state.boostUntil ? 2 : 1); }
  function orderMultiplier(state, now = Date.now()) { return coinMultiplier(state, now) * (1 + state.upgrades.ledger * .12); }
  function brewSpeedMultiplier(state) { return 1 + state.upgrades.cauldron * .1; }
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
    const sourceGather = isRecord(input.gather) ? input.gather : {};
    state.gather = {
      charges: int(sourceGather.charges, GATHER_CONFIG.maxCharges, 0, GATHER_CONFIG.maxCharges),
      lastRechargeAt: clamp(finite(sourceGather.lastRechargeAt, now), 0, now),
      targetId: typeof sourceGather.targetId === "string" && INGREDIENTS[sourceGather.targetId]?.unlock <= state.level ? sourceGather.targetId : null,
    };
    const sourceDiscovery = isRecord(input.discovery) ? input.discovery : {};
    state.discovery = {
      brewed: isRecord(sourceDiscovery.brewed) ? { ...sourceDiscovery.brewed } : {},
      delivered: isRecord(sourceDiscovery.delivered) ? { ...sourceDiscovery.delivered } : {},
    };
    if (!isRecord(input.discovery)) {
      if (state.stats.brewed > 0) state.discovery.brewed.tonic = 1;
      if (state.stats.orders > 0) state.discovery.delivered.tonic = 1;
      if (state.level >= 3) { state.discovery.brewed.clarity = 1; state.discovery.delivered.clarity = 1; }
    }
    const sourceBrew = isRecord(input.brew) ? input.brew : null;
    if (sourceBrew && recipeById(sourceBrew.recipeId)) {
      const startedAt = clamp(finite(sourceBrew.startedAt, now), 0, now);
      const durationMs = int(sourceBrew.durationMs, recipeById(sourceBrew.recipeId).seconds * 1000, 1, OFFLINE_CAP_SECONDS * 1000);
      const endsAt = clamp(finite(sourceBrew.endsAt, startedAt + durationMs), startedAt, startedAt + durationMs);
      state.brew = { recipeId: sourceBrew.recipeId, startedAt, endsAt, durationMs, assistUses: int(sourceBrew.assistUses, 0, 0, FINISH_BREW_CONFIG.maxUsesPerBrew) };
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
    try {
      const input = JSON.parse(raw);
      const sourceVersion = isRecord(input) && Number.isFinite(Number(input.version)) ? Number(input.version) : null;
      if (sourceVersion !== null && sourceVersion > SAVE_VERSION) {
        return { state: null, recovered: false, blocked: true, reason: "unsupported-future-version", sourceVersion };
      }
      return { state: normalizeState(input, now), recovered: false, blocked: false, sourceVersion };
    }
    catch (_) { return { state: defaultState(now), recovered: true }; }
  }

  function shouldBlockSaveWrite(loadResult) {
    return loadResult?.blocked === true && loadResult.reason === "unsupported-future-version";
  }

  function canAffordRecipe(state, recipe) {
    return Boolean(recipe) && Object.entries(recipe.ingredients).every(([id, count]) => state.ingredients[id] >= count);
  }

  function startBrew(state, recipeId, now = Date.now()) {
    const recipe = recipeById(recipeId);
    if (state.brew || !recipe || recipe.unlock > state.level || !canAffordRecipe(state, recipe)) return false;
    for (const [id, count] of Object.entries(recipe.ingredients)) state.ingredients[id] -= count;
    const durationMs = Math.round(recipe.seconds * 1000 / brewSpeedMultiplier(state));
    state.brew = { recipeId, startedAt: now, endsAt: now + durationMs, durationMs, assistUses: 0 };
    return true;
  }

  function finishBrewAssistStatus(state, now = Date.now()) {
    if (!state?.brew) return { available: false, reason: "no-active-brew", remainingMs: 0 };
    const remainingMs = Math.max(0, finite(state.brew.endsAt, now) - now);
    if (remainingMs <= 0) return { available: false, reason: "brew-ready", remainingMs: 0 };
    if (int(state.brew.assistUses, 0) >= FINISH_BREW_CONFIG.maxUsesPerBrew) return { available: false, reason: "already-used", remainingMs };
    if (remainingMs < FINISH_BREW_CONFIG.minRemainingSeconds * 1000) return { available: false, reason: "too-close-to-ready", remainingMs };
    return { available: true, reason: "available", remainingMs };
  }

  function applyFinishBrewAssist(state, now = Date.now()) {
    const status = finishBrewAssistStatus(state, now);
    if (!status.available) return { applied: false, ...status };
    const reducedRemainingMs = Math.max(1000, Math.ceil(status.remainingMs * FINISH_BREW_CONFIG.remainingMultiplier));
    state.brew.endsAt = now + reducedRemainingMs;
    state.brew.assistUses = int(state.brew.assistUses, 0) + 1;
    return { applied: true, reason: "applied", previousRemainingMs: status.remainingMs, remainingMs: reducedRemainingMs };
  }

  function addXp(state, amount) {
    const levels = [];
    state.xp += int(amount);
    while (state.xp >= xpNeeded(state.level)) {
      state.xp -= xpNeeded(state.level);
      state.level += 1;
      state.coins += 10 * state.level;
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
    state.discovery.brewed[recipe.id] = int(state.discovery.brewed[recipe.id]) + 1;
    state.brew = null;
    return { recipe, levels: addXp(state, 5 + recipe.unlock * 2) };
  }

  function generateOrder(state, random = Math.random) {
    const availableRecipes = RECIPES.filter(recipe => recipe.unlock <= state.level);
    const newestRecipes = availableRecipes.filter(recipe => recipe.unlock === state.level);
    const boardHasNewest = state.orders.some(order => recipeById(order.recipeId)?.unlock === state.level);
    const pool = newestRecipes.length && state.level > 1 && (!boardHasNewest || random() < .55) ? newestRecipes : availableRecipes;
    const recipe = pool[Math.floor(clamp(random(), 0, .999999) * pool.length)];
    const quantity = state.level >= 4 && random() > .68 ? 2 : 1;
    const customer = CUSTOMERS[Math.floor(clamp(random(), 0, .999999) * CUSTOMERS.length)];
    return {
      id: state.nextOrderId++, customer: customer[0], avatar: customer[1], note: customer[2], avatarColor: customer[3],
      recipeId: recipe.id, quantity,
      reward: Math.round(recipe.sell * quantity * (1.45 + random() * .25)),
      xp: Math.round(8 + recipe.unlock * 3 + quantity * 3),
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
    state.discovery.delivered[order.recipeId] = int(state.discovery.delivered[order.recipeId]) + order.quantity;
    state.orders.splice(index, 1);
    const levels = addXp(state, order.xp);
    state.orders.push(generateOrder(state, random));
    return { reward, levels };
  }

  function upgradeCost(state, upgrade) { return Math.round(upgrade.baseCost * Math.pow(1.9, state.upgrades[upgrade.id])); }
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
      const fallbackRecipe = state.level >= 2 && !state.discovery.delivered.clarity ? recipeById("clarity") : RECIPES.find(recipe => recipe.unlock <= state.level);
      const missing = fallbackRecipe ? Object.entries(fallbackRecipe.ingredients).flatMap(([id, count]) => Array(Math.max(0, count - state.ingredients[id])).fill(id)) : [];
      const slotsLeft = cap - totalIngredients(state);
      const pool = missing.length && slotsLeft <= missing.length ? missing : available;
      const id = pool[Math.floor(clamp(random(), 0, .999999) * pool.length)];
      state.ingredients[id] += 1; added += 1;
    }
    return added;
  }

  function rechargeGather(state, now = Date.now()) {
    if (state.gather.charges >= GATHER_CONFIG.maxCharges) { state.gather.lastRechargeAt = now; return 0; }
    const elapsed = Math.max(0, now - state.gather.lastRechargeAt);
    const restored = Math.min(GATHER_CONFIG.maxCharges - state.gather.charges, Math.floor(elapsed / (GATHER_CONFIG.rechargeSeconds * 1000)));
    if (restored > 0) {
      state.gather.charges += restored;
      state.gather.lastRechargeAt += restored * GATHER_CONFIG.rechargeSeconds * 1000;
    }
    return restored;
  }

  function chargedGather(state, now = Date.now(), random = Math.random) {
    rechargeGather(state, now);
    if (state.gather.charges < 1) {
      const waitMs = Math.max(0, GATHER_CONFIG.rechargeSeconds * 1000 - (now - state.gather.lastRechargeAt));
      return { added: 0, charges: 0, waitMs };
    }
    state.gather.charges -= 1;
    if (state.gather.charges === GATHER_CONFIG.maxCharges - 1) state.gather.lastRechargeAt = now;
    const targetId = state.gather.targetId;
    const amount = manualGatherAmount(state);
    let added = 0;
    if (targetId && INGREDIENTS[targetId]?.unlock <= state.level) {
      added = Math.min(amount, Math.max(0, storageCap(state) - totalIngredients(state)));
      state.ingredients[targetId] += added;
    } else added = addRandomIngredients(state, amount, random);
    return { added, targetId: targetId || null, charges: state.gather.charges, waitMs: GATHER_CONFIG.rechargeSeconds * 1000 };
  }

  function setGatherTarget(state, targetId) {
    if (targetId !== null && (!INGREDIENTS[targetId] || INGREDIENTS[targetId].unlock > state.level)) return false;
    state.gather.targetId = targetId;
    return true;
  }

  function offlineElapsedSeconds(state, now = Date.now()) { return clamp((now - finite(state.lastSeen, now)) / 1000, 0, OFFLINE_CAP_SECONDS); }
  function grantOfflineIngredients(state, elapsedSeconds, random = Math.random) {
    if (state.stats.orders < 1) return 0;
    const softCap = Math.floor(storageCap(state) * .75);
    const availableSpace = Math.max(0, softCap - totalIngredients(state));
    const requested = Math.min(availableSpace, Math.floor(clamp(finite(elapsedSeconds), 0, OFFLINE_CAP_SECONDS) * gatherRate(state) * .65));
    return addRandomIngredients(state, requested, random);
  }
  function activeElapsedSeconds(lastTickAt, now = Date.now(), hidden = false) {
    return hidden ? 0 : clamp((now - finite(lastTickAt, now)) / 1000, 0, 5);
  }

  return Object.freeze({
    SAVE_VERSION, OFFLINE_CAP_SECONDS, GATHER_CONFIG, FINISH_BREW_CONFIG, INGREDIENTS, RECIPES, UPGRADES, CUSTOMERS, ACHIEVEMENTS, BEGINNER_QUESTS,
    clamp, todayKey, defaultState, normalizeState, parseSave, shouldBlockSaveWrite, recipeById, upgradeById, beginnerQuest, tutorialTransitionPrompt, unlocksAtLevel, xpNeeded,
    storageCap, gatherRate, manualGatherAmount, coinMultiplier, orderMultiplier, brewSpeedMultiplier,
    unlockedIngredients, totalIngredients, canAffordRecipe, startBrew, finishBrewAssistStatus, applyFinishBrewAssist, collectBrew, addXp,
    generateOrder, ensureOrders, fulfillOrder, upgradeCost, buyUpgrade, claimDaily, prestigeReward, performPrestige, refreshOrder,
    resetDailyIfNeeded, addRandomIngredients, rechargeGather, chargedGather, setGatherTarget, offlineElapsedSeconds, grantOfflineIngredients, activeElapsedSeconds,
  });
});
