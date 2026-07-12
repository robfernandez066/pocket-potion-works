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
    constructor(preferenceStore, { contextFactory, now = () => Date.now() } = {}) {
      this.preferenceStore = preferenceStore;
      this.contextFactory = contextFactory || (() => {
        const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
        return Context ? new Context() : null;
      });
      this.now = now;
      this.context = null;
      this.failed = false;
      this.interacted = false;
      this.lastPlayedAt = -Infinity;
      this.activeGain = null;
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
    }
    play(name) {
      if (!this.enabled()) return { played: false, reason: "muted" };
      const sequence = SEQUENCES[name];
      if (!sequence) return { played: false, reason: "unknown" };
      const playedAt = this.now();
      if (playedAt - this.lastPlayedAt < 45) return { played: false, reason: "cooldown" };
      if (!this.interacted) return { played: false, reason: "locked" };
      if (!this.unlock()) return { played: false, reason: "unavailable" };
      try {
        this.stop();
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
        this.lastPlayedAt = playedAt;
        return { played: true };
      } catch {
        this.failed = true;
        this.stop();
        return { played: false, reason: "unavailable" };
      }
    }
  }

  return Object.freeze({
    AUDIO_PREFERENCE_VERSION, AUDIO_PREFERENCE_KEY, DEFAULT_AUDIO_PREFERENCE, SEQUENCES,
    normalizeAudioPreference, parseAudioPreference, AudioPreferenceStore, SoundEngine,
  });
});
