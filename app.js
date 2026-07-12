"use strict";

const SAVE_KEY = "pocket-potion-works-v1";
const Logic = window.PPWLogic;
const Platform = window.PPWPlatform;
const AudioFeedback = window.PPWAudio;
const { SAVE_VERSION, INGREDIENTS, RECIPES, UPGRADES, ACHIEVEMENTS, clamp, todayKey, defaultState, recipeById, upgradeById } = Logic;
const platformStore = new Platform.PlatformStateStore(localStorage);
const consent = new Platform.ConsentManager(platformStore);
const analytics = new Platform.InMemoryAnalyticsAdapter(consent);
const fakeRewardedAds = new Platform.FakeRewardedAdAdapter();
const rewardedAds = new Platform.RewardedAdService(fakeRewardedAds);
const entitlementLedger = new Platform.EntitlementLedger(platformStore);
const fakePurchases = new Platform.FakeIapAdapter();
const purchases = new Platform.PurchaseService(fakePurchases, entitlementLedger);
const lifecycleAdapter = new Platform.FakeLifecycleAdapter();
const audioPreferenceStore = new AudioFeedback.AudioPreferenceStore(localStorage);
const sound = new AudioFeedback.SoundEngine(audioPreferenceStore);
function formatNumber(value) { return Math.floor(value).toLocaleString("en-US"); }
function xpNeeded(level = state.level) { return Logic.xpNeeded(level); }
function storageCap() { return Logic.storageCap(state); }
function gatherRate() { return Logic.gatherRate(state); }
function manualGatherAmount() { return Logic.manualGatherAmount(state); }
function orderMultiplier() { return Logic.orderMultiplier(state); }
function brewSpeedMultiplier() { return Logic.brewSpeedMultiplier(state); }
function totalIngredients() { return Logic.totalIngredients(state); }

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
let unsupportedSaveVersion = null;

function loadState() {
  const result = window.PPWLogic.parseSave(localStorage.getItem(SAVE_KEY));
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
let passiveBank = 0;
let saveTimer = null;
let lastFocus = null;
let lastTickAt = Date.now();
let tutorialBannerTimer = null;
let pendingTutorialTarget = null;
let lastTutorialPromptKey = null;
let announcedReadyBrew = null;
let renderedBrewKey = null;

function saveState() {
  if (gameplaySaveWritesBlocked) return false;
  state.lastSeen = Date.now();
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); }
  catch (error) { console.warn("Save failed.", error); }
  return true;
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
    if (gameplaySaveWritesBlocked) throw new Error("Unsupported future gameplay save is write-protected.");
    state.lastSeen = Date.now();
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  },
});
if (!gameplaySaveWritesBlocked) commerceFulfillment.reconcile();

