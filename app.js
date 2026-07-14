"use strict";

const SAVE_KEY = "pocket-potion-works-v1";
const UI_PREFS_KEY = "pocket-potion-works-ui-v1";
const Logic = window.PPWLogic;
const Platform = window.PPWPlatform;
const AudioFeedback = window.PPWAudio;
const { SAVE_VERSION, PRESTIGE_CONFIG, CUSTOMER_CONFIG, MASTERY_CONFIG, COSMETICS, COLLECTION_GOALS, INGREDIENTS, RECIPES, UPGRADES, CUSTOMERS, SIGNATURE_COMMISSIONS, ACHIEVEMENTS, clamp, todayKey, defaultState, recipeById, upgradeById } = Logic;
const INGREDIENT_SPRITES = new Set(["herb", "mushroom", "crystal", "mist", "ember", "mint", "lavender"]);
const POTION_SPRITES = new Set(RECIPES.map(recipe => recipe.id));
const ingredientSpriteAttr = id => INGREDIENT_SPRITES.has(id) ? ` data-ingredient-sprite="${id}"` : "";
const potionSpriteAttr = recipe => POTION_SPRITES.has(recipe.id) ? ` data-sprite="${recipe.id}"` : "";
const potionSpriteMarkup = (recipe, className = "potion-inline") => `<span class="${className}"${potionSpriteAttr(recipe)} aria-hidden="true">${recipe.icon}</span>`;
function browserStorage() {
  try { return window.localStorage; }
  catch (_) { return null; }
}
const storage = browserStorage();
const gameplayStorage = new Platform.LocalStorageBoundary(storage, SAVE_KEY);
const uiPrefsStorage = new Platform.LocalStorageBoundary(storage, UI_PREFS_KEY);
const platformStore = new Platform.PlatformStateStore(storage);
const consent = new Platform.ConsentManager(platformStore);
const analytics = new Platform.InMemoryAnalyticsAdapter(consent);
const fakeRewardedAds = new Platform.FakeRewardedAdAdapter();
const rewardedAds = new Platform.RewardedAdService(fakeRewardedAds);
const entitlementLedger = new Platform.EntitlementLedger(platformStore);
const fakePurchases = new Platform.FakeIapAdapter();
const purchases = new Platform.PurchaseService(fakePurchases, entitlementLedger);
const lifecycleAdapter = new Platform.FakeLifecycleAdapter();
const audioPreferenceStore = new AudioFeedback.AudioPreferenceStore(storage);
const sound = new AudioFeedback.SoundEngine(audioPreferenceStore);
const music = new AudioFeedback.MusicEngine(audioPreferenceStore);
function formatNumber(value) { return Math.floor(value).toLocaleString("en-US"); }
function xpNeeded(level = state.level) { return Logic.xpNeeded(level); }
function storageCap() { return Logic.storageCap(state); }
function gatherRate() { return Logic.gatherRate(state); }
function manualGatherAmount() { return Logic.manualGatherAmount(state); }
function orderReward(order, now = Date.now()) {
  const customer = state.customers[order.customerId] || { deliveries: 0, hearts: 0 };
  const favor = customer.hearts < CUSTOMER_CONFIG.maxHearts && customer.deliveries % CUSTOMER_CONFIG.deliveriesPerHeart === CUSTOMER_CONFIG.deliveriesPerHeart - 1 ? CUSTOMER_CONFIG.heartBonusCoins : 0;
  return Math.round(order.reward * Logic.orderMultiplier(state, now, order.recipeId)) + favor;
}
function brewSpeedMultiplier() { return Logic.brewSpeedMultiplier(state); }
function totalIngredients() { return Logic.totalIngredients(state); }

function loadUiPrefs() {
  try {
    const input = JSON.parse(uiPrefsStorage.read().value);
    if (input?.version === 1) return { version: 1, pantryOpen: input.pantryOpen === true, recipesOpen: input.recipesOpen === true };
  } catch (_) { /* Use compact defaults for missing or malformed preferences. */ }
  return { version: 1, pantryOpen: false, recipesOpen: false };
}

function saveUiPrefs() {
  uiPrefsStorage.write(JSON.stringify(uiPrefs));
}

function pulseFeedback(selector, tone) {
  const node = document.querySelector(selector);
  if (!node) return;
  const className = `feedback-${tone}`;
  node.classList.remove(className);
  requestAnimationFrame(() => node.classList.add(className));
  setTimeout(() => node.classList.remove(className), 700);
}

function feedback(message, { tone = "success", soundName, target } = {}) {
  if (soundName) sound.play(soundName);
  if (target) pulseFeedback(target, tone);
  toast(message, tone);
}

function playCoinArrivals(amount) {
  const arrivals = AudioFeedback.coinChimeCount(amount);
  for (let index = 0; index < arrivals; index += 1) {
    setTimeout(() => sound.play("coin", { bypassCooldown: true }), 90 + index * 85);
  }
}

let gameplaySaveWritesBlocked = false;
let gameplaySaveSessionOnly = gameplayStorage.sessionOnly;
let unsupportedSaveVersion = null;

function loadState() {
  const loaded = gameplayStorage.read();
  if (loaded.status !== "read") {
    gameplaySaveSessionOnly = true;
    console.warn("Saved workshop could not be read; continuing without local storage.");
  }
  const raw = loaded.value;
  const result = window.PPWLogic.parseSave(raw);
  if (window.PPWLogic.shouldBlockSaveWrite(result)) {
    gameplaySaveWritesBlocked = true;
    unsupportedSaveVersion = result.sourceVersion;
    console.error(`Gameplay save version ${result.sourceVersion} is newer than this build. The stored save is protected from overwrite.`);
    return defaultState();
  }
  if (result.recovered) console.warn("Save could not be loaded; starting fresh.");
  return result.state;
}

let state = loadState();
let uiPrefs = loadUiPrefs();
let passiveBank = 0;
let saveTimer = null;
let lastFocus = null;
let lastTickAt = Date.now();
let tutorialBannerTimer = null;
let pendingTutorialTarget = null;
let lastTutorialPromptKey = null;
let announcedReadyBrew = null;
let renderedBrewKey = null;
const transientCompletions = { daily: false, weekly: false, special: null, afterStars: null };
const completionTimers = new Map();
const completionTokens = new Map();
let pendingDailyChooserToken = 0;

function beginCompletionState(kind, detail = true, onHidden = null) {
  const previous = completionTimers.get(kind) || [];
  previous.forEach(clearTimeout);
  const token = (completionTokens.get(kind) || 0) + 1;
  completionTokens.set(kind, token);
  transientCompletions[kind] = detail;
  const selector = { daily: "#dailyCard", weekly: "#weeklyCard", special: "#specialRequestComplete", afterStars: "#afterStarsCard" }[kind];
  const readableTimer = setTimeout(() => {
    const node = document.querySelector(selector);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reducedMotion) node?.classList.add("is-collapsing");
    const hideTimer = setTimeout(() => {
      if (completionTokens.get(kind) !== token) return;
      transientCompletions[kind] = kind === "special" || kind === "afterStars" ? null : false;
      document.querySelector(selector)?.classList.remove("is-collapsing");
      renderOrders();
      renderWeekly();
      completionTimers.delete(kind);
      if (typeof onHidden === "function") onHidden();
    }, reducedMotion ? 0 : Logic.COMPLETION_CARD_CONFIG.fadeMs);
    completionTimers.set(kind, [hideTimer]);
  }, Logic.COMPLETION_CARD_CONFIG.readableMs);
  completionTimers.set(kind, [readableTimer]);
}

function saveState() {
  if (gameplaySaveWritesBlocked) return false;
  if (gameplaySaveSessionOnly) return "unavailable";
  state.lastSeen = Date.now();
  const result = gameplayStorage.write(JSON.stringify(state));
  if (result !== "saved") {
    gameplaySaveSessionOnly = gameplayStorage.sessionOnly;
    clearTimeout(saveTimer);
    saveTimer = null;
    console.warn("Save failed; progress remains only in this session.");
  }
  return result;
}

const commerceFulfillment = new Platform.CommerceFulfillmentCoordinator(entitlementLedger, {
  handlers: {
    apprentice_bundle: () => {
      if (state.starterClaimed) return false;
      state.starterClaimed = true;
      state.coins += 100;
      addRandomIngredients(10);
      return true;
    },
  },
  persistGameplay: () => {
    const result = saveState();
    if (result !== "saved") throw new Error(result === false ? "Unsupported future gameplay save is write-protected." : "Local storage is unavailable.");
  },
});
if (!gameplaySaveWritesBlocked) commerceFulfillment.reconcile();

function scheduleSave() {
  if (gameplaySaveWritesBlocked || gameplaySaveSessionOnly) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveState, 250);
}

function resetDailyIfNeeded() {
  window.PPWLogic.resetDailyIfNeeded(state);
}

function addRandomIngredients(amount, announce = false) {
  const added = window.PPWLogic.addRandomIngredients(state, amount);
  if (announce && added) toast(`Gathered ${added} fresh ingredient${added === 1 ? "" : "s"}.`);
  return added;
}

function reconcileOfflineProgress() {
  const elapsed = window.PPWLogic.offlineElapsedSeconds(state);
  grantOfflineProgress(elapsed);
}

function grantOfflineProgress(elapsed) {
  if (elapsed < 20) return;
  const gained = Logic.grantOfflineIngredients(state, elapsed);
  if (gained > 0) {
    setTimeout(() => openModal({
      icon: "☾", kicker: "WELCOME BACK", title: "The garden kept growing.",
      body: `<p>Your helpers gathered <strong>${gained} ingredients</strong> while you were away, and they have already been added to the Pantry. Offline progress is limited to 4 hours.</p>`,
      actions: [{ label: "Back to workshop", primary: true }],
    }), 350);
  }
}

const lifecycle = new Platform.LifecycleCoordinator({
  awardOffline: (from, to) => grantOfflineProgress(clamp((to - from) / 1000, 0, Logic.OFFLINE_CAP_SECONDS)),
});
lifecycleAdapter.subscribe(event => lifecycle.handle(event));

