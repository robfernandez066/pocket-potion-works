"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const game = require("./game-logic.js");
const v1Reader = require("./fixtures/rollback/game-save-reader-v1.cjs");
const v2Reader = require("./fixtures/rollback/game-save-reader-v2.cjs");
const v3Reader = require("./fixtures/rollback/game-save-reader-v3.cjs");
const v4Reader = require("./fixtures/rollback/game-save-reader-v4.cjs");
const v5Reader = require("./fixtures/rollback/game-save-reader-v5.cjs");
const v6Reader = require("./fixtures/rollback/game-save-reader-v6.cjs");
const v7Reader = require("./fixtures/rollback/game-save-reader-v7.cjs");
const v8Reader = require("./fixtures/rollback/game-save-reader-v8.cjs");

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
    { id: 9, recipeId: "tonic", quantity: 1 },
    { id: 7, recipeId: "tonic", quantity: 1 },
    { id: 8, recipeId: "clarity", quantity: 1 },
  ]);
  assert.equal(result.state.nextOrderId, 10);
  assert.deepEqual(result.state.afterStars, { step: 0 });
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
  const raw = fixture("future-version-v10.json");
  const result = game.parseSave(raw, NOW);
  assert.deepEqual(result, { state: null, recovered: false, blocked: true, reason: "unsupported-future-version", sourceVersion: 10 });
  assert.equal(game.shouldBlockSaveWrite(result), true);
  let stored = raw;
  if (!game.shouldBlockSaveWrite(result)) stored = JSON.stringify(result.state);
  assert.equal(stored, raw, "v9 tooling must preserve the unsupported future save byte-for-byte");
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

