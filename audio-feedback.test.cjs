"use strict";

const assert = require("node:assert/strict");
const audio = require("./audio-feedback.js");

function storage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return { getItem: key => data.has(key) ? data.get(key) : null, setItem: (key, value) => data.set(key, value), read: key => data.get(key) };
}
function throwingStorage({ read = false, write = false } = {}) {
  const writes = [];
  return {
    getItem: () => { if (read) throw new Error("read unavailable"); return null; },
    setItem: (...args) => { writes.push(args); if (write) throw new Error("write unavailable"); },
    writes,
  };
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

test("sound preference defaults on and rejects untrusted versions and shapes", () => {
  const defaults = { version: 2, enabled: true, effectsVolume: .5, musicVolume: .5 };
  assert.deepEqual(audio.normalizeAudioPreference(null), defaults);
  assert.deepEqual(audio.normalizeAudioPreference({ version: 0, enabled: false }), defaults);
  assert.deepEqual(audio.normalizeAudioPreference({ version: 2, enabled: false }), { ...defaults, enabled: false });
  assert.deepEqual(audio.normalizeAudioPreference({ version: 2, enabled: false, effectsVolume: "loud", musicVolume: 4 }), { version: 2, enabled: false, effectsVolume: .5, musicVolume: 1 });
  assert.deepEqual(audio.normalizeAudioPreference({ version: 1, enabled: false }), { ...defaults, enabled: false });
  assert.equal(audio.parseAudioPreference("{bad").recovered, true);
});

test("sound preference persists independently and reloads safely", () => {
  const memory = storage();
  const store = new audio.AudioPreferenceStore(memory);
  assert.equal(store.enabled(), true);
  store.setEnabled(false);
  assert.equal(new audio.AudioPreferenceStore(memory).enabled(), false);
  store.setEffectsVolume(.7);
  store.setMusicVolume(.25);
  assert.deepEqual(JSON.parse(memory.read(audio.AUDIO_PREFERENCE_KEY)), { version: 2, enabled: false, effectsVolume: .7, musicVolume: .25 });
  assert.equal(new audio.AudioPreferenceStore(memory).effectsVolume(), .7);
  assert.equal(new audio.AudioPreferenceStore(memory).musicVolume(), .25);
});

test("sound preferences safely use memory when storage is unavailable or throws", () => {
  const unavailable = new audio.AudioPreferenceStore(null);
  assert.doesNotThrow(() => unavailable.setEnabled(false));
  assert.equal(unavailable.enabled(), false);
  const unreadable = new audio.AudioPreferenceStore(throwingStorage({ read: true }));
  assert.equal(unreadable.enabled(), true);
  unreadable.setEnabled(false);
  assert.equal(unreadable.storage.writes.length, 0, "a failed initial audio read must block later writes");
  const unwritable = new audio.AudioPreferenceStore(throwingStorage({ write: true }));
  assert.doesNotThrow(() => unwritable.setMusicVolume(.25));
  assert.equal(unwritable.musicVolume(), .25);
});

test("effects use a louder perceptual curve without exceeding the safe base mix", () => {
  assert.equal(audio.effectsOutputGain(0), 0);
  assert.equal(audio.effectsOutputGain(.5), .75);
  assert.ok(Math.abs(audio.effectsOutputGain(.7) - .91) < 1e-9);
  assert.equal(audio.effectsOutputGain(1), 1);
  assert.equal(audio.effectsOutputGain(4), 1);
});

test("muted sounds never initialize or play", () => {
  let initialized = 0;
  const preference = new audio.AudioPreferenceStore(storage()); preference.setEnabled(false);
  const engine = new audio.SoundEngine(preference, { contextFactory: () => { initialized += 1; return fakeContext(); } });
  assert.deepEqual(engine.play("gather"), { played: false, reason: "muted" });
  assert.equal(initialized, 0);
});

test("audio initializes lazily after enable and schedules original tones", () => {
  let initialized = 0;
  const store = new audio.AudioPreferenceStore(storage());
  store.setEnabled(false);
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
  assert.equal(audio.sampleSettings("tap", () => .5).volume, 1);
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
  for (const name of ["tap", "gather", "brewStart", "brewReady", "collect", "delivery", "levelUp"]) assert.equal(audio.SAMPLE_CUES[name].volume, 1, `${name} should use its full safe sample level`);
});

test("phone-safe synthesized fallbacks are loud enough to hear", () => {
  const context = fakeContext();
  const store = new audio.AudioPreferenceStore(storage());
  const engine = new audio.SoundEngine(store, { contextFactory: () => context, audioFactory: () => null, now: () => 100 });
  engine.activate();
  assert.equal(engine.play("tap").source, "synth");
  const peak = context.calls.find(call => call[0] === "linear")?.[1];
  assert.ok(Math.abs(peak - .15) < 1e-9, `expected audible tap fallback, got ${peak}`);
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
  assert.ok(Math.abs(created[0].volume - .37125) < 1e-9);
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

test("music starts randomly after interaction then crossfades through the numbered loop", () => {
  let now = 0;
  const scheduled = [];
  const created = [];
  const makeMusic = src => {
    const listeners = {};
    const sample = { src, currentTime: 0, duration: 10, volume: 0, plays: 0, pauses: 0, play() { this.plays += 1; }, pause() { this.pauses += 1; }, addEventListener(name, callback) { listeners[name] = callback; }, emit(name) { listeners[name]?.(); } };
    created.push(sample); return sample;
  };
  const store = new audio.AudioPreferenceStore(storage());
  const music = new audio.MusicEngine(store, { audioFactory: makeMusic, random: () => .5, now: () => now, schedule: callback => { scheduled.push(callback); return scheduled.length; }, cancelSchedule: () => {}, fadeMs: 2000 });
  assert.equal(music.current, null);
  assert.equal(music.activate(), true);
  assert.equal(created[0].src, "assets/audio/music2.mp3");
  assert.equal(created[0].volume, .5);
  created[0].currentTime = 8;
  created[0].emit("timeupdate");
  assert.equal(created[1].src, "assets/audio/music3.mp3");
  assert.equal(created[1].volume, 0);
  now = 2000; scheduled.shift()();
  assert.equal(created[0].pauses, 1);
  assert.equal(music.current.index, 2);
  assert.equal(created[1].volume, .5);
  music.setMusicVolume(.25);
  assert.equal(created[1].volume, .25);
  created[1].currentTime = 8;
  created[1].emit("timeupdate");
  assert.equal(created[2].src, "assets/audio/music1.mp3");
});

test("music skips unavailable tracks and remains retryable after playback failures", () => {
  const created = [];
  const outcomes = ["throw", "reject", "ok"];
  const audioFactory = src => {
    const outcome = outcomes.shift() || "reject";
    const sample = { src, currentTime: 0, duration: 10, volume: 0, pauses: 0, pause() { this.pauses += 1; }, addEventListener() {}, play() {
      if (outcome === "throw") throw new Error("blocked");
      if (outcome === "reject") return { then() { return { catch(reject) { reject(new Error("missing")); } }; } };
      return undefined;
    } };
    created.push(sample); return sample;
  };
  const store = new audio.AudioPreferenceStore(storage());
  const music = new audio.MusicEngine(store, { audioFactory, random: () => 0 });
  assert.equal(music.activate(), true);
  assert.deepEqual(created.map(item => item.src), ["assets/audio/music1.mp3", "assets/audio/music2.mp3", "assets/audio/music3.mp3"]);
  assert.equal(music.current.index, 2);
  assert.equal(music.pending, null);
  music.stop();
  assert.equal(music.current, null);
  assert.equal(music.activate(), true, "a later interaction can retry after all state was cleared");
});

test("visibility pause preserves an in-progress crossfade and cyclic position", () => {
  let now = 0;
  let nextTimer = 1;
  const timers = new Map();
  const created = [];
  const audioFactory = src => {
    const listeners = {};
    const sample = { src, currentTime: 0, duration: 10, volume: 0, plays: 0, pauses: 0, play() { this.plays += 1; }, pause() { this.pauses += 1; }, addEventListener(name, callback) { listeners[name] = callback; }, emit(name) { listeners[name]?.(); } };
    created.push(sample); return sample;
  };
  const music = new audio.MusicEngine(new audio.AudioPreferenceStore(storage()), { audioFactory, random: () => 0, now: () => now, schedule: callback => { const id = nextTimer++; timers.set(id, callback); return id; }, cancelSchedule: id => timers.delete(id), fadeMs: 2000 });
  music.activate();
  created[0].currentTime = 8; created[0].emit("timeupdate");
  assert.equal(music.current.index, 0); assert.equal(music.next.index, 1);
  music.setPaused(true);
  assert.equal(music.current.index, 0); assert.equal(music.next.index, 1); assert.ok(music.fade);
  now = 5000;
  music.setPaused(false);
  now = 7000;
  const resumeTimer = [...timers.values()].at(-1); resumeTimer();
  assert.equal(music.current.index, 1);
  assert.equal(music.next, null);
});

test("a failed next track keeps the currently playing music alive", () => {
  let calls = 0;
  let currentSample;
  const audioFactory = src => {
    const listeners = {};
    const succeeds = calls++ === 0;
    const sample = { src, currentTime: 0, duration: 10, volume: 0, pauses: 0, play() { return succeeds ? undefined : { then() { return { catch(reject) { reject(new Error("unavailable")); } }; } }; }, pause() { this.pauses += 1; }, addEventListener(name, callback) { listeners[name] = callback; }, emit(name) { listeners[name]?.(); } };
    if (succeeds) currentSample = sample;
    return sample;
  };
  const music = new audio.MusicEngine(new audio.AudioPreferenceStore(storage()), { audioFactory, random: () => 0 });
  music.activate();
  currentSample.currentTime = 8; currentSample.emit("timeupdate");
  assert.equal(music.current.index, 0);
  assert.equal(music.current.transitioning, false);
  assert.equal(music.next, null);
  assert.equal(music.pending, null);
  assert.equal(currentSample.volume, .5);
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
