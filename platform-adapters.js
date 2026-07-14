"use strict";

(function exposePlatformAdapters(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.PPWPlatform = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createPlatformAdapters() {
  const PLATFORM_STATE_VERSION = 1;
  const CONSENT_VERSION = 1;
  const PRODUCT_CATALOG = Object.freeze({
    apprentice_bundle: Object.freeze({ id: "apprentice_bundle", type: "non-consumable", fulfillment: "apprentice_bundle" }),
    keepsake_cauldron: Object.freeze({ id: "keepsake_cauldron", type: "non-consumable" }),
  });
  const ANALYTICS_SCHEMAS = Object.freeze({
    reward_attempt: { placementId: ["prosperity_charm", "finish_brew"] },
    reward_result: { placementId: ["prosperity_charm", "finish_brew"], status: ["success", "cancelled", "failure", "timeout", "unavailable", "offline", "invalid-result"] },
    purchase_result: { productId: Object.keys(PRODUCT_CATALOG), status: ["success", "cancelled", "failure", "timeout", "offline", "invalid-product", "invalid-result"] },
    consent_changed: { analytics: ["allowed", "denied"] },
    lifecycle: { phase: ["foreground", "background", "resume"] },
  });

  const isRecord = value => Boolean(value) && typeof value === "object" && !Array.isArray(value);
  const cleanIds = value => {
    if (!Array.isArray(value)) return [];
    const newestFirst = value.filter(item => typeof item === "string" && item).map(item => item.slice(0, 120)).reverse();
    return [...new Set(newestFirst)].slice(0, 500).reverse();
  };
  const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));

  function cleanPendingFulfillments(value) {
    if (!Array.isArray(value)) return [];
    const newestFirst = value.filter(entry => isRecord(entry)
      && typeof entry.transactionId === "string" && entry.transactionId
      && typeof entry.productId === "string" && PRODUCT_CATALOG[entry.productId]?.fulfillment)
      .map(entry => ({ transactionId: entry.transactionId.slice(0, 120), productId: entry.productId })).reverse();
    const seen = new Set();
    return newestFirst.filter(entry => !seen.has(entry.transactionId) && seen.add(entry.transactionId)).slice(0, 500).reverse();
  }

  function defaultPlatformState() {
    return {
      version: PLATFORM_STATE_VERSION,
      consent: { version: CONSENT_VERSION, analytics: "denied", updatedAt: 0 },
      commerce: { processedTransactionIds: [], nonConsumableEntitlements: [], pendingFulfillments: [] },
    };
  }

  function normalizePlatformState(input) {
    const fresh = defaultPlatformState();
    if (!isRecord(input)) return fresh;
    const consent = isRecord(input.consent) ? input.consent : {};
    const commerce = isRecord(input.commerce) ? input.commerce : {};
    const consentIsCurrent = consent.version === CONSENT_VERSION;
    const processedTransactionIds = cleanIds(commerce.processedTransactionIds);
    const nonConsumableEntitlements = cleanIds(commerce.nonConsumableEntitlements).filter(id => PRODUCT_CATALOG[id]?.type === "non-consumable");
    const pendingFulfillments = cleanPendingFulfillments(commerce.pendingFulfillments).filter(entry => processedTransactionIds.includes(entry.transactionId) && nonConsumableEntitlements.includes(entry.productId));
    return {
      version: PLATFORM_STATE_VERSION,
      consent: {
        version: CONSENT_VERSION,
        analytics: consentIsCurrent && consent.analytics === "allowed" ? "allowed" : "denied",
        updatedAt: consentIsCurrent && Number.isFinite(Number(consent.updatedAt)) && Number(consent.updatedAt) >= 0 ? Math.floor(Number(consent.updatedAt)) : 0,
      },
      commerce: {
        processedTransactionIds,
        nonConsumableEntitlements,
        pendingFulfillments,
      },
    };
  }

  function parsePlatformState(raw) {
    if (typeof raw !== "string" || !raw.trim()) return { state: defaultPlatformState(), recovered: false };
    try { return { state: normalizePlatformState(JSON.parse(raw)), recovered: false }; }
    catch (_) { return { state: defaultPlatformState(), recovered: true }; }
  }

  class LocalStorageBoundary {
    constructor(storage, key) {
      this.storage = storage;
      this.key = key;
      this.initialReadFailed = !storage || typeof storage.getItem !== "function";
      this.sessionOnly = this.initialReadFailed;
      this.raw = null;
      if (this.initialReadFailed) return;
      try { this.raw = storage.getItem(key); }
      catch { this.initialReadFailed = true; this.sessionOnly = true; }
    }
    read() { return { status: this.initialReadFailed ? "unavailable" : "read", value: this.initialReadFailed ? null : this.raw }; }
    write(value) {
      if (this.sessionOnly) return "unavailable";
      if (!this.storage || typeof this.storage.setItem !== "function") { this.sessionOnly = true; return "unavailable"; }
      try { this.storage.setItem(this.key, value); return "saved"; }
      catch { this.sessionOnly = true; return "unavailable"; }
    }
    remove() {
      if (this.initialReadFailed || !this.storage || typeof this.storage.removeItem !== "function") return "unavailable";
      try { this.storage.removeItem(this.key); this.sessionOnly = false; this.raw = null; return "removed"; }
      catch { return "unavailable"; }
    }
  }

  class PlatformStateStore {
    constructor(storage, key = "pocket-potion-works-platform-v1") {
      this.storage = storage;
      this.key = key;
      this.persistenceBlocked = !storage || typeof storage.getItem !== "function";
      let raw = null;
      if (!this.persistenceBlocked) try { raw = storage.getItem(key); } catch { this.persistenceBlocked = true; /* Use a safe in-memory platform state. */ }
      const parsed = parsePlatformState(raw);
      this.state = parsed.state;
      this.recovered = parsed.recovered;
    }
    snapshot() { return clone(this.state); }
    update(mutator) {
      mutator(this.state);
      this.state = normalizePlatformState(this.state);
      if (!this.persistenceBlocked) try { this.storage.setItem(this.key, JSON.stringify(this.state)); } catch { /* Platform state never blocks play. */ }
      return this.snapshot();
    }
  }

  class ConsentManager {
    constructor(store, now = () => Date.now()) { this.store = store; this.now = now; }
    analyticsAllowed() { return this.store.state.consent.analytics === "allowed"; }
    setAnalytics(allowed) {
      return this.store.update(state => { state.consent = { version: CONSENT_VERSION, analytics: allowed === true ? "allowed" : "denied", updatedAt: this.now() }; }).consent;
    }
    snapshot() { return clone(this.store.state.consent); }
  }

  function validateAnalyticsEvent(name, fields) {
    const schema = ANALYTICS_SCHEMAS[name];
    if (!schema || !isRecord(fields)) return false;
    const keys = Object.keys(fields);
    return keys.length === Object.keys(schema).length && keys.every(key => Array.isArray(schema[key]) && schema[key].includes(fields[key]));
  }

  class InMemoryAnalyticsAdapter {
    constructor(consent) { this.consent = consent; this.events = []; }
    track(name, fields) {
      if (!validateAnalyticsEvent(name, fields)) return { accepted: false, reason: "schema-rejected" };
      if (!this.consent.analyticsAllowed()) return { accepted: false, reason: "consent-required" };
      this.events.push(Object.freeze({ name, fields: clone(fields) }));
      return { accepted: true };
    }
    snapshot() { return clone(this.events); }
  }

  class FakeRewardedAdAdapter {
    constructor({ schedule = (fn, delay) => setTimeout(fn, delay), online = true, available = true } = {}) {
      this.schedule = schedule; this.online = online; this.available = available; this.scenarios = []; this.verified = new WeakSet();
    }
    queueScenario(events) { this.scenarios.push(Array.isArray(events) ? events : [isRecord(events) ? events : { afterMs: 0, status: events }]); }
    requestReward({ requestId, placementId, onResult }) {
      const events = !this.online ? [{ status: "offline" }] : !this.available ? [{ status: "unavailable" }] : (this.scenarios.shift() || [{ status: "success" }]);
      let cancelled = false;
      for (const event of events) this.schedule(() => {
        if (cancelled && event.deliverAfterCancel !== true) return;
        const result = { requestId: event.requestId || requestId, placementId: event.placementId || placementId, status: event.status, confirmed: event.status === "success", adapter: "explicit-fake-rewarded-ad" };
        this.verified.add(result); onResult(result);
      }, Math.max(0, Number(event.afterMs) || 0));
      return { cancel: () => { cancelled = true; } };
    }
    validateResultContext(result, expected) { return this.verified.has(result) && result.requestId === expected.requestId && result.placementId === expected.placementId; }
    verifyResult(result, expected) { return this.validateResultContext(result, expected) && result.confirmed === true && result.status === "success"; }
  }

  class RewardedAdService {
    constructor(adapter, { schedule = (fn, delay) => setTimeout(fn, delay), clear = id => clearTimeout(id), now = () => Date.now() } = {}) {
      this.adapter = adapter; this.schedule = schedule; this.clear = clear; this.now = now; this.sequence = 0;
    }
    requestReward({ placementId, timeoutMs = 15000, grantReward }) {
      const requestId = `reward-${this.now()}-${++this.sequence}`;
      return new Promise(resolve => {
        let settled = false;
        let timeoutId = null;
        const finish = (result, internal = false) => {
          if (settled) return;
          const expected = { requestId, placementId };
          if (!internal && !this.adapter.validateResultContext?.(result, expected)) result = { requestId, placementId, status: "invalid-result" };
          else if (result.status === "success" && !this.adapter.verifyResult(result, expected)) result = { requestId, placementId, status: "invalid-result" };
          settled = true; this.clear(timeoutId);
          if (result.status === "success") grantReward();
          resolve({ requestId, placementId, status: result.status });
        };
        const handle = this.adapter.requestReward({ requestId, placementId, onResult: finish });
        timeoutId = this.schedule(() => { handle?.cancel?.(); finish({ requestId, placementId, status: "timeout" }, true); }, timeoutMs);
      });
    }
  }

  class EntitlementLedger {
    constructor(store) { this.store = store; }
    recordVerifiedPurchase(product, transactionId) {
      if (!product || typeof transactionId !== "string" || !transactionId) return { applied: false, reason: "invalid" };
      if (this.store.state.commerce.processedTransactionIds.includes(transactionId)) return { applied: false, reason: "duplicate" };
      const alreadyOwned = product.type === "non-consumable" && this.has(product.id);
      this.store.update(state => {
        state.commerce.processedTransactionIds.push(transactionId);
        if (!alreadyOwned && product.type === "non-consumable") state.commerce.nonConsumableEntitlements.push(product.id);
        if (!alreadyOwned && product.fulfillment) state.commerce.pendingFulfillments.push({ transactionId, productId: product.id });
      });
      return { applied: !alreadyOwned, reason: alreadyOwned ? "owned" : "recorded", type: product.type, pending: !alreadyOwned && Boolean(product.fulfillment) };
    }
    applyVerifiedPurchase(product, transactionId) { return this.recordVerifiedPurchase(product, transactionId); }
    has(productId) { return this.store.state.commerce.nonConsumableEntitlements.includes(productId); }
    pending() { return clone(this.store.state.commerce.pendingFulfillments); }
    acknowledge(transactionId) { this.store.update(state => { state.commerce.pendingFulfillments = state.commerce.pendingFulfillments.filter(entry => entry.transactionId !== transactionId); }); }
  }

  class CommerceFulfillmentCoordinator {
    constructor(ledger, { handlers, persistGameplay }) { this.ledger = ledger; this.handlers = handlers; this.persistGameplay = persistGameplay; }
    reconcile() {
      const result = { acknowledged: 0, granted: 0, failed: 0 };
      for (const pending of this.ledger.pending()) {
        const handler = this.handlers[pending.productId];
        if (typeof handler !== "function") { result.failed += 1; continue; }
        try {
          if (handler(clone(pending)) === true) result.granted += 1;
          this.persistGameplay();
          this.ledger.acknowledge(pending.transactionId);
          result.acknowledged += 1;
        } catch (_) { result.failed += 1; }
      }
      return result;
    }
  }

  class FakeIapAdapter {
    constructor({ schedule = (fn, delay) => setTimeout(fn, delay), online = true } = {}) {
      this.schedule = schedule; this.online = online; this.scenarios = []; this.restoreResults = []; this.verified = new WeakSet(); this.sequence = 0;
    }
    queueScenario(events) { this.scenarios.push(Array.isArray(events) ? events : [isRecord(events) ? events : { status: events }]); }
    setRestoreResults(results) { this.restoreResults = clone(results || []); }
    purchase({ requestId, productId, onResult }) {
      const events = !this.online ? [{ status: "offline" }] : (this.scenarios.shift() || [{ status: "success" }]);
      let cancelled = false;
      for (const event of events) this.schedule(() => {
        if (cancelled && event.deliverAfterCancel !== true) return;
        const result = { requestId: event.requestId || requestId, productId: event.productId || productId, status: event.status, transactionId: event.transactionId || `fake-transaction-${++this.sequence}`, confirmed: event.status === "success", adapter: "explicit-fake-iap" };
        this.verified.add(result); onResult(result);
      }, Math.max(0, Number(event.afterMs) || 0));
      return { cancel: () => { cancelled = true; } };
    }
    restore() {
      return Promise.resolve(this.restoreResults.map(item => {
        const result = { ...item, status: "success", confirmed: true, adapter: "explicit-fake-iap" };
        this.verified.add(result); return result;
      }));
    }
    validateResultContext(result, expected) { return this.verified.has(result) && result.requestId === expected.requestId && result.productId === expected.productId; }
    verifyResult(result, expected) { return this.validateResultContext(result, expected) && typeof result.transactionId === "string" && Boolean(result.transactionId) && result.confirmed === true && result.status === "success"; }
    verifyRestore(result, product) { return this.verified.has(result) && product?.id === result.productId && typeof result.transactionId === "string" && Boolean(result.transactionId) && result.confirmed === true && result.status === "success"; }
  }

  class PurchaseService {
    constructor(adapter, ledger, { schedule = (fn, delay) => setTimeout(fn, delay), clear = id => clearTimeout(id), now = () => Date.now() } = {}) {
      this.adapter = adapter; this.ledger = ledger; this.schedule = schedule; this.clear = clear; this.now = now; this.sequence = 0;
    }
    purchase(productId, timeoutMs = 15000) {
      const product = PRODUCT_CATALOG[productId];
      if (!product) return Promise.resolve({ status: "invalid-product", applied: false });
      const requestId = `purchase-${this.now()}-${++this.sequence}`;
      return new Promise(resolve => {
        let settled = false;
        let timeoutId = null;
        const finish = (result, internal = false) => {
          if (settled) return;
          const expected = { requestId, productId };
          if (!internal && !this.adapter.validateResultContext?.(result, expected)) result = { requestId, productId, status: "invalid-result" };
          else if (result.status === "success" && !this.adapter.verifyResult(result, expected)) result = { requestId, productId, status: "invalid-result" };
          settled = true; this.clear(timeoutId);
          const recorded = result.status === "success" ? this.ledger.recordVerifiedPurchase(product, result.transactionId) : { applied: false, pending: false };
          resolve({ status: result.status, applied: recorded.applied, pending: recorded.pending, transactionId: result.transactionId });
        };
        const handle = this.adapter.purchase({ requestId, productId, onResult: finish });
        timeoutId = this.schedule(() => { handle?.cancel?.(); finish({ requestId, productId, status: "timeout" }, true); }, timeoutMs);
      });
    }
    async restorePurchases() {
      const results = await this.adapter.restore();
      let restored = 0;
      for (const result of results) {
        const product = PRODUCT_CATALOG[result.productId];
        if (product?.type !== "non-consumable" || !this.adapter.verifyRestore(result, product)) continue;
        if (this.ledger.recordVerifiedPurchase(product, result.transactionId).applied) restored += 1;
      }
      return { status: "success", restored };
    }
  }

  class FakeLifecycleAdapter {
    constructor() { this.listeners = new Set(); }
    subscribe(listener) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
    emit(phase, at) { for (const listener of this.listeners) listener({ phase, at }); }
  }

  class LifecycleCoordinator {
    constructor({ awardOffline }) { this.phase = "foreground"; this.backgroundAt = null; this.awardOffline = awardOffline; this.session = 0; }
    handle(event) {
      if (event.phase === "background" && this.phase === "foreground") { this.phase = "background"; this.backgroundAt = event.at; this.session += 1; return { awarded: false }; }
      if ((event.phase === "foreground" || event.phase === "resume") && this.phase === "background") {
        const from = this.backgroundAt; this.phase = "foreground"; this.backgroundAt = null;
        return { awarded: true, value: this.awardOffline(from, event.at, this.session) };
      }
      return { awarded: false };
    }
    activeElapsed(lastTickAt, now) { return this.phase === "foreground" ? Math.max(0, Math.min(5, (now - lastTickAt) / 1000)) : 0; }
  }

  class LocalFakeCloudSaveAdapter {
    constructor() { this.slots = new Map(); }
    async load(slotId) { const entry = this.slots.get(slotId); return entry ? { status: "success", ...clone(entry) } : { status: "not-found", revision: 0 }; }
    async save({ slotId, data, saveVersion, baseRevision }) {
      if (typeof slotId !== "string" || !Number.isInteger(saveVersion) || !Number.isInteger(baseRevision) || baseRevision < 0) return { status: "error", code: "invalid-request" };
      const current = this.slots.get(slotId);
      const currentRevision = current?.revision || 0;
      if (baseRevision !== currentRevision) return { status: "conflict", revision: currentRevision, remote: clone(current) };
      const entry = { revision: currentRevision + 1, saveVersion, data: clone(data) };
      this.slots.set(slotId, entry); return { status: "success", ...clone(entry) };
    }
  }

  return Object.freeze({
    PLATFORM_STATE_VERSION, CONSENT_VERSION, PRODUCT_CATALOG, ANALYTICS_SCHEMAS,
    defaultPlatformState, normalizePlatformState, parsePlatformState, validateAnalyticsEvent, LocalStorageBoundary,
    PlatformStateStore, ConsentManager, InMemoryAnalyticsAdapter,
    FakeRewardedAdAdapter, RewardedAdService, EntitlementLedger, CommerceFulfillmentCoordinator, FakeIapAdapter, PurchaseService,
    FakeLifecycleAdapter, LifecycleCoordinator, LocalFakeCloudSaveAdapter,
  });
});
