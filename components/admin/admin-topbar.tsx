"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleDot, Contrast, Plus, Volume2, VolumeX } from "lucide-react";

import { LogoutButton } from "@/components/admin/logout-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAdminSoundPreference } from "@/features/orders/hooks/use-order-sound";
import { adminThemeMeta, adminThemes, type AdminTheme } from "@/lib/constants/admin-themes";

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
  const styles = getThemeStyles();

  useEffect(() => {
    // O tema e persistido localmente para cada operador continuar de onde parou.
    const storedTheme = window.localStorage.getItem("admin-theme");
    if (storedTheme && adminThemes.includes(storedTheme as AdminTheme)) {
      setTheme(storedTheme as AdminTheme);
    }
  }, []);

  useEffect(() => {
    const shell = document.querySelector(".admin-shell");
    if (!shell) return;
    shell.classList.remove(
      "admin-theme-dark",
      "admin-theme-light",
      "admin-theme-black",
      "admin-theme-graphite",
      "admin-theme-sand"
    );
    shell.classList.add(`admin-theme-${theme}`);
    window.localStorage.setItem("admin-theme", theme);
  }, [theme]);

  function cycleTheme() {
    setTheme((current) => {
      const currentIndex = adminThemes.indexOf(current);
      return adminThemes[(currentIndex + 1) % adminThemes.length];
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