function scheduleSave() {
  if (gameplaySaveWritesBlocked) return;
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
  const ingredients = Math.floor(elapsed * gatherRate() * .65);
  const before = totalIngredients();
  addRandomIngredients(ingredients);
  const gained = totalIngredients() - before;
  if (gained > 0) {
    setTimeout(() => openModal({
      icon: "☾", kicker: "WELCOME BACK", title: "The garden kept growing.",
      body: `<p>While you were away, your helpers gathered <strong>${gained} ingredients</strong>.</p><p>Offline gathering is capped at four hours.</p>`,
      actions: [{ label: "Collect ingredients", primary: true }],
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
  return Object.entries(recipe.ingredients).map(([id, count]) => `${INGREDIENTS[id].icon} ${count}`).join("  ");
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
  document.querySelector("#incomeRate").textContent = `Garden grows ~${Math.round(gatherRate() * 60)} ingredients/min · ${storageCap()} capacity`;
  document.querySelector("#pantryTotal").textContent = `${formatNumber(totalIngredients())} / ${storageCap()} items`;
  const hour = new Date().getHours();
  document.querySelector("#dayGreeting").textContent = `${hour < 12 ? "GOOD MORNING" : hour < 18 ? "GOOD AFTERNOON" : "GOOD EVENING"}, ALCHEMIST`;
  document.querySelector("#workshopStatus").textContent = state.brew ? `${recipeById(state.brew.recipeId).name} is brewing` : "The kettle is warm";
  document.querySelector("#marketButton").disabled = false;
  document.querySelector("#marketButton").title = state.stats.orders < 1 ? "Complete your first order to unlock the market" : "Open Moonlight Market";
  renderBoostStatus();
  document.querySelector("#orderDot").hidden = !state.orders.some(order => state.potions[order.recipeId] >= order.quantity);
  renderGatherButton();
  renderBeginnerQuest();
  renderIngredients();
  renderBrew();
  renderPotionShelf();
  renderRecipes();
  renderOrders();
  renderUpgrades();
  renderJournal();
  scheduleSave();
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
  button.disabled = charges < 1 || totalIngredients() >= storageCap();
  button.querySelector("strong").textContent = charges > 0 ? `Gather ingredients · ${charges}/${Logic.GATHER_CONFIG.maxCharges}` : "Garden recharging";
  button.querySelector("small").textContent = charges > 0 ? `Charged harvest · +${manualGatherAmount()} items` : `One charge every ${Logic.GATHER_CONFIG.rechargeSeconds} seconds`;
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
    return `<div class="ingredient-card" style="--ingredient-bg:${item.color}">
      <span class="ingredient-icon">${locked ? "?" : item.icon}</span>
      <strong>${locked ? `Level ${item.unlock}` : formatNumber(state.ingredients[id])}</strong>
      <small>${locked ? "Locked" : item.name}</small>
    </div>`;
  }).join("");
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
      <span class="potion-bottle" style="--potion-color:${recipe.color}">${recipe.icon}</span>
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
    return `<span class="potion-chip ${requested ? "is-requested" : ""}"><span>${recipe.icon}</span><strong>${state.potions[recipe.id]}</strong> ${recipe.name}${requested ? " · requested" : ""}</span>`;
  }).join("");
}

function renderRecipes() {
  const visibleRecipes = RECIPES.filter(recipe => recipe.unlock <= state.level + 2);
  const hiddenCount = RECIPES.length - visibleRecipes.length;
  document.querySelector("#recipeList").innerHTML = visibleRecipes.map(recipe => {
    const locked = recipe.unlock > state.level;
    const disabled = locked || Boolean(state.brew) || !canAffordRecipe(recipe);
    let buttonLabel = "Brew";
    if (locked) buttonLabel = `Lv. ${recipe.unlock}`;
    else if (state.brew) buttonLabel = "Busy";
    else if (!canAffordRecipe(recipe)) buttonLabel = "Need items";
    const requested = state.orders.some(order => order.recipeId === recipe.id);
    return `<article class="recipe-card ${locked ? "is-locked" : ""} ${requested ? "is-requested" : ""}">
      <span class="potion-bottle" style="--potion-color:${recipe.color}">${locked ? "?" : recipe.icon}</span>
      <div class="recipe-info"><strong>${locked ? "Mysterious recipe" : recipe.name}</strong><small>${locked ? `Discover at level ${recipe.unlock}` : `${Math.ceil(recipe.seconds / brewSpeedMultiplier())} sec · order value ~${recipe.sell} coins`}</small><div class="recipe-cost">${locked ? "Keep helping villagers to level up" : `${ingredientCostText(recipe)} · Owned ${state.potions[recipe.id]}${requested ? " · Requested" : ""}`}</div></div>
      <button class="brew-button" data-brew="${recipe.id}" aria-label="${buttonLabel} ${locked ? "locked recipe" : recipe.name}" ${disabled ? "disabled" : ""}>${buttonLabel}</button>
    </article>`;
  }).join("") + (hiddenCount ? `<p class="distant-recipes">${hiddenCount} distant recipe${hiddenCount === 1 ? "" : "s"} will appear as your alchemy grows.</p>` : "");
  document.querySelectorAll("[data-brew]").forEach(button => button.addEventListener("click", () => startBrew(button.dataset.brew)));
}

