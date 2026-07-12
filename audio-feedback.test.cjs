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

test("provided files map to their intended game cues", () => {
  assert.equal(audio.SAMPLE_CUES.tap.src, "assets/audio/tap.ogg");
  assert.equal(audio.sampleSettings("tap", () => .5).volume, .4);
  assert.equal(audio.sampleSettings("tap", () => .5).playbackRate, 4);
  assert.equal(audio.sampleSettings("tap", () => .5).preservesPitch, false);
  assert.equal(audio.SAMPLE_CUES.gather.src, "assets/audio/gather.mp3");
  assert.equal(audio.SAMPLE_CUES.gather.startTime, undefined);
  assert.equal(audio.SAMPLE_CUES.gather.duration, undefined);
  assert.equal(audio.SAMPLE_CUES.brewStart.src, "assets/audio/brew-start.mp3");
  assert.equal(audio.SAMPLE_CUES.brewReady.src, "assets/audio/brew-ready.mp3");
  assert.equal(audio.SAMPLE_CUES.collect.src, "assets/audio/bagpop.mp3");
  assert.equal(audio.SAMPLE_CUES.delivery.src, "assets/audio/confirm.mp3");
  assert.equal(audio.SAMPLE_CUES.levelUp.src, "assets/audio/levelup.ogg");
  assert.equal(audio.SAMPLE_CUES.coin.src, "assets/audio/coin.mp3");
});

test("each coin sample gets the requested live volume and playback-rate jitter", () => {
  const created = [];
  const randomValues = [0, 1];
  const store = new audio.AudioPreferenceStore(storage()); store.setEnabled(true);
  const engine = new audio.SoundEngine(store, {
    contextFactory: () => fakeContext(),
    audioFactory: src => {
      const sample = { src, play: () => Promise.resolve(), addEventListener: () => {} };
      created.push(sample);
      return sample;
    },
    random: () => randomValues.shift(),
    now: () => 100,
  });
  engine.activate();
  assert.deepEqual(engine.play("coin", { bypassCooldown: true }), { played: true, source: "sample" });
  assert.equal(created[0].src, "assets/audio/coin.mp3");
  assert.equal(created[0].volume, .27);
  assert.equal(created[0].playbackRate, 1.1);
});

test("tap disables pitch preservation so 4x playback raises its pitch", () => {
  const sample = { currentTime: 0, preservesPitch: true, play: () => undefined, addEventListener: () => {} };
  const store = new audio.AudioPreferenceStore(storage()); store.setEnabled(true);
  const engine = new audio.SoundEngine(store, { contextFactory: () => fakeContext(), audioFactory: () => sample, now: () => 100 });
  engine.activate();
  assert.equal(engine.play("tap").played, true);
  assert.equal(sample.playbackRate, 4);
  assert.equal(sample.preservesPitch, false);
});

test("coin rewards scale through capped chime tiers instead of playing once per coin", () => {
  const cases = [
    [0, 0], [1, 1], [9, 1], [10, 2], [19, 2], [20, 3], [39, 3],
    [40, 5], [79, 5], [80, 7], [149, 7], [150, 9], [10000, 9],
  ];
  for (const [coins, chimes] of cases) assert.equal(audio.coinChimeCount(coins), chimes, `${coins} coins`);
});

test("gather plays the entire trimmed file from the beginning", () => {
  const timers = [];
  const sample = { currentTime: 0, paused: 0, play: () => undefined, pause() { this.paused += 1; }, addEventListener: () => {} };
  const store = new audio.AudioPreferenceStore(storage()); store.setEnabled(true);
  const engine = new audio.SoundEngine(store, {
    contextFactory: () => fakeContext(),
    audioFactory: () => sample,
    schedule: (callback, delay) => { timers.push({ callback, delay }); return timers.length; },
    cancelSchedule: () => {},
    now: () => 100,
  });
  engine.activate();
  assert.equal(engine.play("gather").played, true);
  assert.equal(sample.currentTime, 0);
  assert.equal(timers.length, 0);
  assert.equal(sample.paused, 0);
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
