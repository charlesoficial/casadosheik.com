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

// Uma "nota" dentro de um toque sintetizado.
type ToneStep = {
  freq: number;          // Hz
  type: OscillatorType;
  startTime: number;     // segundos a partir do início do toque
  duration: number;      // segundos
  gainPeak: number;      // ganho relativo (0–1)
};

// ── 8 toques sintetizados para restaurante de balcão ──────────────────────────
//
// Projetados para cortar ruído de salão, serem reconhecíveis e não irritativos.
// Cada receita é composta por osciladores com envelope ADSR simplificado.
//
const TONE_RECIPES: Record<AlertTone, ToneStep[]> = {
  // 1 · Sino único — campainha limpa de balcão
  "Alerta 1": [
    { freq: 880, type: "sine", startTime: 0, duration: 0.5, gainPeak: 1 },
  ],

  // 2 · Ding-dong — dois tons descendentes (campainha de entrada)
  "Alerta 2": [
    { freq: 987, type: "sine", startTime: 0,    duration: 0.28, gainPeak: 1   },
    { freq: 783, type: "sine", startTime: 0.32, duration: 0.40, gainPeak: 0.9 },
  ],

  // 3 · Três pings — atenção rápida no pico do serviço
  "Alerta 3": [
    { freq: 880, type: "sine", startTime: 0,    duration: 0.16, gainPeak: 1 },
    { freq: 880, type: "sine", startTime: 0.24, duration: 0.16, gainPeak: 1 },
    { freq: 880, type: "sine", startTime: 0.48, duration: 0.16, gainPeak: 1 },
  ],

  // 4 · Balcão (oitava) — sino grave + agudo simultâneos, encorpado
  "Alerta 4": [
    { freq: 587,  type: "sine", startTime: 0, duration: 0.45, gainPeak: 0.8 },
    { freq: 1174, type: "sine", startTime: 0, duration: 0.40, gainPeak: 0.65 },
  ],

  // 5 · Chime suave — discreto para ambientes com som ambiente alto
  "Alerta 5": [
    { freq: 659, type: "sine", startTime: 0, duration: 0.75, gainPeak: 0.7 },
  ],

  // 6 · Duplo agudo — dois pings de alta frequência, corta qualquer ruído
  "Alerta 6": [
    { freq: 1047, type: "triangle", startTime: 0,    duration: 0.14, gainPeak: 0.9 },
    { freq: 1047, type: "triangle", startTime: 0.22, duration: 0.14, gainPeak: 0.9 },
  ],

  // 7 · Chamada rítmica — padrão grave-agudo-grave, prende a atenção
  "Alerta 7": [
    { freq: 880, type: "sine", startTime: 0,    duration: 0.20, gainPeak: 1   },
    { freq: 660, type: "sine", startTime: 0.26, duration: 0.16, gainPeak: 0.8 },
    { freq: 880, type: "sine", startTime: 0.48, duration: 0.26, gainPeak: 1   },
  ],

  // 8 · Fanfarra — sequência ascendente de quatro notas, inconfundível
  "Alerta 8": [
    { freq: 523,  type: "sine", startTime: 0,    duration: 0.16, gainPeak: 0.8  },
    { freq: 659,  type: "sine", startTime: 0.20, duration: 0.16, gainPeak: 0.85 },
    { freq: 784,  type: "sine", startTime: 0.40, duration: 0.16, gainPeak: 0.9  },
    { freq: 1047, type: "sine", startTime: 0.60, duration: 0.28, gainPeak: 1    },
  ],
};

export const ALERT_SOUND_PROFILES: Record<
  AlertSoundProfile,
  { label: string; volume: number; gainBoost: number; repeatIfPending: boolean; repeatIntervalMs: number }
> = {
  soft: {
    label: "Suave",
    volume: 0.65,
    gainBoost: 1,
    repeatIfPending: false,
    repeatIntervalMs: 10000
  },
  normal: {
    label: "Normal",
    volume: 0.85,
    gainBoost: 1,
    repeatIfPending: true,
    repeatIntervalMs: 10000
  },
  loud: {
    label: "Alto",
    volume: 1,
    gainBoost: 1.2,
    repeatIfPending: true,
    repeatIntervalMs: 8000
  },
  max_restaurant: {
    label: "Maximo restaurante",
    volume: 1,
    gainBoost: 1.5,
    repeatIfPending: true,
    repeatIntervalMs: 8000
  }
};

export const ALERT_TONES: Record<AlertTone, { label: string; hint: string }> = {
  "Alerta 1": {
    label: "Sino único",
    hint: "Campainha limpa de balcão — direta e reconhecível.",
  },
  "Alerta 2": {
    label: "Ding-dong",
    hint: "Dois tons descendentes, estilo campainha de entrada.",
  },
  "Alerta 3": {
    label: "Três pings",
    hint: "Três toques rápidos para chamar atenção no pico do serviço.",
  },
  "Alerta 4": {
    label: "Balcão oitava",
    hint: "Sino grave e agudo juntos — encorpado e limpo.",
  },
  "Alerta 5": {
    label: "Chime suave",
    hint: "Tom discreto, ideal para ambientes com som ambiente alto.",
  },
  "Alerta 6": {
    label: "Duplo agudo",
    hint: "Dois pings de alta frequência — corta qualquer ruído de salão.",
  },
  "Alerta 7": {
    label: "Chamada rítmica",
    hint: "Padrão grave-agudo-grave que prende a atenção sem irritar.",
  },
  "Alerta 8": {
    label: "Fanfarra",
    hint: "Sequência ascendente de quatro notas — inconfundível.",
  },
};