function ensureOrders() {
  window.PPWLogic.ensureOrders(state);
}

function generateOrder() {
  return window.PPWLogic.generateOrder(state);
}

function ingredientCostText(recipe) {
  return Object.entries(recipe.ingredients).map(([id, count]) => `<span class="ingredient-cost-item"><span class="ingredient-cost-icon"${ingredientSpriteAttr(id)} aria-hidden="true">${INGREDIENTS[id].icon}</span>${count}</span>`).join("");
}

function canAffordRecipe(recipe) {
  return window.PPWLogic.canAffordRecipe(state, recipe);
}

function renderAll() {
  resetDailyIfNeeded();
  ensureOrders();
  document.querySelector("#coinCount").textContent = formatNumber(state.coins);
  document.querySelector("#xpCount").textContent = `${formatNumber(state.xp)}/${formatNumber(xpNeeded())}`;
  document.querySelector("#levelCount").textContent = state.level;
  document.querySelector("#levelSeal").textContent = state.level;
  document.querySelector("#stardustCount").textContent = state.stardust;
  document.querySelector("#incomeRate").textContent = state.stats.orders < 1 ? "Garden wakes after your first delivery" : `Garden trickles ~${Math.round(gatherRate() * 60)}/min · stops at ${Math.round(Logic.PASSIVE_STORAGE_RATIO * 100)}%`;
  document.querySelector("#pantryTotal").textContent = `${formatNumber(totalIngredients())} / ${storageCap()} items`;
  const hour = new Date().getHours();
  document.querySelector("#dayGreeting").textContent = `${hour < 12 ? "GOOD MORNING" : hour < 18 ? "GOOD AFTERNOON" : "GOOD EVENING"}, ALCHEMIST`;
  document.querySelector("#workshopStatus").textContent = state.brew ? `${recipeById(state.brew.recipeId).name} is brewing` : "The kettle is warm";
  document.querySelector("#marketButton").disabled = false;
  document.querySelector("#marketButton").title = state.stats.orders < 1 ? "Complete your first order to unlock the market" : "Open Moonlight Market";
  renderWorkshopLook();
  renderBoostStatus();
  document.querySelector("#orderDot").hidden = !state.orders.some(order => state.potions[order.recipeId] >= order.quantity);
  renderGatherButton();
  renderBeginnerQuest();
  renderIngredients();
  renderReadyDeliverStrip();
  renderBrew();
  renderPotionShelf();
  renderRecipes();
  renderOrders();
  renderWeekly();
  renderUpgrades();
  renderJournal();
  renderDisclosures();
  updateBrewShortcut();
  scheduleSave();
}

function renderWorkshopLook() {
  const scene = document.querySelector(".workshop-scene");
  const decoration = Logic.workshopDecorationState(state);
  scene.dataset.cosmetic = decoration.selected;
  scene.classList.toggle("has-keepsake", decoration.keepsake);
  scene.classList.toggle("has-guild-ribbon", decoration.ribbon);
  scene.classList.toggle("has-dawnthread", decoration.dawnthread);
}

function renderBoostStatus(now = Date.now()) {
  const remaining = Math.max(0, state.boostUntil - now);
  const active = remaining > 0;
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor(remaining % 60000 / 1000);
  document.querySelector("#coinResource").classList.toggle("is-boosted", active);
  document.querySelector("#coinStatus").textContent = active ? `2× charm ${minutes}:${String(seconds).padStart(2, "0")}` : "coins";
}

function renderGatherButton() {
  Logic.rechargeGather(state);
  const button = document.querySelector("#gatherButton");
  const charges = state.gather.charges;
  const target = state.gather.targetId ? INGREDIENTS[state.gather.targetId] : null;
  button.disabled = charges < 1 || totalIngredients() >= storageCap();
  button.querySelector("strong").textContent = charges > 0 ? `${target ? `Gather ${target.name}` : "Gather smart mix"} · ${charges}/${Logic.GATHER_CONFIG.maxCharges}` : "Garden recharging";
  button.querySelector("small").textContent = charges > 0 ? `Charged harvest · +${manualGatherAmount()} ${target ? target.name : "needed items"}` : `One charge every ${Logic.GATHER_CONFIG.rechargeSeconds} seconds`;
}

function renderBeginnerQuest() {
  const quest = Logic.beginnerQuest(state);
  const card = document.querySelector("#beginnerQuestCard");
  card.hidden = !quest;
  if (!quest) { hideTutorialBanner(); return; }
  card.dataset.targetView = quest.view;
  card.dataset.status = quest.status;
  document.querySelector("#beginnerQuestLabel").textContent = quest.label;
  document.querySelector("#beginnerQuestTitle").textContent = quest.title;
  document.querySelector("#beginnerQuestDetail").textContent = quest.detail;
  document.querySelector("#beginnerQuestButton").textContent = quest.buttonLabel;
}