function renderOrders() {
  const dailyComplete = state.daily.orders >= 5;
  document.querySelector("#dailyProgress").textContent = `${Math.min(state.daily.orders, 5)} / 5 orders${state.daily.claimed ? " · claimed" : ""}`;
  document.querySelector("#dailyBar").style.width = `${Math.min(100, state.daily.orders / 5 * 100)}%`;
  const dailyClaimButton = document.querySelector("#claimDailyButton");
  dailyClaimButton.hidden = !dailyComplete || state.daily.claimed;
  document.querySelector("#orderList").innerHTML = state.orders.map(order => {
    const recipe = recipeById(order.recipeId);
    const owned = state.potions[recipe.id];
    const canFill = owned >= order.quantity;
    const reward = Math.round(order.reward * orderMultiplier());
    return `<article class="order-card">
      <div class="order-top"><span class="customer-avatar" style="--avatar:${order.avatarColor}">${order.avatar}</span><div class="order-copy"><strong>${order.customer}</strong><small>${order.note}</small></div><div class="order-reward">+${reward} ●<br><small>+${order.xp} XP</small></div></div>
      <div class="order-bottom"><div class="order-request"><span>${recipe.icon} ${order.quantity}×</span> ${recipe.name}<br><small>You have ${owned}</small></div><button class="fulfill-button" data-order="${order.id}" ${canFill ? "" : "disabled"}>${canFill ? "Deliver" : "Not ready"}</button></div>
    </article>`;
  }).join("");
  document.querySelectorAll("[data-order]").forEach(button => button.addEventListener("click", () => fulfillOrder(Number(button.dataset.order))));
}

function upgradeCost(upgrade) {
  return Logic.upgradeCost(state, upgrade);
}

function renderUpgrades() {
  document.querySelector("#upgradeList").innerHTML = UPGRADES.map(upgrade => {
    const level = state.upgrades[upgrade.id];
    const maxed = level >= upgrade.max;
    const cost = upgradeCost(upgrade);
    return `<article class="upgrade-card"><span class="upgrade-icon">${upgrade.icon}</span><div class="upgrade-copy"><strong>${upgrade.name}</strong><small>${upgrade.description}</small><small class="upgrade-level">Level ${level} / ${upgrade.max}</small></div><button class="upgrade-button" data-upgrade="${upgrade.id}" ${maxed || state.coins < cost ? "disabled" : ""}>${maxed ? "MAX" : `${cost} ●`}</button></article>`;
  }).join("");
  document.querySelectorAll("[data-upgrade]").forEach(button => button.addEventListener("click", () => buyUpgrade(button.dataset.upgrade)));
  const canPrestige = state.level >= 8;
  const prestigeButton = document.querySelector("#prestigeButton");
  prestigeButton.disabled = !canPrestige;
  prestigeButton.textContent = canPrestige ? `Rebirth for ${prestigeReward()} stardust` : "Reach level 8 to unlock";
}

function renderJournal() {
  const stats = [
    ["Potions brewed", state.stats.brewed], ["Orders delivered", state.stats.orders],
    ["Lifetime coins", state.stats.coinsEarned], ["Harvest taps", state.stats.taps],
  ];
  document.querySelector("#statsGrid").innerHTML = stats.map(([label, value]) => `<div class="stat-card"><span>${label}</span><strong>${formatNumber(value)}</strong></div>`).join("");
  document.querySelector("#achievementList").innerHTML = ACHIEVEMENTS.map(achievement => {
    const earned = Boolean(state.achievements[achievement.id]);
    return `<article class="achievement-card ${earned ? "" : "is-locked"}"><span class="achievement-icon">${earned ? achievement.icon : "?"}</span><div><strong>${achievement.name}</strong><small>${achievement.description}</small></div><span class="achievement-status">${earned ? "Earned" : "Locked"}</span></article>`;
  }).join("");
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
  announceLevels(result.levels);
  checkAchievements();
  feedback(`Order delivered! +${result.reward} coins`, { tone: "delivery", soundName: "delivery", target: ".resource-bar" });
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
  if (!window.PPWLogic.claimDaily(state)) return;
  checkAchievements();
  toast("Daily goal complete! +50 coins and +1 stardust");
  renderAll();
  playCoinArrivals(50);
}

function prestigeReward() { return Logic.prestigeReward(state); }

