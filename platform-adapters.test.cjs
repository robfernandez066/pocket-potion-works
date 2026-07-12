"use strict";

const assert = require("assert/strict");
const platform = require("./platform-adapters.js");
const game = require("./game-logic.js");

let passed = 0;
async function test(name, fn) {
  await fn(); passed += 1; console.log(`ok ${passed} - ${name}`);
}
function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return { getItem: key => values.has(key) ? values.get(key) : null, setItem: (key, value) => values.set(key, value), values };
}
function clock() {
  let id = 0;
  const queue = [];
  return {
    schedule(fn, delay = 0) { const item = { id: ++id, at: delay, fn, cancelled: false }; queue.push(item); return item.id; },
    clear(itemId) { const item = queue.find(entry => entry.id === itemId); if (item) item.cancelled = true; },
    runNext() { queue.sort((a, b) => a.at - b.at || a.id - b.id); const item = queue.shift(); if (item && !item.cancelled) item.fn(); return item; },
    runAll() { while (queue.length) this.runNext(); },
  };
}
function rewardHarness(options = {}) {
  const timer = clock();
  const adapter = new platform.FakeRewardedAdAdapter({ schedule: timer.schedule, ...options });
  const service = new platform.RewardedAdService(adapter, { schedule: timer.schedule, clear: timer.clear, now: () => 1000 });
  return { timer, adapter, service };
}

