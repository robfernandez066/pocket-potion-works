"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const game = require("./game-logic.js");
const v1Reader = require("./fixtures/rollback/game-save-reader-v1.cjs");
const v2Reader = require("./fixtures/rollback/game-save-reader-v2.cjs");
const v3Reader = require("./fixtures/rollback/game-save-reader-v3.cjs");

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
  const raw = fixture("future-version-v5.json");
  const result = game.parseSave(raw, NOW);
  assert.deepEqual(result, { state: null, recovered: false, blocked: true, reason: "unsupported-future-version", sourceVersion: 5 });
  assert.equal(game.shouldBlockSaveWrite(result), true);
  let stored = raw;
  if (!game.shouldBlockSaveWrite(result)) stored = JSON.stringify(result.state);
  assert.equal(stored, raw, "v4 tooling must preserve the unsupported future save byte-for-byte");
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

test("Task 8 v2 migrates to current v4 and the frozen v2 reader blocks Task 9 v3", () => {
  const task8 = game.defaultState(NOW);
  task8.version = 2;
  delete task8.weekly;
  delete task8.customization;
  task8.mastery.tonic = 8;
  task8.customers["customer-0"] = { deliveries: 4, hearts: 1 };
  const migrated = game.parseSave(JSON.stringify(task8), NOW).state;
  assert.equal(migrated.version, 4);
  assert.deepEqual(migrated.weekly, { cycle: 0, progress: 0, claimedSteps: 0 });
  assert.deepEqual(migrated.customization, { selected: "midnight" });
  assert.equal(migrated.mastery.tonic, 8);
  assert.deepEqual(migrated.customers["customer-0"], { deliveries: 4, hearts: 1 });

  const task9 = structuredClone(migrated);
  task9.version = 3;
  delete task9.ingredients.mint;
  for (const id of ["lantern", "quiet", "way", "aurora"]) {
    delete task9.potions[id];
    delete task9.mastery[id];
    delete task9.discovery.brewed[id];
    delete task9.discovery.delivered[id];
  }
  const raw = JSON.stringify(task9);
  const downlevel = v2Reader.parseSave(raw);
  assert.deepEqual(downlevel, { state: null, recovered: false, blocked: true, reason: "unsupported-future-version", sourceVersion: 3 });
  assert.equal(v2Reader.shouldBlockSaveWrite(downlevel), true);
  assert.equal(raw, JSON.stringify(task9), "the v3 save remains byte-for-byte available to the current reader");
});

test("current v4 and malformed saves retain their existing compatibility behavior", () => {
  const current = game.defaultState(NOW);
  current.stardust = 4;
  assert.equal(game.parseSave(JSON.stringify(current), NOW).state.stardust, 4);
  const malformed = game.parseSave("{bad", NOW);
  assert.equal(malformed.recovered, true);
  assert.equal(malformed.state.version, game.SAVE_VERSION);
  assert.equal(game.shouldBlockSaveWrite(malformed), false);
});

test("pre-expansion version-three saves acquire safe zeroed content entries", () => {
  const priorV3 = game.defaultState(NOW);
  priorV3.version = 3;
  priorV3.coins = 812;
  priorV3.mastery.tonic = 15;
  priorV3.discovery.delivered.tonic = 9;
  delete priorV3.ingredients.mint;
  for (const id of ["lantern", "quiet", "way", "aurora"]) {
    delete priorV3.potions[id];
    delete priorV3.mastery[id];
    delete priorV3.discovery.brewed[id];
    delete priorV3.discovery.delivered[id];
  }
  const loaded = game.parseSave(JSON.stringify(priorV3), NOW).state;
  assert.equal(loaded.version, 4);
  assert.equal(loaded.coins, 812);
  assert.equal(loaded.mastery.tonic, 15);
  assert.equal(loaded.discovery.delivered.tonic, 9);
  assert.equal(loaded.ingredients.mint, 0);
  for (const id of ["lantern", "quiet", "way", "aurora"]) {
    assert.equal(loaded.potions[id], 0);
    assert.equal(loaded.mastery[id], 0);
    assert.equal(loaded.discovery.brewed[id], 0);
    assert.equal(loaded.discovery.delivered[id], 0);
  }
});

test("the frozen v3 reader blocks and preserves a Task 12 v4 save byte-for-byte", () => {
  const task12 = game.defaultState(NOW);
  task12.ingredients.mint = 7;
  task12.potions.lantern = 2;
  task12.mastery.quiet = 3;
  task12.discovery.brewed.way = 1;
  task12.discovery.delivered.aurora = 1;
  const raw = JSON.stringify(task12);
  const downlevel = v3Reader.parseSave(raw);
  assert.deepEqual(downlevel, { state: null, recovered: false, blocked: true, reason: "unsupported-future-version", sourceVersion: 4 });
  assert.equal(v3Reader.shouldBlockSaveWrite(downlevel), true);
  let stored = raw;
  if (!v3Reader.shouldBlockSaveWrite(downlevel)) stored = JSON.stringify(downlevel.state);
  assert.equal(stored, raw, "the Task 12 v4 save must remain byte-for-byte intact for the current reader");
  const reloaded = game.parseSave(stored, NOW).state;
  assert.equal(reloaded.ingredients.mint, 7);
  assert.equal(reloaded.potions.lantern, 2);
  assert.equal(reloaded.mastery.quiet, 3);
  assert.equal(reloaded.discovery.brewed.way, 1);
  assert.equal(reloaded.discovery.delivered.aurora, 1);
});

console.log(`All ${passed} historical and rollback save compatibility tests passed.`);
