"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  CreditCard,
  Loader2,
  Palette,
  Phone,
  Printer,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Store,
  Zap,
} from "lucide-react";

import {
  AdminGrid,
  AdminPage,
  AdminHeader,
  AdminHeaderContent,
  AdminHeaderTitle,
  AdminHeaderDescription,
  AdminHeaderActions,
  AdminLivePulse,
  AdminSectionIconHeader,
  AdminFieldGroup,
  AdminDivider,
} from "@/components/layout";
import { DSBadge, DSButton, DSCard, DSInput } from "@/components/system";
import { adminThemeMeta, adminThemes, type AdminTheme } from "@/lib/constants/admin-themes";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

// ─── Theme helpers ────────────────────────────────────────────────────────────

function applyAdminTheme(theme: AdminTheme) {
  const shell = document.querySelector(".admin-shell");
  if (!shell) return;
  shell.classList.remove("admin-theme-black", "admin-theme-light");
  shell.classList.add(`admin-theme-${theme}`);
  window.localStorage.setItem("admin-theme", theme);
}

async function persistAdminTheme(theme: AdminTheme) {
  try {
    await getSupabaseBrowserClient().auth.updateUser({ data: { admin_theme: theme } });
  } catch {
    // Mantem a troca visual local mesmo se a sincronizacao remota falhar.
  }
}

// ─── Sidebar cards ────────────────────────────────────────────────────────────

function StatusCard({ theme, saveState }: { theme: AdminTheme; saveState: SaveState }) {
  const rows = [
    { icon: Phone, label: "Contato", value: "(64) 99955-9916" },
    { icon: CreditCard, label: "Pagamentos", value: "Dinheiro, crédito, débito e Pix" },
    { icon: Clock3, label: "Horário", value: "Todos os dias, 11:00 - 23:00" },
  ];

  return (
    <DSCard padding="lg" className="shadow-card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <DSBadge variant="success">Operacional</DSBadge>
          <h3 className="mt-3 text-base font-semibold text-admin-fg">Saúde do sistema</h3>
          <p className="mt-1 text-sm text-admin-fg-muted">
            Leitura rápida dos pontos que sustentam a operação.
          </p>
        </div>
        <ShieldCheck className="h-5 w-5 text-status-success-fg" />
      </div>

      <div className="mt-5 space-y-3">
        <div className="rounded-ds-lg border border-admin-border bg-admin-surface p-4">
          <p className="text-xs text-admin-fg-faint">Tema atual</p>
          <p className="mt-1 text-sm font-medium text-admin-fg">{adminThemeMeta[theme].label}</p>
        </div>
        <div className="rounded-ds-lg border border-admin-border bg-admin-surface p-4">
          <p className="text-xs text-admin-fg-faint">Estado de salvamento</p>
          <p className="mt-1 text-sm font-medium text-admin-fg">
            {saveState === "saving" ? "Salvando" : saveState === "saved" ? "Salvo" : "Pronto"}
          </p>
        </div>
        {rows.map(({ icon: Icon, label, value }) => (
          <div key={label} className="rounded-ds-lg border border-admin-border-faint bg-admin-surface p-4">
            <div className="flex items-center gap-2 text-admin-fg-faint">
              <Icon className="h-3.5 w-3.5" />
              <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-admin-fg-secondary">{value}</p>
          </div>
        ))}
      </div>
    </DSCard>
  );
}

const SHORTCUTS = [
  {
    href: "/admin/configuracoes/impressoras",
    icon: Printer,
    label: "Impressoras",
    description: "Setup, testes e diagnóstico de impressão",
  },
  {
    href: "/admin/pedidos/configuracoes",
    icon: Settings2,
    label: "Pedidos",
    description: "Fluxo, alertas e automações operacionais",
  },
  {
    href: "/admin/mesas",
    icon: ShoppingBag,
    label: "Mesas",
    description: "Organização de mesas e QR Codes",
  },
];

