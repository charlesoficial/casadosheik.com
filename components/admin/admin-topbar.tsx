"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { BellRing, ChevronRight, CircleDot, Contrast, Plus, Volume2, VolumeX } from "lucide-react";

import { useAdminSoundPreference } from "@/features/orders/hooks/use-order-sound";
import { LogoutButton } from "@/components/admin/logout-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { adminThemeMeta, adminThemes, type AdminTheme } from "@/lib/constants/admin-themes";
import type { AdminOrder } from "@/lib/types";

// A topbar concentra controles globais do operador:
// tema, som, alertas em tempo real e acesso rapido ao fluxo de pedidos.
type AlertItem = {
  id: string;
  title: string;
  description: string;
  href: string;
};

const statusLabels: Record<AdminOrder["status"], string> = {
  novo: "novos",
  aceito: "aceitos",
  preparo: "em preparo",
  pronto: "prontos",
  concluido: "concluidos",
  cancelado: "cancelados"
};

function getThemeStyles(theme: AdminTheme) {
  return {
    neutralButtonClass: "border-[var(--admin-control-border)] bg-[var(--admin-control-bg)] text-[var(--admin-control-fg)] hover:bg-[var(--admin-control-hover-bg)]",
    badgeClass: "gap-2 rounded-full border-[var(--admin-control-border)] bg-[var(--admin-control-bg)] text-[var(--admin-control-fg)]",
    counterClass: "bg-[var(--admin-counter-bg)] text-[var(--admin-counter-fg)]",
    panelClass: "border-[var(--admin-panel-border)] bg-[var(--admin-panel-bg)] shadow-[var(--admin-panel-shadow)]",
    headerClass: "border-[var(--admin-panel-header-border)] bg-[var(--admin-panel-header-bg)]",
    smallTextClass: "text-[var(--admin-subtle)]",
    titleClass: "text-[var(--admin-title)]",
    iconWrapClass: "border-[var(--admin-icon-wrap-border)] bg-[var(--admin-icon-wrap-bg)] text-[var(--admin-icon-wrap-fg)]",
    pendingBadgeClass: "shrink-0 border-[var(--admin-counter-bg)] bg-[var(--admin-counter-bg)] px-2.5 py-1 text-[var(--admin-counter-fg)]",
    statusChipClass: "rounded-full border border-[var(--admin-status-chip-border)] bg-[var(--admin-status-chip-bg)] px-3 py-1 text-[var(--admin-status-chip-fg)]",
    loadingCardClass: "border-[var(--admin-loading-border)] bg-[var(--admin-loading-bg)] text-[var(--admin-loading-fg)]",
    alertCardClass: "border-[var(--admin-alert-card-border)] bg-[var(--admin-alert-card-bg)] hover:border-[var(--admin-alert-card-hover-border)] hover:bg-[var(--admin-alert-card-hover-bg)]",
    alertDescriptionClass: "text-[var(--admin-alert-description)]",
    ctaChipClass: "border-[var(--admin-chip-cta-border)] bg-[var(--admin-chip-cta-bg)] text-[var(--admin-chip-cta-fg)]",
    chevronClass: "text-[var(--admin-chevron)]",
    emptyCardClass: "border-[var(--admin-empty-border)] bg-[var(--admin-empty-bg)]",
    footerClass: "border-[var(--admin-footer-border)] bg-[var(--admin-footer-bg)]",
    footerInnerClass: "border-[var(--admin-footer-inner-border)] bg-[var(--admin-footer-inner-bg)]",
    footerTextClass: "text-[var(--admin-footer-fg)]",
    receiptIconClass: "text-[var(--admin-footer-link)]",
    footerLinkClass: "text-[var(--admin-footer-link)] hover:text-[var(--admin-footer-link-hover)]"
  };
}

