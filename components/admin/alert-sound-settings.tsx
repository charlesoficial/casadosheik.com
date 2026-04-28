"use client";

import { useState } from "react";
import { BellRing, RotateCcw, Volume2, VolumeX } from "lucide-react";

import { DSBadge, DSButton, DSCard } from "@/components/system";
import { ALERT_SOUND_PROFILES, ALERT_TONES } from "@/lib/audio/alert-audio";
import { setAdminSoundEnabled } from "@/lib/admin-sound";
import { useAlertAudio } from "@/hooks/use-alert-audio";

const restaurantProfileIds = ["max_restaurant"] as const;
const restaurantToneIds = ["Alerta 1"] as const;

export function AlertSoundSettings() {
  const { settings, state, updateSettings, playTestSound, resetToMaxRestaurant } = useAlertAudio({ orders: [] });
  const [testing, setTesting] = useState(false);
  const profile = ALERT_SOUND_PROFILES[settings.soundProfile];
  const selectedTone = ALERT_TONES[settings.alertTone];

  async function handleTestSound() {
    setTesting(true);
    try {
      await playTestSound();
    } finally {
      setTesting(false);
    }
  }

  return (
    <DSCard variant="admin-panel" className="overflow-hidden shadow-soft">
      <div className="grid gap-4 border-b border-admin-border bg-admin-surface p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-ds-lg border border-admin-border-strong bg-admin-elevated text-brand-gold">
            <BellRing className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-admin-fg-faint">
              Motor de audio
            </p>
            <h2 className="mt-2 text-lg font-semibold text-admin-fg">Campainha de restaurante</h2>
            <p className="mt-2 text-sm leading-6 text-admin-fg-muted">
              Toque bell global, desbloqueio do navegador e repeticao sem intervalo artificial.
            </p>
          </div>
        </div>

        <DSButton type="button" variant="secondary" size="sm" onClick={handleTestSound} disabled={testing}>
          <Volume2 className="h-4 w-4" />
          {testing ? "Tocando..." : "Testar som"}
        </DSButton>
      </div>

      <div className="grid gap-4 p-5">
        <label className="flex items-start justify-between gap-4 rounded-ds-lg border border-admin-border bg-admin-elevated px-4 py-4 text-sm">
          <span>
            <span className="block font-semibold text-admin-fg">Habilitar alertas sonoros</span>
            <span className="mt-1 block text-xs leading-5 text-admin-fg-muted">
              O operador precisa interagir com a pagina para liberar audio do navegador.
            </span>
          </span>
          <span
            aria-hidden="true"
            className={[
              "relative mt-0.5 flex h-6 w-11 shrink-0 items-center rounded-full border p-0.5 transition-all duration-motion-fast",
              settings.enabled
                ? "border-brand-purple bg-brand-purple shadow-soft"
                : "border-admin-border-strong bg-admin-surface"
            ].join(" ")}
          >
            <span
              className={[
                "h-5 w-5 rounded-full bg-admin-fg transition-transform duration-motion-fast",
                settings.enabled ? "translate-x-5" : "translate-x-0"
              ].join(" ")}
            />
          </span>
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(event) => {
              updateSettings({ enabled: event.target.checked });
              setAdminSoundEnabled(event.target.checked);
            }}
            className="sr-only"
          />
        </label>

        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-ds-xl border border-admin-border bg-admin-elevated p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-admin-fg">Perfil sonoro</p>
                <p className="mt-1 text-xs text-admin-fg-muted">Preset fixo para campainha global de pedidos.</p>
              </div>
              <DSBadge variant="admin">{profile.label}</DSBadge>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {restaurantProfileIds.map((profileId) => (
                <button
                  key={profileId}
                  type="button"
                  onClick={() => {
                    const next = ALERT_SOUND_PROFILES[profileId];
                    updateSettings({
                      soundProfile: profileId,
                      volume: next.volume,
                      gainBoost: next.gainBoost,
                      repeatIfPending: next.repeatIfPending,
                      repeatIntervalMs: next.repeatIntervalMs
                    });
                  }}
                  className={[
                    "rounded-ds-md border px-3 py-2 text-left text-xs font-medium transition-colors duration-motion-fast",
                    settings.soundProfile === profileId
                      ? "border-brand-purple bg-brand-purple-bg text-status-new-fg ring-1 ring-brand-purple/20"
                      : "border-admin-border bg-admin-surface text-admin-fg-muted hover:border-admin-border-strong hover:text-admin-fg-secondary"
                  ].join(" ")}
                >
                  {ALERT_SOUND_PROFILES[profileId].label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-ds-xl border border-admin-border bg-admin-elevated p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-admin-fg">Estado do navegador</p>
              <DSBadge variant={state.unlocked ? "success" : "warning"}>
                {state.unlocked ? "Audio liberado" : "Aguardando clique"}
              </DSBadge>
            </div>
            <div className="grid gap-2 text-xs leading-5 text-admin-fg-muted">
              <p>Contexto: {state.contextState}</p>
              {state.lastError ? <p className="text-status-danger-fg">Ultima falha: {state.lastError}</p> : null}
              <p>
                {settings.enabled ? <Volume2 className="mr-1 inline h-3.5 w-3.5" /> : <VolumeX className="mr-1 inline h-3.5 w-3.5" />}
                O teste tambem desbloqueia o audio para novos pedidos.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-ds-xl border border-admin-border bg-admin-elevated p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-admin-fg">Toque do alerta</p>
              <p className="mt-1 text-xs text-admin-fg-muted">{selectedTone.hint}</p>
            </div>
            <DSBadge variant="secondary">{selectedTone.label}</DSBadge>
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {restaurantToneIds.map((toneId) => (
              <button
                key={toneId}
                type="button"
                onClick={() => updateSettings({ alertTone: toneId })}
                className={[
                  "rounded-ds-md border px-3 py-2 text-left text-xs font-medium transition-colors duration-motion-fast",
                  settings.alertTone === toneId
                    ? "border-brand-purple bg-brand-purple-bg text-status-new-fg ring-1 ring-brand-purple/20"
                    : "border-admin-border bg-admin-surface text-admin-fg-muted hover:border-admin-border-strong hover:text-admin-fg-secondary"
                ].join(" ")}
              >
                <span className="block">{toneId}</span>
                <span className="mt-1 block text-[10px] font-normal text-admin-fg-muted">{ALERT_TONES[toneId].label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-ds-xl border border-admin-border bg-admin-elevated p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-admin-fg">Volume</p>
              <DSBadge variant="secondary">{Math.round(settings.volume * 100)}%</DSBadge>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={Math.round(settings.volume * 100)}
              onChange={(event) => updateSettings({ volume: Number(event.target.value) / 100 })}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-gradient-to-r from-admin-border via-admin-border-strong to-brand-purple accent-brand-purple"
            />
          </div>

          <div className="rounded-ds-xl border border-admin-border bg-admin-elevated p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-admin-fg">Ganho extra Web Audio</p>
              <DSBadge variant="secondary">{settings.gainBoost.toFixed(1)}x</DSBadge>
            </div>
            <input
              type="range"
              min={0.5}
              max={2.5}
              step={0.1}
              value={settings.gainBoost}
              onChange={(event) => updateSettings({ gainBoost: Number(event.target.value) })}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-gradient-to-r from-admin-border via-admin-border-strong to-brand-purple accent-brand-purple"
            />
          </div>
        </div>

        <div className="grid gap-4">
          <label className="flex items-start justify-between gap-4 rounded-ds-lg border border-admin-border bg-admin-elevated px-4 py-4 text-sm">
            <span>
              <span className="block font-semibold text-admin-fg">Repetir enquanto houver pendente</span>
              <span className="mt-1 block text-xs leading-5 text-admin-fg-muted">
                O som continua ate o pedido sair de novo. A repeticao usa 0 segundos de intervalo.
              </span>
            </span>
            <span
              aria-hidden="true"
              className={[
                "relative mt-0.5 flex h-6 w-11 shrink-0 items-center rounded-full border p-0.5 transition-all duration-motion-fast",
                settings.repeatIfPending
                  ? "border-brand-purple bg-brand-purple shadow-soft"
                  : "border-admin-border-strong bg-admin-surface"
              ].join(" ")}
            >
              <span
                className={[
                  "h-5 w-5 rounded-full bg-admin-fg transition-transform duration-motion-fast",
                  settings.repeatIfPending ? "translate-x-5" : "translate-x-0"
                ].join(" ")}
              />
            </span>
            <input
              type="checkbox"
              checked
              onChange={() => updateSettings({ repeatIfPending: true, repeatIntervalMs: 0 })}
              className="sr-only"
            />
          </label>
        </div>

        <div className="grid gap-3 rounded-ds-xl border border-status-warning-border bg-status-warning-bg px-4 py-4 text-sm text-status-warning-text xl:grid-cols-[1fr_auto]">
          <div>
            <p className="font-medium text-status-warning-text">Checklist rapido do Windows</p>
            <p className="mt-1 leading-6">
              Volume geral em 100%, navegador em 100%, saida correta e reducao automatica desativada.
            </p>
          </div>
          <DSButton
            type="button"
            variant="outline"
            size="sm"
            className="border-status-warning-border text-status-warning-text hover:bg-status-warning-bg"
            onClick={() => {
              resetToMaxRestaurant();
              setAdminSoundEnabled(true);
            }}
          >
            <RotateCcw className="h-4 w-4" />
            Maximo
          </DSButton>
        </div>
      </div>
    </DSCard>
  );
}
