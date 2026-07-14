"use strict";

(function initAudioFeedback(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PPWAudio = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function audioFeedbackFactory() {
  const AUDIO_PREFERENCE_VERSION = 2;
  const AUDIO_PREFERENCE_KEY = "pocket-potion-works-audio-v1";
  const DEFAULT_AUDIO_PREFERENCE = Object.freeze({ version: AUDIO_PREFERENCE_VERSION, enabled: true, effectsVolume: .5, musicVolume: .5 });
  const MUSIC_TRACKS = Object.freeze(["assets/audio/music1.mp3", "assets/audio/music2.mp3", "assets/audio/music3.mp3"]);
  const SYNTH_OUTPUT_BOOST = 8;

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
    tap: Object.freeze({ src: "assets/audio/tap.ogg", volume: 1, rateMin: 4, rateMax: 4, preservesPitch: false }),
    gather: Object.freeze({ src: "assets/audio/gather.mp3", volume: 1 }),
    brewStart: Object.freeze({ src: "assets/audio/brew-start.mp3", volume: 1 }),
    brewReady: Object.freeze({ src: "assets/audio/brew-ready.mp3", volume: 1 }),
    collect: Object.freeze({ src: "assets/audio/bagpop.mp3", volume: 1 }),
    delivery: Object.freeze({ src: "assets/audio/confirm.mp3", volume: 1 }),
    levelUp: Object.freeze({ src: "assets/audio/levelup.ogg", volume: 1 }),
    coin: Object.freeze({ src: "assets/audio/coin.mp3", volume: .55, volumeJitter: .1, rateMin: .95, rateMax: 1.1 }),
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

  function effectsOutputGain(volume) {
    const level = Math.max(0, Math.min(1, Number(volume) || 0));
    return level * (2 - level);
  }

  function normalizeAudioPreference(input) {
    if (input?.version === 1 && typeof input.enabled === "boolean") return { ...DEFAULT_AUDIO_PREFERENCE, enabled: input.enabled };
    if (!input || input.version !== AUDIO_PREFERENCE_VERSION || typeof input.enabled !== "boolean") return { ...DEFAULT_AUDIO_PREFERENCE };
    const volume = value => Number.isFinite(Number(value)) ? Math.max(0, Math.min(1, Number(value))) : .5;
    return { version: AUDIO_PREFERENCE_VERSION, enabled: input.enabled, effectsVolume: volume(input.effectsVolume), musicVolume: volume(input.musicVolume) };
  }

  function parseAudioPreference(raw) {
    try { return { preference: normalizeAudioPreference(JSON.parse(raw)), recovered: false }; }
    catch { return { preference: { ...DEFAULT_AUDIO_PREFERENCE }, recovered: true }; }
  }

  class AudioPreferenceStore {
    constructor(storage, key = AUDIO_PREFERENCE_KEY) {
      this.storage = storage;
      this.key = key;
      this.persistenceBlocked = !storage || typeof storage.getItem !== "function";
      let raw = null;
      if (!this.persistenceBlocked) try { raw = storage.getItem(key); } catch { this.persistenceBlocked = true; /* Use the safe default. */ }
      this.preference = raw === null ? { ...DEFAULT_AUDIO_PREFERENCE } : parseAudioPreference(raw).preference;
    }
    enabled() { return this.preference.enabled; }
    effectsVolume() { return this.preference.effectsVolume; }
    musicVolume() { return this.preference.musicVolume; }
    persist(next) {
      this.preference = normalizeAudioPreference(next);
      if (!this.persistenceBlocked) try { this.storage.setItem(this.key, JSON.stringify(this.preference)); } catch { /* Audio preference never blocks play. */ }
      return this.snapshot();
    }
    setEnabled(enabled) {
      this.persist({ ...this.preference, version: AUDIO_PREFERENCE_VERSION, enabled: Boolean(enabled) });
      return this.enabled();
    }
    setEffectsVolume(volume) { return this.persist({ ...this.preference, effectsVolume: volume }).effectsVolume; }
    setMusicVolume(volume) { return this.persist({ ...this.preference, musicVolume: volume }).musicVolume; }
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
    effectsVolume() { return this.preferenceStore.effectsVolume(); }
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
          gain.gain.linearRampToValueAtTime(Math.min(1, volume * effectsOutputGain(this.effectsVolume()) * SYNTH_OUTPUT_BOOST), cursor + .008);
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
        sample.volume = settings.volume * effectsOutputGain(this.effectsVolume());
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
      if (!this.enabled() || this.effectsVolume() <= 0) return { played: false, reason: "muted" };
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

  class MusicEngine {
    constructor(preferenceStore, { audioFactory, random = Math.random, now = () => Date.now(), schedule = (callback, delay) => setTimeout(callback, delay), cancelSchedule = timer => clearTimeout(timer), tracks = MUSIC_TRACKS, fadeMs = 2200 } = {}) {
      this.preferenceStore = preferenceStore;
      this.audioFactory = audioFactory || (src => {
        const AudioConstructor = globalThis.Audio;
        return AudioConstructor ? new AudioConstructor(src) : null;
      });
      this.random = random;
      this.now = now;
      this.schedule = schedule;
      this.cancelSchedule = cancelSchedule;
      this.tracks = [...tracks];
      this.fadeMs = fadeMs;
      this.interacted = false;
      this.paused = false;
      this.current = null;
      this.next = null;
      this.pending = null;
      this.fade = null;
      this.fadeTimer = null;
      this.generation = 0;
    }
    enabled() { return this.preferenceStore.enabled() && this.preferenceStore.musicVolume() > 0; }
    targetVolume() { return this.preferenceStore.musicVolume(); }
    activate() {
      this.interacted = true;
      if (!this.enabled() || this.paused || this.current || this.pending || !this.tracks.length) return false;
      const index = Math.floor(Math.max(0, Math.min(.999999, Number(this.random()) || 0)) * this.tracks.length);
      return this.start(index, null, 0);
    }
    createTrack(index) {
      try {
        const audio = this.audioFactory(this.tracks[index]);
        if (!audio) return null;
        audio.preload = "auto";
        audio.loop = false;
        audio.volume = 0;
        const entry = { audio, index, transitioning: false };
        audio.addEventListener?.("timeupdate", () => this.maybeTransition(entry));
        audio.addEventListener?.("ended", () => {
          if (this.current === entry && !entry.transitioning) this.start((index + 1) % this.tracks.length, entry, 0);
        }, { once: true });
        return entry;
      } catch { return null; }
    }
    start(index, previous = null, attempt = 0) {
      if (!this.enabled() || this.paused || this.pending) return false;
      const entry = this.createTrack(index);
      if (!entry) return this.handleStartFailure(index, previous, attempt);
      if (previous) previous.transitioning = true;
      this.pending = entry;
      const generation = this.generation;
      const success = () => {
        if (generation !== this.generation || this.paused || !this.enabled()) {
          try { entry.audio.pause?.(); } catch { /* Ignore stale playback. */ }
          if (this.pending === entry) this.pending = null;
          if (previous) previous.transitioning = false;
          return;
        }
        if (this.pending === entry) this.pending = null;
        if (previous && this.current === previous) this.crossfade(previous, entry);
        else if (!previous && !this.current) { entry.audio.volume = this.targetVolume(); this.current = entry; }
        else { try { entry.audio.pause?.(); } catch { /* Ignore superseded playback. */ } }
      };
      const failure = () => {
        try { entry.audio.pause?.(); entry.audio.currentTime = 0; } catch { /* Best-effort cleanup. */ }
        if (this.pending === entry) this.pending = null;
        if (previous) previous.transitioning = false;
        if (generation === this.generation) this.handleStartFailure(index, previous, attempt);
      };
      try {
        const started = entry.audio.play?.();
        if (started?.then) started.then(success).catch(failure); else success();
      } catch { failure(); }
      return true;
    }
    handleStartFailure(index, previous, attempt) {
      if (attempt + 1 < this.tracks.length && this.enabled() && !this.paused) return this.start((index + 1) % this.tracks.length, previous, attempt + 1);
      if (previous) {
        previous.transitioning = false;
        try { previous.audio.volume = this.targetVolume(); } catch { /* Keep the working track. */ }
      }
      return false;
    }
    maybeTransition(entry) {
      if (this.current !== entry || entry.transitioning || !Number.isFinite(entry.audio.duration)) return;
      if (entry.audio.duration - entry.audio.currentTime <= this.fadeMs / 1000) {
        this.start((entry.index + 1) % this.tracks.length, entry, 0);
      }
    }
    crossfade(previous, next) {
      this.next = next;
      this.fade = { previous, next, progress: 0, lastAt: this.now(), generation: this.generation };
      this.fadeStep();
    }
    fadeStep() {
      const fade = this.fade;
      if (!fade || this.paused || fade.generation !== this.generation) return;
      if (!this.enabled()) return this.stop();
      const elapsed = Math.max(0, this.now() - fade.lastAt);
      fade.lastAt = this.now();
      fade.progress = Math.max(0, Math.min(1, fade.progress + elapsed / this.fadeMs));
      const progress = fade.progress;
        const volume = this.targetVolume();
        try { fade.previous.audio.volume = volume * (1 - progress); fade.next.audio.volume = volume * progress; } catch { /* Best-effort fade. */ }
        if (progress >= 1) {
          try { fade.previous.audio.pause?.(); fade.previous.audio.currentTime = 0; } catch { /* Best-effort cleanup. */ }
          fade.previous.transitioning = false;
          this.current = fade.next; this.next = null; this.fade = null; this.fadeTimer = null;
        } else this.fadeTimer = this.schedule(() => this.fadeStep(), 50);
    }
    setMusicVolume(volume) {
      const nextVolume = this.preferenceStore.setMusicVolume(volume);
      try {
        if (this.fade) { this.fade.previous.audio.volume = nextVolume * (1 - this.fade.progress); this.fade.next.audio.volume = nextVolume * this.fade.progress; }
        else if (this.current) this.current.audio.volume = this.enabled() ? nextVolume : 0;
      } catch { /* Best-effort live volume. */ }
      if (!this.enabled()) this.stop(); else if (this.interacted && !this.current) this.activate();
      return nextVolume;
    }
    syncEnabled() {
      if (!this.enabled()) this.stop(); else if (this.interacted && !this.paused) this.activate();
    }
    setPaused(paused) {
      this.paused = Boolean(paused);
      if (this.paused) {
        if (this.fadeTimer !== null) this.cancelSchedule(this.fadeTimer);
        this.fadeTimer = null;
        for (const entry of [this.current, this.next]) { try { entry?.audio?.pause?.(); } catch { /* Best-effort pause. */ } }
        return;
      }
      const resume = (entry, onFailure) => {
        if (!entry) return;
        try { const result = entry.audio.play?.(); if (result?.catch) result.catch(onFailure); } catch { onFailure(); }
      };
      resume(this.current, () => this.stop());
      resume(this.next, () => this.cancelFadeKeepCurrent());
      if (this.fade) { this.fade.lastAt = this.now(); this.fadeTimer = this.schedule(() => this.fadeStep(), 50); }
      if (this.interacted && !this.current && !this.pending) this.activate();
    }
    cancelFadeKeepCurrent() {
      if (!this.fade) return;
      if (this.fadeTimer !== null) this.cancelSchedule(this.fadeTimer);
      try { this.fade.next.audio.pause?.(); this.fade.next.audio.currentTime = 0; this.fade.previous.audio.volume = this.targetVolume(); } catch { /* Best-effort recovery. */ }
      this.fade.previous.transitioning = false;
      this.current = this.fade.previous; this.next = null; this.fade = null; this.fadeTimer = null;
    }
    stop() {
      this.generation += 1;
      if (this.fadeTimer !== null) this.cancelSchedule(this.fadeTimer);
      this.fadeTimer = null;
      for (const entry of [this.current, this.next, this.pending]) {
        try { entry?.audio?.pause?.(); if (entry?.audio) entry.audio.currentTime = 0; } catch { /* Best-effort stop. */ }
      }
      this.current = null; this.next = null; this.pending = null; this.fade = null;
    }
  }

  return Object.freeze({
    AUDIO_PREFERENCE_VERSION, AUDIO_PREFERENCE_KEY, DEFAULT_AUDIO_PREFERENCE, MUSIC_TRACKS, SEQUENCES, SAMPLE_CUES, SYNTH_OUTPUT_BOOST, sampleSettings, coinChimeCount, effectsOutputGain,
    normalizeAudioPreference, parseAudioPreference, AudioPreferenceStore, SoundEngine, MusicEngine,
  });
});