export const DEFAULT_ALERT_AUDIO_SETTINGS: AlertAudioSettings = {
  enabled: true,
  volume: 1,
  gainBoost: 1.5,
  repeatIfPending: true,
  repeatIntervalMs: 8000,
  soundProfile: "max_restaurant",
  alertTone: "Alerta 8"
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
    repeatIfPending: input.repeatIfPending ?? profile.repeatIfPending,
    repeatIntervalMs: clamp(input.repeatIntervalMs ?? profile.repeatIntervalMs, 0, 60000),
    soundProfile: input.soundProfile ?? DEFAULT_ALERT_AUDIO_SETTINGS.soundProfile,
    alertTone: input.alertTone && ALERT_TONES[input.alertTone] ? input.alertTone : DEFAULT_ALERT_AUDIO_SETTINGS.alertTone
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
    this.stopRepeating();
    if (!this.settings.enabled || !this.settings.repeatIfPending) return;
    // 0 = sem pausa: usa 100 ms de polling; o playLockUntil (650 ms) garante que o
    // som não se sobreponha — repete logo após a trava expirar (~650 ms de ciclo).
    const intervalMs = this.settings.repeatIntervalMs === 0 ? 100 : this.settings.repeatIntervalMs;
    this.repeatTimer = window.setInterval(() => {
      void this.playNewOrderSound();
    }, intervalMs);
    this.log("repeat_started");
  }

  stopRepeating() {
    if (this.repeatTimer) {
      window.clearInterval(this.repeatTimer);
      this.repeatTimer = null;
      this.log("repeat_stopped");
    }
  }

  private async play(reason: "test" | "new_order") {
    if (!this.settings.enabled) return false;
    if (typeof window === "undefined") return false;

    const now = Date.now();
    if (now < this.playLockUntil) return false;
    this.playLockUntil = now + 650;

    try {
      await this.ensureAudioContext();
      await this.ensureContextRunning();
      if (this.audioContext && this.audioContext.state === "running") {
        this.stopActiveOscillators();
        this.playToneRecipe(this.audioContext);
        this.unlocked = true;
        window.localStorage.setItem(UNLOCKED_KEY, "true");
        this.log("audio_play_success");
        return true;
      }
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : "Falha no Web Audio API.";
      this.log("audio_play_failure");
    }

    return this.playFallbackBeep(reason);
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

  private playToneRecipe(ctx: AudioContext) {
    const now = ctx.currentTime + 0.01;
    const recipe = TONE_RECIPES[this.settings.alertTone];
    const masterLoudness = clamp(this.settings.volume * this.settings.gainBoost, 0.0001, 2.4);

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 8;
    compressor.ratio.value = 6;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.12;
    compressor.connect(ctx.destination);

    for (const step of recipe) {
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
        try { osc.disconnect(); } catch { /* já desconectado */ }
        try { gain.disconnect(); } catch { /* já desconectado */ }
      };

      this.activeOscillators.push(osc);
    }

    // Desconecta o compressor após todos os osciladores terminarem
    const maxDuration = Math.max(...recipe.map((s) => s.startTime + s.duration)) + 0.15;
    window.setTimeout(() => {
      try { compressor.disconnect(); } catch { /* já desconectado */ }
    }, maxDuration * 1000);
  }

  // Cria um contexto temporário quando o contexto principal ainda está bloqueado
  private playFallbackBeep(reason: "test" | "new_order") {
    try {
      const Ctor = window.AudioContext || (window as WebKitAudioWindow).webkitAudioContext;
      if (!Ctor) throw new Error("Web Audio API indisponivel.");
      const ctx = new Ctor();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(this.settings.volume * this.settings.gainBoost, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
      osc.onended = () => void ctx.close();
      this.unlocked = true;
      window.localStorage.setItem(UNLOCKED_KEY, "true");
      this.log("audio_play_success");
      return true;
    } catch (error) {
      this.lastError =
        error instanceof Error
          ? error.message
          : reason === "test"
            ? "Clique novamente para liberar o som do navegador."
            : "Navegador bloqueou o audio. Use o botao de teste de som.";
      this.log("audio_play_failure");
      return false;
    }
  }

  private stopActiveOscillators() {
    for (const osc of this.activeOscillators) {
      try { osc.stop(); } catch { /* oscilador já encerrado */ }
      try { osc.disconnect(); } catch { /* desconexão defensiva */ }
    }
    this.activeOscillators = [];
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
