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
  state.ingredients = { herb: 2, mushroom: 1, crystal: 0, mist: 0, ember: 0, lavender: 0 };
  assert.equal(game.startBrew(state, "tonic", NOW), true);
  assert.deepEqual(state.ingredients, { herb: 0, mushroom: 0, crystal: 0, mist: 0, ember: 0, lavender: 0 });
});

test("insufficient cost cannot start or partially charge a brew", () => {
  const state = game.defaultState(NOW);
  state.ingredients = { herb: 2, mushroom: 0, crystal: 0, mist: 0, ember: 0, lavender: 0 };
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
  state.ingredients = { herb: 59, mushroom: 0, crystal: 0, mist: 0, ember: 0, lavender: 0 };
  assert.equal(game.addRandomIngredients(state, 50, () => 0), 1);
  assert.equal(game.totalIngredients(state), 60);
  const corrupt = { ...state, ingredients: { herb: 1000, mushroom: 1000, crystal: 1000, mist: 1000, ember: 1000, lavender: 1000 } };
  assert.equal(game.totalIngredients(game.normalizeState(corrupt, NOW)), 60);
});

test("daily reward is idempotent", () => {
  const state = game.defaultState(NOW); state.daily.orders = 5;
  assert.equal(game.claimDaily(state), true);
  assert.equal(game.claimDaily(state), false);
  assert.equal(state.coins, 80); assert.equal(state.stardust, 1); assert.equal(state.stats.coinsEarned, 50);
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
  assert.deepEqual(result.achievements, { firstBrew: 1234, legacyBadge: 5678 });
  assert.equal(result.stats.brewed, 22); assert.equal(result.stats.prestiges, 2); assert.equal(result.stats.legacyCounter, 44);
  assert.equal(result.upgrades.garden, 8); assert.equal(result.brew, null); assert.equal(result.lastSeen, NOW);
});

test("a versioned existing save retains stardust, achievements, and lifetime stats", () => {
  const existing = game.defaultState(NOW - 1000);
  existing.stardust = 17;
  existing.achievements = { firstBrew: 111, rebirth: 222 };
  existing.stats = { taps: 90, brewed: 30, orders: 14, coinsEarned: 912, prestiges: 3 };
  const loaded = game.parseSave(JSON.stringify(existing), NOW).state;
  assert.equal(loaded.stardust, 17);
  assert.deepEqual(loaded.achievements, existing.achievements);
  assert.deepEqual(loaded.stats, existing.stats);
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
  assert.equal(game.chargedGather(state, NOW, () => 0).added, 2);
  assert.equal(game.chargedGather(state, NOW, () => 0).added, 2);
  assert.equal(game.chargedGather(state, NOW, () => 0).added, 2);
  assert.equal(game.chargedGather(state, NOW, () => 0).added, 0);
  assert.equal(game.chargedGather(state, NOW + 3000, () => 0).added, 2);
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
    { status: "needs-delivery", selector: '[data-order="1"]' },
  );
});

test("tutorial recognizes coin, ingredient, upgrade, and new unlock states", () => {
  const state = game.defaultState(NOW);
  state.stats.orders = 1;
  state.coins = 40;
  state.ingredients = { herb: 0, mushroom: 0, crystal: 0, mist: 0, ember: 0, lavender: 0 };
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
  assert.equal(game.beginnerQuest(state, NOW + 66000).targetSelector, '[data-order="44"]');
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
