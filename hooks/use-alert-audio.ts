"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  alertAudio,
  type AlertAudioSettings,
  type AlertAudioState,
  DEFAULT_ALERT_AUDIO_SETTINGS
} from "@/lib/audio/alert-audio";
import type { AdminOrder } from "@/lib/types";

type UseAlertAudioOptions = {
  orders: AdminOrder[];
  enabled?: boolean;
  settings?: Partial<AlertAudioSettings>;
};

const INITIAL_ALERT_AUDIO_STATE: AlertAudioState = {
  unlocked: false,
  contextState: "unavailable",
  lastError: null,
  lastEvent: null
};

export function useAlertAudio({ orders, enabled = true, settings }: UseAlertAudioOptions) {
  const [audioSettings, setAudioSettings] = useState<AlertAudioSettings>(DEFAULT_ALERT_AUDIO_SETTINGS);
  const [audioState, setAudioState] = useState<AlertAudioState>(INITIAL_ALERT_AUDIO_STATE);
  const initializedRef = useRef(false);
  const previousOrdersRef = useRef<AdminOrder[]>([]);
  const alertedOrderIdsRef = useRef<Set<string>>(new Set());

  const pendingOrderIds = useMemo(
    () => orders.filter((order) => order.status === "novo").map((order) => order.id),
    [orders]
  );

  useEffect(() => {
    if (settings) {
      alertAudio.setSettings(settings);
      setAudioSettings(alertAudio.getSettings());
      setAudioState(alertAudio.getState());
    }
  }, [settings]);

  useEffect(() => {
    setAudioSettings(alertAudio.getSettings());
    setAudioState(alertAudio.getState());

    const unsubscribe = alertAudio.subscribe(() => {
      setAudioSettings(alertAudio.getSettings());
      setAudioState(alertAudio.getState());
    });

    function unlock() {
      void alertAudio.unlock().finally(() => setAudioState(alertAudio.getState()));
    }

    function resumeOnVisibility() {
      if (document.visibilityState === "visible") {
        void alertAudio.resume().finally(() => setAudioState(alertAudio.getState()));
      }
    }

    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    window.addEventListener("touchstart", unlock, { once: true });
    window.addEventListener("focus", unlock);
    document.addEventListener("visibilitychange", resumeOnVisibility);

    return () => {
      unsubscribe();
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
      window.removeEventListener("focus", unlock);
      document.removeEventListener("visibilitychange", resumeOnVisibility);
    };
  }, []);

  useEffect(() => {
    const activePending = new Set(pendingOrderIds);
    alertedOrderIdsRef.current = new Set([...alertedOrderIdsRef.current].filter((id) => activePending.has(id)));

    if (!initializedRef.current) {
      initializedRef.current = true;
      previousOrdersRef.current = orders;
      return;
    }

    const previousById = new Map(previousOrdersRef.current.map((order) => [order.id, order]));
    const newPendingOrders = orders.filter((order) => {
      if (order.status !== "novo") return false;
      if (alertedOrderIdsRef.current.has(order.id)) return false;
      const previous = previousById.get(order.id);
      return !previous || previous.status !== "novo";
    });

    if (enabled && audioSettings.enabled && newPendingOrders.length > 0) {
      for (const order of newPendingOrders) {
        alertedOrderIdsRef.current.add(order.id);
      }
      void alertAudio.playNewOrderSound().finally(() => setAudioState(alertAudio.getState()));
    }

    previousOrdersRef.current = orders;
  }, [audioSettings.enabled, enabled, orders, pendingOrderIds]);

  useEffect(() => {
    if (enabled && audioSettings.enabled && audioSettings.repeatIfPending && pendingOrderIds.length > 0) {
      alertAudio.startRepeating();
    } else {
      alertAudio.stopRepeating();
    }

    return () => alertAudio.stopRepeating();
  }, [audioSettings.enabled, audioSettings.repeatIfPending, audioSettings.repeatIntervalMs, enabled, pendingOrderIds.length]);

  function updateSettings(next: Partial<AlertAudioSettings>) {
    alertAudio.setSettings(next);
    setAudioSettings(alertAudio.getSettings());
    setAudioState(alertAudio.getState());
  }

  async function playTestSound() {
    await alertAudio.unlock();
    await alertAudio.playTestSound();
    setAudioState(alertAudio.getState());
  }

  return {
    settings: audioSettings,
    state: audioState,
    pendingOrderIds,
    updateSettings,
    playTestSound,
    resetToMaxRestaurant: () => updateSettings(DEFAULT_ALERT_AUDIO_SETTINGS)
  };
}
