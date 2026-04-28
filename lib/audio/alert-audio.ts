"use client";

export type AlertSoundProfile = "soft" | "normal" | "loud" | "max_restaurant";
export type AlertTone =
  | "Alerta 1"
  | "Alerta 2"
  | "Alerta 3"
  | "Alerta 4"
  | "Alerta 5"
  | "Alerta 6"
  | "Alerta 7"
  | "Alerta 8";

export type AlertAudioSettings = {
  enabled: boolean;
  volume: number;
  gainBoost: number;
  repeatIfPending: boolean;
  repeatIntervalMs: number;
  soundProfile: AlertSoundProfile;
  alertTone: AlertTone;
};

export type AlertAudioState = {
  unlocked: boolean;
  contextState: AudioContextState | "unavailable";
  lastError: string | null;
  lastEvent: string | null;
};

const SETTINGS_KEY = "alert_sound_settings";
const SETTINGS_EVENT = "alert_sound_settings_updated";
const UNLOCKED_KEY = "alert_audio_unlocked";
const RESTAURANT_BELL_TONE: AlertTone = "Alerta 1";

type ToneStep = {
  freq: number;
  type: OscillatorType;
  startTime: number;
  duration: number;
  gainPeak: number;
};

const RESTAURANT_BELL_RECIPE: ToneStep[] = [
  { freq: 1174.66, type: "sine", startTime: 0, duration: 0.22, gainPeak: 1 },
  { freq: 880, type: "sine", startTime: 0.03, duration: 0.38, gainPeak: 0.9 },
  { freq: 587.33, type: "triangle", startTime: 0.08, duration: 0.52, gainPeak: 0.5 }
];

const RESTAURANT_BELL_DURATION_MS =
  Math.ceil(Math.max(...RESTAURANT_BELL_RECIPE.map((step) => step.startTime + step.duration)) * 1000) + 120;

export const ALERT_SOUND_PROFILES: Record<
  AlertSoundProfile,
  { label: string; volume: number; gainBoost: number; repeatIfPending: boolean; repeatIntervalMs: number }
> = {
  soft: {
    label: "Campainha restaurante",
    volume: 0.65,
    gainBoost: 1,
    repeatIfPending: true,
    repeatIntervalMs: 0
  },
  normal: {
    label: "Campainha restaurante",
    volume: 0.85,
    gainBoost: 1,
    repeatIfPending: true,
    repeatIntervalMs: 0
  },
  loud: {
    label: "Campainha restaurante",
    volume: 1,
    gainBoost: 1.2,
    repeatIfPending: true,
    repeatIntervalMs: 0
  },
  max_restaurant: {
    label: "Campainha restaurante",
    volume: 1,
    gainBoost: 1.5,
    repeatIfPending: true,
    repeatIntervalMs: 0
  }
};

export const ALERT_TONES: Record<AlertTone, { label: string; hint: string }> = {
  "Alerta 1": {
    label: "Campainha restaurante",
    hint: "Toque bell de restaurante usado globalmente para pedidos novos."
  },
  "Alerta 2": {
    label: "Campainha restaurante",
    hint: "Normalizado para a campainha padrao de restaurante."
  },
  "Alerta 3": {
    label: "Campainha restaurante",
    hint: "Normalizado para a campainha padrao de restaurante."
  },
  "Alerta 4": {
    label: "Campainha restaurante",
    hint: "Normalizado para a campainha padrao de restaurante."
  },
  "Alerta 5": {
    label: "Campainha restaurante",
    hint: "Normalizado para a campainha padrao de restaurante."
  },
  "Alerta 6": {
    label: "Campainha restaurante",
    hint: "Normalizado para a campainha padrao de restaurante."
  },
  "Alerta 7": {
    label: "Campainha restaurante",
    hint: "Normalizado para a campainha padrao de restaurante."
  },
  "Alerta 8": {
    label: "Campainha restaurante",
    hint: "Normalizado para a campainha padrao de restaurante."
  }
};

