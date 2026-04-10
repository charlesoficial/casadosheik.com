"use client";

import { useEffect, useState } from "react";

const ADMIN_SOUND_STORAGE_KEY = "admin-sound-enabled";
const ADMIN_SOUND_EVENT = "admin-sound-setting";

function readAdminSoundEnabled() {
  if (typeof window === "undefined") return true;
  const stored = window.localStorage.getItem(ADMIN_SOUND_STORAGE_KEY);
  return stored === null ? true : stored === "true";
}

export function setAdminSoundEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ADMIN_SOUND_STORAGE_KEY, String(enabled));
  window.dispatchEvent(new CustomEvent(ADMIN_SOUND_EVENT, { detail: enabled }));
}

export function useAdminSoundPreference() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    setEnabled(readAdminSoundEnabled());

    function syncFromStorage() {
      setEnabled(readAdminSoundEnabled());
    }

    function syncFromEvent(event: Event) {
      const customEvent = event as CustomEvent<boolean>;
      if (typeof customEvent.detail === "boolean") {
        setEnabled(customEvent.detail);
        return;
      }
      setEnabled(readAdminSoundEnabled());
    }

    window.addEventListener("storage", syncFromStorage);
    window.addEventListener(ADMIN_SOUND_EVENT, syncFromEvent as EventListener);

    return () => {
      window.removeEventListener("storage", syncFromStorage);
      window.removeEventListener(ADMIN_SOUND_EVENT, syncFromEvent as EventListener);
    };
  }, []);

  return {
    soundEnabled: enabled,
    setSoundEnabled: (next: boolean) => setAdminSoundEnabled(next),
    toggleSound: () => setAdminSoundEnabled(!enabled)
  };
}
