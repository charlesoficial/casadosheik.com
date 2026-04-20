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
            repeatIfPending: settings.alertFrequency !== "once_per_order" && settings.alertFrequency !== "none",
            alertTone: settings.alertSound
          }
        : undefined,
    [isEnabled, settings?.alertFrequency, settings?.alertSound, settings?.alertVolume]
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

  useAlertAudio({
    orders,
    enabled: isEnabled,
    settings: audioSettings
  });

  return null;
}