export function AdminTopbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { soundEnabled, toggleSound } = useAdminSoundPreference();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [alertsError, setAlertsError] = useState<string | null>(null);
  const [theme, setTheme] = useState<AdminTheme>("black");
  const panelRef = useRef<HTMLDivElement | null>(null);
  const alertButtonRef = useRef<HTMLButtonElement | null>(null);
  const [panelPos, setPanelPos] = useState({ top: 0, right: 0 });
  const [mounted, setMounted] = useState(false);
  const styles = getThemeStyles(theme);

  useEffect(() => { setMounted(true); }, []);

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
    shell.classList.remove("admin-theme-dark", "admin-theme-light", "admin-theme-black", "admin-theme-graphite", "admin-theme-sand");
    shell.classList.add(`admin-theme-${theme}`);
    window.localStorage.setItem("admin-theme", theme);
  }, [theme]);

  useEffect(() => {
    let active = true;

    async function loadOrders() {
      try {
        const response = await fetch("/api/admin/orders", { cache: "no-store" });
        if (!response.ok) throw new Error("Nao foi possivel carregar alertas.");
        const data = (await response.json()) as AdminOrder[];
        if (!active) return;
        setOrders(data);
        setAlertsError(null);
      } catch (error) {
        if (!active) return;
        setAlertsError(error instanceof Error ? error.message : "Erro ao carregar alertas.");
      } finally {
        if (active) setLoadingAlerts(false);
      }
    }

    void loadOrders();
    // Os alertas usam polling leve porque a topbar pode estar presente em telas
    // que nao assinam realtime diretamente.
    const interval = window.setInterval(() => {
      void loadOrders();
    }, 15000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        !panelRef.current?.contains(target) &&
        !alertButtonRef.current?.contains(target)
      ) {
        setAlertsOpen(false);
      }
    }
    if (!alertsOpen) return;
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [alertsOpen]);

  useEffect(() => {
    setAlertsOpen(false);
  }, [pathname]);

  const nextAlerts = useMemo<AlertItem[]>(() => {
    const items: AlertItem[] = [];
    const newOrders = orders.filter((order) => order.status === "novo");
    const preparingOrders = orders.filter((order) => order.status === "preparo");
    const readyOrders = orders.filter((order) => order.status === "pronto");

    if (newOrders.length) {
      items.push({
        id: "new-orders",
        title: `${newOrders.length} pedido${newOrders.length > 1 ? "s" : ""} aguardando aceite`,
        description: "Entraram agora no gestor e merecem atencao imediata do operador.",
        href: "/admin/pedidos"
      });
    }
    if (preparingOrders.length) {
      items.push({
        id: "preparing-orders",
        title: `${preparingOrders.length} pedido${preparingOrders.length > 1 ? "s" : ""} em preparo`,
        description: "A cozinha ja recebeu essas comandas e o painel esta acompanhando o andamento.",
        href: "/admin/pedidos"
      });
    }
    if (readyOrders.length) {
      items.push({
        id: "ready-orders",
        title: `${readyOrders.length} pedido${readyOrders.length > 1 ? "s" : ""} pronto${readyOrders.length > 1 ? "s" : ""}`,
        description: "Existem pedidos aguardando entrega em mesa, retirada no balcao ou despacho.",
        href: "/admin/pedidos"
      });
    }
    return items;
  }, [orders]);

  const totalAttention = useMemo(
    () => orders.filter((order) => order.status === "novo" || order.status === "pronto").length,
    [orders]
  );

  const statusSnapshot = useMemo(
    () =>
      (["novo", "aceito", "preparo", "pronto"] as const)
        .map((status) => ({
          status,
          count: orders.filter((order) => order.status === status).length
        }))
        .filter((entry) => entry.count > 0),
    [orders]
  );

  function cycleTheme() {
    setTheme((current) => {
      const currentIndex = adminThemes.indexOf(current);
      return adminThemes[(currentIndex + 1) % adminThemes.length];
    });
  }

  function openAlerts() {
    if (alertButtonRef.current) {
      const rect = alertButtonRef.current.getBoundingClientRect();
      setPanelPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
    }
    setAlertsOpen((prev) => !prev);
  }

  return (
    <div className="admin-topbar flex flex-wrap items-center justify-between gap-4 border-b border-[var(--admin-topbar-border)] px-6 py-5">
      <div>
        <p className="text-sm text-[var(--admin-subtle)]">Painel do operador</p>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--admin-title)]">Casa do Sheik</h1>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="admin" className="admin-online-badge gap-2 rounded-full border-[#265b3d] bg-[#102519] text-[#87f0a9]">
          <CircleDot className="h-3.5 w-3.5 fill-current" />
          Online
        </Badge>

        <Button variant="outline" className={styles.neutralButtonClass} onClick={toggleSound}>
          {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          {soundEnabled ? "Som ativo" : "Som desligado"}
        </Button>

        <Button
          variant="outline"
          className={styles.neutralButtonClass}
          onClick={cycleTheme}
          title={`Tema atual: ${adminThemeMeta[theme].label}`}
        >
          <Contrast className="h-4 w-4" />
          {adminThemeMeta[theme].label}
        </Button>

        <div className="relative">
          <Button ref={alertButtonRef} variant="outline" className={styles.neutralButtonClass} onClick={openAlerts}>
            <BellRing className="h-4 w-4" />
            Alertas
            {totalAttention > 0 ? (
              <span className={`admin-alert-count ml-1 inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${styles.counterClass}`}>
                {totalAttention}
              </span>
            ) : null}
          </Button>

          {alertsOpen && mounted ? createPortal(
            <div ref={panelRef} style={{ top: panelPos.top, right: panelPos.right }} className={`fixed z-[9999] w-[300px] overflow-hidden rounded-2xl border ${styles.panelClass}`}>

              {/* Itens */}
              <div className="px-2 py-2">
                {loadingAlerts ? (
                  <p className={`px-3 py-3 text-xs ${styles.smallTextClass}`}>Carregando...</p>
                ) : alertsError ? (
                  <p className="px-3 py-3 text-xs text-[#f2b6b6]">{alertsError}</p>
                ) : nextAlerts.length ? (
                  nextAlerts.map((alert) => (
                    <button
                      key={alert.id}
                      type="button"
                      onClick={() => { router.push(alert.href); setAlertsOpen(false); }}
                      className={`group flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors ${styles.alertCardClass}`}
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#91e0b2]" />
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-medium leading-5 ${styles.titleClass}`}>{alert.title}</p>
                        <p className={`mt-0.5 text-xs leading-5 ${styles.alertDescriptionClass}`}>{alert.description}</p>
                      </div>
                      <ChevronRight className={`mt-0.5 h-3.5 w-3.5 shrink-0 opacity-40 transition-transform group-hover:translate-x-0.5 ${styles.chevronClass}`} />
                    </button>
                  ))
                ) : (
                  <p className={`px-3 py-3 text-sm ${styles.smallTextClass}`}>
                    Sem alertas no momento.
                  </p>
                )}
              </div>

              {/* Rodapé */}
              <div className={`border-t px-4 py-2.5 ${styles.footerClass}`}>
                <Link
                  href="/admin/pedidos"
                  className={`text-xs font-medium transition-colors ${styles.footerLinkClass}`}
                  onClick={() => setAlertsOpen(false)}
                >
                  Ver todos os pedidos →
                </Link>
              </div>
            </div>,
            document.body
          ) : null}
        </div>

        <Button variant="admin" onClick={() => router.push("/admin/pedidos")}>
          <Plus className="h-4 w-4" />
          Novo Pedido
        </Button>

        <LogoutButton />
      </div>
    </div>
  );
}
