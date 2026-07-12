"use strict";

const assert = require("node:assert/strict");
const game = require("./game-logic.js");
const platform = require("./platform-adapters.js");
const audio = require("./audio-feedback.js");

const GAMEPLAY_KEY = "pocket-potion-works-v1";
const PLATFORM_KEY = "pocket-potion-works-platform-v1";
const NOW = Date.UTC(2026, 6, 12, 12);

function storage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return { getItem: key => values.has(key) ? values.get(key) : null, setItem: (key, value) => values.set(key, value), values };
}

let passed = 0;
function test(name, fn) { fn(); passed += 1; console.log(`ok ${passed} - ${name}`); }

test("gameplay, platform, and audio versioned namespaces survive a shared-storage reload", () => {
  const local = storage();
  const gameplay = game.defaultState(NOW);
  gameplay.coins = 412;
  gameplay.stardust = 8;
  gameplay.stats.orders = 17;
  gameplay.achievements.firstBrew = NOW - 1000;
  local.setItem(GAMEPLAY_KEY, JSON.stringify(gameplay));
  const platformStore = new platform.PlatformStateStore(local, PLATFORM_KEY);
  new platform.ConsentManager(platformStore, () => NOW).setAnalytics(true);
  new audio.AudioPreferenceStore(local).setEnabled(true);

  const reloadedGame = game.parseSave(local.getItem(GAMEPLAY_KEY), NOW + 5000).state;
  const reloadedPlatform = new platform.PlatformStateStore(local, PLATFORM_KEY);
  const reloadedAudio = new audio.AudioPreferenceStore(local);
  assert.equal(reloadedGame.coins, 412);
  assert.equal(reloadedGame.stardust, 8);
  assert.equal(reloadedGame.stats.orders, 17);
  assert.equal(reloadedGame.achievements.firstBrew, NOW - 1000);
  assert.equal(reloadedPlatform.state.consent.analytics, "allowed");
  assert.equal(reloadedAudio.enabled(), true);
  assert.deepEqual([...local.values.keys()].sort(), [audio.AUDIO_PREFERENCE_KEY, GAMEPLAY_KEY, PLATFORM_KEY].sort());
});

test("reload recovery is isolated so one corrupt namespace cannot erase the others", () => {
  const local = storage({
    [GAMEPLAY_KEY]: "{broken",
    [PLATFORM_KEY]: JSON.stringify({ version: 1, consent: { version: 1, analytics: "allowed", updatedAt: NOW }, commerce: {} }),
    [audio.AUDIO_PREFERENCE_KEY]: JSON.stringify({ version: 1, enabled: true }),
  });
  assert.equal(game.parseSave(local.getItem(GAMEPLAY_KEY), NOW).recovered, true);
  assert.equal(new platform.PlatformStateStore(local, PLATFORM_KEY).state.consent.analytics, "allowed");
  assert.equal(new audio.AudioPreferenceStore(local).enabled(), true);
});

test("offline credit is single-award, capped at four hours, and rejects future timestamps", () => {
  const awards = [];
  const lifecycle = new platform.LifecycleCoordinator({
    awardOffline: (from, to) => {
      const state = game.defaultState(from);
      state.lastSeen = from;
      const seconds = game.offlineElapsedSeconds(state, to);
      awards.push(seconds);
      return seconds;
    },
  });
  lifecycle.handle({ phase: "background", at: NOW });
  assert.equal(lifecycle.activeElapsed(NOW, NOW + 60_000), 0);
  assert.equal(lifecycle.handle({ phase: "resume", at: NOW + 24 * 60 * 60 * 1000 }).value, game.OFFLINE_CAP_SECONDS);
  assert.equal(lifecycle.handle({ phase: "resume", at: NOW + 25 * 60 * 60 * 1000 }).awarded, false);
  lifecycle.handle({ phase: "background", at: NOW + 30 * 60 * 60 * 1000 });
  assert.equal(lifecycle.handle({ phase: "resume", at: NOW + 30 * 60 * 60 * 1000 - 1000 }).value, 0);
  assert.deepEqual(awards, [game.OFFLINE_CAP_SECONDS, 0]);
});

console.log(`All ${passed} release lifecycle and migration tests passed.`);