export const DEFAULT_ALERT_AUDIO_SETTINGS: AlertAudioSettings = {
  enabled: true,
  volume: 1,
  gainBoost: 1.5,
  repeatIfPending: true,
  repeatIntervalMs: 0,
  soundProfile: "max_restaurant",
  alertTone: RESTAURANT_BELL_TONE
};

type WebKitAudioWindow = Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext };

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeSettings(input: Partial<AlertAudioSettings> = {}): AlertAudioSettings {
  const profile = ALERT_SOUND_PROFILES[input.soundProfile ?? DEFAULT_ALERT_AUDIO_SETTINGS.soundProfile];
  return {
    enabled: input.enabled ?? DEFAULT_ALERT_AUDIO_SETTINGS.enabled,
    volume: clamp(input.volume ?? profile.volume, 0, 1),
    gainBoost: clamp(input.gainBoost ?? profile.gainBoost, 0.1, 3),
    repeatIfPending: true,
    repeatIntervalMs: 0,
    soundProfile: input.soundProfile ?? DEFAULT_ALERT_AUDIO_SETTINGS.soundProfile,
    alertTone: RESTAURANT_BELL_TONE
  };
}

function readJsonSettings() {
  if (typeof window === "undefined") return DEFAULT_ALERT_AUDIO_SETTINGS;
  try {
    const stored = window.localStorage.getItem(SETTINGS_KEY);
    if (!stored) return DEFAULT_ALERT_AUDIO_SETTINGS;
    return normalizeSettings(JSON.parse(stored) as Partial<AlertAudioSettings>);
  } catch {
    return DEFAULT_ALERT_AUDIO_SETTINGS;
  }
}

class AlertAudioEngine {
  private audioContext: AudioContext | null = null;
  private settings = DEFAULT_ALERT_AUDIO_SETTINGS;
  private unlocked = false;
  private lastError: string | null = null;
  private lastEvent: string | null = null;
  private repeatTimer: number | null = null;
  private activeOscillators: Array<OscillatorNode> = [];
  private playLockUntil = 0;

  constructor() {
    if (typeof window !== "undefined") {
      this.settings = readJsonSettings();
      this.unlocked = window.localStorage.getItem(UNLOCKED_KEY) === "true";
    }
  }

  getSettings() {
    return this.settings;
  }

  getState(): AlertAudioState {
    return {
      unlocked: this.unlocked,
      contextState: this.audioContext?.state ?? "unavailable",
      lastError: this.lastError,
      lastEvent: this.lastEvent
    };
  }