function confirmPrestige() {
  if (state.level < 8) return;
  const reward = prestigeReward();
  openModal({ icon: "★", kicker: "STARRY REBIRTH", title: "Begin again, brighter?", body: `<p>This resets coins, level, ingredients, potions, orders, brewing, and upgrades.</p><p>You keep achievements and gain <strong>${reward} stardust</strong>, permanently increasing all coin earnings by ${reward * 10}%.</p>`, actions: [
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
}

function openModal({ icon = "✦", kicker = "POCKET POTION WORKS", title, body, actions = [] }) {
  lastFocus = document.activeElement;
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
  const node = document.createElement("div");
  node.className = `toast toast-${tone}`;
  node.textContent = message;
  document.querySelector("#toastRegion").appendChild(node);
  setTimeout(() => node.classList.add("is-leaving"), 2600);
  setTimeout(() => node.remove(), 2900);
}

function showMarket() {
  if (state.stats.orders < 1) {
    openModal({ icon: "✦", kicker: "MOONLIGHT MARKET · LOCKED", title: "Complete one village order", body: "<p>The market opens after your first successful delivery. Follow First Steps to brew a Meadow Tonic, collect it, and deliver it from Orders.</p><p>No real ads or purchases are connected.</p>", actions: [{ label: "Got it", primary: true }] });
    return;
  }
  const boostActive = Date.now() < state.boostUntil;
  const finishStatus = Logic.finishBrewAssistStatus(state);
  const finishCopy = finishStatus.available
    ? "Simulated rewarded ad · removes 40% of remaining time · once per brew"
    : finishStatus.reason === "already-used" ? "Already used for this brew"
      : finishStatus.reason === "too-close-to-ready" ? `Available with at least ${Logic.FINISH_BREW_CONFIG.minRemainingSeconds}s remaining`
        : finishStatus.reason === "brew-ready" ? "This brew is ready to collect" : "Start a longer brew to use this charm";
  openModal({ icon: "✦", kicker: "MOONLIGHT MARKET · PROTOTYPE", title: "Helpful little extras", body: `
    <p>Monetization placements are simulated in this prototype. No ad network or billing system is connected.</p>
    <div class="market-offer"><span>▶</span><div><strong>Prosperity charm</strong><small>${boostActive ? `Active · ${document.querySelector("#coinStatus").textContent}` : "Simulated rewarded ad · 2× order coins for 5 minutes"}</small></div></div>
    <div class="market-offer"><span>⚡</span><div><strong>Quick-brew charm</strong><small>${finishCopy}</small></div></div>
    <div class="market-offer"><span>🎁</span><div><strong>Apprentice bundle</strong><small>One-time simulated purchase · 100 coins and 10 ingredients</small></div></div>`, actions: [
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
  toast("Simulated rewarded ad started. Reward is waiting for confirmation.");
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
  return runSimulatedReward("finish_brew", () => Logic.applyFinishBrewAssist(state, Date.now()), "Quick-brew charm applied once. Remaining brew time was reduced by 40%.");
}
async function claimStarter() {
  closeModal();
  sound.play("tap");
  fakePurchases.queueScenario("success");
  toast("Starting a simulated purchase. No billing system is connected.");
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
  const soundLine = `<p><strong>Sound:</strong> ${sound.enabled() ? "On" : "Off"} (starts off by default)</p>`;
  openModal({ icon: "⚙", kicker: "SETTINGS & INFORMATION", title: "Workshop settings", body: `
    ${soundLine}
    <p><strong>Autosave:</strong> ${gameplaySaveWritesBlocked ? "Blocked to protect a newer save" : "On"}<br><strong>Offline gathering:</strong> Up to 4 hours<br><strong>Version:</strong> 0.1 vertical slice</p>
    <p><strong>Optional local analytics:</strong> ${consent.analyticsAllowed() ? "Allowed" : "Off"}. Events stay in memory, are schema-limited, and are never transmitted.</p>
    <p>This prototype contains no real advertisements, purchases, analytics services, accounts, or gameplay-data transmission. The web host serves the app files on first load; progress stays in this browser.</p>`,
    actions: [
      { label: `Sound: ${sound.enabled() ? "On - turn off" : "Off - turn on"}`, ariaPressed: sound.enabled(), onClick: () => {
        const enabled = sound.setEnabled(!sound.enabled());
        if (enabled) { sound.activate(); sound.play("tap"); }
        closeModal();
        toast(`Workshop sound turned ${enabled ? "on" : "off"}.`);
      } },
      { label: "Save now", primary: true, onClick: () => { const saved = saveState(); closeModal(); toast(saved ? "Workshop saved." : "Newer save remains protected; this build did not write progress."); } },
      { label: consent.analyticsAllowed() ? "Turn local analytics off" : "Allow local analytics", onClick: () => {
        consent.setAnalytics(!consent.analyticsAllowed());
        analytics.track("consent_changed", { analytics: consent.analyticsAllowed() ? "allowed" : "denied" });
        closeModal(); toast(`Optional local analytics ${consent.analyticsAllowed() ? "allowed" : "turned off"}.`);
      } },
    ],
  });
}

function confirmReset() {
  openModal({ icon: "!", kicker: "RESET WORKSHOP", title: "Erase all progress?", body: "<p>This permanently clears your local save and restarts the tutorial. This cannot be undone.</p>", actions: [
    { label: "Keep my workshop" },
    { label: "Erase and restart", primary: true, onClick: () => { localStorage.removeItem(SAVE_KEY); gameplaySaveWritesBlocked = false; unsupportedSaveVersion = null; state = defaultState(); closeModal(); switchView("workshop"); renderAll(); showTutorial(); } },
  ] });
}

function showTutorial() {
  if (state.tutorialSeen) return;
  state.tutorialSeen = true;
  openModal({ icon: "⚗", kicker: "WELCOME, ALCHEMIST", title: "A tiny shop with big potential", body: `<p>Your pantry already holds everything for a <strong>Meadow Tonic</strong>. Follow the First Steps card to brew, collect, deliver, and improve your workshop.</p><p>Charged harvests refill gently over time, and the garden grows slowly while you are away.</p>`, actions: [{ label: "Show my first step", primary: true }] });
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
  feedback(`Gathered ${added} fresh ingredient${added === 1 ? "" : "s"}.`, { tone: "gather", soundName: "gather", target: ".workshop-card" });
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
    const added = addRandomIngredients(whole);
    passiveBank -= whole;
    if (added > 0) { renderIngredients(); document.querySelector("#pantryTotal").textContent = `${formatNumber(totalIngredients())} / ${storageCap()} items`; }
  }
  if (state.brew) renderBrew();
  renderBoostStatus(now);
  renderGatherButton();
  renderBeginnerQuest();
  if (Date.now() > state.boostUntil && state.boostUntil !== 0) { state.boostUntil = 0; renderAll(); }
}

document.addEventListener("pointerdown", () => sound.activate(), { passive: true });
document.addEventListener("keydown", event => { if (event.key === "Enter" || event.key === " ") sound.activate(); });
document.querySelectorAll("[data-nav]").forEach(button => button.addEventListener("click", () => { sound.play("tap"); switchView(button.dataset.nav); }));
document.querySelector("#gatherButton").addEventListener("click", manualGather);
document.querySelector("#beginnerQuestButton").addEventListener("click", () => {
  goToTutorialTarget(Logic.beginnerQuest(state));
});
document.querySelector("#tutorialBannerButton").addEventListener("click", () => goToTutorialTarget(pendingTutorialTarget));
document.querySelector("#tutorialBannerClose").addEventListener("click", hideTutorialBanner);
document.querySelector("#refreshOrdersButton").addEventListener("click", refreshOrder);
document.querySelector("#claimDailyButton").addEventListener("click", claimDaily);
document.querySelector("#prestigeButton").addEventListener("click", confirmPrestige);
document.querySelector("#marketButton").addEventListener("click", showMarket);
document.querySelector("#settingsButton").addEventListener("click", showSettings);
document.querySelector("#resetSaveButton").addEventListener("click", confirmReset);
document.querySelector("#modalClose").addEventListener("click", closeModal);
document.querySelector("#modalBackdrop").addEventListener("click", event => { if (event.target.id === "modalBackdrop") closeModal(); });
document.addEventListener("click", event => {
  const button = event.target.closest?.("button");
  if (button && !button.disabled) sound.play("tap");
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !document.querySelector("#modalBackdrop").hidden) closeModal();
  if (event.key === "Tab" && !document.querySelector("#modalBackdrop").hidden) {
    const focusable = [...document.querySelector("#modalBackdrop").querySelectorAll("button:not([disabled])")];
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

if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("service-worker.js").catch(error => console.warn("Offline mode unavailable.", error));

reconcileOfflineProgress();
renderAll();
checkAchievements();
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
