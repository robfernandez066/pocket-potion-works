"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const game = require("./game-logic.js");
const v1Reader = require("./fixtures/rollback/game-save-reader-v1.cjs");
const v2Reader = require("./fixtures/rollback/game-save-reader-v2.cjs");

const NOW = Date.UTC(2026, 6, 12, 12);
const fixture = name => fs.readFileSync(`fixtures/saves/${name}`, "utf8");

let passed = 0;
function test(name, fn) { fn(); passed += 1; console.log(`ok ${passed} - ${name}`); }

test("historical pre-release v1 fixture preserves durable progress, brew, and orders", () => {
  const result = game.parseSave(fixture("legacy-pre-release-v1.json"), NOW);
  assert.equal(result.blocked, false);
  assert.equal(result.state.version, game.SAVE_VERSION);
  assert.deepEqual({ coins: result.state.coins, xp: result.state.xp, level: result.state.level, stardust: result.state.stardust }, { coins: 287, xp: 31, level: 4, stardust: 6 });
  assert.deepEqual(result.state.achievements, { firstBrew: 1783800000000, orderFive: 1783810000000 });
  assert.deepEqual(result.state.stats, { taps: 74, brewed: 29, orders: 18, coinsEarned: 1450, prestiges: 2 });
  assert.deepEqual(result.state.brew, { recipeId: "clarity", startedAt: 1783857540000, endsAt: 1783857606000, durationMs: 66000, assistUses: 0 });
  assert.deepEqual(result.state.orders.map(order => ({ id: order.id, recipeId: order.recipeId, quantity: order.quantity })), [
    { id: 7, recipeId: "tonic", quantity: 1 },
    { id: 8, recipeId: "clarity", quantity: 1 },
  ]);
  assert.equal(result.state.nextOrderId, 9);
  assert.equal(result.state.ingredients.mist, 0);
  assert.equal(result.state.ingredients.lavender, 0);
  assert.deepEqual(result.state.gather, { charges: game.GATHER_CONFIG.maxCharges, lastRechargeAt: NOW, targetId: null });
  assert.equal(result.state.discovery.brewed.tonic, 1);
  assert.equal(result.state.discovery.delivered.tonic, 1);
  assert.equal(result.state.discovery.brewed.clarity, 1);
  assert.equal(result.state.discovery.delivered.clarity, 1);
  assert.equal(result.state.mastery.tonic, 1, "legacy brew discovery migrates into mastery without inventing counts");
  assert.deepEqual(result.state.customers["customer-0"], { deliveries: 0, hearts: 0 });
});

test("future-version fixture is detected and cannot be normalized for overwrite", () => {
  const raw = fixture("future-version-v4.json");
  const result = game.parseSave(raw, NOW);
  assert.deepEqual(result, { state: null, recovered: false, blocked: true, reason: "unsupported-future-version", sourceVersion: 4 });
  assert.equal(game.shouldBlockSaveWrite(result), true);
  let stored = raw;
  if (!game.shouldBlockSaveWrite(result)) stored = JSON.stringify(result.state);
  assert.equal(stored, raw, "v2 tooling must preserve the unsupported future save byte-for-byte");
});

test("the frozen v1 reader blocks a Task 8 v2 save without overwriting it", () => {
  const current = game.defaultState(NOW);
  current.version = 2;
  delete current.weekly;
  delete current.customization;
  current.mastery.tonic = 8;
  current.customers["customer-0"] = { deliveries: 4, hearts: 1 };
  const raw = JSON.stringify(current);
  const downlevel = v1Reader.parseSave(raw);
  assert.deepEqual(downlevel, { state: null, recovered: false, blocked: true, reason: "unsupported-future-version", sourceVersion: 2 });
  assert.equal(v1Reader.shouldBlockSaveWrite(downlevel), true);
  let stored = raw;
  if (!v1Reader.shouldBlockSaveWrite(downlevel)) stored = JSON.stringify(downlevel.state);
  assert.equal(stored, raw, "the previous reader must preserve the v2 save byte-for-byte");
  const reloaded = game.parseSave(stored, NOW).state;
  assert.equal(reloaded.mastery.tonic, 8);
  assert.deepEqual(reloaded.customers["customer-0"], { deliveries: 4, hearts: 1 });
});

test("Task 8 v2 migrates explicitly and the frozen v2 reader blocks Task 9 v3", () => {
  const task8 = game.defaultState(NOW);
  task8.version = 2;
  delete task8.weekly;
  delete task8.customization;
  task8.mastery.tonic = 8;
  task8.customers["customer-0"] = { deliveries: 4, hearts: 1 };
  const migrated = game.parseSave(JSON.stringify(task8), NOW).state;
  assert.equal(migrated.version, 3);
  assert.deepEqual(migrated.weekly, { cycle: 0, progress: 0, claimedSteps: 0 });
  assert.deepEqual(migrated.customization, { selected: "midnight" });
  assert.equal(migrated.mastery.tonic, 8);
  assert.deepEqual(migrated.customers["customer-0"], { deliveries: 4, hearts: 1 });

  const raw = JSON.stringify(migrated);
  const downlevel = v2Reader.parseSave(raw);
  assert.deepEqual(downlevel, { state: null, recovered: false, blocked: true, reason: "unsupported-future-version", sourceVersion: 3 });
  assert.equal(v2Reader.shouldBlockSaveWrite(downlevel), true);
  assert.equal(raw, JSON.stringify(migrated), "the v3 save remains byte-for-byte available to the current reader");
});

test("current v3 and malformed saves retain their existing compatibility behavior", () => {
  const current = game.defaultState(NOW);
  current.stardust = 4;
  assert.equal(game.parseSave(JSON.stringify(current), NOW).state.stardust, 4);
  const malformed = game.parseSave("{bad", NOW);
  assert.equal(malformed.recovered, true);
  assert.equal(malformed.state.version, game.SAVE_VERSION);
  assert.equal(game.shouldBlockSaveWrite(malformed), false);
});

console.log(`All ${passed} historical and rollback save compatibility tests passed.`);
