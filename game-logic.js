"use strict";

(function exposePocketPotionLogic(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.PPWLogic = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createPocketPotionLogic() {
  const SAVE_VERSION = 8;
  const OFFLINE_CAP_SECONDS = 4 * 60 * 60;
  const BASE_PASSIVE_RATE = .08;
  const PASSIVE_STORAGE_RATIO = .6;
  const GATHER_CONFIG = Object.freeze({ maxCharges: 3, rechargeSeconds: 30, amountPerCharge: 3 });
  const FINISH_BREW_CONFIG = Object.freeze({ minRemainingSeconds: 45, remainingMultiplier: .6, maxUsesPerBrew: 1 });
  const MASTERY_CONFIG = Object.freeze({ thresholds: Object.freeze([3, 8, 15]), coinBonusPerRank: .04 });
  const CUSTOMER_CONFIG = Object.freeze({ deliveriesPerHeart: 3, maxHearts: 3, heartBonusCoins: 12 });
  const COMPLETION_CARD_CONFIG = Object.freeze({ readableMs: 3000, fadeMs: 300 });
  const JOURNAL_REWARDS = Object.freeze({ story: 5, recipe: 5, achievement: 10 });
  const PRESTIGE_CONFIG = Object.freeze({ unlockLevel: 7, baseReward: 3, levelsPerBonus: 2 });
  const WEEKLY_CHAINS = Object.freeze([
    Object.freeze({ id: "neighbors", name: "Neighborly Notes", thresholds: Object.freeze([2, 4, 6]), rewards: Object.freeze([10, 10, 15]) }),
    Object.freeze({ id: "moonfair", name: "Moonfair Preparations", thresholds: Object.freeze([2, 5, 7]), rewards: Object.freeze([10, 10, 15]) }),
    Object.freeze({ id: "lanterns", name: "Lantern Night Stock", thresholds: Object.freeze([3, 6, 9]), rewards: Object.freeze([10, 10, 15]) }),
  ]);
  const COSMETICS = Object.freeze([
    Object.freeze({ id: "midnight", name: "Midnight Workshop", description: "The original violet workbench." }),
    Object.freeze({ id: "fern", name: "Fern Window", description: "Unlocked by brewing 10 potions." }),
    Object.freeze({ id: "mooncloth", name: "Mooncloth Shelves", description: "Unlocked by collecting the original eight recipes." }),
    Object.freeze({ id: "starglass", name: "Starglass Keepsake", description: "Unlocked by your first starry rebirth." }),
    Object.freeze({ id: "guild", name: "Guild Ribbon", description: "Unlocked by completing one rolling request chain." }),
    Object.freeze({ id: "heirloom", name: "Heirloom Garland", description: "Unlocked by collecting all twelve villager keepsakes." }),
    Object.freeze({ id: "dawnthread", name: "Dawnthread Workshop", description: "Unlocked by completing After the Stars." }),
  ]);
  const INGREDIENTS = {
    herb: { name: "Dewleaf", icon: "☘", color: "#dcebd8", unlock: 1 },
    mushroom: { name: "Mooshroom", icon: "♧", color: "#f0d8d5", unlock: 1 },
    crystal: { name: "Starshard", icon: "♦", color: "#dfd9f0", unlock: 2 },
    mist: { name: "Mist Pearl", icon: "◌", color: "#d7e9ea", unlock: 3 },
    ember: { name: "Sun Ember", icon: "✹", color: "#f4dfbd", unlock: 4 },
    mint: { name: "Frostmint", icon: "♢", color: "#d5ece5", unlock: 4 },
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
    { id: "lantern", name: "Lantern Sip", description: "A bright draught for twilight errands.", icon: "◇", color: "#d5a65c", unlock: 4, seconds: 88, sell: 72, ingredients: { herb: 2, crystal: 1, mint: 2 } },
    { id: "quiet", name: "Quietbell Tea", description: "Tea for hushing a busy room.", icon: "♬", color: "#8ebbb0", unlock: 5, seconds: 100, sell: 91, ingredients: { mushroom: 2, lavender: 1, mint: 2 } },
    { id: "way", name: "Wayfinder Cordial", description: "A cool cordial for finding the kindly road home.", icon: "⌖", color: "#6fa7a6", unlock: 6, seconds: 112, sell: 118, ingredients: { mushroom: 3, crystal: 2, mint: 2 } },
    { id: "aurora", name: "Aurora Nectar", description: "A bright nectar for celebrations past moonrise.", icon: "✧", color: "#9474c8", unlock: 7, seconds: 125, sell: 156, ingredients: { mist: 2, ember: 2, mint: 2 } },
  ];

  const SAMPLER_IDS = Object.freeze(["tonic", "clarity", "moon", "bloom", "sun", "heart", "dream", "starlight"]);

  const COLLECTION_GOALS = Object.freeze([
    Object.freeze({ id: "brewer", name: "Brewkeeper", target: 10, cosmeticId: "fern" }),
    Object.freeze({ id: "sampler", name: "Potion Sampler", target: SAMPLER_IDS.length, cosmeticId: "mooncloth" }),
    Object.freeze({ id: "keepsake", name: "First Star Keepsake", target: 1, cosmeticId: "starglass" }),
    Object.freeze({ id: "heirlooms", name: "Village Heirlooms", target: 12, cosmeticId: "heirloom" }),
  ]);

  const UPGRADES = [
    { id: "garden", path: "Harvest", name: "Moonlit Garden", icon: "☘", description: "+25% passive ingredients per level", baseCost: 70, max: 8 },
    { id: "basket", path: "Harvest", name: "Bottomless Basket", icon: "⌄", description: "+1 ingredient per charged harvest", baseCost: 65, max: 6 },
    { id: "cauldron", path: "Brewing", name: "Copper Cauldron", icon: "⚗", description: "Brews finish 10% faster per level", baseCost: 90, max: 7 },
    { id: "shelves", path: "Harvest", name: "Pantry Shelves", icon: "▤", description: "+25 ingredient storage per level", baseCost: 85, max: 6 },
    { id: "ledger", path: "Trade", name: "Golden Ledger", icon: "●", description: "+12% order coins per level", baseCost: 110, max: 6 },
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

  const CUSTOMER_CONTENT = Object.freeze([
    Object.freeze({ orderLines: Object.freeze(["The ovens wake before I do.", "A warm loaf deserves a steady baker.", "Could you bottle a calmer morning?"]), stories: Object.freeze(["Mira leaves the first bun of every batch on the village well for whoever starts work earliest.", "She learned to bake from a flour-smudged notebook whose final page is still blank.", "Mira decides the blank page should hold a recipe the whole village helps invent."]) }),
    Object.freeze({ orderLines: Object.freeze(["The moss has been whispering again.", "A hedgerow sent me with this request.", "The old oaks think this one is important."]), stories: Object.freeze(["Old Moss knows which footpaths appear only after rain.", "He once planted a walking stick; it grew into the crooked willow by the pond.", "He admits the forest does not actually talk loudly. He has simply become very good at listening."]) }),
    Object.freeze({ orderLines: Object.freeze(["My encore could use a little courage.", "This melody needs one brighter note.", "A sip before the curtain, please."]), stories: Object.freeze(["Juniper practices behind the mill because the turning wheel keeps perfect time.", "Her favorite song began as a tune for a nervous moonmoth.", "She finally plays that song in the square and names it after the alchemist who listened first."]) }),
    Object.freeze({ orderLines: Object.freeze(["Special delivery, gently hurried!", "The west route is especially uphill today.", "Rain or shine, the post must sparkle."]), stories: Object.freeze(["Pip sorts letters by destination, urgency, and how much hope seems tucked inside.", "His fastest route crosses three gardens and includes a mandatory biscuit stop.", "Pip starts a tiny free post service for letters people are not brave enough to send alone."]) }),
    Object.freeze({ orderLines: Object.freeze(["Something refined, but not terribly sensible.", "The conservatory requires a flourish.", "Surprise me within impeccable limits."]), stories: Object.freeze(["Lady Bramble secretly trims the palace hedges into animals after sunset.", "Her grandest hat was rescued from a bramble bush and still attracts robins.", "She opens the conservatory for village picnics and insists the muddy footprints improve the marble."]) }),
    Object.freeze({ orderLines: Object.freeze(["For a perfectly controlled experiment.", "The forge needs one less explosion today.", "I have goggles, tongs, and a theory."]), stories: Object.freeze(["Tink labels every invention, including the kettle and one unusually dependable spoon.", "The small brass bird on the forge roof was his first machine that chose where to fly.", "He stops calling mistakes scrap and builds them into a wind chime for the workshop door."]) }),
    Object.freeze({ orderLines: Object.freeze(["The seedlings asked very politely.", "My nasturtiums need encouragement.", "A little help for the greenhouse, please."]), stories: Object.freeze(["Fern can identify every garden in the village by the smell of its soil.", "She keeps a stubborn seed in a blue pot and greets it every morning.", "The stubborn seed finally blooms; Fern names the new flower Patience."]) }),
    Object.freeze({ orderLines: Object.freeze(["Steady hands make kind journeys.", "The road is long, but the weather is fair.", "One bottle for the trail ahead."]), stories: Object.freeze(["Captain Wren maps good resting spots as carefully as distant roads.", "Her compass points toward the place she is most needed, which is rarely north.", "She adds Pocket Potion Works to the map as the village's official safe harbor."]) }),
    Object.freeze({ orderLines: Object.freeze(["The millstones and I are on the late shift.", "A little shine for a floury night.", "Could you brighten the next sackful?"]), stories: Object.freeze(["Nell knows the mill's nighttime creaks well enough to hum their harmony.", "She grinds a special flour for the moonfair, though it dusts everything silver.", "Nell invites the village to paint the mill sails, then keeps every cheerful handprint."]) }),
    Object.freeze({ orderLines: Object.freeze(["This hem refuses to see reason.", "I need a brighter stitch of inspiration.", "Something elegant for a tangled afternoon."]), stories: Object.freeze(["Rowan saves every ribbon end because even the shortest piece can mend something.", "He sews tiny silver pockets inside winter coats for lucky stones and secret notes.", "His patchwork festival banner uses a scrap from every household in the village."]) }),
    Object.freeze({ orderLines: Object.freeze(["This footnote is resisting cataloging.", "The archives require a clearer afternoon.", "I have found a mystery between paragraphs."]), stories: Object.freeze(["Sol can tell who borrowed a book by the crumbs left between its pages.", "A missing catalogue card leads him to a shelf of villagers' unfinished stories.", "He leaves several pages blank so new village tales always have somewhere to belong."]) }),
    Object.freeze({ orderLines: Object.freeze(["The hives are rehearsing a tiny opera.", "A calmer buzz would be lovely.", "The bees voted for this request."]), stories: Object.freeze(["Bea names each hive after a different kind of weather.", "The bees build one honeycomb shaped exactly like the village clock.", "Bea bottles the season's last honey for a feast where everyone brings something sweet."]) }),
  ]);

  const SIGNATURE_COMMISSIONS = Object.freeze([
    Object.freeze({ id: "mira-dawn", customerId: "customer-0", recipeId: "tonic", title: "The First Oven", request: "A steady bottle for the village's earliest batch.", keepsake: Object.freeze({ mark: "FS", name: "Flour-Sun Pin", description: "Mira's tiny sunrise, dusted with flour." }) }),
    Object.freeze({ id: "moss-rainpath", customerId: "customer-1", recipeId: "moon", title: "The Rainpath Walk", request: "Moonlight for a footpath that appears after rain.", keepsake: Object.freeze({ mark: "WK", name: "Willow Knot", description: "A smooth knot from Old Moss's crooked willow." }) }),
    Object.freeze({ id: "juniper-encore", customerId: "customer-2", recipeId: "heart", title: "The Moonmoth Encore", request: "One brave cordial before the song's first public encore.", keepsake: Object.freeze({ mark: "SN", name: "Silver Note", description: "A bright note from Juniper's moonmoth song." }) }),
    Object.freeze({ id: "pip-hilltop", customerId: "customer-3", recipeId: "clarity", title: "Hilltop Express", request: "A clear head for the steepest route before sundown.", keepsake: Object.freeze({ mark: "BP", name: "Brass Postmark", description: "Pip's mark for a letter delivered with care." }) }),
    Object.freeze({ id: "bramble-toast", customerId: "customer-4", recipeId: "aurora", title: "The Conservatory Toast", request: "Dawn colors for the conservatory's first village picnic.", keepsake: Object.freeze({ mark: "RC", name: "Robin Cameo", description: "A tiny robin from Lady Bramble's rescued hat." }) }),
    Object.freeze({ id: "tink-trial", customerId: "customer-5", recipeId: "quiet", title: "The Quiet Forge Trial", request: "A calmer brew for one perfectly controlled experiment.", keepsake: Object.freeze({ mark: "CG", name: "Copper Gear", description: "The first gear Tink decided was not scrap." }) }),
    Object.freeze({ id: "fern-patience", customerId: "customer-6", recipeId: "bloom", title: "Patience in Bloom", request: "A gentle tea for the stubborn seed in the blue pot.", keepsake: Object.freeze({ mark: "BS", name: "Blue Seed", description: "A keepsake from Fern's famously patient flower." }) }),
    Object.freeze({ id: "wren-harbor", customerId: "customer-7", recipeId: "way", title: "A Safe Harbor", request: "A cordial for mapping the village's kindest resting places.", keepsake: Object.freeze({ mark: "CR", name: "Compass Rose", description: "Wren's compass rose points toward whoever needs help." }) }),
    Object.freeze({ id: "nell-moonfair", customerId: "customer-8", recipeId: "lantern", title: "The Silver Mill Shift", request: "Lantern light for flour that sparkles after midnight.", keepsake: Object.freeze({ mark: "MS", name: "Mill-Sail Charm", description: "A painted charm shaped like Nell's cheerful mill sails." }) }),
    Object.freeze({ id: "rowan-banner", customerId: "customer-9", recipeId: "sun", title: "The Festival Banner", request: "Bottled sunshine for the banner's final golden stitch.", keepsake: Object.freeze({ mark: "PS", name: "Patchwork Star", description: "A star sewn from Rowan's smallest ribbon ends." }) }),
    Object.freeze({ id: "sol-catalog", customerId: "customer-10", recipeId: "dream", title: "The Blank-Page Catalogue", request: "A dreaming draught for stories not written yet.", keepsake: Object.freeze({ mark: "IB", name: "Ivory Bookmark", description: "Sol's bookmark leaves room for the next village tale." }) }),
    Object.freeze({ id: "bea-feast", customerId: "customer-11", recipeId: "starlight", title: "The Last Honey Feast", request: "A starlit bottle for the feast's final jar of honey.", keepsake: Object.freeze({ mark: "HS", name: "Honeycomb Seal", description: "Bea's seal for a season shared sweetly." }) }),
  ]);

  const AFTER_STARS_STEPS = Object.freeze([
    Object.freeze({ id: "oven-remembers", title: "The Oven Remembers", customerId: "customer-0", recipeId: "tonic", request: "A meadow tonic for the first oven lit beneath the changed stars." }),
    Object.freeze({ id: "new-route", title: "A New Route", customerId: "customer-3", recipeId: "clarity", request: "A clarity elixir for mapping a post road through the starborn morning." }),
    Object.freeze({ id: "roots-after-starlight", title: "Roots After Starlight", customerId: "customer-6", recipeId: "bloom", request: "Cloudbloom tea to help the garden remember its roots after starlight." }),
    Object.freeze({ id: "dawnthread-hem", title: "The Dawnthread Hem", customerId: "customer-9", recipeId: "sun", request: "Bottled sunrise for the final golden hem of a dawnthread banner." }),
  ]);

  const RECIPE_LORE = Object.freeze({
    tonic: "A meadow remedy first brewed for gardeners who forgot to stop for lunch.",
    clarity: "Its square shimmer is said to put wandering thoughts back on the same path.",
    moon: "Moonmilk keeps a silver glow borrowed from the quietest hour of night.",
    bloom: "Cloudbloom Tea carries the fresh scent of rain that has not fallen yet.",
    sun: "Each bottle holds the golden instant when dawn reaches the village roofs.",
    heart: "Kindheart Cordial warms most when poured for someone else.",
    dream: "This draught gathers gentle dreams and leaves troublesome ones at the door.",
    starlight: "The final philter reflects constellations that only patient alchemists can see.",
    lantern: "A moonfair favorite for carrying lanterns home.",
    quiet: "This tea helps small sounds settle softly.",
    way: "This cordial remembers every welcoming doorstep.",
    aurora: "This nectar keeps dawn colors for late celebrations.",
  });

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
  const recipeCounts = (source = {}, fallback = {}) => Object.fromEntries(RECIPES.map(({ id }) => [id, int(source[id], fallback[id])]));

  function todayKey(now = Date.now()) {
    const date = new Date(now);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function defaultState(now = Date.now()) {
    return {
      version: SAVE_VERSION, coins: 30, xp: 0, level: 1, stardust: 0,
      ingredients: { herb: 7, mushroom: 4, crystal: 0, mist: 0, ember: 0, mint: 0, lavender: 0 },
      potions: recipeCounts(),
      upgrades: Object.fromEntries(UPGRADES.map(upgrade => [upgrade.id, 0])),
      brew: null, orders: [], nextOrderId: 1,
      daily: { date: todayKey(now), orders: 0, claimed: false },
      gather: { charges: GATHER_CONFIG.maxCharges, lastRechargeAt: now, targetId: null },
      discovery: { brewed: recipeCounts(), delivered: recipeCounts() },
      mastery: recipeCounts(),
      customers: Object.fromEntries(CUSTOMERS.map((_, index) => [`customer-${index}`, { deliveries: 0, hearts: 0 }])),
      commissions: { invitations: 0, selectedId: null, completedIds: [] },
      afterStars: { step: 0 },
      journal: { readStories: [], readRecipes: [], claimedAchievements: [] },
      weekly: { cycle: 0, progress: 0, claimedSteps: 0 },
      customization: { selected: "midnight" },
      boostUntil: 0, starterClaimed: false, tutorialSeen: false,
      achievements: {},
      stats: { taps: 0, brewed: 0, orders: 0, coinsEarned: 0, prestiges: 0 },
      lastSeen: now,
    };
  }

  function recipeById(id) { return RECIPES.find(recipe => recipe.id === id); }
  function upgradeById(id) { return UPGRADES.find(upgrade => upgrade.id === id); }
  function customerIdFromOrder(order) {
    if (typeof order?.customerId === "string" && /^customer-(?:[0-9]|1[01])$/.test(order.customerId)) return order.customerId;
    const index = CUSTOMERS.findIndex(customer => customer[0] === order?.customer);
    return `customer-${Math.max(0, index)}`;
  }
  function customerIndexFromId(customerId) {
    return typeof customerId === "string" && /^customer-(?:[0-9]|1[01])$/.test(customerId) ? Number(customerId.slice(9)) : 0;
  }
  function commissionById(id) { return SIGNATURE_COMMISSIONS.find(commission => commission.id === id); }
  function isSignatureOrder(order) { return Boolean(commissionById(order?.commissionId)); }
  function afterStarsStepByIndex(index) { return AFTER_STARS_STEPS[int(index, 0, 0, AFTER_STARS_STEPS.length - 1)]; }
  function isAfterStarsOrder(order) {
    const index = Number(order?.afterStarsStep);
    return Number.isInteger(index) && index >= 0 && index < AFTER_STARS_STEPS.length;
  }
  function isReservedOrder(order) { return isSignatureOrder(order) || isAfterStarsOrder(order); }
  function signatureOrderEconomics(commission) {
    const recipe = recipeById(commission?.recipeId);
    return recipe ? { reward: Math.round(recipe.sell * 1.55), xp: Math.round(11 + recipe.unlock * 3) } : null;
  }
  function unfinishedCommissionCount(state) {
    const completed = new Set(Array.isArray(state?.commissions?.completedIds) ? state.commissions.completedIds : []);
    return SIGNATURE_COMMISSIONS.filter(commission => !completed.has(commission.id)).length;
  }
  function commissionEligible(state, commissionOrId) {
    const commission = typeof commissionOrId === "string" ? commissionById(commissionOrId) : commissionOrId;
    if (!commission || state?.commissions?.completedIds?.includes(commission.id) || state?.commissions?.selectedId === commission.id) return false;
    return recipeById(commission.recipeId)?.unlock <= int(state?.level, 1, 1);
  }
  function refreshCommissionChoices(state) {
    if (!isRecord(state?.commissions)) state.commissions = { invitations: 0, selectedId: null, completedIds: [] };
    return SIGNATURE_COMMISSIONS.filter(commission => commissionEligible(state, commission));
  }
  function selectSignatureCommission(state, commissionId) {
    const commission = commissionById(commissionId);
    if (!commission || int(state?.commissions?.invitations) < 1 || state.commissions.selectedId || state.orders.some(isAfterStarsOrder) || !commissionEligible(state, commission)) return null;
    const ordinary = state.orders.filter(order => !isReservedOrder(order))
      .sort((a, b) => recipeById(b.recipeId).unlock - recipeById(a.recipeId).unlock || a.id - b.id).slice(0, 2);
    const recipe = recipeById(commission.recipeId);
    const economics = signatureOrderEconomics(commission);
    const customerIndex = customerIndexFromId(commission.customerId);
    const customer = CUSTOMERS[customerIndex];
    const order = {
      id: state.nextOrderId++, commissionId: commission.id, customerId: commission.customerId, customer: customer[0], avatar: customer[1],
      note: commission.request, avatarColor: customer[3], recipeId: recipe.id, quantity: 1,
      reward: economics.reward, xp: economics.xp,
    };
    state.commissions.selectedId = commission.id;
    state.commissions.invitations = Math.max(0, int(state.commissions.invitations) - 1);
    state.orders = [order, ...ordinary];
    ensureOrders(state);
    return order;
  }

  function afterStarsStatus(state) {
    const active = int(state?.stats?.prestiges) > 0;
    const step = active ? int(state?.afterStars?.step, 0, 0, AFTER_STARS_STEPS.length) : 0;
    if (!active) return { active: false, complete: false, step: 0, total: AFTER_STARS_STEPS.length, current: null, recipeLocked: false };
    if (step >= AFTER_STARS_STEPS.length) return { active: true, complete: true, step, total: AFTER_STARS_STEPS.length, current: null, recipeLocked: false };
    const current = AFTER_STARS_STEPS[step];
    const recipe = recipeById(current.recipeId);
    return { active: true, complete: false, step, total: AFTER_STARS_STEPS.length, current, recipe, recipeLocked: recipe.unlock > int(state?.level, 1, 1), orderActive: state?.orders?.some(order => isAfterStarsOrder(order) && order.afterStarsStep === step) === true };
  }

  function createAfterStarsOrder(state, stepIndex = state.afterStars.step) {
    const step = AFTER_STARS_STEPS[stepIndex];
    if (!step) return null;
    const recipe = recipeById(step.recipeId);
    const economics = signatureOrderEconomics(step);
    const customerIndex = customerIndexFromId(step.customerId);
    const customer = CUSTOMERS[customerIndex];
    return {
      id: state.nextOrderId++, afterStarsStep: stepIndex, customerId: step.customerId, customer: customer[0], avatar: customer[1],
      note: step.request, avatarColor: customer[3], recipeId: recipe.id, quantity: 1, reward: economics.reward, xp: economics.xp,
    };
  }

  function ensureAfterStarsOrder(state) {
    const status = afterStarsStatus(state);
    if (!status.active || status.complete || status.recipeLocked || state.orders.some(isSignatureOrder)) return null;
    const current = state.orders.find(isAfterStarsOrder);
    if (current?.afterStarsStep === status.step) return current;
    const ordinary = state.orders.filter(order => !isReservedOrder(order)).slice(0, 2);
    const order = createAfterStarsOrder(state, status.step);
    state.orders = [order, ...ordinary];
    return order;
  }
  function customerOrderLine(customerId, orderId, recipeId, quantity = 1) {
    const customerIndex = customerIndexFromId(customerId);
    const recipeIndex = Math.max(0, RECIPES.findIndex(recipe => recipe.id === recipeId));
    const lines = CUSTOMER_CONTENT[customerIndex].orderLines;
    return lines[(int(orderId, 1, 1) + recipeIndex + int(quantity, 1, 1, 2) - 2) % lines.length];
  }
  function customerStoryStatus(state, customerId, storyIndex) {
    const customerIndex = customerIndexFromId(customerId);
    const beat = int(storyIndex, 0, 0, CUSTOMER_CONFIG.maxHearts - 1);
    const normalizedCustomerId = `customer-${customerIndex}`;
    const id = `${normalizedCustomerId}:${beat + 1}`;
    const hearts = int(state?.customers?.[normalizedCustomerId]?.hearts, 0, 0, CUSTOMER_CONFIG.maxHearts);
    const unlocked = hearts >= beat + 1;
    return { id, unlocked, read: unlocked && state?.journal?.readStories?.includes(id) === true, requiredHearts: beat + 1, text: CUSTOMER_CONTENT[customerIndex].stories[beat] };
  }
  function recipeLoreStatus(state, recipeId) {
    const recipe = recipeById(recipeId) || RECIPES[0];
    const unlocked = int(state?.discovery?.brewed?.[recipe.id]) > 0 || int(state?.discovery?.delivered?.[recipe.id]) > 0 || int(state?.mastery?.[recipe.id]) > 0;
    return { id: recipe.id, unlocked, read: unlocked && state?.journal?.readRecipes?.includes(recipe.id) === true, text: RECIPE_LORE[recipe.id] };
  }
  function markJournalRead(state, kind, id) {
    if (!state?.journal) return false;
    if (kind === "story") {
      const match = typeof id === "string" ? /^customer-(?:[0-9]|1[01]):([1-3])$/.exec(id) : null;
      if (!match) return false;
      const status = customerStoryStatus(state, id.split(":")[0], Number(match[1]) - 1);
      if (!status.unlocked) return false;
      if (!state.journal.readStories.includes(id)) state.journal.readStories.push(id);
      return true;
    }
    if (kind === "recipe") {
      if (!recipeById(id)) return false;
      const status = recipeLoreStatus(state, id);
      if (!status.unlocked) return false;
      if (!state.journal.readRecipes.includes(id)) state.journal.readRecipes.push(id);
      return true;
    }
    return false;
  }
  function journalClaimableCounts(state) {
    const story = CUSTOMERS.reduce((sum, _, customerIndex) => sum + [0, 1, 2].filter(storyIndex => {
      const status = customerStoryStatus(state, `customer-${customerIndex}`, storyIndex);
      return status.unlocked && !status.read;
    }).length, 0);
    const recipe = RECIPES.filter(item => {
      const status = recipeLoreStatus(state, item.id);
      return status.unlocked && !status.read;
    }).length;
    const claimedAchievements = new Set(state?.journal?.claimedAchievements || []);
    const achievement = ACHIEVEMENTS.filter(item => Number.isFinite(state?.achievements?.[item.id]) && state.achievements[item.id] > 0 && !claimedAchievements.has(item.id)).length;
    return { story, recipe, achievement, total: story + recipe + achievement };
  }
  function claimJournalReward(state, kind, id) {
    let reward = 0;
    if (kind === "story") {
      const match = typeof id === "string" ? /^customer-(?:[0-9]|1[01]):([1-3])$/.exec(id) : null;
      if (!match) return null;
      const status = customerStoryStatus(state, id.split(":")[0], Number(match[1]) - 1);
      if (!status.unlocked || status.read || !markJournalRead(state, kind, id)) return null;
      reward = JOURNAL_REWARDS.story;
    } else if (kind === "recipe") {
      const status = recipeLoreStatus(state, id);
      if (!recipeById(id) || !status.unlocked || status.read || !markJournalRead(state, kind, id)) return null;
      reward = JOURNAL_REWARDS.recipe;
    } else if (kind === "achievement") {
      if (!ACHIEVEMENTS.some(item => item.id === id) || !Number.isFinite(state.achievements[id]) || state.achievements[id] <= 0 || state.journal.claimedAchievements.includes(id)) return null;
      state.journal.claimedAchievements.push(id);
      reward = JOURNAL_REWARDS.achievement;
    } else return null;
    state.coins += reward;
    state.stats.coinsEarned += reward;
    return { kind, id, reward };
  }
  function tutorialQuest({ id, step, status, title, detail, view, targetSelector, targetKind = "control", buttonLabel = "Show me" }) {
    return { id, step, status, label: `First steps · ${step} of ${BEGINNER_QUESTS.steps}`, title, detail, view, targetSelector, targetKind, buttonLabel };
  }

  function recipeTutorialState(state, recipeId, step, purpose, now) {
    const recipe = recipeById(recipeId);
    if (state.brew) {
      const matching = state.brew.recipeId === recipeId;
      if (state.brew.endsAt <= now) return tutorialQuest({ id: `${purpose}-collect`, step, status: "ready-to-collect", title: `Collect ${matching ? recipe.name : "the finished potion"}`, detail: "The brew is ready. Tap Collect.", view: "workshop", targetSelector: "#collectBrewButton", buttonLabel: "Show Collect" });
      return tutorialQuest({ id: `${purpose}-waiting`, step, status: "in-progress", title: `${recipeById(state.brew.recipeId).name} is brewing`, detail: matching ? "Return when the timer reaches zero." : `Finish the current brew before starting ${recipe.name}.`, view: "workshop", targetSelector: "#brewSlot", targetKind: "status", buttonLabel: "Show timer" });
    }
    if (state.potions[recipeId] > 0) {
      const order = state.orders.find(item => item.recipeId === recipeId && state.potions[recipeId] >= item.quantity);
      if (order) return tutorialQuest({ id: `${purpose}-deliver`, step: purpose === "clarity" ? 7 : step, status: "needs-delivery", title: `Deliver ${recipe.name}`, detail: "The matching order is ready below. Tap Deliver.", view: "workshop", targetSelector: `[data-quick-deliver="${order.id}"]`, buttonLabel: "Show Deliver" });
    }
    if (canAffordRecipe(state, recipe)) return tutorialQuest({ id: `${purpose}-start`, step, status: "available-to-start", title: `Brew ${recipe.name}`, detail: "Ingredients ready. Tap Brew.", view: "workshop", targetSelector: `[data-brew="${recipeId}"]`, buttonLabel: "Show Brew" });
    const missing = Object.entries(recipe.ingredients).filter(([id, count]) => state.ingredients[id] < count).map(([id, count]) => `${count - state.ingredients[id]} ${INGREDIENTS[id].name}`).join(" and ");
    return tutorialQuest({ id: `${purpose}-ingredients`, step, status: "insufficient-ingredients", title: `Gather for ${recipe.name}`, detail: `Need: ${missing}. Use a charged harvest.`, view: "workshop", targetSelector: "#gatherButton", buttonLabel: "Show Gather" });
  }

  function beginnerQuest(state, now = Date.now()) {
    if (int(state?.stats?.prestiges) > 0) return null;
    if (state.discovery.delivered.clarity) return null;
    if (state.stats.orders < 1) {
      const quest = recipeTutorialState(state, "tonic", 1, "first-tonic", now);
      return quest.status === "needs-delivery" ? { ...quest, step: 2, label: `First steps · 2 of ${BEGINNER_QUESTS.steps}` } : quest;
    }
    const upgradesBought = Object.values(state.upgrades).reduce((sum, level) => sum + level, 0);
    if (!upgradesBought) {
      const affordable = UPGRADES.filter(upgrade => upgradeCost(state, upgrade) <= state.coins).sort((a, b) => upgradeCost(state, a) - upgradeCost(state, b))[0];
      if (affordable) return tutorialQuest({ id: "first-upgrade-affordable", step: 4, status: "affordable-upgrade", title: `Buy ${affordable.name}`, detail: "You have enough coins. Tap Buy.", view: "upgrades", targetSelector: `[data-upgrade="${affordable.id}"]`, buttonLabel: "Show Upgrade" });
      const earnCoins = recipeTutorialState(state, "tonic", 3, "fund-upgrade", now);
      const cheapest = Math.min(...UPGRADES.map(upgrade => upgradeCost(state, upgrade)));
      return { ...earnCoins, blockedBy: "insufficient-coins", detail: `Need ${Math.max(0, cheapest - state.coins)} more coins for an upgrade. ${earnCoins.detail}` };
    }
    if (state.level < 2) return recipeTutorialState(state, "tonic", 4, "reach-level-two", now);
    if (state.ingredients.crystal < 1 && !state.brew && !state.potions.clarity) {
      if (state.gather.targetId !== "crystal") return tutorialQuest({ id: "focus-starshard", step: 5, status: "choose-gather-target", title: "Focus on Starshard", detail: "Open Pantry and select Starshard for your next charged harvest.", view: "workshop", targetSelector: '[data-gather-target="crystal"]', buttonLabel: "Show Starshard" });
      return tutorialQuest({ id: "gather-starshard", step: 5, status: "gather-new-ingredient", title: "Gather your first Starshard", detail: "Starshard selected. Use a charged harvest.", view: "workshop", targetSelector: "#gatherButton", targetKind: "gather-and-pantry", buttonLabel: "Show Gather" });
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
  function gatherRate(state) { return BASE_PASSIVE_RATE * (1 + int(state.upgrades?.garden, 0, 0, 8) * .25); }
  function passiveStorageCap(state) { return Math.floor(storageCap(state) * PASSIVE_STORAGE_RATIO); }
  function manualGatherAmount(state) { return GATHER_CONFIG.amountPerCharge + int(state.upgrades?.basket, 0, 0, 6); }
  function coinMultiplier(state, now = Date.now()) { return (1 + state.stardust * .1) * (now < state.boostUntil ? 2 : 1); }
  function recipeMasteryRank(state, recipeId) {
    const count = int(state.mastery?.[recipeId]);
    return MASTERY_CONFIG.thresholds.filter(threshold => count >= threshold).length;
  }
  function recipeMasteryProgress(state, recipeId) {
    const count = int(state.mastery?.[recipeId]), rank = recipeMasteryRank(state, recipeId);
    return { count, rank, next: MASTERY_CONFIG.thresholds[rank] || null };
  }
  function orderMultiplier(state, now = Date.now(), recipeId = null) {
    const masteryBonus = recipeId ? recipeMasteryRank(state, recipeId) * MASTERY_CONFIG.coinBonusPerRank : 0;
    return coinMultiplier(state, now) * (1 + state.upgrades.ledger * .12 + masteryBonus);
  }
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
    state.potions = recipeCounts(isRecord(input.potions) ? input.potions : {});
    state.upgrades = Object.fromEntries(UPGRADES.map(upgrade => [upgrade.id, int(isRecord(input.upgrades) ? input.upgrades[upgrade.id] : 0, 0, 0, upgrade.max)]));
    state.nextOrderId = int(input.nextOrderId, 1, 1);
    state.boostUntil = int(input.boostUntil);
    state.starterClaimed = input.starterClaimed === true;
    state.tutorialSeen = input.tutorialSeen === true;
    state.lastSeen = clamp(finite(input.lastSeen, now), 0, now);
    const sourceAchievements = isRecord(input.achievements) ? input.achievements : {};
    state.achievements = Object.fromEntries(ACHIEVEMENTS.flatMap(achievement => {
      const earnedAt = Number(sourceAchievements[achievement.id]);
      return Number.isFinite(earnedAt) && earnedAt > 0 ? [[achievement.id, earnedAt]] : [];
    }));
    const sourceStats = isRecord(input.stats) ? input.stats : {};
    state.stats = { ...sourceStats };
    for (const id of Object.keys(fresh.stats)) state.stats[id] = int(sourceStats[id]);
    const sourceAfterStars = isRecord(input.afterStars) ? input.afterStars : {};
    state.afterStars = { step: state.stats.prestiges > 0 ? int(sourceAfterStars.step, 0, 0, AFTER_STARS_STEPS.length) : 0 };
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
    const sourceBrewed = isRecord(sourceDiscovery.brewed) ? sourceDiscovery.brewed : {};
    const sourceDelivered = isRecord(sourceDiscovery.delivered) ? sourceDiscovery.delivered : {};
    state.discovery = {
      brewed: recipeCounts(sourceBrewed), delivered: recipeCounts(sourceDelivered),
    };
    const sourceCustomers = isRecord(input.customers) ? input.customers : {};
    state.customers = Object.fromEntries(CUSTOMERS.map((_, index) => {
      const id = `customer-${index}`, source = isRecord(sourceCustomers[id]) ? sourceCustomers[id] : {};
      const deliveries = int(source.deliveries), hearts = Math.min(CUSTOMER_CONFIG.maxHearts, Math.floor(deliveries / CUSTOMER_CONFIG.deliveriesPerHeart));
      return [id, { deliveries, hearts }];
    }));
    const sourceCommissions = isRecord(input.commissions) ? input.commissions : {};
    const validCommissionIds = new Set(SIGNATURE_COMMISSIONS.map(commission => commission.id));
    const completedIds = [...new Set(Array.isArray(sourceCommissions.completedIds) ? sourceCommissions.completedIds.filter(id => validCommissionIds.has(id)) : [])];
    state.commissions = { invitations: int(sourceCommissions.invitations, 0, 0, SIGNATURE_COMMISSIONS.length - completedIds.length), selectedId: null, completedIds };
    const requestedSelectedId = typeof sourceCommissions.selectedId === "string" ? sourceCommissions.selectedId : null;
    if (requestedSelectedId && commissionEligible(state, requestedSelectedId)) state.commissions.selectedId = requestedSelectedId;
    if (!isRecord(input.discovery)) {
      if (state.stats.brewed > 0) state.discovery.brewed.tonic = 1;
      if (state.stats.orders > 0) state.discovery.delivered.tonic = 1;
      if (state.level >= 3) { state.discovery.brewed.clarity = 1; state.discovery.delivered.clarity = 1; }
    }
    const sourceMastery = isRecord(input.mastery) ? input.mastery : {};
    state.mastery = recipeCounts(sourceMastery, state.discovery.brewed);
    const sourceJournal = isRecord(input.journal) ? input.journal : {};
    const validStoryIds = new Set(CUSTOMERS.flatMap((_, index) => [1, 2, 3].map(beat => `customer-${index}:${beat}`)));
    const validRecipeIds = new Set(RECIPES.map(recipe => recipe.id));
    state.journal = {
      readStories: [...new Set(Array.isArray(sourceJournal.readStories) ? sourceJournal.readStories.filter(id => validStoryIds.has(id)) : [])],
      readRecipes: [...new Set(Array.isArray(sourceJournal.readRecipes) ? sourceJournal.readRecipes.filter(id => validRecipeIds.has(id)) : [])],
      claimedAchievements: [...new Set(Array.isArray(sourceJournal.claimedAchievements) ? sourceJournal.claimedAchievements.filter(id => ACHIEVEMENTS.some(item => item.id === id)) : [])],
    };
    const sourceWeekly = isRecord(input.weekly) ? input.weekly : {};
    let cycle = int(sourceWeekly.cycle, 0, 0, WEEKLY_CHAINS.length);
    let chain = WEEKLY_CHAINS[cycle];
    const normalizedClaimedSteps = chain ? int(sourceWeekly.claimedSteps, 0, 0, chain.thresholds.length) : 0;
    if (chain && normalizedClaimedSteps >= chain.thresholds.length) {
      cycle += 1;
      chain = WEEKLY_CHAINS[cycle];
    }
    state.weekly = {
      cycle,
      progress: chain && cycle === int(sourceWeekly.cycle, 0, 0, WEEKLY_CHAINS.length) ? int(sourceWeekly.progress, 0, 0, chain.thresholds.at(-1)) : 0,
      claimedSteps: chain && cycle === int(sourceWeekly.cycle, 0, 0, WEEKLY_CHAINS.length) ? normalizedClaimedSteps : 0,
    };
    const requestedCosmetic = isRecord(input.customization) && typeof input.customization.selected === "string" ? input.customization.selected : "midnight";
    state.customization = { selected: cosmeticUnlocked(state, requestedCosmetic) ? requestedCosmetic : "midnight" };
    const sourceBrew = isRecord(input.brew) ? input.brew : null;
    if (sourceBrew && recipeById(sourceBrew.recipeId)) {
      const startedAt = clamp(finite(sourceBrew.startedAt, now), 0, now);
      const durationMs = int(sourceBrew.durationMs, recipeById(sourceBrew.recipeId).seconds * 1000, 1, OFFLINE_CAP_SECONDS * 1000);
      const endsAt = clamp(finite(sourceBrew.endsAt, startedAt + durationMs), startedAt, startedAt + durationMs);
      state.brew = { recipeId: sourceBrew.recipeId, startedAt, endsAt, durationMs, assistUses: int(sourceBrew.assistUses, 0, 0, FINISH_BREW_CONFIG.maxUsesPerBrew) };
    }
    const seenIds = new Set();
    const normalizedOrders = (Array.isArray(input.orders) ? input.orders : []).map(order => normalizeOrder(order, state)).filter(order => {
      if (!order || seenIds.has(order.id)) return false;
      seenIds.add(order.id); return true;
    });
    const selectedSignature = normalizedOrders.find(order => isSignatureOrder(order));
    const selectedQuest = normalizedOrders.find(order => isAfterStarsOrder(order) && order.afterStarsStep === state.afterStars.step);
    const selectedOrder = selectedSignature || selectedQuest;
    if (!selectedSignature) state.commissions.selectedId = null;
    state.orders = selectedOrder ? [selectedOrder, ...normalizedOrders.filter(order => !isReservedOrder(order)).slice(0, 2)] : normalizedOrders.filter(order => !isReservedOrder(order)).slice(0, 3);
    state.nextOrderId = Math.max(state.nextOrderId, ...state.orders.map(order => order.id + 1), 1);
    while (state.xp >= xpNeeded(state.level)) {
      state.xp -= xpNeeded(state.level);
      state.level += 1;
    }
    ensureAfterStarsOrder(state);
    enforceStorageCap(state);
    return state;
  }

  function normalizeOrder(order, state) {
    if (!isRecord(order)) return null;
    const recipe = recipeById(order.recipeId);
    if (!recipe || recipe.unlock > state.level) return null;
    const id = int(order.id, 0, 1);
    if (!id) return null;
    const requestedCommission = typeof order.commissionId === "string" ? commissionById(order.commissionId) : null;
    const commission = requestedCommission && state.commissions.selectedId === requestedCommission.id && !state.commissions.completedIds.includes(requestedCommission.id)
      && requestedCommission.recipeId === recipe.id && customerIdFromOrder(order) === requestedCommission.customerId ? requestedCommission : null;
    if (requestedCommission && !commission) return null;
    const requestedQuestIndex = Number(order.afterStarsStep);
    const questStep = Number.isInteger(requestedQuestIndex) && requestedQuestIndex === state.afterStars.step && state.stats.prestiges > 0
      ? AFTER_STARS_STEPS[requestedQuestIndex] : null;
    if (Number.isFinite(requestedQuestIndex) && !questStep) return null;
    if (questStep && (questStep.recipeId !== recipe.id || state.commissions.selectedId)) return null;
    const customerId = commission?.customerId || questStep?.customerId || customerIdFromOrder(order);
    const customerIndex = customerIndexFromId(customerId);
    const quantity = int(order.quantity, 1, 1, 2);
    const reservedEconomics = commission ? signatureOrderEconomics(commission) : questStep ? signatureOrderEconomics(questStep) : null;
    return {
      id, customerId, customer: CUSTOMERS[customerIndex][0],
      avatar: commission || questStep ? CUSTOMERS[customerIndex][1] : typeof order.avatar === "string" ? order.avatar.slice(0, 8) : CUSTOMERS[customerIndex][1],
      note: commission?.request || questStep?.request || customerOrderLine(customerId, id, recipe.id, quantity),
      avatarColor: commission || questStep ? CUSTOMERS[customerIndex][3] : typeof order.avatarColor === "string" ? order.avatarColor.slice(0, 30) : CUSTOMERS[customerIndex][3],
      recipeId: recipe.id, quantity: commission || questStep ? 1 : quantity,
      reward: reservedEconomics?.reward ?? int(order.reward, recipe.sell, 1), xp: reservedEconomics?.xp ?? int(order.xp, 12, 1),
      ...(commission ? { commissionId: commission.id } : {}),
      ...(questStep ? { afterStarsStep: requestedQuestIndex } : {}),
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
    state.mastery[recipe.id] = int(state.mastery[recipe.id]) + 1;
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
    const customerIndex = Math.floor(clamp(random(), 0, .999999) * CUSTOMERS.length);
    const customer = CUSTOMERS[customerIndex];
    const orderId = state.nextOrderId++;
    return {
      id: orderId, customerId: `customer-${customerIndex}`, customer: customer[0], avatar: customer[1], note: customerOrderLine(`customer-${customerIndex}`, orderId, recipe.id, quantity), avatarColor: customer[3],
      recipeId: recipe.id, quantity,
      reward: Math.round(recipe.sell * quantity * (1.45 + random() * .25)),
      xp: Math.round(8 + recipe.unlock * 3 + quantity * 3),
    };
  }

  function ensureOrders(state, random = Math.random) {
    ensureAfterStarsOrder(state);
    const reserved = state.orders.find(order => isReservedOrder(order));
    const ordinary = state.orders.filter(order => !isReservedOrder(order)).slice(0, reserved ? 2 : 3);
    state.orders = reserved ? [reserved, ...ordinary] : ordinary;
    while (state.orders.filter(order => !isReservedOrder(order)).length < (reserved ? 2 : 3)) state.orders.push(generateOrder(state, random));
    refreshCommissionChoices(state);
  }

  function fulfillOrder(state, orderId, now = Date.now(), random = Math.random) {
    const index = state.orders.findIndex(item => item.id === orderId);
    if (index < 0) return null;
    const order = state.orders[index];
    if (state.potions[order.recipeId] < order.quantity) return null;
    state.potions[order.recipeId] -= order.quantity;
    const customerId = customerIdFromOrder(order);
    order.customerId = customerId;
    const progress = state.customers[customerId] || { deliveries: 0, hearts: 0 };
    const previousHearts = progress.hearts;
    progress.deliveries += 1;
    progress.hearts = Math.min(CUSTOMER_CONFIG.maxHearts, Math.floor(progress.deliveries / CUSTOMER_CONFIG.deliveriesPerHeart));
    state.customers[customerId] = progress;
    const customerBonus = progress.hearts > previousHearts ? CUSTOMER_CONFIG.heartBonusCoins : 0;
    const reward = Math.round(order.reward * orderMultiplier(state, now, order.recipeId)) + customerBonus;
    state.coins += reward; state.stats.coinsEarned += reward; state.stats.orders += 1; state.daily.orders += 1;
    recordWeeklyDelivery(state);
    state.discovery.delivered[order.recipeId] = int(state.discovery.delivered[order.recipeId]) + order.quantity;
    const completedCommission = commissionById(order.commissionId);
    const completedQuestStep = isAfterStarsOrder(order) && order.afterStarsStep === state.afterStars.step ? AFTER_STARS_STEPS[order.afterStarsStep] : null;
    if (completedCommission && !state.commissions.completedIds.includes(completedCommission.id)) {
      state.commissions.completedIds.push(completedCommission.id);
      state.commissions.selectedId = null;
      state.commissions.invitations = Math.min(int(state.commissions.invitations), unfinishedCommissionCount(state));
    }
    if (completedQuestStep) state.afterStars.step = Math.min(AFTER_STARS_STEPS.length, state.afterStars.step + 1);
    state.orders.splice(index, 1);
    const levels = addXp(state, order.xp);
    ensureOrders(state, random);
    return { reward, levels, customerBonus, customerProgress: { ...progress }, commission: completedCommission || null, afterStars: completedQuestStep ? { step: order.afterStarsStep, title: completedQuestStep.title, complete: state.afterStars.step >= AFTER_STARS_STEPS.length } : null };
  }

  function upgradeCost(state, upgrade) { return Math.round(upgrade.baseCost * Math.pow(1.9, state.upgrades[upgrade.id])); }
  function upgradePreview(state, upgrade) {
    if (!upgrade) return null;
    const level = int(state.upgrades?.[upgrade.id], 0, 0, upgrade.max), next = Math.min(upgrade.max, level + 1);
    const values = {
      garden: rank => `${(BASE_PASSIVE_RATE * (1 + rank * .25) * 60).toFixed(1)} items/min`, basket: rank => `${GATHER_CONFIG.amountPerCharge + rank} items/harvest`,
      cauldron: rank => `${Math.round((1 + rank * .1) * 100)}% brew speed`, shelves: rank => `${60 + Math.max(0, state.level - 1) * 10 + rank * 25} capacity`,
      ledger: rank => `+${rank * 12}% order coins`,
    };
    return { path: upgrade.path, current: values[upgrade.id](level), next: values[upgrade.id](next), maxed: level >= upgrade.max };
  }
  function buyUpgrade(state, id) {
    const upgrade = upgradeById(id);
    if (!upgrade || state.upgrades[id] >= upgrade.max) return false;
    const cost = upgradeCost(state, upgrade);
    if (state.coins < cost) return false;
    state.coins -= cost; state.upgrades[id] += 1; return true;
  }

  function claimDaily(state) {
    if (state.daily.claimed || state.daily.orders < 5) return false;
    state.daily.claimed = true; state.coins += 50; state.stardust += 1; state.stats.coinsEarned += 50;
    const invitationCap = unfinishedCommissionCount(state);
    state.commissions.invitations = Math.min(int(state.commissions?.invitations), invitationCap);
    if (state.commissions.invitations < invitationCap) state.commissions.invitations += 1;
    return true;
  }

  function completionCardPhase(shownAt, now = Date.now(), reducedMotion = false) {
    const elapsed = Math.max(0, finite(now) - finite(shownAt, now));
    if (elapsed < COMPLETION_CARD_CONFIG.readableMs) return "readable";
    if (reducedMotion || elapsed >= COMPLETION_CARD_CONFIG.readableMs + COMPLETION_CARD_CONFIG.fadeMs) return "hidden";
    return "fading";
  }

  function collectionGoalProgress(state, goalId) {
    if (goalId === "brewer") return { current: Math.min(10, int(state.stats?.brewed)), target: 10 };
    if (goalId === "sampler") return { current: SAMPLER_IDS.filter(id => int(state.mastery?.[id]) > 0).length, target: SAMPLER_IDS.length };
    if (goalId === "keepsake") return { current: Math.min(1, int(state.stats?.prestiges)), target: 1 };
    if (goalId === "heirlooms") return { current: Math.min(SIGNATURE_COMMISSIONS.length, state.commissions?.completedIds?.length || 0), target: SIGNATURE_COMMISSIONS.length };
    return null;
  }

  function cosmeticUnlocked(state, cosmeticId) {
    if (cosmeticId === "midnight") return true;
    if (cosmeticId === "guild") return int(state.weekly?.cycle) > 0;
    if (cosmeticId === "dawnthread") return int(state.afterStars?.step, 0, 0, AFTER_STARS_STEPS.length) >= AFTER_STARS_STEPS.length && int(state.stats?.prestiges) > 0;
    const goal = COLLECTION_GOALS.find(item => item.cosmeticId === cosmeticId);
    const progress = goal && collectionGoalProgress(state, goal.id);
    return Boolean(progress && progress.current >= progress.target);
  }

  function selectCosmetic(state, cosmeticId) {
    if (!COSMETICS.some(item => item.id === cosmeticId) || !cosmeticUnlocked(state, cosmeticId)) return false;
    if (state.customization.selected === cosmeticId) return false;
    state.customization.selected = cosmeticId;
    return true;
  }

  function workshopDecorationState(state) {
    const selected = cosmeticUnlocked(state, state.customization?.selected) ? state.customization.selected : "midnight";
    return { selected, keepsake: selected === "starglass", ribbon: selected === "guild", dawnthread: selected === "dawnthread" };
  }

  function weeklyChainStatus(state) {
    const cycle = int(state.weekly?.cycle, 0, 0, WEEKLY_CHAINS.length);
    const chain = WEEKLY_CHAINS[cycle];
    if (!chain) return { complete: true, cycle, totalCycles: WEEKLY_CHAINS.length };
    const claimedSteps = int(state.weekly?.claimedSteps, 0, 0, chain.thresholds.length);
    return {
      complete: false, cycle, totalCycles: WEEKLY_CHAINS.length, chain,
      progress: int(state.weekly?.progress, 0, 0, chain.thresholds.at(-1)), claimedSteps,
      nextThreshold: chain.thresholds[claimedSteps] || null,
      reward: chain.rewards[claimedSteps] || 0,
      ready: claimedSteps < chain.thresholds.length && int(state.weekly?.progress) >= chain.thresholds[claimedSteps],
    };
  }

  function recordWeeklyDelivery(state) {
    const status = weeklyChainStatus(state);
    if (status.complete) return false;
    state.weekly.progress = Math.min(status.chain.thresholds.at(-1), status.progress + 1);
    return true;
  }

  function claimWeeklyStep(state) {
    const status = weeklyChainStatus(state);
    if (status.complete || !status.ready) return null;
    const reward = status.reward;
    state.coins += reward;
    state.stats.coinsEarned += reward;
    state.weekly.claimedSteps += 1;
    const chainCompleted = state.weekly.claimedSteps >= status.chain.thresholds.length;
    if (chainCompleted) state.weekly = { cycle: status.cycle + 1, progress: 0, claimedSteps: 0 };
    return { reward, chainCompleted, cycle: status.cycle };
  }

  function prestigeReward(state) { return PRESTIGE_CONFIG.baseReward + Math.floor(Math.max(0, state.level - PRESTIGE_CONFIG.unlockLevel) / PRESTIGE_CONFIG.levelsPerBonus); }
  function performPrestige(state, reward = prestigeReward(state), now = Date.now()) {
    if (state.level < PRESTIGE_CONFIG.unlockLevel) return null;
    const next = defaultState(now);
    next.stardust = state.stardust + int(reward, 1, 1);
    next.achievements = { ...state.achievements };
    next.stats = { ...state.stats, prestiges: state.stats.prestiges + 1 };
    next.mastery = { ...state.mastery };
    next.customers = Object.fromEntries(Object.entries(state.customers).map(([id, progress]) => [id, { ...progress }]));
    next.commissions = { invitations: Math.min(int(state.commissions.invitations), unfinishedCommissionCount(state)), selectedId: null, completedIds: [...state.commissions.completedIds] };
    next.afterStars = { step: int(state.afterStars?.step, 0, 0, AFTER_STARS_STEPS.length) };
    next.journal = { readStories: [...state.journal.readStories], readRecipes: [...state.journal.readRecipes], claimedAchievements: [...state.journal.claimedAchievements] };
    next.weekly = { ...state.weekly };
    next.customization = { ...state.customization };
    next.daily = { ...state.daily };
    next.tutorialSeen = true;
    next.starterClaimed = state.starterClaimed;
    return next;
  }

  function refreshOrder(state, random = Math.random) {
    const index = state.orders.findIndex(order => !isReservedOrder(order));
    if (state.coins < 15 || index < 0) return false;
    state.coins -= 15; state.orders.splice(index, 1); ensureOrders(state, random); return true;
  }

  function resetDailyIfNeeded(state, now = Date.now()) {
    const date = todayKey(now);
    if (date > state.daily.date) state.daily = { date, orders: 0, claimed: false };
  }

  function enforceStorageCap(state) {
    let excess = Math.max(0, totalIngredients(state) - storageCap(state));
    for (const id of Object.keys(INGREDIENTS).reverse()) {
      const removed = Math.min(state.ingredients[id], excess);
      state.ingredients[id] -= removed; excess -= removed;
    }
  }

  function addRandomIngredients(state, amount, random = Math.random, maxTotal = storageCap(state)) {
    const available = unlockedIngredients(state), cap = Math.floor(clamp(finite(maxTotal, storageCap(state)), 0, storageCap(state)));
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

  function grantPassiveIngredients(state, amount, random = Math.random) {
    if (state.stats.orders < 1) return 0;
    return addRandomIngredients(state, amount, random, passiveStorageCap(state));
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

  function discardIngredient(state, ingredientId, amount) {
    if (!INGREDIENTS[ingredientId] || INGREDIENTS[ingredientId].unlock > state.level) return 0;
    const removed = Math.min(state.ingredients[ingredientId], int(amount, 0));
    if (removed < 1) return 0;
    state.ingredients[ingredientId] -= removed;
    if (state.gather.targetId === ingredientId) state.gather.targetId = null;
    return removed;
  }

  function offlineElapsedSeconds(state, now = Date.now()) { return clamp((now - finite(state.lastSeen, now)) / 1000, 0, OFFLINE_CAP_SECONDS); }
  function grantOfflineIngredients(state, elapsedSeconds, random = Math.random) {
    if (state.stats.orders < 1) return 0;
    const softCap = passiveStorageCap(state);
    const availableSpace = Math.max(0, softCap - totalIngredients(state));
    const requested = Math.min(availableSpace, Math.floor(clamp(finite(elapsedSeconds), 0, OFFLINE_CAP_SECONDS) * gatherRate(state) * .65));
    return grantPassiveIngredients(state, requested, random);
  }
  function activeElapsedSeconds(lastTickAt, now = Date.now(), hidden = false) {
    return hidden ? 0 : clamp((now - finite(lastTickAt, now)) / 1000, 0, 5);
  }

  return Object.freeze({
    SAVE_VERSION, OFFLINE_CAP_SECONDS, BASE_PASSIVE_RATE, PASSIVE_STORAGE_RATIO, GATHER_CONFIG, FINISH_BREW_CONFIG, MASTERY_CONFIG, CUSTOMER_CONFIG, COMPLETION_CARD_CONFIG, JOURNAL_REWARDS, PRESTIGE_CONFIG, WEEKLY_CHAINS, COSMETICS, COLLECTION_GOALS, SAMPLER_IDS, INGREDIENTS, RECIPES, UPGRADES, CUSTOMERS, CUSTOMER_CONTENT, SIGNATURE_COMMISSIONS, AFTER_STARS_STEPS, RECIPE_LORE, ACHIEVEMENTS, BEGINNER_QUESTS,
    clamp, todayKey, defaultState, normalizeState, parseSave, shouldBlockSaveWrite, recipeById, upgradeById, customerOrderLine, customerStoryStatus, recipeLoreStatus, markJournalRead, journalClaimableCounts, claimJournalReward, beginnerQuest, tutorialTransitionPrompt, unlocksAtLevel, xpNeeded,
    storageCap, gatherRate, passiveStorageCap, manualGatherAmount, coinMultiplier, recipeMasteryRank, recipeMasteryProgress, orderMultiplier, brewSpeedMultiplier,
    unlockedIngredients, totalIngredients, canAffordRecipe, startBrew, finishBrewAssistStatus, applyFinishBrewAssist, collectBrew, addXp,
    generateOrder, ensureOrders, fulfillOrder, commissionById, commissionEligible, unfinishedCommissionCount, refreshCommissionChoices, selectSignatureCommission, isSignatureOrder, afterStarsStatus, ensureAfterStarsOrder, isAfterStarsOrder, isReservedOrder, upgradeCost, upgradePreview, buyUpgrade, claimDaily, completionCardPhase, collectionGoalProgress, cosmeticUnlocked, selectCosmetic, workshopDecorationState, weeklyChainStatus, recordWeeklyDelivery, claimWeeklyStep, prestigeReward, performPrestige, refreshOrder,
    resetDailyIfNeeded, addRandomIngredients, grantPassiveIngredients, rechargeGather, chargedGather, setGatherTarget, discardIngredient, offlineElapsedSeconds, grantOfflineIngredients, activeElapsedSeconds,
  });
});