test("Task 8 v2 migrates to current v9 and the frozen v2 reader blocks Task 9 v3", () => {
  const task8 = game.defaultState(NOW);
  task8.version = 2;
  delete task8.weekly;
  delete task8.customization;
  task8.mastery.tonic = 8;
  task8.customers["customer-0"] = { deliveries: 4, hearts: 1 };
  const migrated = game.parseSave(JSON.stringify(task8), NOW).state;
  assert.equal(migrated.version, 9);
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

test("current v9 and malformed saves retain their existing compatibility behavior", () => {
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
  assert.equal(loaded.version, 9);
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
  task12.version = 4;
  delete task12.journal.claimedAchievements;
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

test("version-four journal progress migrates without replaying read entries and exposes earned achievement claims once", () => {
  const priorV4 = game.defaultState(NOW);
  priorV4.version = 4;
  priorV4.coins = 412;
  priorV4.stats.coinsEarned = 498;
  priorV4.journal = { readStories: ["customer-0:1"], readRecipes: ["tonic"] };
  priorV4.achievements = { firstBrew: NOW - 1000 };
  const migrated = game.parseSave(JSON.stringify(priorV4), NOW).state;
  assert.equal(migrated.version, 9);
  assert.deepEqual(migrated.journal, { readStories: ["customer-0:1"], readRecipes: ["tonic"], claimedAchievements: [] });
  assert.deepEqual(game.journalClaimableCounts(migrated), { story: 0, recipe: 0, achievement: 1, total: 1 });
  assert.deepEqual(game.claimJournalReward(migrated, "achievement", "firstBrew"), { kind: "achievement", id: "firstBrew", reward: 10 });
  assert.equal(migrated.coins, 422);
  assert.equal(migrated.stats.coinsEarned, 508);
  assert.equal(game.claimJournalReward(migrated, "achievement", "firstBrew"), null);
});

test("the frozen v4 reader blocks and preserves a populated v5 journal save", () => {
  const current = game.defaultState(NOW);
  current.version = 5;
  delete current.commissions;
  current.coins = 515;
  current.stats.coinsEarned = 901;
  current.achievements.firstBrew = NOW - 1000;
  current.journal.claimedAchievements = ["firstBrew"];
  const raw = JSON.stringify(current);
  const downlevel = v4Reader.parseSave(raw);
  assert.deepEqual(downlevel, { state: null, recovered: false, blocked: true, reason: "unsupported-future-version", sourceVersion: 5 });
  assert.equal(v4Reader.shouldBlockSaveWrite(downlevel), true);
  let stored = raw;
  if (!v4Reader.shouldBlockSaveWrite(downlevel)) stored = JSON.stringify(downlevel.state);
  assert.equal(stored, raw);
  const reloaded = game.parseSave(stored, NOW).state;
  assert.equal(reloaded.coins, 515);
  assert.equal(reloaded.stats.coinsEarned, 901);
  assert.deepEqual(reloaded.journal.claimedAchievements, ["firstBrew"]);
});

test("a populated version-five save migrates to v9 with safe empty special-request and quest state", () => {
  const priorV5 = game.defaultState(NOW);
  priorV5.version = 5;
  delete priorV5.commissions;
  priorV5.level = 5;
  priorV5.coins = 735;
  priorV5.ingredients.mint = 11;
  priorV5.mastery.aurora = 4;
  priorV5.discovery.delivered.quiet = 2;
  priorV5.customers["customer-5"] = { deliveries: 7, hearts: 2 };
  priorV5.journal.claimedAchievements = ["firstBrew"];
  priorV5.orders = [{ id: 41, customerId: "customer-5", customer: game.CUSTOMERS[5][0], recipeId: "quiet", quantity: 1, reward: 140, xp: 24 }];
  const migrated = game.parseSave(JSON.stringify(priorV5), NOW).state;
  assert.equal(migrated.version, 9);
  assert.equal(migrated.coins, 735);
  assert.equal(migrated.ingredients.mint, 11);
  assert.equal(migrated.mastery.aurora, 4);
  assert.equal(migrated.discovery.delivered.quiet, 2);
  assert.deepEqual(migrated.customers["customer-5"], { deliveries: 7, hearts: 2 });
  assert.deepEqual(migrated.journal.claimedAchievements, ["firstBrew"]);
  assert.deepEqual(migrated.commissions, { invitations: 0, selectedId: null, completedIds: [] });
  assert.equal(migrated.orders[0].recipeId, "quiet");
});

test("a populated v6 commission save migrates to v9 without inventing invitations", () => {
  const current = game.defaultState(NOW);
  current.level = 7;
  current.customers["customer-0"].deliveries = 2;
  current.customers["customer-1"].deliveries = 1;
  current.version = 6;
  current.commissions = { choices: ["moss-rainpath"], selectedId: "mira-dawn", completedIds: ["juniper-encore"] };
  current.orders = [
    { id: 70, commissionId: "mira-dawn", customerId: "customer-0", customer: game.CUSTOMERS[0][0], recipeId: "tonic", quantity: 1, reward: 999999999, xp: 999999999 },
    { id: 71, customerId: "customer-3", customer: game.CUSTOMERS[3][0], recipeId: "clarity", quantity: 1, reward: 44, xp: 17 },
    { id: 72, customerId: "customer-4", customer: game.CUSTOMERS[4][0], recipeId: "sun", quantity: 1, reward: 110, xp: 23 },
  ];
  const reloaded = game.parseSave(JSON.stringify(current), NOW).state;
  assert.deepEqual(reloaded.commissions, { invitations: 0, selectedId: "mira-dawn", completedIds: ["juniper-encore"] });
  assert.equal(reloaded.orders.filter(game.isSignatureOrder).length, 1);
  assert.equal(reloaded.orders.filter(order => !game.isSignatureOrder(order)).length, 2);
  assert.deepEqual({ reward: reloaded.orders[0].reward, xp: reloaded.orders[0].xp }, { reward: 22, xp: 14 }, "a matched active commission must reconstruct canonical economics instead of trusting saved reward or XP");

  const malformed = structuredClone(current);
  malformed.commissions = { invitations: 9999, choices: ["moss-rainpath", "moss-rainpath", "bad", "tink-trial"], selectedId: "mira-dawn", completedIds: ["mira-dawn", "juniper-encore", "juniper-encore", 9] };
  malformed.orders.push({ id: 73, commissionId: "moss-rainpath", customerId: "customer-1", recipeId: "moon", quantity: 2, reward: 999999, xp: 999 });
  const recovered = game.parseSave(JSON.stringify(malformed), NOW).state;
  assert.deepEqual(recovered.commissions.completedIds, ["mira-dawn", "juniper-encore"]);
  assert.equal(recovered.commissions.selectedId, null);
  assert.equal(recovered.commissions.invitations, 10);
  assert.equal(recovered.orders.filter(game.isSignatureOrder).length, 0);
});

test("the frozen v5 reader blocks and preserves a populated v6 commission save", () => {
  const current = game.defaultState(NOW);
  current.version = 6;
  current.level = 7;
  current.customers["customer-0"].deliveries = 2;
  current.customers["customer-1"].deliveries = 1;
  current.commissions = { choices: ["moss-rainpath"], selectedId: "mira-dawn", completedIds: ["juniper-encore"] };
  current.orders = [{ id: 80, commissionId: "mira-dawn", customerId: "customer-0", customer: game.CUSTOMERS[0][0], recipeId: "tonic", quantity: 1, reward: 22, xp: 14 }];
  const raw = JSON.stringify(current);
  const downlevel = v5Reader.parseSave(raw);
  assert.deepEqual(downlevel, { state: null, recovered: false, blocked: true, reason: "unsupported-future-version", sourceVersion: 6 });
  assert.equal(v5Reader.shouldBlockSaveWrite(downlevel), true);
  let stored = raw;
  if (!v5Reader.shouldBlockSaveWrite(downlevel)) stored = JSON.stringify(downlevel.state);
  assert.equal(stored, raw, "the v5 reader must preserve the v6 save byte-for-byte");
  const reloaded = game.parseSave(stored, NOW).state;
  assert.deepEqual(reloaded.commissions, { invitations: 0, selectedId: "mira-dawn", completedIds: ["juniper-encore"] });
  assert.equal(reloaded.orders[0].commissionId, "mira-dawn");
});

test("current v7 invitations round-trip and the frozen v6 reader protects them", () => {
  const current = game.defaultState(NOW);
  current.version = 7;
  current.level = 7;
  current.commissions = { invitations: 4, selectedId: "mira-dawn", completedIds: ["juniper-encore"] };
  current.orders = [{ id: 90, commissionId: "mira-dawn", customerId: "customer-0", customer: game.CUSTOMERS[0][0], recipeId: "tonic", quantity: 1, reward: 22, xp: 14 }];
  const raw = JSON.stringify(current);
  const downlevel = v6Reader.parseSave(raw);
  assert.deepEqual(downlevel, { state: null, recovered: false, blocked: true, reason: "unsupported-future-version", sourceVersion: 7 });
  assert.equal(v6Reader.shouldBlockSaveWrite(downlevel), true);
  let stored = raw;
  if (!v6Reader.shouldBlockSaveWrite(downlevel)) stored = JSON.stringify(downlevel.state);
  assert.equal(stored, raw, "the v6 reader must preserve the v7 save byte-for-byte");
  const reloaded = game.parseSave(stored, NOW).state;
  assert.deepEqual(reloaded.commissions, current.commissions);
  assert.equal(reloaded.orders[0].commissionId, "mira-dawn");
});

test("a populated v7 save migrates to v9 and the frozen v7 reader protects quest progress", () => {
  const priorV7 = game.defaultState(NOW);
  priorV7.version = 7;
  delete priorV7.afterStars;
  priorV7.level = 3;
  priorV7.stats.prestiges = 1;
  priorV7.commissions.invitations = 2;
  const migrated = game.parseSave(JSON.stringify(priorV7), NOW).state;
  assert.equal(migrated.version, 9);
  assert.deepEqual(migrated.afterStars, { step: 0 });
  assert.equal(migrated.orders.find(game.isAfterStarsOrder).recipeId, "tonic");
  assert.equal(migrated.commissions.invitations, 2);

  const current = structuredClone(migrated);
  current.version = 8;
  current.afterStars.step = 2;
  current.orders = [];
  game.ensureOrders(current, () => 0);
  const raw = JSON.stringify(current);
  const downlevel = v7Reader.parseSave(raw);
  assert.deepEqual(downlevel, { state: null, recovered: false, blocked: true, reason: "unsupported-future-version", sourceVersion: 8 });
  assert.equal(v7Reader.shouldBlockSaveWrite(downlevel), true);
  let stored = raw;
  if (!v7Reader.shouldBlockSaveWrite(downlevel)) stored = JSON.stringify(downlevel.state);
  assert.equal(stored, raw, "the frozen v7 reader must preserve the v8 quest save byte-for-byte");
  assert.equal(game.parseSave(stored, NOW).state.afterStars.step, 2);
});

test("v1-v8 saves start with zero chapter progress while preserving an older valid look", () => {
  for (let version = 1; version <= 8; version += 1) {
    const prior = game.defaultState(NOW);
    prior.version = version;
    prior.chapterProgress = 3;
    prior.stats.brewed = 10;
    prior.customization.selected = "fern";
    const migrated = game.parseSave(JSON.stringify(prior), NOW).state;
    assert.equal(migrated.version, 9);
    assert.equal(migrated.chapterProgress, 0, `v${version} cannot invent chapter completion`);
    assert.equal(migrated.customization.selected, "fern");
  }
});

test("v9 chapter progress and Firstlight selection round-trip", () => {
  const current = game.defaultState(NOW);
  current.chapterProgress = 3;
  current.customization.selected = "firstlight";
  const reloaded = game.parseSave(JSON.stringify(current), NOW + 1).state;
  assert.equal(reloaded.version, 9);
  assert.equal(reloaded.chapterProgress, 3);
  assert.equal(reloaded.customization.selected, "firstlight");
});

test("the frozen v8 reader blocks and preserves a populated v9 chapter save", () => {
  const raw = fixture("future-version-v9.json");
  const downlevel = v8Reader.parseSave(raw);
  assert.deepEqual(downlevel, { state: null, recovered: false, blocked: true, reason: "unsupported-future-version", sourceVersion: 9 });
  assert.equal(v8Reader.shouldBlockSaveWrite(downlevel), true);
  let stored = raw;
  if (!v8Reader.shouldBlockSaveWrite(downlevel)) stored = JSON.stringify(downlevel.state);
  assert.equal(stored, raw, "the frozen v8 reader must preserve the v9 chapter save byte-for-byte");
  const reloaded = game.parseSave(stored, NOW).state;
  assert.equal(reloaded.chapterProgress, 3);
  assert.equal(reloaded.customization.selected, "firstlight");
});

console.log(`All ${passed} historical and rollback save compatibility tests passed.`);