function ShortcutsCard() {
  return (
    <DSCard padding="lg" className="shadow-card">
      <div className="flex items-center gap-2">
        <Zap className="h-4 w-4 text-status-warning-fg" />
        <h3 className="text-base font-semibold text-admin-fg">Próximos controles</h3>
      </div>
      <p className="mt-1 text-sm text-admin-fg-muted">
        Atalhos para áreas que afetam diretamente a operação.
      </p>

      <div className="mt-5 space-y-2">
        {SHORTCUTS.map(({ href, icon: Icon, label, description }) => (
          <Link
            key={href}
            href={href}
            className="group flex items-center gap-3 rounded-ds-lg border border-admin-border-faint bg-admin-surface px-4 py-3 transition-all duration-motion-default ease-motion-in-out hover:border-admin-border-strong hover:bg-admin-elevated"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-ds-sm border border-admin-border bg-admin-elevated text-admin-fg-muted transition-colors duration-motion-default ease-motion-in-out group-hover:border-admin-border-strong group-hover:text-admin-fg">
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-admin-fg">{label}</p>
              <p className="mt-0.5 truncate text-xs text-admin-fg-faint">{description}</p>
            </div>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-admin-fg-faint transition-colors duration-motion-default ease-motion-in-out group-hover:text-admin-fg-muted" />
          </Link>
        ))}
      </div>
    </DSCard>
  );
}

// ─── Theme picker ─────────────────────────────────────────────────────────────