  setSettings(settings: Partial<AlertAudioSettings>) {
    this.settings = normalizeSettings({ ...this.settings, ...settings });
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
      window.dispatchEvent(new CustomEvent(SETTINGS_EVENT, { detail: this.settings }));
    }
    this.log("settings_updated");
  }

  subscribe(listener: () => void) {
    if (typeof window === "undefined") return () => {};
    const handler = () => listener();
    window.addEventListener(SETTINGS_EVENT, handler);
    return () => window.removeEventListener(SETTINGS_EVENT, handler);
  }

  async unlock() {
    if (typeof window === "undefined") return false;
    await this.ensureAudioContext();
    await this.ensureContextRunning();
    this.unlocked = true;
    window.localStorage.setItem(UNLOCKED_KEY, "true");
    this.log("audio_unlocked");
    return true;
  }

  async resume() {
    await this.ensureContextRunning();
  }

  async playTestSound() {
    return this.play("test");
  }

  async playNewOrderSound() {
    return this.play("new_order");
  }

  startRepeating() {
    this.stopRepeating(false);
    if (!this.settings.enabled || !this.settings.repeatIfPending) return;
    void this.playNewOrderSound();
    this.repeatTimer = window.setInterval(() => {
      void this.playNewOrderSound();
    }, RESTAURANT_BELL_DURATION_MS);
    this.log("repeat_started");
  }

  stopRepeating(stopCurrentSound = true) {
    if (this.repeatTimer) {
      window.clearInterval(this.repeatTimer);
      this.repeatTimer = null;
      this.log("repeat_stopped");
    }
    if (stopCurrentSound) this.stopActiveOscillators();
  }

  private async play(reason: "test" | "new_order") {
    if (!this.settings.enabled) return false;
    if (typeof window === "undefined") return false;

    const now = Date.now();
    if (now < this.playLockUntil) return false;
    this.playLockUntil = now + RESTAURANT_BELL_DURATION_MS;

    try {
      await this.ensureAudioContext();
      await this.ensureContextRunning();
      if (this.audioContext && this.audioContext.state === "running") {
        this.stopActiveOscillators();
        this.playRestaurantBell(this.audioContext);
        this.unlocked = true;
        window.localStorage.setItem(UNLOCKED_KEY, "true");
        this.lastError = null;
        this.log("audio_play_success");
        return true;
      }
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : "Falha no Web Audio API.";
      this.log("audio_play_failure");
    }

    return this.playFallbackBell(reason);
  }

  private async ensureAudioContext() {
    if (this.audioContext) return;
    const Ctor = window.AudioContext || (window as WebKitAudioWindow).webkitAudioContext;
    if (!Ctor) {
      this.lastError = "Web Audio API indisponivel.";
      return;
    }
    this.audioContext = new Ctor();
  }

  private async ensureContextRunning() {
    if (!this.audioContext) return;
    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
      this.log("audio_context_resumed");
    }
  }

  private playRestaurantBell(ctx: AudioContext) {
    const now = ctx.currentTime + 0.01;
    const masterLoudness = clamp(this.settings.volume * this.settings.gainBoost, 0.0001, 2.4);

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 8;
    compressor.ratio.value = 6;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.12;
    compressor.connect(ctx.destination);

    for (const step of RESTAURANT_BELL_RECIPE) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = step.type;
      osc.frequency.value = step.freq;

      const loudness = masterLoudness * step.gainPeak;
      const startAt = now + step.startTime;
      const endAt = startAt + step.duration;

      gain.gain.setValueAtTime(0, startAt);
      gain.gain.linearRampToValueAtTime(loudness, startAt + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, endAt);

      osc.connect(gain);
      gain.connect(compressor);
      osc.start(startAt);
      osc.stop(endAt + 0.05);

      osc.onended = () => {
        try { osc.disconnect(); } catch { /* already disconnected */ }
        try { gain.disconnect(); } catch { /* already disconnected */ }
      };

      this.activeOscillators.push(osc);
    }

    window.setTimeout(() => {
      try { compressor.disconnect(); } catch { /* already disconnected */ }
    }, RESTAURANT_BELL_DURATION_MS);
  }

  private playFallbackBell(reason: "test" | "new_order") {
    try {
      const Ctor = window.AudioContext || (window as WebKitAudioWindow).webkitAudioContext;
      if (!Ctor) throw new Error("Web Audio API indisponivel.");
      const ctx = new Ctor();
      this.playRestaurantBell(ctx);
      window.setTimeout(() => void ctx.close(), RESTAURANT_BELL_DURATION_MS + 100);
      this.unlocked = true;
      window.localStorage.setItem(UNLOCKED_KEY, "true");
      this.lastError = null;
      this.log("audio_play_success");
      return true;
    } catch (error) {
      this.lastError =
        error instanceof Error
          ? error.message
          : reason === "test"
            ? "Clique novamente em Ativar som para liberar o audio do navegador."
            : "Navegador bloqueou o audio. Use o botao Ativar som.";
      this.log("audio_play_failure");
      return false;
    }
  }

  private stopActiveOscillators() {
    for (const osc of this.activeOscillators) {
      try { osc.stop(); } catch { /* already stopped */ }
      try { osc.disconnect(); } catch { /* already disconnected */ }
    }
    this.activeOscillators = [];
    this.playLockUntil = 0;
  }

  private log(event: string) {
    this.lastEvent = event;
    if (process.env.NODE_ENV !== "production") {
      console.info(`[alert-audio] ${event}`);
    }
  }
}

export const alertAudio = new AlertAudioEngine();
export const alertAudioStorageKeys = {
  settings: SETTINGS_KEY,
  event: SETTINGS_EVENT,
  unlocked: UNLOCKED_KEY
};
