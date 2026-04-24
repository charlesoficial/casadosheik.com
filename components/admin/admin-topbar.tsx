"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleDot, Contrast, Plus, Volume2, VolumeX } from "lucide-react";

import { LogoutButton } from "@/components/admin/logout-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAdminSoundPreference } from "@/features/orders/hooks/use-order-sound";
import { adminThemeMeta, adminThemes, type AdminTheme } from "@/lib/constants/admin-themes";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

// A topbar concentra controles globais do operador:
// tema, som e acesso rapido ao fluxo de pedidos.
function getThemeStyles() {
  return {
    neutralButtonClass:
      "border-[var(--admin-control-border)] bg-[var(--admin-control-bg)] text-[var(--admin-control-fg)] hover:bg-[var(--admin-control-hover-bg)]",
  };
}

export function AdminTopbar() {
  const router = useRouter();
  const { soundEnabled, toggleSound } = useAdminSoundPreference();
  const [theme, setTheme] = useState<AdminTheme>("black");
  const [themeReady, setThemeReady] = useState(false);
  const styles = getThemeStyles();

  async function persistTheme(nextTheme: AdminTheme) {
    try {
      await getSupabaseBrowserClient().auth.updateUser({ data: { admin_theme: nextTheme } });
    } catch {
      // O tema continua aplicado localmente; se a sincronizacao remota falhar,
      // o operador nao perde a interacao atual.
    }
  }

  useEffect(() => {
    // O tema e persistido localmente para cada operador continuar de onde parou.
    // Sem localStorage, respeita o tema renderizado no servidor pelo perfil.
    const storedTheme = window.localStorage.getItem("admin-theme");
    if (storedTheme && adminThemes.includes(storedTheme as AdminTheme)) {
      setTheme(storedTheme as AdminTheme);
    } else if (document.querySelector(".admin-shell")?.classList.contains("admin-theme-light")) {
      setTheme("light");
    }
    setThemeReady(true);
  }, []);

  useEffect(() => {
    if (!themeReady) return;
    const shell = document.querySelector(".admin-shell");
    if (!shell) return;
    shell.classList.remove("admin-theme-light", "admin-theme-black");
    shell.classList.add(`admin-theme-${theme}`);
    window.localStorage.setItem("admin-theme", theme);
  }, [theme, themeReady]);

  function cycleTheme() {
    setTheme((current) => {
      const currentIndex = adminThemes.indexOf(current);
      const nextTheme = adminThemes[(currentIndex + 1) % adminThemes.length];
      void persistTheme(nextTheme);
      return nextTheme;
    });
  }

  return (
    <div className="admin-topbar flex flex-wrap items-center justify-end gap-3 border-b border-[var(--admin-topbar-border)] px-6 py-3 2xl:py-5">
      <div className="flex items-center gap-2 xl:gap-3">
        <Badge
          variant="admin"
          className="admin-online-badge gap-2 rounded-full border-status-success-border bg-status-success-bg text-status-success-fg"
        >
          <CircleDot className="h-3.5 w-3.5 fill-current" />
          Online
        </Badge>

        <Button variant="outline" className={styles.neutralButtonClass} onClick={toggleSound}>
          {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          <span className="hidden 2xl:inline">
            {soundEnabled ? "Som ativo" : "Som desligado"}
          </span>
        </Button>

        <Button
          variant="outline"
          className={styles.neutralButtonClass}
          onClick={cycleTheme}
          title={`Tema atual: ${adminThemeMeta[theme].label}`}
        >
          <Contrast className="h-4 w-4" />
          <span className="hidden 2xl:inline">{adminThemeMeta[theme].label}</span>
        </Button>

        <Button variant="admin" onClick={() => router.push("/admin/pedidos")}>
          <Plus className="h-4 w-4" />
          Novo Pedido
        </Button>

        <LogoutButton />
      </div>
    </div>
  );
}
