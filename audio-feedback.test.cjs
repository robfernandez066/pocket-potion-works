"use strict";

const assert = require("node:assert/strict");
const audio = require("./audio-feedback.js");

function storage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return { getItem: key => data.has(key) ? data.get(key) : null, setItem: (key, value) => data.set(key, value), read: key => data.get(key) };
}

function fakeContext({ fail = false } = {}) {
  const calls = [];
  return {
    calls, currentTime: 1, destination: {}, resume: () => Promise.resolve(),
    createGain() {
      if (fail) throw new Error("audio unavailable");
      return { gain: { setValueAtTime: (...args) => calls.push(["set", ...args]), linearRampToValueAtTime: (...args) => calls.push(["linear", ...args]), exponentialRampToValueAtTime: (...args) => calls.push(["exponential", ...args]), cancelScheduledValues: () => {} }, connect: () => {} };
    },
    createOscillator() { return { frequency: { setValueAtTime: () => {} }, connect: () => {}, start: () => calls.push(["start"]), stop: () => {} }; },
  };
}

let passed = 0;
function test(name, fn) { try { fn(); passed += 1; console.log(`ok ${passed} - ${name}`); } catch (error) { console.error(`not ok - ${name}`); throw error; } }

test("sound preference defaults off and rejects untrusted versions and shapes", () => {
  assert.deepEqual(audio.normalizeAudioPreference(null), { version: 1, enabled: false });
  assert.deepEqual(audio.normalizeAudioPreference({ version: 0, enabled: true }), { version: 1, enabled: false });
  assert.deepEqual(audio.normalizeAudioPreference({ version: 2, enabled: true }), { version: 1, enabled: false });
  assert.deepEqual(audio.normalizeAudioPreference({ version: 1, enabled: "yes" }), { version: 1, enabled: false });
  assert.equal(audio.parseAudioPreference("{bad").recovered, true);
});

test("sound preference persists independently and reloads safely", () => {
  const memory = storage();
  const store = new audio.AudioPreferenceStore(memory);
  assert.equal(store.enabled(), false);
  store.setEnabled(true);
  assert.equal(new audio.AudioPreferenceStore(memory).enabled(), true);
  assert.deepEqual(JSON.parse(memory.read(audio.AUDIO_PREFERENCE_KEY)), { version: 1, enabled: true });
});

test("muted sounds never initialize or play", () => {
  let initialized = 0;
  const engine = new audio.SoundEngine(new audio.AudioPreferenceStore(storage()), { contextFactory: () => { initialized += 1; return fakeContext(); } });
  assert.deepEqual(engine.play("gather"), { played: false, reason: "muted" });
  assert.equal(initialized, 0);
});

test("audio initializes lazily after enable and schedules original tones", () => {
  let initialized = 0;
  const store = new audio.AudioPreferenceStore(storage());
  const context = fakeContext();
  const engine = new audio.SoundEngine(store, { contextFactory: () => { initialized += 1; return context; }, now: () => 100 });
  engine.setEnabled(true);
  assert.equal(initialized, 0);
  assert.deepEqual(engine.play("brewReady"), { played: false, reason: "locked" });
  engine.activate();
  assert.equal(engine.play("brewReady").played, true);
  assert.equal(initialized, 1);
  assert.equal(context.calls.filter(call => call[0] === "start").length, 3);
});

test("required cues exist and the engine suppresses rapid overlap", () => {
  for (const name of ["tap", "gather", "brewStart", "brewReady", "collect", "delivery", "upgrade", "levelUp", "reward"]) {
    assert.ok(audio.SEQUENCES[name]?.length, `${name} cue is missing`);
  }
  let now = 100;
  const store = new audio.AudioPreferenceStore(storage()); store.setEnabled(true);
  const engine = new audio.SoundEngine(store, { contextFactory: () => fakeContext(), now: () => now });
  engine.activate();
  assert.equal(engine.play("gather").played, true);
  now = 120;
  assert.deepEqual(engine.play("tap"), { played: false, reason: "cooldown" });
});

test("audio failure is silent, sticky, and never blocks", () => {
  let initialized = 0;
  const store = new audio.AudioPreferenceStore(storage()); store.setEnabled(true);
  const engine = new audio.SoundEngine(store, { contextFactory: () => { initialized += 1; return fakeContext({ fail: true }); }, now: () => 100 });
  engine.activate();
  assert.deepEqual(engine.play("delivery"), { played: false, reason: "unavailable" });
  assert.deepEqual(engine.play("delivery"), { played: false, reason: "unavailable" });
  assert.equal(initialized, 1);
});

console.log(`All ${passed} audio feedback tests passed.`);