(async () => {
  await test("reward starts without granting and grants once only after verified success", async () => {
    const { timer, adapter, service } = rewardHarness();
    adapter.queueScenario([{ status: "success" }, { status: "success", afterMs: 1 }]);
    let grants = 0;
    const pending = service.requestReward({ placementId: "boost", grantReward: () => { grants += 1; } });
    assert.equal(grants, 0, "starting a request must not grant");
    timer.runNext();
    assert.equal((await pending).status, "success");
    timer.runAll();
    assert.equal(grants, 1, "duplicate callback must not grant twice");
  });

  await test("unverified success cannot grant and resolves safely", async () => {
    const timer = clock();
    const adapter = { requestReward: ({ requestId, onResult }) => { timer.schedule(() => onResult({ requestId, status: "success", confirmed: true }), 0); return {}; }, verifyResult: () => false };
    const service = new platform.RewardedAdService(adapter, { schedule: timer.schedule, clear: timer.clear, now: () => 1 });
    let grants = 0;
    const pending = service.requestReward({ placementId: "boost", timeoutMs: 10, grantReward: () => { grants += 1; } });
    timer.runAll();
    assert.equal((await pending).status, "invalid-result");
    assert.equal(grants, 0);
  });

  await test("cross-placement reward callback is rejected without granting", async () => {
    const { timer, adapter, service } = rewardHarness();
    adapter.queueScenario({ status: "success", placementId: "finish_brew" });
    let grants = 0;
    const pending = service.requestReward({ placementId: "prosperity_charm", grantReward: () => { grants += 1; } });
    timer.runNext();
    assert.equal((await pending).status, "invalid-result");
    assert.equal(grants, 0);
  });

  for (const status of ["cancelled", "failure"]) {
    await test(`reward ${status} grants nothing`, async () => {
      const { timer, adapter, service } = rewardHarness(); adapter.queueScenario(status); let grants = 0;
      const pending = service.requestReward({ placementId: "boost", grantReward: () => { grants += 1; } }); timer.runNext();
      assert.equal((await pending).status, status); assert.equal(grants, 0);
    });
  }

  await test("reward timeout ignores a late callback", async () => {
    const { timer, adapter, service } = rewardHarness();
    adapter.queueScenario([{ status: "success", afterMs: 20, deliverAfterCancel: true }]); let grants = 0;
    const pending = service.requestReward({ placementId: "boost", timeoutMs: 10, grantReward: () => { grants += 1; } });
    timer.runNext(); assert.equal((await pending).status, "timeout"); timer.runAll(); assert.equal(grants, 0);
  });

  for (const options of [{ available: false, expected: "unavailable" }, { online: false, expected: "offline" }]) {
    await test(`reward ${options.expected} path grants nothing`, async () => {
      const { timer, service } = rewardHarness(options); let grants = 0;
      const pending = service.requestReward({ placementId: "boost", grantReward: () => { grants += 1; } }); timer.runNext();
      assert.equal((await pending).status, options.expected); assert.equal(grants, 0);
    });
  }

  await test("IAP success is verified and duplicate transaction IDs are idempotent", async () => {
    const timer = clock(), store = new platform.PlatformStateStore(memoryStorage()), ledger = new platform.EntitlementLedger(store);
    const adapter = new platform.FakeIapAdapter({ schedule: timer.schedule });
    const service = new platform.PurchaseService(adapter, ledger, { schedule: timer.schedule, clear: timer.clear, now: () => 1 });
    adapter.queueScenario({ status: "success", transactionId: "tx-one" });
    let pending = service.purchase("apprentice_bundle"); timer.runNext(); let result = await pending;
    assert.deepEqual({ status: result.status, applied: result.applied }, { status: "success", applied: true });
    adapter.queueScenario([{ status: "success", transactionId: "tx-one" }, { status: "success", transactionId: "tx-late", afterMs: 1 }]);
    pending = service.purchase("apprentice_bundle"); timer.runNext(); result = await pending; timer.runAll();
    assert.equal(result.applied, false); assert.deepEqual(store.state.commerce.processedTransactionIds, ["tx-one"]);
  });

  await test("cross-product purchase callback is rejected without receipt or entitlement", async () => {
    const timer = clock(), store = new platform.PlatformStateStore(memoryStorage()), adapter = new platform.FakeIapAdapter({ schedule: timer.schedule });
    const service = new platform.PurchaseService(adapter, new platform.EntitlementLedger(store), { schedule: timer.schedule, clear: timer.clear });
    adapter.queueScenario({ status: "success", productId: "keepsake_cauldron", transactionId: "cross-product" });
    const pending = service.purchase("apprentice_bundle"); timer.runNext();
    assert.equal((await pending).status, "invalid-result");
    assert.deepEqual(store.state.commerce.processedTransactionIds, []);
    assert.deepEqual(store.state.commerce.nonConsumableEntitlements, []);
  });

  await test("bounded replay retention preserves and rejects the newest receipt", async () => {
    const store = new platform.PlatformStateStore(memoryStorage()), ledger = new platform.EntitlementLedger(store);
    for (let index = 0; index <= 500; index += 1) ledger.recordVerifiedPurchase(platform.PRODUCT_CATALOG.keepsake_cauldron, `tx-${index}`);
    assert.equal(store.state.commerce.processedTransactionIds.length, 500);
    assert.equal(store.state.commerce.processedTransactionIds.includes("tx-500"), true);
    assert.deepEqual(ledger.recordVerifiedPurchase(platform.PRODUCT_CATALOG.keepsake_cauldron, "tx-500"), { applied: false, reason: "duplicate" });
    assert.equal(store.state.commerce.processedTransactionIds.filter(id => id === "tx-500").length, 1);
  });

  for (const status of ["cancelled", "failure"]) {
    await test(`IAP ${status} does not create an entitlement`, async () => {
      const timer = clock(), store = new platform.PlatformStateStore(memoryStorage()), adapter = new platform.FakeIapAdapter({ schedule: timer.schedule });
      const service = new platform.PurchaseService(adapter, new platform.EntitlementLedger(store), { schedule: timer.schedule, clear: timer.clear });
      adapter.queueScenario(status); const pending = service.purchase("keepsake_cauldron"); timer.runNext();
      assert.deepEqual({ status: (await pending).status, entitlements: store.state.commerce.nonConsumableEntitlements }, { status, entitlements: [] });
    });
  }

  await test("IAP offline and timeout paths do not apply a purchase", async () => {
    const timer = clock(), store = new platform.PlatformStateStore(memoryStorage()), adapter = new platform.FakeIapAdapter({ schedule: timer.schedule, online: false });
    let service = new platform.PurchaseService(adapter, new platform.EntitlementLedger(store), { schedule: timer.schedule, clear: timer.clear });
    let pending = service.purchase("apprentice_bundle"); timer.runNext(); assert.equal((await pending).status, "offline");
    adapter.online = true; adapter.queueScenario({ status: "success", afterMs: 20, deliverAfterCancel: true });
    pending = service.purchase("apprentice_bundle", 10); timer.runNext(); assert.equal((await pending).status, "timeout"); timer.runAll();
    assert.deepEqual(store.state.commerce.processedTransactionIds, []);
  });

  await test("restore applies only non-consumables and is idempotent", async () => {
    const store = new platform.PlatformStateStore(memoryStorage()), ledger = new platform.EntitlementLedger(store), adapter = new platform.FakeIapAdapter();
    adapter.setRestoreResults([
      { productId: "keepsake_cauldron", transactionId: "restore-one" },
      { productId: "apprentice_bundle", transactionId: "restore-bundle" },
      { productId: "keepsake_cauldron", transactionId: "restore-one" },
      { productId: "keepsake_cauldron", transactionId: "" },
      { productId: "unknown-product", transactionId: "wrong-product" },
    ]);
    const service = new platform.PurchaseService(adapter, ledger);
    assert.equal((await service.restorePurchases()).restored, 2);
    assert.equal((await service.restorePurchases()).restored, 0);
    assert.equal(ledger.has("keepsake_cauldron"), true);
    assert.equal(ledger.has("apprentice_bundle"), true);
    assert.deepEqual(store.state.commerce.processedTransactionIds, ["restore-one", "restore-bundle"]);
    assert.deepEqual(ledger.pending(), [{ productId: "apprentice_bundle", transactionId: "restore-bundle" }]);
  });

  await test("pending fulfillment survives a crash before gameplay save and reconciles once", async () => {
    const platformStorage = memoryStorage(), store = new platform.PlatformStateStore(platformStorage), ledger = new platform.EntitlementLedger(store);
    ledger.recordVerifiedPurchase(platform.PRODUCT_CATALOG.apprentice_bundle, "crash-before-save");
    let gameplay = { starterClaimed: false, coins: 30 }, attempts = 0;
    let coordinator = new platform.CommerceFulfillmentCoordinator(ledger, {
      handlers: { apprentice_bundle: () => { if (gameplay.starterClaimed) return false; gameplay.starterClaimed = true; gameplay.coins += 100; return true; } },
      persistGameplay: () => { attempts += 1; throw new Error("simulated crash"); },
    });
    assert.deepEqual(coordinator.reconcile(), { acknowledged: 0, granted: 1, failed: 1 });
    assert.equal(ledger.pending().length, 1);
    gameplay = { starterClaimed: false, coins: 30 };
    const reloadedLedger = new platform.EntitlementLedger(new platform.PlatformStateStore(platformStorage));
    coordinator = new platform.CommerceFulfillmentCoordinator(reloadedLedger, {
      handlers: { apprentice_bundle: () => { if (gameplay.starterClaimed) return false; gameplay.starterClaimed = true; gameplay.coins += 100; return true; } },
      persistGameplay: () => { attempts += 1; },
    });
    assert.deepEqual(coordinator.reconcile(), { acknowledged: 1, granted: 1, failed: 0 });
    assert.deepEqual(gameplay, { starterClaimed: true, coins: 130 });
    assert.equal(reloadedLedger.pending().length, 0);
    assert.equal(attempts, 2);
  });

  await test("pending fulfillment reload after gameplay save does not grant twice", async () => {
    const platformStorage = memoryStorage(), store = new platform.PlatformStateStore(platformStorage), ledger = new platform.EntitlementLedger(store);
    ledger.recordVerifiedPurchase(platform.PRODUCT_CATALOG.apprentice_bundle, "crash-before-ack");
    let savedGameplay = { starterClaimed: false, coins: 30 }, gameplay = { ...savedGameplay };
    const throwingLedger = Object.create(ledger);
    throwingLedger.acknowledge = () => { throw new Error("simulated crash before acknowledgement"); };
    let coordinator = new platform.CommerceFulfillmentCoordinator(throwingLedger, {
      handlers: { apprentice_bundle: () => { if (gameplay.starterClaimed) return false; gameplay.starterClaimed = true; gameplay.coins += 100; return true; } },
      persistGameplay: () => { savedGameplay = { ...gameplay }; },
    });
    assert.deepEqual(coordinator.reconcile(), { acknowledged: 0, granted: 1, failed: 1 });
    gameplay = { ...savedGameplay };
    const reloadedLedger = new platform.EntitlementLedger(new platform.PlatformStateStore(platformStorage));
    coordinator = new platform.CommerceFulfillmentCoordinator(reloadedLedger, {
      handlers: { apprentice_bundle: () => { if (gameplay.starterClaimed) return false; gameplay.starterClaimed = true; gameplay.coins += 100; return true; } },
      persistGameplay: () => { savedGameplay = { ...gameplay }; },
    });
    assert.deepEqual(coordinator.reconcile(), { acknowledged: 1, granted: 0, failed: 0 });
    assert.deepEqual(savedGameplay, { starterClaimed: true, coins: 130 });
    assert.equal(reloadedLedger.pending().length, 0);
  });

  await test("concurrent duplicate purchase successes create one pending fulfillment", async () => {
    const timer = clock(), store = new platform.PlatformStateStore(memoryStorage()), ledger = new platform.EntitlementLedger(store), adapter = new platform.FakeIapAdapter({ schedule: timer.schedule });
    const service = new platform.PurchaseService(adapter, ledger, { schedule: timer.schedule, clear: timer.clear, now: () => 7 });
    adapter.queueScenario({ status: "success", transactionId: "same-receipt" });
    adapter.queueScenario({ status: "success", transactionId: "same-receipt" });
    const first = service.purchase("apprentice_bundle"), second = service.purchase("apprentice_bundle");
    timer.runAll();
    assert.deepEqual([(await first).applied, (await second).applied].sort(), [false, true]);
    assert.deepEqual(ledger.pending(), [{ productId: "apprentice_bundle", transactionId: "same-receipt" }]);
  });

  await test("consent defaults denied, persists changes, and gates local analytics", async () => {
    const storage = memoryStorage(), store = new platform.PlatformStateStore(storage), consent = new platform.ConsentManager(store, () => 44), analytics = new platform.InMemoryAnalyticsAdapter(consent);
    assert.equal(consent.analyticsAllowed(), false);
    assert.equal(analytics.track("reward_attempt", { placementId: "prosperity_charm" }).reason, "consent-required");
    consent.setAnalytics(true);
    assert.equal(analytics.track("reward_attempt", { placementId: "prosperity_charm" }).accepted, true);
    assert.equal(new platform.PlatformStateStore(storage).state.consent.analytics, "allowed");
    consent.setAnalytics(false);
    assert.equal(analytics.track("reward_attempt", { placementId: "prosperity_charm" }).reason, "consent-required");
  });

  await test("stale, missing, and future consent versions reset analytics to denied", async () => {
    for (const version of [0, undefined, String(platform.CONSENT_VERSION), platform.CONSENT_VERSION + 1]) {
      const state = platform.normalizePlatformState({ consent: { version, analytics: "allowed", updatedAt: 99 } });
      assert.deepEqual(state.consent, { version: platform.CONSENT_VERSION, analytics: "denied", updatedAt: 0 });
    }
  });

  await test("analytics rejects unknown, extra, missing, and raw-save shaped fields", async () => {
    const store = new platform.PlatformStateStore(memoryStorage()), consent = new platform.ConsentManager(store); consent.setAnalytics(true);
    const analytics = new platform.InMemoryAnalyticsAdapter(consent);
    assert.equal(analytics.track("unknown", {}).reason, "schema-rejected");
    assert.equal(analytics.track("reward_attempt", {}).reason, "schema-rejected");
    assert.equal(analytics.track("reward_attempt", { placementId: "person@example.com" }).reason, "schema-rejected");
    assert.equal(analytics.track("reward_attempt", { placementId: "boost", save: "raw" }).reason, "schema-rejected");
    assert.equal(analytics.track("purchase_result", { productId: "x", status: "success", email: "person@example.com" }).reason, "schema-rejected");
    assert.equal(analytics.snapshot().length, 0);
  });

  await test("lifecycle awards one offline interval and suppresses overlapping active time", async () => {
    const awards = [], lifecycle = new platform.LifecycleCoordinator({ awardOffline: (from, to, session) => { awards.push({ from, to, session }); return to - from; } });
    assert.equal(lifecycle.handle({ phase: "background", at: 100 }).awarded, false);
    assert.equal(lifecycle.activeElapsed(100, 500), 0);
    assert.equal(lifecycle.handle({ phase: "background", at: 200 }).awarded, false);
    assert.equal(lifecycle.handle({ phase: "resume", at: 1100 }).value, 1000);
    assert.equal(lifecycle.handle({ phase: "foreground", at: 1200 }).awarded, false);
    assert.equal(lifecycle.activeElapsed(1200, 2200), 1);
    assert.deepEqual(awards, [{ from: 100, to: 1100, session: 1 }]);
  });

  await test("local fake cloud save detects stale revisions and never overwrites newer data", async () => {
    const cloud = new platform.LocalFakeCloudSaveAdapter();
    assert.equal((await cloud.load("main")).status, "not-found");
    assert.deepEqual(await cloud.save({ slotId: "main", data: {}, saveVersion: 1, baseRevision: -1 }), { status: "error", code: "invalid-request" });
    assert.equal((await cloud.save({ slotId: "main", data: { coins: 1 }, saveVersion: 1, baseRevision: 0 })).revision, 1);
    assert.equal((await cloud.save({ slotId: "main", data: { coins: 2 }, saveVersion: 1, baseRevision: 1 })).revision, 2);
    const conflict = await cloud.save({ slotId: "main", data: { coins: 0 }, saveVersion: 1, baseRevision: 1 });
    assert.equal(conflict.status, "conflict"); assert.equal(conflict.revision, 2); assert.equal(conflict.remote.data.coins, 2);
    assert.equal((await cloud.load("main")).data.coins, 2);
  });

  await test("malformed persisted platform state safely normalizes", async () => {
    assert.equal(platform.parsePlatformState("{bad").recovered, true);
    const state = platform.normalizePlatformState({ consent: { analytics: "maybe", updatedAt: -4 }, commerce: { processedTransactionIds: ["ok", "ok", 3], nonConsumableEntitlements: ["apprentice_bundle", "keepsake_cauldron"], pendingFulfillments: [{ transactionId: "injected", productId: "apprentice_bundle" }] } });
    assert.equal(state.consent.analytics, "denied"); assert.deepEqual(state.commerce.processedTransactionIds, ["ok"]); assert.deepEqual(state.commerce.nonConsumableEntitlements, ["apprentice_bundle", "keepsake_cauldron"]);
    assert.deepEqual(state.commerce.pendingFulfillments, []);
  });

  await test("existing gameplay saves remain compatible and independent of platform state", async () => {
    const existing = game.defaultState(1000); existing.coins = 321; existing.stardust = 7; existing.starterClaimed = true;
    const loaded = game.parseSave(JSON.stringify(existing), 2000).state;
    assert.equal(loaded.coins, 321); assert.equal(loaded.stardust, 7); assert.equal(loaded.starterClaimed, true);
    assert.equal(Object.hasOwn(loaded, "platform"), false);
  });

  console.log(`All ${passed} platform adapter tests passed.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
