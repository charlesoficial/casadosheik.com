"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useAlertAudio } from "@/hooks/use-alert-audio";
import { useAdminSoundPreference } from "@/features/orders/hooks/use-order-sound";
import { getSupabaseBrowserClient } from "@/lib/realtime/client";
import type { AdminOrder, OrderSettingsRecord } from "@/lib/types";

export function AdminOrderAlerts() {
  const { soundEnabled } = useAdminSoundPreference();
  const [settings, setSettings] = useState<OrderSettingsRecord | null>(null);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const refreshInFlightRef = useRef(false);
  const isEnabled = useMemo(() => Boolean(settings?.notificationsEnabled) && soundEnabled, [settings, soundEnabled]);
  const audioSettings = useMemo(
    () =>
      settings
        ? {
            enabled: isEnabled,
            volume: Math.max(1, settings.alertVolume) / 100,
            repeatIfPending: true,
            repeatIntervalMs: 0,
            alertTone: "Alerta 1" as const
          }
        : undefined,
    [isEnabled, settings?.alertVolume]
  );

  async function refreshOrders() {
    if (refreshInFlightRef.current) return;
    refreshInFlightRef.current = true;
    try {
      const response = await fetch("/api/admin/orders", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as AdminOrder[];
      setOrders(data);
    } catch {
      // evita ruido quando o servidor local reinicia
    } finally {
      refreshInFlightRef.current = false;
    }
  }

  async function refreshSettings() {
    try {
      const response = await fetch("/api/admin/order-settings", { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      setSettings(data.settings as OrderSettingsRecord);
    } catch {
      // sem ruido visual; o board segue operando
    }
  }

  useEffect(() => {
    void refreshOrders();
    void refreshSettings();

    // O realtime cobre a maior parte dos eventos. O polling entra apenas como
    // fallback de resiliencia para quedas temporarias do canal.
    const interval = window.setInterval(() => {
      void refreshOrders();
    }, 15000);

    const settingsInterval = window.setInterval(() => {
      void refreshSettings();
    }, 15000);

    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      ?.channel("global-admin-orders")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "pedidos" }, async () => {
        await refreshOrders();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "pedidos" }, async () => {
        await refreshOrders();
      })
      .subscribe();

    return () => {
      window.clearInterval(interval);
      window.clearInterval(settingsInterval);
      if (channel && supabase) supabase.removeChannel(channel);
    };
  }, []);

  const { state, playTestSound } = useAlertAudio({
    orders,
    enabled: isEnabled,
    settings: audioSettings
  });

  const needsAudioActivation = isEnabled && (!state.unlocked || state.lastError);

  if (!needsAudioActivation) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-ds-lg border border-status-warning-border bg-status-warning-bg p-4 text-sm text-status-warning-text shadow-soft">
      <p className="font-semibold">Som de pedidos bloqueado pelo navegador</p>
      <p className="mt-1 leading-5">Clique para ativar a campainha de restaurante nos proximos pedidos.</p>
      <button
        type="button"
        onClick={() => void playTestSound()}
        className="mt-3 rounded-ds-md border border-status-warning-border bg-admin-surface px-3 py-2 text-xs font-semibold text-admin-fg hover:bg-admin-elevated"
      >
        Ativar som
      </button>
    </div>
  );
}
