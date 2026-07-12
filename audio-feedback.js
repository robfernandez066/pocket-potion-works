"use strict";

(function initAudioFeedback(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PPWAudio = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function audioFeedbackFactory() {
  const AUDIO_PREFERENCE_VERSION = 1;
  const AUDIO_PREFERENCE_KEY = "pocket-potion-works-audio-v1";
  const DEFAULT_AUDIO_PREFERENCE = Object.freeze({ version: AUDIO_PREFERENCE_VERSION, enabled: false });

  const SEQUENCES = Object.freeze({
    tap: [[520, .035, .025]],
    gather: [[410, .045, .035], [610, .055, .04]],
    brewStart: [[220, .07, .045], [330, .08, .055]],
    brewReady: [[440, .06, .045], [660, .07, .055], [880, .1, .065]],
    collect: [[560, .05, .04], [760, .09, .055]],
    delivery: [[390, .05, .04], [520, .06, .045], [780, .1, .06]],
    upgrade: [[300, .05, .04], [450, .06, .045], [600, .09, .055]],
    levelUp: [[440, .06, .045], [554, .06, .045], [659, .06, .05], [880, .13, .07]],
    reward: [[523, .06, .045], [784, .08, .055], [1046, .12, .06]],
  });

  const SAMPLE_CUES = Object.freeze({
    tap: Object.freeze({ src: "assets/audio/tap.ogg", volume: .4, rateMin: 4, rateMax: 4, preservesPitch: false }),
    gather: Object.freeze({ src: "assets/audio/gather.mp3", volume: .65 }),
    brewStart: Object.freeze({ src: "assets/audio/brew-start.mp3", volume: .7 }),
    brewReady: Object.freeze({ src: "assets/audio/brew-ready.mp3", volume: .7 }),
    collect: Object.freeze({ src: "assets/audio/bagpop.mp3", volume: .65 }),
    delivery: Object.freeze({ src: "assets/audio/confirm.mp3", volume: .7 }),
    levelUp: Object.freeze({ src: "assets/audio/levelup.ogg", volume: .7 }),
    coin: Object.freeze({ src: "assets/audio/coin.mp3", volume: .3, volumeJitter: .1, rateMin: .95, rateMax: 1.1 }),
  });

  function sampleSettings(name, random = Math.random) {
    const cue = SAMPLE_CUES[name];
    if (!cue) return null;
    const nextRandom = () => Math.max(0, Math.min(1, Number(random()) || 0));
    const jitter = cue.volumeJitter || 0;
    const volume = cue.volume * (1 - jitter + nextRandom() * jitter * 2);
    const playbackRate = cue.rateMin === undefined ? 1 : cue.rateMin + nextRandom() * (cue.rateMax - cue.rateMin);
    return { src: cue.src, volume, playbackRate, preservesPitch: cue.preservesPitch !== false, startTime: cue.startTime || 0, duration: cue.duration || null };
  }

  function coinChimeCount(amount) {
    const coins = Math.max(0, Math.floor(Number(amount) || 0));
    if (coins === 0) return 0;
    if (coins < 10) return 1;
    if (coins < 20) return 2;
    if (coins < 40) return 3;
    if (coins < 80) return 5;
    if (coins < 150) return 7;
    return 9;
  }

  function normalizeAudioPreference(input) {
    if (!input || input.version !== AUDIO_PREFERENCE_VERSION || typeof input.enabled !== "boolean") {
      return { ...DEFAULT_AUDIO_PREFERENCE };
    }
    return { version: AUDIO_PREFERENCE_VERSION, enabled: input.enabled };
  }

  function parseAudioPreference(raw) {
    try { return { preference: normalizeAudioPreference(JSON.parse(raw)), recovered: false }; }
    catch { return { preference: { ...DEFAULT_AUDIO_PREFERENCE }, recovered: true }; }
  }

  class AudioPreferenceStore {
    constructor(storage, key = AUDIO_PREFERENCE_KEY) {
      this.storage = storage;
      this.key = key;
      let raw = null;
      try { raw = storage?.getItem?.(key); } catch { /* Use the safe default. */ }
      this.preference = raw === null ? { ...DEFAULT_AUDIO_PREFERENCE } : parseAudioPreference(raw).preference;
    }
    enabled() { return this.preference.enabled; }
    setEnabled(enabled) {
      this.preference = normalizeAudioPreference({ version: AUDIO_PREFERENCE_VERSION, enabled: Boolean(enabled) });
      try { this.storage?.setItem?.(this.key, JSON.stringify(this.preference)); } catch { /* Audio preference never blocks play. */ }
      return this.enabled();
    }
    snapshot() { return { ...this.preference }; }
  }

  class SoundEngine {
    constructor(preferenceStore, { contextFactory, audioFactory, now = () => Date.now(), random = Math.random, schedule = (callback, delay) => setTimeout(callback, delay), cancelSchedule = timer => clearTimeout(timer) } = {}) {
      this.preferenceStore = preferenceStore;
      this.contextFactory = contextFactory || (() => {
        const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
        return Context ? new Context() : null;
      });
      this.audioFactory = audioFactory || (src => {
        const AudioConstructor = globalThis.Audio;
        return AudioConstructor ? new AudioConstructor(src) : null;
      });
      this.now = now;
      this.random = random;
      this.schedule = schedule;
      this.cancelSchedule = cancelSchedule;
      this.context = null;
      this.failed = false;
      this.interacted = false;
      this.lastPlayedAt = -Infinity;
      this.activeGain = null;
      this.activeSamples = new Set();
      this.sampleTimers = new Map();
    }
    enabled() { return this.preferenceStore.enabled(); }
    setEnabled(enabled) {
      const next = this.preferenceStore.setEnabled(enabled);
      if (!next) this.stop();
      return next;
    }
    activate() {
      this.interacted = true;
      return this.unlock();
    }
    unlock() {
      if (!this.interacted || !this.enabled() || this.failed) return false;
      try {
        if (!this.context) this.context = this.contextFactory();
        if (!this.context) return false;
        const resumed = this.context.resume?.();
        if (resumed?.catch) resumed.catch(() => {});
        return true;
      } catch {
        this.failed = true;
        this.context = null;
        return false;
      }
    }
    stop() {
      try { this.activeGain?.gain?.cancelScheduledValues?.(0); this.activeGain?.gain?.setValueAtTime?.(0, 0); }
      catch { /* Best-effort stop. */ }
      this.activeGain = null;
      for (const sample of this.activeSamples) {
        try { sample.pause?.(); sample.currentTime = 0; } catch { /* Best-effort stop. */ }
      }
      for (const timer of this.sampleTimers.values()) this.cancelSchedule(timer);
      this.sampleTimers.clear();
      this.activeSamples.clear();
    }
    playSequence(name) {
      const sequence = SEQUENCES[name];
      if (!sequence || !this.unlock()) return { played: false, reason: "unavailable" };
      try {
        try { this.activeGain?.gain?.cancelScheduledValues?.(0); this.activeGain?.gain?.setValueAtTime?.(0, 0); }
        catch { /* Best-effort replacement of a synthesized cue. */ }
        this.activeGain = null;
        const context = this.context;
        const gain = context.createGain();
        gain.gain.setValueAtTime(0, context.currentTime);
        gain.connect(context.destination);
        this.activeGain = gain;
        let cursor = context.currentTime + .005;
        for (const [frequency, duration, volume] of sequence) {
          const oscillator = context.createOscillator();
          oscillator.type = "sine";
          oscillator.frequency.setValueAtTime(frequency, cursor);
          oscillator.connect(gain);
          gain.gain.setValueAtTime(0, cursor);
          gain.gain.linearRampToValueAtTime(volume, cursor + .008);
          gain.gain.exponentialRampToValueAtTime(.0001, cursor + duration);
          oscillator.start(cursor);
          oscillator.stop(cursor + duration + .01);
          cursor += duration * .72;
        }
        return { played: true, source: "synth" };
      } catch {
        this.failed = true;
        this.stop();
        return { played: false, reason: "unavailable" };
      }
    }
    playSample(name) {
      const settings = sampleSettings(name, this.random);
      if (!settings) return this.playSequence(name);
      try {
        const sample = this.audioFactory(settings.src);
        if (!sample) return this.playSequence(name);
        sample.preload = "auto";
        sample.volume = settings.volume;
        sample.playbackRate = settings.playbackRate;
        sample.preservesPitch = settings.preservesPitch;
        if ("mozPreservesPitch" in sample) sample.mozPreservesPitch = settings.preservesPitch;
        if ("webkitPreservesPitch" in sample) sample.webkitPreservesPitch = settings.preservesPitch;
        sample.currentTime = settings.startTime;
        this.activeSamples.add(sample);
        const cleanup = () => {
          const timer = this.sampleTimers.get(sample);
          if (timer !== undefined) this.cancelSchedule(timer);
          this.sampleTimers.delete(sample);
          this.activeSamples.delete(sample);
        };
        const stopAtSliceEnd = () => {
          if (!settings.duration) return;
          const timer = this.schedule(() => {
            try { sample.pause?.(); sample.currentTime = 0; } catch { /* Best-effort slice stop. */ }
            cleanup();
          }, settings.duration * 1000);
          this.sampleTimers.set(sample, timer);
        };
        sample.addEventListener?.("ended", cleanup, { once: true });
        const started = sample.play();
        if (started?.then) started.then(stopAtSliceEnd).catch(() => { cleanup(); this.playSequence(name); });
        else stopAtSliceEnd();
        return { played: true, source: "sample" };
      } catch {
        return this.playSequence(name);
      }
    }
    play(name, { bypassCooldown = false } = {}) {
      if (!this.enabled()) return { played: false, reason: "muted" };
      const sequence = SEQUENCES[name];
      if (!sequence && !SAMPLE_CUES[name]) return { played: false, reason: "unknown" };
      const playedAt = this.now();
      if (!bypassCooldown && playedAt - this.lastPlayedAt < 45) return { played: false, reason: "cooldown" };
      if (!this.interacted) return { played: false, reason: "locked" };
      const result = SAMPLE_CUES[name] ? this.playSample(name) : this.playSequence(name);
      if (result.played) this.lastPlayedAt = playedAt;
      return result;
    }
  }

  return Object.freeze({
    AUDIO_PREFERENCE_VERSION, AUDIO_PREFERENCE_KEY, DEFAULT_AUDIO_PREFERENCE, SEQUENCES, SAMPLE_CUES, sampleSettings, coinChimeCount,
    normalizeAudioPreference, parseAudioPreference, AudioPreferenceStore, SoundEngine,
  });
});