function activeView() { return document.querySelector(".view.is-active")?.dataset.view || "workshop"; }
function motionBehavior() { return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"; }

function goToTutorialTarget(quest) {
  if (!quest) return;
  hideTutorialBanner();
  if (quest.targetSelector?.includes("data-brew")) setDisclosure("recipes", true);
  if (quest.targetSelector?.includes("data-gather-target")) setDisclosure("pantry", true);
  switchView(quest.view);
  requestAnimationFrame(() => {
    const target = document.querySelector(quest.targetSelector);
    if (!target) return;
    document.querySelectorAll(".tutorial-target").forEach(node => node.classList.remove("tutorial-target"));
    target.classList.add("tutorial-target");
    target.scrollIntoView({ behavior: motionBehavior(), block: "center" });
    if (!target.matches("button, [href], input, select, textarea, [tabindex]")) target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
    setTimeout(() => target.classList.remove("tutorial-target"), 2200);
  });
}

function hideTutorialBanner() {
  clearTimeout(tutorialBannerTimer);
  pendingTutorialTarget = null;
  document.querySelector("#tutorialBanner").hidden = true;
  document.body.classList.remove("tutorial-prompt-visible");
}

function showTutorialTransition(before, viewBeforeAction) {
  const after = Logic.beginnerQuest(state);
  if (!after) { hideTutorialBanner(); return; }
  const prompt = Logic.tutorialTransitionPrompt(before, after, viewBeforeAction);
  if (!prompt || prompt.key === lastTutorialPromptKey) return;
  lastTutorialPromptKey = prompt.key;
  pendingTutorialTarget = after;
  document.querySelector("#tutorialBannerTitle").textContent = prompt.title;
  document.querySelector("#tutorialBannerDetail").textContent = prompt.detail;
  document.querySelector("#tutorialBanner").hidden = false;
  document.body.classList.add("tutorial-prompt-visible");
  document.querySelector("#toastRegion").replaceChildren();
  clearTimeout(tutorialBannerTimer);
  tutorialBannerTimer = setTimeout(hideTutorialBanner, 6500);
}

function renderIngredients() {
  document.querySelector("#ingredientGrid").innerHTML = Object.entries(INGREDIENTS).map(([id, item]) => {
    const locked = item.unlock > state.level;
    const selected = state.gather.targetId === id;
    return `<button class="ingredient-card ${selected ? "is-selected" : ""}" type="button" style="--ingredient-bg:${item.color}" ${locked ? "disabled" : `data-gather-target="${id}" aria-pressed="${selected}"`}>
      <span class="ingredient-icon"${locked ? "" : ingredientSpriteAttr(id)}>${locked ? "?" : item.icon}</span>
      <strong>${locked ? `Level ${item.unlock}` : formatNumber(state.ingredients[id])}</strong>
      <small>${locked ? "Locked" : item.name}</small>
    </button>`;
  }).join("");
  document.querySelectorAll("[data-gather-target]").forEach(button => button.addEventListener("click", () => selectGatherTarget(button.dataset.gatherTarget)));
  document.querySelector("#smartGatherTarget").setAttribute("aria-pressed", String(state.gather.targetId === null));
}

function selectGatherTarget(targetId) {
  if (!Logic.setGatherTarget(state, targetId)) return;
  renderAll();
  const item = targetId ? INGREDIENTS[targetId] : null;
  toast(item ? `${item.name} selected for charged harvests.` : "Smart mix will prioritize useful ingredients.");
}

function showPantryCleanup() {
  const choices = Object.entries(INGREDIENTS).filter(([id, item]) => item.unlock <= state.level && state.ingredients[id] > 0);
  openModal({
    icon: "⌄", kicker: "PANTRY", title: "Clear some space",
    body: choices.length ? `<p>Choose an ingredient to discard. Discarded ingredients earn no coins.</p><div class="discard-grid">${choices.map(([id, item]) => `<button data-discard-choice="${id}"><span class="ingredient-discard-icon"${ingredientSpriteAttr(id)}>${item.icon}</span><strong>${item.name}</strong><small>${state.ingredients[id]} stored</small></button>`).join("")}</div>` : "<p>Your Pantry has nothing available to discard.</p>",
    actions: [{ label: "Back", primary: true }],
  });
  document.querySelectorAll("[data-discard-choice]").forEach(button => button.addEventListener("click", () => showDiscardIngredient(button.dataset.discardChoice)));
}

function showDiscardIngredient(ingredientId) {
  const item = INGREDIENTS[ingredientId];
  const stored = state.ingredients[ingredientId];
  if (!item || stored < 1) { showPantryCleanup(); return; }
  const discard = amount => {
    const removed = Logic.discardIngredient(state, ingredientId, amount);
    closeModal();
    if (!removed) return;
    renderAll();
    scheduleSave();
    feedback(`Discarded ${removed} ${item.name}.`, { tone: "gather", soundName: "confirm", target: "#pantryDisclosure" });
  };
  const actions = [{ label: "Back", onClick: showPantryCleanup }];
  if (stored > 1) actions.push({ label: "Discard 1", onClick: () => discard(1) });
  if (stored > 5) actions.push({ label: "Discard 5", onClick: () => discard(5) });
  actions.push({ label: `Discard all ${stored}`, primary: true, onClick: () => discard(stored) });
  openModal({ icon: item.icon, kicker: "CLEAR SPACE", title: `Discard ${item.name}?`, body: `<p>You have <strong>${stored}</strong>. This cannot be undone and earns no coins.</p>`, actions });
}

function renderReadyDeliverStrip() {
  const available = { ...state.potions };
  const ready = [];
  for (const order of state.orders) {
    if (available[order.recipeId] >= order.quantity) {
      available[order.recipeId] -= order.quantity;
      ready.push(order);
    }
  }
  const strip = document.querySelector("#readyDeliverStrip");
  strip.hidden = ready.length === 0;
  strip.innerHTML = ready.length ? `<div><span class="eyebrow">READY TO DELIVER</span><strong>${ready.length} order${ready.length === 1 ? "" : "s"} waiting</strong></div><div class="ready-deliver-actions">${ready.slice(0, 2).map(order => {
    const recipe = recipeById(order.recipeId);
    return `<button data-quick-deliver="${order.id}">${potionSpriteMarkup(recipe)}<span>Deliver ${recipe.name} · +${orderReward(order)}</span></button>`;
  }).join("")}</div>` : "";
  strip.querySelectorAll("[data-quick-deliver]").forEach(button => button.addEventListener("click", () => fulfillOrder(Number(button.dataset.quickDeliver))));
}

function setDisclosure(kind, open) {
  if (kind === "pantry") uiPrefs.pantryOpen = open;
  if (kind === "recipes") uiPrefs.recipesOpen = open;
  saveUiPrefs();
  renderDisclosures();
}

function renderDisclosures() {
  for (const [kind, buttonId, contentId] of [["pantry", "pantryDisclosure", "pantryContent"], ["recipes", "recipeDisclosure", "recipeContent"]]) {
    const open = kind === "pantry" ? uiPrefs.pantryOpen : uiPrefs.recipesOpen;
    const button = document.querySelector(`#${buttonId}`);
    button.setAttribute("aria-expanded", String(open));
    button.querySelector("i").textContent = open ? "⌃" : "⌄";
    document.querySelector(`#${contentId}`).hidden = !open;
  }
}

function renderBrew() {
  const slot = document.querySelector("#brewSlot");
  const scene = document.querySelector(".workshop-scene");
  if (!state.brew) {
    announcedReadyBrew = null;
    scene.classList.remove("is-brewing", "is-ready");
    scene.classList.add("is-idle");
    scene.style.removeProperty("--brew-color");
    slot.classList.remove("is-ready");
    if (renderedBrewKey !== "idle") slot.innerHTML = `<div class="brew-empty"><span>♨</span><div><strong>Your cauldron is ready</strong><small>Choose a recipe below to start brewing.</small></div></div>`;
    renderedBrewKey = "idle";
    document.querySelector("#brewQueueLabel").textContent = "Ready";
    return;
  }
  const recipe = recipeById(state.brew.recipeId);
  const remaining = Math.max(0, state.brew.endsAt - Date.now());
  const duration = state.brew.durationMs;
  const percent = clamp(100 - remaining / duration * 100, 0, 100);
  const ready = remaining <= 0;
  const readyKey = `${state.brew.recipeId}:${state.brew.endsAt}`;
  scene.classList.remove("is-idle", "is-brewing", "is-ready");
  scene.classList.add(ready ? "is-ready" : "is-brewing");
  scene.style.setProperty("--brew-color", recipe.color);
  document.querySelector("#workshopStatus").textContent = ready ? `${recipe.name} is ready` : `${recipe.name} is brewing`;
  if (ready && announcedReadyBrew !== readyKey) {
    announcedReadyBrew = readyKey;
    document.querySelector("#brewStatusAnnouncement").textContent = `${recipe.name} is ready to collect.`;
    sound.play("brewReady");
    pulseFeedback("#brewSlot", "ready");
  }
  slot.classList.toggle("is-ready", ready);
  document.querySelector("#brewQueueLabel").textContent = ready ? "Complete!" : `${Math.ceil(remaining / 1000)}s left`;
  const brewKey = `${state.brew.recipeId}:${state.brew.startedAt}`;
  if (renderedBrewKey !== brewKey) {
    slot.innerHTML = `<div class="active-brew">
      <span class="potion-bottle"${potionSpriteAttr(recipe)} style="--potion-color:${recipe.color}">${recipe.icon}</span>
      <div><strong>${recipe.name}</strong><small data-brew-remaining></small><div class="brew-progress" role="progressbar" aria-label="${recipe.name} brewing progress" aria-valuemin="0" aria-valuemax="100"><span></span></div></div>
      <button class="collect-button" id="collectBrewButton" disabled>Brewing</button>
    </div>`;
    document.querySelector("#collectBrewButton").addEventListener("click", collectBrew);
    renderedBrewKey = brewKey;
  }
  slot.querySelector("[data-brew-remaining]").textContent = ready ? "Bottle it while it's sparkling." : `${Math.ceil(remaining / 1000)} seconds remaining`;
  const progress = slot.querySelector(".brew-progress");
  progress.setAttribute("aria-valuenow", String(Math.round(percent)));
  progress.querySelector("span").style.width = `${percent}%`;
  const collectButton = document.querySelector("#collectBrewButton");
  collectButton.disabled = !ready;
  collectButton.textContent = ready ? "Collect" : "Brewing";
  collectButton.setAttribute("aria-label", ready ? `Collect ${recipe.name}` : `${recipe.name} is brewing`);
}

function renderPotionShelf() {
  const visible = RECIPES.filter(recipe => recipe.unlock <= state.level && (state.potions[recipe.id] > 0 || state.orders.some(order => order.recipeId === recipe.id)));
  document.querySelector("#potionShelf").innerHTML = visible.map(recipe => {
    const requested = state.orders.some(order => order.recipeId === recipe.id);
    return `<span class="potion-chip ${requested ? "is-requested" : ""}"><span class="potion-chip-art"${potionSpriteAttr(recipe)}>${recipe.icon}</span><strong>${state.potions[recipe.id]}</strong> ${recipe.name}${requested ? " · requested" : ""}</span>`;
  }).join("");
}

function renderRecipes() {
  const visibleRecipes = RECIPES.filter(recipe => recipe.unlock <= state.level + 2).sort((a, b) => a.unlock - b.unlock);
  const hiddenCount = RECIPES.length - visibleRecipes.length;
  document.querySelector("#recipeList").innerHTML = visibleRecipes.map(recipe => {
    const locked = recipe.unlock > state.level;
    const disabled = locked || Boolean(state.brew) || !canAffordRecipe(recipe);
    let buttonLabel = "Brew";
    if (locked) buttonLabel = `Lv. ${recipe.unlock}`;
    else if (state.brew) buttonLabel = "Busy";
    else if (!canAffordRecipe(recipe)) buttonLabel = "Need items";
    const requested = state.orders.some(order => order.recipeId === recipe.id);
    const mastery = Logic.recipeMasteryProgress(state, recipe.id);
    const masteryBonus = mastery.rank * MASTERY_CONFIG.coinBonusPerRank * 100;
    const masteryText = mastery.next ? `Mastery ${mastery.rank} · ${mastery.count}/${mastery.next} brews · +${masteryBonus}% order coins` : `Mastery ${mastery.rank} · complete · +${masteryBonus}% order coins`;
    return `<article class="recipe-card ${locked ? "is-locked" : ""} ${requested ? "is-requested" : ""}">
      <span class="potion-bottle"${locked ? "" : potionSpriteAttr(recipe)} style="--potion-color:${recipe.color}">${locked ? "?" : recipe.icon}</span>
      <div class="recipe-info"><strong>${locked ? "Mysterious recipe" : recipe.name}</strong><small>${locked ? `Discover at level ${recipe.unlock}` : `${Math.ceil(recipe.seconds / brewSpeedMultiplier())} sec · order value ~${recipe.sell} coins`}</small>${!locked && recipe.description ? `<small class="recipe-description">${recipe.description}</small>` : ""}<div class="recipe-cost">${locked ? "Keep helping villagers to level up" : `${ingredientCostText(recipe)} · Owned ${state.potions[recipe.id]}${requested ? " · Requested" : ""}`}</div>${locked ? "" : `<small class="mastery-progress">${masteryText}</small>`}</div>
      <button class="brew-button" data-brew="${recipe.id}" aria-label="${buttonLabel} ${locked ? "locked recipe" : recipe.name}" ${disabled ? "disabled" : ""}>${buttonLabel}</button>
    </article>`;
  }).join("") + (hiddenCount ? `<p class="distant-recipes">${hiddenCount} distant recipe${hiddenCount === 1 ? "" : "s"} will appear as your alchemy grows.</p>` : "");
  document.querySelectorAll("[data-brew]").forEach(button => button.addEventListener("click", () => startBrew(button.dataset.brew)));
  const requested = RECIPES.filter(recipe => state.orders.some(order => order.recipeId === recipe.id)).length;
  document.querySelector("#recipeSummary").textContent = `${RECIPES.filter(recipe => recipe.unlock <= state.level).length} known · ${requested} requested`;
}

function renderOrders() {
  const dailyComplete = state.daily.orders >= 5;
  const invitationAvailable = state.commissions.invitations < Logic.unfinishedCommissionCount(state);
  const dailyCard = document.querySelector("#dailyCard");
  dailyCard.hidden = state.daily.claimed && !transientCompletions.daily;
  document.querySelector("#dailyProgress").textContent = state.daily.claimed && transientCompletions.daily ? "Daily reward claimed!" : `${Math.min(state.daily.orders, 5)} / 5 orders`;
  document.querySelector("#dailyRewardLabel").textContent = state.daily.claimed && transientCompletions.daily ? "Collected" : "Reward";
  document.querySelector("#dailyRewardCopy").textContent = state.daily.claimed && transientCompletions.daily
    ? `50 coins + 1 stardust${transientCompletions.daily.invitationGranted ? transientCompletions.daily.savedForLater ? " + Villager Special Request invitation saved for later" : " + Villager Special Request" : ""}`
    : invitationAvailable
      ? state.commissions.selectedId ? "50 coins + 1 stardust + Villager Special Request invitation saved for later" : "50 coins + 1 stardust + Villager Special Request"
      : `50 coins + 1 stardust${Logic.unfinishedCommissionCount(state) ? " · request invitation already saved" : " · keepsakes complete"}`;
  document.querySelector("#dailyBar").style.width = `${Math.min(100, state.daily.orders / 5 * 100)}%`;
  const dailyClaimButton = document.querySelector("#claimDailyButton");
  dailyClaimButton.hidden = !dailyComplete || state.daily.claimed;
  const commissionChoices = Logic.refreshCommissionChoices(state);
  const invitations = state.commissions.invitations;
  const choiceCard = document.querySelector("#commissionChoices");
  choiceCard.hidden = invitations < 1;
  const choiceButton = document.querySelector("#openCommissionChoicesButton");
  const activeRequest = Boolean(state.commissions.selectedId);
  const afterStars = Logic.afterStarsStatus(state);
  const questOrderActive = state.orders.some(Logic.isAfterStarsOrder);
  choiceButton.disabled = activeRequest || questOrderActive || commissionChoices.length === 0;
  choiceButton.textContent = questOrderActive ? "Finish the starborn errand first" : activeRequest ? "Finish your active request first" : commissionChoices.length ? "Choose a request" : "Unlock more potions to choose";
  document.querySelector("#commissionChoiceSummary").textContent = `${invitations} invitation${invitations === 1 ? "" : "s"} saved. ${questOrderActive ? "Complete the After the Stars errand first; your invitation stays saved." : activeRequest ? "Finish the request on the board, then choose another." : "Choose a villager, build trust, and earn their named keepsake."}`;
  const afterStarsCard = document.querySelector("#afterStarsCard");
  const finalQuestState = transientCompletions.afterStars;
  afterStarsCard.hidden = !afterStars.active || afterStars.complete && !finalQuestState;
  if (finalQuestState) {
    document.querySelector("#afterStarsTitle").textContent = "Dawnthread Workshop unlocked";
    document.querySelector("#afterStarsProgress").textContent = "4 / 4";
    document.querySelector("#afterStarsDetail").textContent = "The four errands are complete. You can use the new Workshop Look from the Journal.";
  } else if (afterStars.active && !afterStars.complete) {
    document.querySelector("#afterStarsTitle").textContent = afterStars.current.title;
    document.querySelector("#afterStarsProgress").textContent = `${afterStars.step + 1} / ${afterStars.total}`;
    document.querySelector("#afterStarsDetail").textContent = afterStars.recipeLocked
      ? `Next: reach level ${afterStars.recipe.unlock} to rediscover ${afterStars.recipe.name}.`
      : questOrderActive ? `${CUSTOMERS[Number(afterStars.current.customerId.slice(9))][0]} is waiting for one ${afterStars.recipe.name}.` : "This starborn errand will appear when the reserved request slot is free.";
  }
  const specialCompletion = document.querySelector("#specialRequestComplete");
  specialCompletion.hidden = !transientCompletions.special;
  specialCompletion.innerHTML = transientCompletions.special ? `<p class="eyebrow">VILLAGER SPECIAL REQUEST COMPLETE</p><h2>${transientCompletions.special.title}</h2><p>${transientCompletions.special.customer} gave you the <strong>${transientCompletions.special.keepsake}</strong>.</p>` : "";
  document.querySelector("#orderList").innerHTML = state.orders.map(order => {
    const recipe = recipeById(order.recipeId);
    const owned = state.potions[recipe.id];
    const canFill = owned >= order.quantity;
    const customer = state.customers[order.customerId] || { deliveries: 0, hearts: 0 };
    const towardHeart = customer.deliveries % CUSTOMER_CONFIG.deliveriesPerHeart;
    const reward = orderReward(order);
    const trust = customer.hearts >= CUSTOMER_CONFIG.maxHearts ? `${"♥".repeat(customer.hearts)} trusted friend` : `${"♥".repeat(customer.hearts)}${"♡".repeat(CUSTOMER_CONFIG.maxHearts - customer.hearts)} · ${towardHeart}/${CUSTOMER_CONFIG.deliveriesPerHeart} toward next favor`;
    const commission = Logic.commissionById(order.commissionId);
    const questStep = Logic.isAfterStarsOrder(order) ? Logic.AFTER_STARS_STEPS[order.afterStarsStep] : null;
    const questRibbon = questStep ? `<div class="commission-ribbon">After the Stars · ${questStep.title}</div>` : "";
    return `<article class="order-card ${commission ? "is-commission" : questStep ? "is-after-stars" : ""}">${questRibbon}
      ${commission ? `<div class="commission-ribbon">Villager Special Request · ${commission.title}</div>` : ""}
      <div class="order-top"><span class="customer-avatar" style="--avatar:${order.avatarColor}">${order.avatar}</span><div class="order-copy"><strong>${order.customer}</strong><small>${order.note}</small><small class="customer-trust">${trust}</small></div><div class="order-reward">+${reward} ●<br><small>+${order.xp} XP</small></div></div>
      <div class="order-bottom"><div class="order-request"><span>${potionSpriteMarkup(recipe)} ${order.quantity}×</span> ${recipe.name}<br><small>You have ${owned}</small></div><button class="fulfill-button" data-order="${order.id}" ${canFill ? "" : "disabled"}>${canFill ? "Deliver" : "Not ready"}</button></div>
    </article>`;
  }).join("");
  document.querySelectorAll("[data-order]").forEach(button => button.addEventListener("click", () => fulfillOrder(Number(button.dataset.order))));
}

function chooseCommission(commissionId) {
  const order = Logic.selectSignatureCommission(state, commissionId);
  if (!order) return;
  closeModal();
  feedback("Villager Special Request added. Two ordinary requests remain open.", { tone: "reward", soundName: "confirm", target: "#orderList" });
  renderAll();
}

function showSpecialRequestChooser({ automatic = false } = {}) {
  if (!automatic) pendingDailyChooserToken += 1;
  if (state.commissions.invitations < 1) return;
  if (state.orders.some(Logic.isAfterStarsOrder)) {
    openModal({ icon: "✦", kicker: "AFTER THE STARS", title: "A starborn errand comes first", body: `<p>Complete the After the Stars request on your noticeboard first. Your Villager Special Request invitation remains saved.</p>`, actions: [{ label: "Got it", primary: true }] });
    return;
  }
  if (state.commissions.selectedId) {
    openModal({ icon: "✦", kicker: "VILLAGER SPECIAL REQUEST", title: "Your invitation is saved", body: `<p>Finish the Villager Special Request on your noticeboard. Your unused invitation will still be here afterward.</p>`, actions: [{ label: "Got it", primary: true }] });
    return;
  }
  const choices = Logic.refreshCommissionChoices(state);
  const body = choices.length ? `<p>Choose exactly who you want to help. Their request uses one noticeboard slot, builds their trust, and awards the keepsake shown.</p><div class="commission-choice-list">${choices.map(commission => {
    const customer = CUSTOMERS[Number(commission.customerId.slice(9))];
    const recipe = recipeById(commission.recipeId);
    const trust = state.customers[commission.customerId]?.hearts || 0;
    return `<button type="button" class="commission-choice" data-commission-choice="${commission.id}"><span class="customer-avatar" style="--avatar:${customer[3]}">${customer[1]}</span><span><strong>${customer[0]} · ${commission.title}</strong><small class="commission-potion-line">${potionSpriteMarkup(recipe)} Potion: ${recipe.name}</small><small>Trust: ${trust}/${CUSTOMER_CONFIG.maxHearts} hearts</small><small>Keepsake: ${commission.keepsake.name}</small></span><b>Choose request</b></button>`;
  }).join("")}</div>` : `<p>No unfinished request matches a potion you know yet. Your invitation is saved until you unlock another potion.</p>`;
  openModal({ icon: "✦", kicker: "VILLAGER SPECIAL REQUEST", title: "Choose who to help", body, actions: [{ label: "Choose later", primary: true }] });
  document.querySelectorAll("[data-commission-choice]").forEach(button => button.addEventListener("click", () => chooseCommission(button.dataset.commissionChoice)));
}

function renderWeekly() {
  const card = document.querySelector("#weeklyCard");
  const status = Logic.weeklyChainStatus(state);
  const button = document.querySelector("#claimWeeklyButton");
  if (status.complete) {
    card.hidden = !transientCompletions.weekly;
    card.classList.add("is-complete");
    document.querySelector("#weeklyTitle").textContent = "All rolling requests complete";
    document.querySelector("#weeklyPolicy").textContent = "You finished all three chains and claimed every coin parcel. There is no reset or missed-week penalty.";
    document.querySelector("#weeklyProgress").textContent = "3 / 3 chains";
    document.querySelector("#weeklyReward").textContent = "Guild Ribbon unlocked";
    document.querySelector("#weeklyBar").style.width = "100%";
    button.hidden = true;
    return;
  }
  card.hidden = false;
  card.classList.remove("is-complete");
  const finalTarget = status.chain.thresholds.at(-1);
  document.querySelector("#weeklyTitle").textContent = status.chain.name;
  document.querySelector("#weeklyPolicy").textContent = `Rolling chain ${status.cycle + 1} of ${status.totalCycles}. Complete all 3 parcels at your pace${status.cycle === 0 ? " to unlock the Guild Ribbon Workshop Look" : ""}. Nothing expires.`;
  document.querySelector("#weeklyProgress").textContent = status.ready ? `Parcel ready · ${status.progress} deliveries completed` : `${status.progress} of ${status.nextThreshold} deliveries`;
  document.querySelector("#weeklyReward").textContent = `Parcel ${status.claimedSteps + 1}: ${status.reward} coins`;
  document.querySelector("#weeklyBar").style.width = `${Math.min(100, status.progress / finalTarget * 100)}%`;
  button.hidden = !status.ready;
}

function upgradeCost(upgrade) {
  return Logic.upgradeCost(state, upgrade);
}

function renderUpgrades() {
  document.querySelector("#upgradeList").innerHTML = UPGRADES.map(upgrade => {
    const level = state.upgrades[upgrade.id];
    const maxed = level >= upgrade.max;
    const cost = upgradeCost(upgrade);
    const preview = Logic.upgradePreview(state, upgrade);
    return `<article class="upgrade-card"><span class="upgrade-icon">${upgrade.icon}</span><div class="upgrade-copy"><strong>${upgrade.name}</strong><small>${preview.path} path · ${upgrade.description}</small><small class="upgrade-preview">${preview.maxed ? `Current: ${preview.current}` : `${preview.current} → ${preview.next}`}</small><small class="upgrade-level">Level ${level} / ${upgrade.max}</small></div><button class="upgrade-button" data-upgrade="${upgrade.id}" ${maxed || state.coins < cost ? "disabled" : ""}>${maxed ? "MAX" : `${cost} ●`}</button></article>`;
  }).join("");
  document.querySelectorAll("[data-upgrade]").forEach(button => button.addEventListener("click", () => buyUpgrade(button.dataset.upgrade)));
  const canPrestige = state.level >= PRESTIGE_CONFIG.unlockLevel;
  const prestigeButton = document.querySelector("#prestigeButton");
  prestigeButton.disabled = !canPrestige;
  prestigeButton.textContent = canPrestige ? `Rebirth for ${prestigeReward()} stardust` : `Reach level ${PRESTIGE_CONFIG.unlockLevel} to unlock`;
}

function renderJournal() {
  const openCustomers = new Set([...document.querySelectorAll("[data-journal-customer][open]")].map(node => node.dataset.journalCustomer));
  const claims = Logic.journalClaimableCounts(state);
  document.querySelector("#journalDot").hidden = claims.total === 0;
  document.querySelector('[data-nav="journal"]').setAttribute("aria-label", claims.total ? `Journal, ${claims.total} reward${claims.total === 1 ? "" : "s"} ready` : "Journal");
  document.querySelector("#friendsJournalDot").hidden = claims.story === 0;
  document.querySelector("#recipeJournalDot").hidden = claims.recipe === 0;
  document.querySelector("#achievementJournalDot").hidden = claims.achievement === 0;
  const stats = [
    ["Potions brewed", state.stats.brewed], ["Orders delivered", state.stats.orders],
    ["Lifetime coins", state.stats.coinsEarned], ["Harvest taps", state.stats.taps],
  ];
  document.querySelector("#statsGrid").innerHTML = stats.map(([label, value]) => `<div class="stat-card"><span>${label}</span><strong>${formatNumber(value)}</strong></div>`).join("");
  document.querySelector("#villageStoryList").innerHTML = CUSTOMERS.map((customer, customerIndex) => {
    const customerId = `customer-${customerIndex}`;
    const hearts = state.customers[customerId]?.hearts || 0;
    const statuses = [0, 1, 2].map(storyIndex => Logic.customerStoryStatus(state, customerId, storyIndex));
    const unlockedCount = statuses.filter(status => status.unlocked).length;
    const newCount = statuses.filter(status => status.unlocked && !status.read).length;
    const beats = statuses.map((status, storyIndex) => {
      if (!status.unlocked) return `<div class="journal-entry is-locked"><div><strong>Story ${storyIndex + 1}</strong><small>Unlocks at ${status.requiredHearts} trust heart${status.requiredHearts === 1 ? "" : "s"}</small></div><span>Locked</span></div>`;
      if (!status.read) return `<button type="button" class="journal-entry is-new" data-journal-story="${status.id}"><div><strong>Story ${storyIndex + 1} is ready</strong><small>Unlocked by ${status.requiredHearts} trust heart${status.requiredHearts === 1 ? "" : "s"}</small></div><span>+${Logic.JOURNAL_REWARDS.story} coins · Read & claim</span></button>`;
      return `<div class="journal-entry is-read" data-journal-story-read="${status.id}" tabindex="-1"><div><strong>Story ${storyIndex + 1}</strong><small>${status.text}</small></div><span>Read</span></div>`;
    }).join("");
    const progress = `${unlockedCount}/${CUSTOMER_CONFIG.maxHearts} stories${newCount ? ` · ${newCount} new` : ""}`;
    return `<details class="villager-journal-card ${newCount ? "has-claim" : ""}" data-journal-customer="${customerId}" ${openCustomers.has(customerId) ? "open" : ""}><summary><span class="customer-avatar" style="--avatar:${customer[3]}">${customer[1]}</span><div><strong>${customer[0]}</strong><small>${"♥".repeat(hearts)}${"♡".repeat(CUSTOMER_CONFIG.maxHearts - hearts)} trust · ${progress}</small></div><span class="journal-expand" aria-hidden="true">⌄</span></summary><div class="journal-entry-stack">${beats}</div></details>`;
  }).join("");
  document.querySelector("#recipeLoreList").innerHTML = [...RECIPES].sort((a, b) => a.unlock - b.unlock).map(recipe => {
    const status = Logic.recipeLoreStatus(state, recipe.id);
    if (!status.unlocked) return `<div class="journal-entry recipe-lore is-locked"><span class="potion-bottle" style="--potion-color:${recipe.color}">?</span><div><strong>Undiscovered potion</strong><small>Brew or deliver ${recipe.unlock <= state.level ? "this recipe" : `the level ${recipe.unlock} recipe`} to reveal its lore.</small></div><b>Locked</b></div>`;
    if (!status.read) return `<button type="button" class="journal-entry recipe-lore is-new" data-journal-recipe="${recipe.id}"><span class="potion-bottle"${potionSpriteAttr(recipe)} style="--potion-color:${recipe.color}">${recipe.icon}</span><div><strong>${recipe.name}</strong><small>Read this bottle note and claim ${Logic.JOURNAL_REWARDS.recipe} coins</small></div><b>Read & claim</b></button>`;
    return `<div class="journal-entry recipe-lore is-read"><span class="potion-bottle"${potionSpriteAttr(recipe)} style="--potion-color:${recipe.color}">${recipe.icon}</span><div><strong>${recipe.name}</strong><small>${status.text}</small></div><b>Read</b></div>`;
  }).join("");
  const completedKeepsakes = new Set(state.commissions.completedIds);
  document.querySelector("#keepsakeProgress").textContent = `${completedKeepsakes.size} / ${SIGNATURE_COMMISSIONS.length} collected · all twelve unlock the Heirloom Garland look.`;
  document.querySelector("#keepsakeList").innerHTML = SIGNATURE_COMMISSIONS.map(commission => {
    const collected = completedKeepsakes.has(commission.id);
    return `<article class="keepsake-card ${collected ? "is-collected" : "is-locked"}"><span aria-hidden="true">${collected ? commission.keepsake.mark : "?"}</span><div><strong>${collected ? commission.keepsake.name : "Uncollected keepsake"}</strong><small>${collected ? commission.keepsake.description : `Help ${CUSTOMERS[Number(commission.customerId.slice(9))][0]} with a Villager Special Request.`}</small></div></article>`;
  }).join("");
  document.querySelector("#achievementList").innerHTML = ACHIEVEMENTS.map(achievement => {
    const earned = Number.isFinite(state.achievements[achievement.id]) && state.achievements[achievement.id] > 0;
    const claimed = state.journal.claimedAchievements.includes(achievement.id);
    if (earned && !claimed) return `<button type="button" class="achievement-card is-claimable" data-journal-achievement="${achievement.id}"><span class="achievement-icon">${achievement.icon}</span><div><strong>${achievement.name}</strong><small>${achievement.description}</small></div><span class="achievement-status">+${Logic.JOURNAL_REWARDS.achievement} · Claim</span></button>`;
    return `<article class="achievement-card ${earned ? "" : "is-locked"}"><span class="achievement-icon">${earned ? achievement.icon : "?"}</span><div><strong>${achievement.name}</strong><small>${achievement.description}</small></div><span class="achievement-status">${earned ? "Claimed" : "Locked"}</span></article>`;
  }).join("");
  document.querySelector("#collectionList").innerHTML = COLLECTION_GOALS.map(goal => {
    const progress = Logic.collectionGoalProgress(state, goal.id);
    const complete = progress.current >= progress.target;
    const cosmetic = COSMETICS.find(item => item.id === goal.cosmeticId);
    return `<article class="collection-card"><div><strong>${goal.name}</strong><small>Unlocks the ${cosmetic.name} Workshop Look</small></div><span>${complete ? "Unlocked" : `${progress.current} / ${progress.target}`}</span></article>`;
  }).join("");
  const journalCosmetics = COSMETICS.filter(cosmetic => cosmetic.id !== "dawnthread" || state.stats.prestiges > 0);
  document.querySelector("#cosmeticList").innerHTML = journalCosmetics.map(cosmetic => {
    const unlocked = Logic.cosmeticUnlocked(state, cosmetic.id);
    const selected = state.customization.selected === cosmetic.id;
    return `<button class="cosmetic-button" data-cosmetic="${cosmetic.id}" aria-pressed="${selected}" ${unlocked ? "" : "disabled"}><div><strong>${cosmetic.name}</strong><small>${cosmetic.description}</small></div><span>${selected ? "In use" : unlocked ? "Use" : "Locked"}</span></button>`;
  }).join("");
  document.querySelectorAll("#cosmeticList button[data-cosmetic]").forEach(button => button.addEventListener("click", () => selectCosmetic(button.dataset.cosmetic)));
  document.querySelectorAll("[data-journal-story]").forEach(button => button.addEventListener("click", () => claimJournalEntry("story", button.dataset.journalStory)));
  document.querySelectorAll("[data-journal-recipe]").forEach(button => button.addEventListener("click", () => claimJournalEntry("recipe", button.dataset.journalRecipe)));
  document.querySelectorAll("[data-journal-achievement]").forEach(button => button.addEventListener("click", () => claimJournalEntry("achievement", button.dataset.journalAchievement)));
}

function claimJournalEntry(kind, id) {
  const result = Logic.claimJournalReward(state, kind, id);
  if (!result) return;
  const customerId = kind === "story" ? id.split(":")[0] : null;
  checkAchievements();
  feedback(`Journal reward claimed! +${result.reward} coins`, { tone: "reward", soundName: "confirm", target: ".resource-bar" });
  playCoinArrivals(result.reward);
  renderAll();
  if (customerId) {
    document.querySelector("#friendsJournalSection").open = true;
    document.querySelector(`[data-journal-customer="${customerId}"]`)?.setAttribute("open", "");
    document.querySelector(`[data-journal-story-read="${id}"]`)?.focus({ preventScroll: true });
  }
}

function selectCosmetic(cosmeticId) {
  if (!Logic.selectCosmetic(state, cosmeticId)) return;
  feedback("Workshop look updated.", { tone: "reward", soundName: "tap", target: ".workshop-card" });
  renderAll();
}

function claimWeekly() {
  const result = Logic.claimWeeklyStep(state);
  if (!result) return;
  if (result.chainCompleted && Logic.weeklyChainStatus(state).complete) beginCompletionState("weekly");
  feedback(`${result.chainCompleted ? "Request chain complete" : "Request parcel claimed"}! +${result.reward} coins`, { tone: "reward", soundName: "reward", target: "#weeklyCard" });
  playCoinArrivals(result.reward);
  renderAll();
}

function startBrew(recipeId) {
  const tutorialBefore = Logic.beginnerQuest(state);
  const viewBeforeAction = activeView();
  const recipe = recipeById(recipeId);
  if (!window.PPWLogic.startBrew(state, recipeId)) return;
  announcedReadyBrew = null;
  document.querySelector("#brewStatusAnnouncement").textContent = `${recipe.name} started brewing.`;
  feedback(`${recipe.name} is bubbling away.`, { tone: "brew", soundName: "brewStart", target: "#brewSlot" });
  renderAll();
  showTutorialTransition(tutorialBefore, viewBeforeAction);
}

function collectBrew() {
  const tutorialBefore = Logic.beginnerQuest(state);
  const viewBeforeAction = activeView();
  const result = window.PPWLogic.collectBrew(state);
  if (!result) return;
  announceLevels(result.levels);
  checkAchievements();
  feedback(`${result.recipe.name} added to your shelf!`, { tone: "collect", soundName: "collect", target: "#potionShelf" });
  renderAll();
  showTutorialTransition(tutorialBefore, viewBeforeAction);
}

function fulfillOrder(orderId) {
  const tutorialBefore = Logic.beginnerQuest(state);
  const viewBeforeAction = activeView();
  const result = window.PPWLogic.fulfillOrder(state, orderId);
  if (!result) return;
  if (result.commission) beginCompletionState("special", { title: result.commission.title, customer: CUSTOMERS[Number(result.commission.customerId.slice(9))][0], keepsake: result.commission.keepsake.name });
  if (result.afterStars?.complete) beginCompletionState("afterStars", result.afterStars);
  announceLevels(result.levels);
  checkAchievements();
  const completion = result.commission ? ` · ${result.commission.keepsake.name} collected` : "";
  feedback(`Order delivered! +${result.reward} coins${result.customerBonus ? ` · friendship favor +${result.customerBonus}` : ""}${completion}`, { tone: "delivery", soundName: "delivery", target: ".resource-bar" });
  renderAll();
  playCoinArrivals(result.reward);
  showTutorialTransition(tutorialBefore, viewBeforeAction);
}

function addXp(amount) {
  announceLevels(window.PPWLogic.addXp(state, amount));
}

function announceLevels(levels) {
  if (levels.length) {
    sound.play("levelUp");
    pulseFeedback(".level-seal", "level");
  }
  levels.forEach(level => {
    const unlocks = Logic.unlocksAtLevel(level);
    const names = [...unlocks.ingredients, ...unlocks.recipes].map(item => item.name);
    toast(`Level ${level}! ${names.length ? `${names.join(" and ")} unlocked.` : "Your workshop is growing."}`, "level");
  });
}

function buyUpgrade(id) {
  const tutorialBefore = Logic.beginnerQuest(state);
  const viewBeforeAction = activeView();
  const upgrade = upgradeById(id);
  if (!window.PPWLogic.buyUpgrade(state, id)) return;
  renderAll();
  feedback(`${upgrade.name} improved to level ${state.upgrades[id]}.`, { tone: "upgrade", soundName: "tap", target: `[data-upgrade="${id}"]` });
  showTutorialTransition(tutorialBefore, viewBeforeAction);
}

function claimDaily() {
  const invitationsBefore = state.commissions.invitations;
  if (!window.PPWLogic.claimDaily(state)) return;
  const invitationGranted = state.commissions.invitations > invitationsBefore;
  const savedForLater = invitationGranted && Boolean(state.commissions.selectedId);
  const chooserToken = ++pendingDailyChooserToken;
  const autoOpenChooser = invitationGranted ? () => {
    if (chooserToken !== pendingDailyChooserToken || activeView() !== "orders" || !document.querySelector("#modalBackdrop").hidden) return;
    pendingDailyChooserToken += 1;
    showSpecialRequestChooser({ automatic: true });
  } : null;
  beginCompletionState("daily", { invitationGranted, savedForLater }, autoOpenChooser);
  checkAchievements();
  toast(`Daily goal complete! +50 coins and +1 stardust${invitationGranted ? " · special request earned" : ""}`);
  renderAll();
  playCoinArrivals(50);
}

function prestigeReward() { return Logic.prestigeReward(state); }

function confirmPrestige() {
  if (state.level < PRESTIGE_CONFIG.unlockLevel) return;
  const reward = prestigeReward();
  openModal({ icon: "★", kicker: "STARRY REBIRTH", title: "Begin again, brighter?", body: `<p>This resets coins, level, ingredients, potions, orders, brewing, upgrades, and any active Villager Special Request.</p><p>Saved special-request invitations, friendships, completed keepsakes, mastery, rolling requests, cosmetics, today's daily state, and achievements stay. Your first rebirth also leaves a cosmetic Starglass Keepsake. You gain <strong>${reward} stardust</strong>, permanently increasing order coins by ${reward * 10}%.</p>`, actions: [
    { label: "Not yet" },
    { label: `Rebirth for ${reward} stardust`, primary: true, onClick: () => performPrestige(reward) },
  ] });
}

function performPrestige(reward) {
  const nextState = Logic.performPrestige(state, reward);
  if (!nextState) return;
  state = nextState;
  closeModal();
  checkAchievements();
  switchView("workshop");
  toast("The stars remember you. Your workshop begins anew.");
  renderAll();
}

function checkAchievements() {
  ACHIEVEMENTS.forEach(achievement => {
    if (!state.achievements[achievement.id] && achievement.test(state)) {
      state.achievements[achievement.id] = Date.now();
      toast(`Achievement: ${achievement.name}`);
    }
  });
}

function refreshOrder() {
  if (!Logic.refreshOrder(state)) return;
  toast("A new request was pinned to the noticeboard.");
  renderAll();
}

function switchView(view) {
  document.querySelectorAll("[data-view]").forEach(section => { section.hidden = section.dataset.view !== view; section.classList.toggle("is-active", section.dataset.view === view); });
  document.querySelectorAll("[data-nav]").forEach(button => {
    const active = button.dataset.nav === view;
    button.classList.toggle("is-active", active);
    if (active) button.setAttribute("aria-current", "page"); else button.removeAttribute("aria-current");
  });
  window.scrollTo({ top: 0, behavior: motionBehavior() });
  if (view === "orders") document.querySelector("#orderDot").hidden = true;
  if (pendingTutorialTarget?.view === view) hideTutorialBanner();
  requestAnimationFrame(() => updateBrewShortcut());
}

function updateBrewShortcut(now = Date.now()) {
  const shortcut = document.querySelector("#brewShortcut");
  if (!state.brew) {
    shortcut.hidden = true;
    delete shortcut.dataset.sprite;
    document.body.classList.remove("brew-shortcut-visible");
    return;
  }
  const slot = document.querySelector("#brewSlot");
  const rect = slot.getBoundingClientRect();
  const slotVisible = activeView() === "workshop" && rect.bottom > 0 && rect.top < innerHeight;
  const remaining = Math.max(0, state.brew.endsAt - now);
  const recipe = recipeById(state.brew.recipeId);
  shortcut.hidden = slotVisible;
  shortcut.dataset.sprite = recipe.id;
  shortcut.textContent = remaining <= 0 ? `${recipe.name} ready · Collect` : `${recipe.name} · ${Math.ceil(remaining / 1000)}s`;
  shortcut.setAttribute("aria-label", shortcut.textContent);
  document.body.classList.toggle("brew-shortcut-visible", !slotVisible);
}

function goToBrewSlot() {
  switchView("workshop");
  requestAnimationFrame(() => document.querySelector("#brewSlot").scrollIntoView({ behavior: motionBehavior(), block: "center" }));
}

function openModal({ icon = "✦", kicker = "POCKET POTION WORKS", title, body, actions = [] }) {
  if (document.querySelector("#modalBackdrop").hidden) lastFocus = document.activeElement;
  document.querySelector("#modalIcon").textContent = icon;
  document.querySelector("#modalKicker").textContent = kicker;
  document.querySelector("#modalTitle").textContent = title;
  document.querySelector("#modalBody").innerHTML = body;
  const actionsNode = document.querySelector("#modalActions");
  actionsNode.innerHTML = "";
  (actions.length ? actions : [{ label: "Back to the workshop", primary: true }]).forEach(action => {
    const button = document.createElement("button");
    button.className = action.primary ? "primary-button" : "secondary-button";
    button.textContent = action.label;
    if (typeof action.ariaPressed === "boolean") button.setAttribute("aria-pressed", String(action.ariaPressed));
    button.addEventListener("click", action.onClick || closeModal);
    actionsNode.appendChild(button);
  });
  document.querySelector("#modalBackdrop").hidden = false;
  document.querySelector(".game-shell").inert = true;
  document.body.style.overflow = "hidden";
  document.querySelector("#modalClose").focus();
}

function closeModal() {
  document.querySelector("#modalBackdrop").hidden = true;
  document.querySelector(".game-shell").inert = false;
  document.body.style.overflow = "";
  if (lastFocus?.focus) lastFocus.focus();
}

function toast(message, tone = "info") {
  const region = document.querySelector("#toastRegion");
  const duplicate = [...region.querySelectorAll(".toast:not(.is-leaving)")].find(item => item.textContent === message);
  if (duplicate) return;
  const node = document.createElement("div");
  node.className = `toast toast-${tone}`;
  node.textContent = message;
  region.appendChild(node);
  setTimeout(() => node.classList.add("is-leaving"), 2600);
  setTimeout(() => node.remove(), 2900);
}

function showMarket() {
  if (state.stats.orders < 1) {
    openModal({ icon: "✦", kicker: "MOONLIGHT MARKET · LOCKED", title: "Complete one village order", body: "<p>Complete your first order to open the market. Follow First Steps to brew, collect, and deliver a Meadow Tonic.</p><p>Offers are simulated.</p>", actions: [{ label: "Got it", primary: true }] });
    return;
  }
  const boostActive = Date.now() < state.boostUntil;
  const finishStatus = Logic.finishBrewAssistStatus(state);
  const finishCopy = finishStatus.available
    ? "Simulated ad · 40% less remaining time · once per brew"
    : finishStatus.reason === "already-used" ? "Already used for this brew"
      : finishStatus.reason === "too-close-to-ready" ? `Available with at least ${Logic.FINISH_BREW_CONFIG.minRemainingSeconds}s remaining`
        : finishStatus.reason === "brew-ready" ? "This brew is ready to collect" : "Start a longer brew to use this charm";
  openModal({ icon: "✦", kicker: "MOONLIGHT MARKET · PROTOTYPE", title: "Helpful little extras", body: `
    <p>Offers are simulated. No ads or payments are connected.</p>
    <div class="market-offer"><span>▶</span><div><strong>Prosperity charm</strong><small>${boostActive ? `Active · ${document.querySelector("#coinStatus").textContent}` : "Simulated ad · 2× order coins · 5 min"}</small></div></div>
    <div class="market-offer"><span>⚡</span><div><strong>Quick-brew charm</strong><small>${finishCopy}</small></div></div>
    <div class="market-offer"><span>🎁</span><div><strong>Apprentice bundle</strong><small>Simulated purchase · 100 coins + 10 ingredients</small></div></div>`, actions: [
      { label: boostActive ? "Prosperity charm active" : "Simulate ad: 2× coins", primary: true, onClick: boostActive ? closeModal : activateBoost },
      ...(finishStatus.available ? [{ label: "Simulate ad: shorten brew", onClick: finishBrewAd }] : []),
      ...(!state.starterClaimed ? [{ label: "Simulate one-time bundle", onClick: claimStarter }] : []),
    ] });
}

async function runSimulatedReward(placementId, grantReward, successMessage) {
  closeModal();
  sound.play("tap");
  analytics.track("reward_attempt", { placementId });
  fakeRewardedAds.queueScenario("success");
  toast("Simulating ad…");
  const result = await rewardedAds.requestReward({ placementId, grantReward });
  analytics.track("reward_result", { placementId, status: result.status });
  if (result.status === "success") feedback(successMessage, { tone: "reward", soundName: "reward", target: ".resource-bar" });
  else toast(`Simulated ad ended: ${result.status}. No reward granted.`);
  renderAll();
}

function activateBoost() {
  return runSimulatedReward("prosperity_charm", () => { state.boostUntil = Date.now() + 5 * 60 * 1000; }, "Prosperity charm active for 5 minutes!");
}
function finishBrewAd() {
  return runSimulatedReward("finish_brew", () => Logic.applyFinishBrewAssist(state, Date.now()), "Quick-brew applied. 40% less time remains.");
}
async function claimStarter() {
  closeModal();
  sound.play("tap");
  fakePurchases.queueScenario("success");
  toast("Simulating purchase…");
  const result = await purchases.purchase("apprentice_bundle");
  const fulfillment = commerceFulfillment.reconcile();
  if (result.status === "success" && fulfillment.granted === 1) {
    feedback("Simulated apprentice bundle granted. No money was charged.", { tone: "reward", soundName: "collect", target: ".resource-bar" });
    playCoinArrivals(100);
  } else toast(`Simulated purchase ended: ${result.status}. No new bundle granted.`);
  analytics.track("purchase_result", { productId: "apprentice_bundle", status: result.status });
  renderAll();
}

function showSettings() {
  const effectsPercent = Math.round(audioPreferenceStore.effectsVolume() * 100);
  const musicPercent = Math.round(audioPreferenceStore.musicVolume() * 100);
  const soundLine = `<p><strong>Sound:</strong> ${sound.enabled() ? "On" : "Off"}</p>`;
  openModal({ icon: "⚙", kicker: "SETTINGS", title: "Workshop settings", body: `
    ${soundLine}
    <div class="volume-control"><label for="effectsVolume"><strong>Sound effects</strong><output data-volume-output="effects">${effectsPercent}%</output></label><input id="effectsVolume" data-volume-slider="effects" type="range" min="0" max="100" step="5" value="${effectsPercent}" /></div>
    <div class="volume-control"><label for="musicVolume"><strong>Music</strong><output data-volume-output="music">${musicPercent}%</output></label><input id="musicVolume" data-volume-slider="music" type="range" min="0" max="100" step="5" value="${musicPercent}" /></div>
    <p><strong>Autosave:</strong> ${gameplaySaveWritesBlocked ? "Blocked to protect a newer save" : gameplaySaveSessionOnly ? "Session-only (storage unavailable)" : "On"}<br><strong>Offline gathering:</strong> Up to 4 hours<br><strong>Version:</strong> 0.1</p>
    <p><strong>Local analytics:</strong> ${consent.analyticsAllowed() ? "On" : "Off"}. Nothing is sent.</p>
    <p>No real ads or payments are connected. Progress stays in this browser.</p>`,
    actions: [
      { label: sound.enabled() ? "Turn sound off" : "Turn sound on", ariaPressed: sound.enabled(), onClick: () => {
        const enabled = sound.setEnabled(!sound.enabled());
        music.syncEnabled();
        if (enabled) { sound.activate(); music.activate(); sound.play("tap"); }
        closeModal();
        toast(`Sound ${enabled ? "on" : "off"}.`);
      } },
      { label: "Credits", onClick: showCredits },
      { label: "Save now", primary: true, onClick: () => {
        const result = saveState();
        closeModal();
        toast(result === "saved" ? "Workshop saved." : result === false ? "Newer save remains protected; this build did not write progress." : "Workshop could not be saved. You can keep playing, but progress will stay only in this session.", result === "saved" ? "success" : "warning");
      } },
      { label: consent.analyticsAllowed() ? "Turn analytics off" : "Turn analytics on", onClick: () => {
        consent.setAnalytics(!consent.analyticsAllowed());
        analytics.track("consent_changed", { analytics: consent.analyticsAllowed() ? "allowed" : "denied" });
        closeModal(); toast(`Local analytics ${consent.analyticsAllowed() ? "on" : "off"}.`);
      } },
    ],
  });
  const effectsSlider = document.querySelector('[data-volume-slider="effects"]');
  const musicSlider = document.querySelector('[data-volume-slider="music"]');
  const makePointerReliable = slider => {
    let dragging = false;
    const updateFromPointer = event => {
      const bounds = slider.getBoundingClientRect();
      if (!bounds.width) return;
      const min = Number(slider.min) || 0;
      const max = Number(slider.max) || 100;
      const step = Number(slider.step) || 1;
      const ratio = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
      const value = Math.max(min, Math.min(max, min + Math.round(((min + ratio * (max - min)) - min) / step) * step));
      if (Number(slider.value) === value) return;
      slider.value = String(value);
      slider.dispatchEvent(new Event("input", { bubbles: true }));
    };
    slider.addEventListener("pointerdown", event => {
      if (event.button !== 0) return;
      dragging = true;
      slider.focus();
      slider.setPointerCapture?.(event.pointerId);
      updateFromPointer(event);
    });
    slider.addEventListener("pointermove", event => { if (dragging) updateFromPointer(event); });
    slider.addEventListener("pointerup", event => {
      if (!dragging) return;
      updateFromPointer(event);
      dragging = false;
      slider.releasePointerCapture?.(event.pointerId);
      slider.dispatchEvent(new Event("change", { bubbles: true }));
    });
    slider.addEventListener("pointercancel", () => { dragging = false; });
  };
  makePointerReliable(effectsSlider);
  makePointerReliable(musicSlider);
  effectsSlider.addEventListener("input", () => {
    const value = Number(effectsSlider.value);
    document.querySelector('[data-volume-output="effects"]').textContent = `${value}%`;
    audioPreferenceStore.setEffectsVolume(value / 100);
  });
  effectsSlider.addEventListener("change", () => sound.play("tap", { bypassCooldown: true }));
  musicSlider.addEventListener("input", () => {
    const value = Number(musicSlider.value);
    document.querySelector('[data-volume-output="music"]').textContent = `${value}%`;
    music.setMusicVolume(value / 100);
  });
}

function showCredits() {
  openModal({ icon: "♪", kicker: "CREDITS", title: "Made with a little magic", body: `<p><strong>Music:</strong> Trycja via Pixabay</p><p>Dreamscape · Violin Alchemy · Emerald Echoes Cries</p><p><strong>Sound effects:</strong> Pixabay contributors</p><p>Used under the Pixabay Content License.</p>`, actions: [{ label: "Back to settings", primary: true, onClick: showSettings }] });
}

function confirmReset() {
  openModal({ icon: "!", kicker: "RESET WORKSHOP", title: "Erase all progress?", body: "<p>This erases your local save and restarts the tutorial. It cannot be undone.</p>", actions: [
    { label: "Keep my workshop" },
    { label: "Erase and restart", primary: true, onClick: () => {
      if (uiPrefsStorage.remove() !== "removed" || gameplayStorage.remove() !== "removed") {
        console.warn("Reset failed; the saved workshop was not removed.");
        toast("Workshop data could not be cleared. Your saved workshop remains unchanged.", "warning");
        return;
      }
      gameplaySaveWritesBlocked = false; gameplaySaveSessionOnly = false; unsupportedSaveVersion = null; state = defaultState(); uiPrefs = { version: 1, pantryOpen: false, recipesOpen: false }; closeModal(); switchView("workshop"); renderAll(); showTutorial();
    } },
  ] });
}

function showTutorial() {
  if (state.tutorialSeen) return;
  state.tutorialSeen = true;
  openModal({ icon: "⚗", kicker: "WELCOME, ALCHEMIST", title: "A tiny shop with big potential", body: `<p>Your pantry has everything for a <strong>Meadow Tonic</strong>. Follow First Steps to brew, collect, deliver, and upgrade.</p><p>Charged harvests refill over time. After your first delivery, the garden gathers while you are away without filling your pantry.</p>`, actions: [{ label: "Show my first step", primary: true }] });
  scheduleSave();
}

function showFutureSaveGuard() {
  openModal({
    icon: "!", kicker: "NEWER SAVE DETECTED", title: "This workshop is protected",
    body: `<p>This browser contains gameplay save version <strong>${unsupportedSaveVersion}</strong>, but this build supports version <strong>${SAVE_VERSION}</strong>.</p><p>The newer save has not been loaded, changed, or overwritten. Return to the newer build, or use Reset game data only if you intentionally want to erase it.</p>`,
    actions: [{ label: "Keep the newer save protected", primary: true }],
  });
}

function manualGather(event) {
  const tutorialBefore = Logic.beginnerQuest(state);
  const viewBeforeAction = activeView();
  const result = Logic.chargedGather(state);
  const added = result.added;
  if (!added) {
    toast(state.gather.charges < 1 ? "The garden is recharging. Another harvest will be ready soon." : "Your pantry is full. Brew something delicious!");
    renderAll();
    return;
  }
  const gatheredName = result.targetId ? INGREDIENTS[result.targetId].name : "fresh ingredient";
  feedback(`Gathered ${added} ${gatheredName}${added === 1 || result.targetId ? "" : "s"}.`, { tone: "gather", soundName: "gather", target: ".workshop-card" });
  state.stats.taps += 1;
  if (added > 0 && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const particle = document.querySelector("#particleTemplate").content.firstElementChild.cloneNode(true);
    particle.textContent = `+${added}`;
    particle.style.left = `${event.clientX || innerWidth / 2}px`;
    particle.style.top = `${event.clientY || innerHeight / 2}px`;
    document.body.appendChild(particle);
    setTimeout(() => particle.remove(), 800);
  }
  renderAll();
  showTutorialTransition(tutorialBefore, viewBeforeAction);
}

function tick() {
  const now = Date.now();
  const elapsedSeconds = lifecycle.activeElapsed(lastTickAt, now);
  lastTickAt = now;
  if (document.hidden) return;
  passiveBank += gatherRate() * elapsedSeconds;
  const whole = Math.floor(passiveBank);
  if (whole > 0) {
    const added = Logic.grantPassiveIngredients(state, whole);
    passiveBank -= whole;
    if (added > 0) { renderIngredients(); document.querySelector("#pantryTotal").textContent = `${formatNumber(totalIngredients())} / ${storageCap()} items`; }
  }
  if (state.brew) renderBrew();
  renderBoostStatus(now);
  renderGatherButton();
  renderBeginnerQuest();
  updateBrewShortcut(now);
  if (Date.now() > state.boostUntil && state.boostUntil !== 0) { state.boostUntil = 0; renderAll(); }
}

function activateAudioFromGesture() {
  music.activate();
  sound.activate();
}
document.addEventListener("touchend", activateAudioFromGesture, { passive: true });
document.addEventListener("click", activateAudioFromGesture, { passive: true });
document.addEventListener("keydown", event => { if (event.key === "Enter" || event.key === " ") activateAudioFromGesture(); });
document.querySelectorAll("[data-nav]").forEach(button => button.addEventListener("click", () => { sound.play("tap"); switchView(button.dataset.nav); }));
document.querySelector("#gatherButton").addEventListener("click", manualGather);
document.querySelector("#smartGatherTarget").addEventListener("click", () => selectGatherTarget(null));
document.querySelector("#pantryDisclosure").addEventListener("click", () => setDisclosure("pantry", !uiPrefs.pantryOpen));
document.querySelector("#recipeDisclosure").addEventListener("click", () => setDisclosure("recipes", !uiPrefs.recipesOpen));
document.querySelector("#brewShortcut").addEventListener("click", goToBrewSlot);
document.querySelector("#beginnerQuestButton").addEventListener("click", () => {
  goToTutorialTarget(Logic.beginnerQuest(state));
});
document.querySelector("#tutorialBannerButton").addEventListener("click", () => goToTutorialTarget(pendingTutorialTarget));
document.querySelector("#tutorialBannerClose").addEventListener("click", hideTutorialBanner);
document.querySelector("#refreshOrdersButton").addEventListener("click", refreshOrder);
document.querySelector("#claimDailyButton").addEventListener("click", claimDaily);
document.querySelector("#claimWeeklyButton").addEventListener("click", claimWeekly);
document.querySelector("#openCommissionChoicesButton").addEventListener("click", showSpecialRequestChooser);
document.querySelector("#prestigeButton").addEventListener("click", confirmPrestige);
document.querySelector("#marketButton").addEventListener("click", showMarket);
document.querySelector("#settingsButton").addEventListener("click", showSettings);
document.querySelector("#clearPantryButton").addEventListener("click", showPantryCleanup);
document.querySelector("#resetSaveButton").addEventListener("click", confirmReset);
document.querySelector("#modalClose").addEventListener("click", closeModal);
document.querySelector("#modalBackdrop").addEventListener("click", event => { if (event.target.id === "modalBackdrop") closeModal(); });
document.addEventListener("click", event => {
  const button = event.target.closest?.("button");
  if (button && !button.disabled) sound.play("tap");
});
window.addEventListener("scroll", () => updateBrewShortcut(), { passive: true });
document.addEventListener("visibilitychange", () => music.setPaused(document.hidden));
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !document.querySelector("#modalBackdrop").hidden) closeModal();
  if (event.key === "Tab" && !document.querySelector("#modalBackdrop").hidden) {
    const focusable = [...document.querySelector("#modalBackdrop").querySelectorAll("button:not([disabled]), input:not([disabled])")];
    if (!focusable.length) return;
    const first = focusable[0], last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
});
window.addEventListener("pagehide", saveState);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    saveState();
    lifecycleAdapter.emit("background", Date.now());
    analytics.track("lifecycle", { phase: "background" });
  }
  else {
    lifecycleAdapter.emit("resume", Date.now());
    analytics.track("lifecycle", { phase: "resume" });
    lastTickAt = Date.now();
    renderAll();
  }
});

