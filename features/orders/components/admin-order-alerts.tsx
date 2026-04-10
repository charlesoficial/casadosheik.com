"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useAdminSoundPreference } from "@/features/orders/hooks/use-order-sound";
import { getSupabaseBrowserClient } from "@/lib/realtime/client";
import type { AdminOrder, OrderSettingsRecord } from "@/lib/types";

function useBeepLoop({
  active,
  enabled,
  frequency,
  volume,
  sound,
  triggerSignal
}: {
  active: boolean;
  enabled: boolean;
  frequency: OrderSettingsRecord["alertFrequency"];
  volume: number;
  sound: OrderSettingsRecord["alertSound"];
  triggerSignal: number;
}) {
  const intervalRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const unlockedRef = useRef(false);
  const playRef = useRef<() => void>(() => {});

  playRef.current = () => {
    if (!enabled || frequency === "none" || !audioContextRef.current || !unlockedRef.current) return;

    const audioContext = audioContextRef.current;
const soundMap: Record<OrderSettingsRecord["alertSound"], number[]> = {
  "Alerta 1": [880, 880, 880],
  "Alerta 2": [720, 960, 720],
  "Alerta 3": [1040, 880, 720],
  "Alerta 4": [920, 920, 1180, 1180],
  "Alerta 5": [640, 760, 640],
  "Alerta 6": [1180, 1320, 1180],
  "Alerta 7": [760, 960, 760, 1120],
  "Alerta 8": [860, 1080, 1280]
};
    const gainValue = Math.max(0.0001, volume / 100);
    let startAt = audioContext.currentTime;

    for (const tone of soundMap[sound]) {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.frequency.value = tone;
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(gainValue * 0.2, startAt + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.3);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(startAt);
      oscillator.stop(startAt + 0.3);
      startAt += 0.45;
    }
  };

  useEffect(() => {
    function unlock() {
      const AudioContextCtor =
        window.AudioContext ||
        (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextCtor) return;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextCtor();
      }
      void audioContextRef.current.resume?.();
      unlockedRef.current = true;
      if (active && enabled) {
        playRef.current();
      }
    }

    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("touchstart", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });

    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("touchstart", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [active, enabled]);

  useEffect(() => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (enabled && frequency === "repeat_while_pending" && active) {
      intervalRef.current = window.setInterval(() => playRef.current(), 1600);
    }

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }
    };
  }, [active, enabled, frequency]);

  useEffect(() => {
    if (!triggerSignal || !enabled || !active || frequency === "none") {
      return;
    }

    playRef.current();
  }, [active, enabled, frequency, triggerSignal]);
}

export function AdminOrderAlerts() {
  const { soundEnabled } = useAdminSoundPreference();
  const [settings, setSettings] = useState<OrderSettingsRecord | null>(null);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [alertOrderIds, setAlertOrderIds] = useState<string[]>([]);
  const [alertSignal, setAlertSignal] = useState(0);
  const initializedRef = useRef(false);
  const previousOrdersRef = useRef<AdminOrder[]>([]);
  const refreshInFlightRef = useRef(false);
  const isEnabled = useMemo(() => Boolean(settings?.notificationsEnabled) && soundEnabled, [settings, soundEnabled]);

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

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      previousOrdersRef.current = orders;
      setAlertOrderIds([]);
      return;
    }

    const previousOrders = previousOrdersRef.current;
    const previousById = new Map(previousOrders.map((order) => [order.id, order]));
    const newlyArrived = orders
      .filter((order) => {
        if (order.status !== "novo") return false;
        const previous = previousById.get(order.id);
        return !previous || previous.status !== "novo";
      })
      .map((order) => order.id);

    setAlertOrderIds((current) => {
      const activeNewIds = new Set(orders.filter((order) => order.status === "novo").map((order) => order.id));
      const next = new Set(current.filter((id) => activeNewIds.has(id)));
      for (const id of newlyArrived) {
        next.add(id);
      }
      return Array.from(next);
    });

    if (newlyArrived.length) {
      setAlertSignal((current) => current + newlyArrived.length);
    }

    previousOrdersRef.current = orders;
  }, [orders]);

  useBeepLoop({
    active: alertOrderIds.length > 0,
    enabled: isEnabled,
    frequency: settings?.alertFrequency ?? "repeat_while_pending",
    volume: settings?.alertVolume ?? 70,
    sound: settings?.alertSound ?? "Alerta 1",
    triggerSignal: alertSignal
  });

  return null;
}