function ThemePicker({
  theme,
  themeCards,
  onThemeChange,
}: {
  theme: AdminTheme;
  themeCards: Array<{ id: AdminTheme; label: string; description: string; preview: string }>;
  onThemeChange: (t: AdminTheme) => void;
}) {
  return (
    <DSCard padding="lg" className="shadow-card">
      <AdminSectionIconHeader
        icon={Palette}
        title="Aparência do painel"
        description="Escolha o tema visual. A mudança é aplicada na hora e sincronizada entre dispositivos."
      />

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {themeCards.map((item) => {
          const active = theme === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onThemeChange(item.id)}
              className={[
                "group rounded-ds-xl border p-4 text-left transition-all duration-motion-default ease-motion-in-out",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/30",
                active
                  ? "border-brand-purple bg-brand-purple-bg shadow-card"
                  : "border-admin-border bg-admin-surface hover:border-admin-border-strong hover:bg-admin-elevated",
              ].join(" ")}
            >
              <div
                className={`h-24 w-full rounded-ds-lg border border-admin-border bg-gradient-to-br ${item.preview} transition-transform duration-motion-default ease-motion-in-out group-hover:scale-[0.99]`}
              />

              <div className="mt-4 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-admin-fg">{item.label}</p>
                  <p className="mt-0.5 text-xs text-admin-fg-muted">{item.description}</p>
                </div>
                {active ? (
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-ds-sm bg-brand-purple text-admin-fg">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </span>
                ) : (
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-ds-sm border border-admin-border" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </DSCard>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type SaveState = "idle" | "saving" | "saved" | "error";

interface ConfigForm {
  id: string | null;
  nome: string;
  telefone: string;
  endereco: string;
  pedidoMinimo: string;
  taxaEntrega: string;
  mensagemBoasVindas: string;
}

const DEFAULT_FORM: ConfigForm = {
  id: null,
  nome: "",
  telefone: "",
  endereco: "",
  pedidoMinimo: "",
  taxaEntrega: "",
  mensagemBoasVindas: "",
};

export default function AdminSettingsPage() {
  const [theme, setTheme] = useState<AdminTheme>("black");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [form, setForm] = useState<ConfigForm>(DEFAULT_FORM);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem("admin-theme");
    if (stored && adminThemes.includes(stored as AdminTheme)) {
      setTheme(stored as AdminTheme);
      applyAdminTheme(stored as AdminTheme);
    } else if (document.querySelector(".admin-shell")?.classList.contains("admin-theme-light")) {
      setTheme("light");
      applyAdminTheme("light");
    } else {
      applyAdminTheme("black");
    }

    void fetch("/api/admin/restaurante-config")
      .then((res) => res.json())
      .then((data) => {
        setForm({
          id: data.id ?? null,
          nome: data.nome ?? "",
          telefone: data.telefone ?? "",
          endereco: data.endereco ?? "",
          pedidoMinimo: data.pedidoMinimo != null ? String(data.pedidoMinimo) : "",
          taxaEntrega: data.taxaEntrega != null ? String(data.taxaEntrega) : "",
          mensagemBoasVindas: data.mensagemBoasVindas ?? "",
        });
      })
      .catch(() => null);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const themeCards = useMemo(
    () => adminThemes.map((id) => ({ id, ...adminThemeMeta[id] })),
    []
  );

  function handleThemeChange(next: AdminTheme) {
    setTheme(next);
    applyAdminTheme(next);
    void persistAdminTheme(next);
  }

  function setField(key: keyof ConfigForm, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (saveState === "saving") return;
    setSaveState("saving");
    setSaveError(null);
    try {
      const response = await fetch("/api/admin/restaurante-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: form.id,
          nome: form.nome,
          telefone: form.telefone,
          endereco: form.endereco,
          pedidoMinimo: parseFloat(form.pedidoMinimo.replace(",", ".")) || 0,
          taxaEntrega: parseFloat(form.taxaEntrega.replace(",", ".")) || 0,
          mensagemBoasVindas: form.mensagemBoasVindas,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Erro ao salvar.");
      }
      setSaveState("saved");
      saveTimer.current = setTimeout(() => setSaveState("idle"), 2500);
    } catch (saveErr) {
      setSaveError(saveErr instanceof Error ? saveErr.message : "Erro ao salvar configuracoes.");
      setSaveState("error");
      saveTimer.current = setTimeout(() => setSaveState("idle"), 3000);
    }
  }

  return (
    <AdminPage gap="relaxed">
      <AdminHeader>
        <AdminHeaderContent>
          <AdminHeaderTitle>Configurações</AdminHeaderTitle>
          <AdminHeaderDescription>
            Controle identidade, operação, aparência e conexões críticas do restaurante.
          </AdminHeaderDescription>
        </AdminHeaderContent>
        <AdminHeaderActions>
          <AdminLivePulse label="Sistema ativo" status="active" />
          <DSButton
            type="button"
            variant="admin"
            size="sm"
            onClick={() => void handleSave()}
            disabled={saveState === "saving"}
            className="min-w-[120px]"
          >
            {saveState === "saving" ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Salvando
              </>
            ) : saveState === "saved" ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                Salvo
              </>
            ) : saveState === "error" ? (
              "Erro — tentar novamente"
            ) : (
              "Salvar"
            )}
          </DSButton>
        </AdminHeaderActions>
      </AdminHeader>

      {saveError && (
        <div className="mx-auto w-full max-w-[1640px] px-4 lg:px-8">
          <p className="rounded-ds-md border border-status-danger-text/30 bg-status-danger-text/10 px-4 py-3 text-sm text-status-danger-text">
            {saveError}
          </p>
        </div>
      )}

      <AdminGrid cols="sidebar-sm" gap="xl">
        <div className="space-y-6 2xl:space-y-8">
          <DSCard padding="lg" className="shadow-card">
            <AdminSectionIconHeader
              icon={Store}
              title="Identidade e atendimento"
              description="Dados exibidos no menu público, comprovantes e comunicações com o cliente."
            />

            <div className="mt-6 space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <AdminFieldGroup label="Nome do restaurante" hint="Exibido no cardápio e nos recibos" htmlFor="restaurant-name">
                  <DSInput
                    id="restaurant-name"
                    placeholder="Nome do restaurante"
                    value={form.nome}
                    onChange={(e) => setField("nome", e.target.value)}
                  />
                </AdminFieldGroup>

                <AdminFieldGroup label="Telefone / WhatsApp" hint="Para contato e pedidos por mensagem" htmlFor="phone">
                  <DSInput
                    id="phone"
                    placeholder="(00) 00000-0000"
                    value={form.telefone}
                    onChange={(e) => setField("telefone", e.target.value)}
                  />
                </AdminFieldGroup>

                <AdminFieldGroup label="Endereço completo" className="sm:col-span-2" htmlFor="address">
                  <DSInput
                    id="address"
                    placeholder="Rua, número, bairro, cidade - UF"
                    value={form.endereco}
                    onChange={(e) => setField("endereco", e.target.value)}
                  />
                </AdminFieldGroup>
              </div>

              <AdminDivider />

              <div>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-admin-fg-faint">
                      Delivery
                    </p>
                    <p className="mt-1 text-sm text-admin-fg-muted">
                      Regras básicas que afetam pedidos de entrega.
                    </p>
                  </div>
                  <DSBadge variant="secondary">Operação</DSBadge>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <AdminFieldGroup label="Pedido mínimo" hint="Valor mínimo para aceitar delivery" htmlFor="min-order">
                    <DSInput
                      id="min-order"
                      placeholder="0.00"
                      value={form.pedidoMinimo}
                      onChange={(e) => setField("pedidoMinimo", e.target.value)}
                    />
                  </AdminFieldGroup>
                  <AdminFieldGroup label="Taxa de entrega" hint="Cobrada por pedido de delivery" htmlFor="delivery-fee">
                    <DSInput
                      id="delivery-fee"
                      placeholder="0.00"
                      value={form.taxaEntrega}
                      onChange={(e) => setField("taxaEntrega", e.target.value)}
                    />
                  </AdminFieldGroup>
                </div>
              </div>
            </div>
          </DSCard>

          <DSCard padding="lg" className="shadow-card">
            <AdminSectionIconHeader
              icon={SlidersHorizontal}
              title="Conteúdo e mensagem"
              description="Texto de abertura do cardápio digital e pontos de contato com o cliente."
            />

            <div className="mt-6">
              <AdminFieldGroup label="Mensagem de boas-vindas" hint="Exibida no topo do cardápio digital" htmlFor="welcome-msg">
                <textarea
                  id="welcome-msg"
                  className="min-h-[118px] w-full resize-none rounded-ds-md border border-admin-border bg-admin-surface px-4 py-3 text-sm leading-relaxed text-admin-fg placeholder:text-admin-fg-faint outline-none transition-[background-color,border-color,box-shadow] duration-motion-default ease-motion-in-out hover:border-admin-border-strong focus-visible:border-brand-gold focus-visible:ring-2 focus-visible:ring-brand-gold/20"
                  placeholder="Escreva uma mensagem de boas-vindas..."
                  value={form.mensagemBoasVindas}
                  onChange={(e) => setField("mensagemBoasVindas", e.target.value)}
                />
              </AdminFieldGroup>
            </div>
          </DSCard>

          <ThemePicker
            theme={theme}
            themeCards={themeCards}
            onThemeChange={handleThemeChange}
          />
        </div>

        <aside className="space-y-5">
          <StatusCard theme={theme} saveState={saveState} />
          <ShortcutsCard />
          <DSCard padding="lg" className="border-status-warning-border bg-status-warning-bg shadow-card">
            <DSBadge variant="warning">Avançado</DSBadge>
            <h3 className="mt-3 text-base font-semibold text-status-warning-text">
              Controles sensíveis separados
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-status-warning-text">
              Impressoras, fluxo de pedidos e mesas ficam em áreas dedicadas para reduzir risco operacional.
            </p>
          </DSCard>
        </aside>
      </AdminGrid>
    </AdminPage>
  );
}