function setupServiceWorkerUpdates() {
  if (!("serviceWorker" in navigator) || location.protocol === "file:") return;
  let hasController = Boolean(navigator.serviceWorker.controller);
  const banner = document.querySelector("#updateBanner");
  let updateReady = false;
  let lastUpdateCheckAt = 0;
  let registration = null;

  const showUpdate = () => {
    if (!hasController) {
      hasController = true;
      return;
    }
    if (updateReady) return;
    updateReady = true;
    banner.hidden = false;
    document.body.classList.add("update-ready");
    document.querySelector("#updateAnnouncement").textContent = "A new game update is available. Tap the restart button to use it.";
  };
  const checkForUpdate = (force = false) => {
    if (!registration || updateReady || (!force && Date.now() - lastUpdateCheckAt < 15 * 60 * 1000)) return;
    lastUpdateCheckAt = Date.now();
    registration.update().catch(() => { lastUpdateCheckAt = 0; });
  };

  navigator.serviceWorker.addEventListener("controllerchange", showUpdate);
  banner.addEventListener("click", () => {
    banner.disabled = true;
    banner.querySelector("small").textContent = "Restarting...";
    location.reload();
  });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) checkForUpdate(); });
  window.addEventListener("online", () => checkForUpdate(true));

  navigator.serviceWorker.register("service-worker.js").then(result => {
    registration = result;
    checkForUpdate();
  }).catch(error => console.warn("Offline mode unavailable.", error));
}

setupServiceWorkerUpdates();

reconcileOfflineProgress();
checkAchievements();
renderAll();
setInterval(tick, 1000);
setTimeout(() => gameplaySaveWritesBlocked ? showFutureSaveGuard() : showTutorial(), 500);

window.PPW = Object.freeze({
  getSnapshot: () => JSON.parse(JSON.stringify(state)),
  validateData: () => ({
    recipesValid: RECIPES.every(recipe => Object.keys(recipe.ingredients).every(id => INGREDIENTS[id]) && recipe.seconds > 0 && recipe.sell > 0),
    upgradesValid: UPGRADES.every(upgrade => upgrade.max > 0 && upgrade.baseCost > 0),
    saveVersion: state.version,
    saveWriteBlocked: gameplaySaveWritesBlocked,
  }),
  getPlatformSnapshot: () => platformStore.snapshot(),
  getLocalAnalytics: () => analytics.snapshot(),
});
