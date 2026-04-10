"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, CreditCard, Palette, Phone, Printer, Settings2, Sparkles, Store } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { adminThemeMeta, adminThemes, type AdminTheme } from "@/lib/constants/admin-themes";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

function applyAdminTheme(theme: AdminTheme) {
  const shell = document.querySelector(".admin-shell");
  if (!shell) return;
  shell.classList.remove("admin-theme-black", "admin-theme-light");
  shell.classList.add(`admin-theme-${theme}`);
  window.localStorage.setItem("admin-theme", theme);
}

export default function AdminSettingsPage() {
  const [theme, setTheme] = useState<AdminTheme>("black");

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("admin-theme");
    if (storedTheme && adminThemes.includes(storedTheme as AdminTheme)) {
      setTheme(storedTheme as AdminTheme);
      applyAdminTheme(storedTheme as AdminTheme);
      return;
    }
    applyAdminTheme("black");
  }, []);

  const themeCards = useMemo(
    () =>
      adminThemes.map((item) => ({
        id: item,
        ...adminThemeMeta[item]
      })),
    []
  );

  function handleThemeChange(nextTheme: AdminTheme) {
    setTheme(nextTheme);
    applyAdminTheme(nextTheme);
    // Persiste no banco para que o tema seja restaurado em qualquer dispositivo no login.
    getSupabaseBrowserClient().auth.updateUser({ data: { admin_theme: nextTheme } });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_380px]">
      <div className="space-y-6">
        <section className="admin-config-hero overflow-hidden rounded-[30px] border border-[#2b2b2b] bg-[radial-gradient(circle_at_top_right,rgba(91,52,255,0.12),transparent_26%),radial-gradient(circle_at_top_left,rgba(212,160,23,0.12),transparent_28%),linear-gradient(180deg,#1b1b1b_0%,#131313_100%)]">
          <div className="grid gap-6 p-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4">
              <Badge variant="admin" className="w-fit rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em]">
                Central do restaurante
              </Badge>
              <div className="space-y-3">
                <h1 className="text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl">
                  Aparencia, identidade e operacao em um so lugar.
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-[#b8b0a4] sm:text-base">
                  Ajuste as informacoes principais do restaurante, acompanhe o estado atual da operacao e experimente novos temas para o painel sem sair do fluxo.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              {[
                {
                  icon: <Store className="h-4 w-4" />,
                  eyebrow: "Loja",
                  value: "Casa do Sheik",
                  hint: "Identidade ativa"
                },
                {
                  icon: <Clock3 className="h-4 w-4" />,
                  eyebrow: "Operacao",
                  value: "11:00 - 23:00",
                  hint: "Todos os dias"
                },
                {
                  icon: <CreditCard className="h-4 w-4" />,
                  eyebrow: "Pagamento",
                  value: "4 meios",
                  hint: "Dinheiro, credito, debito e pix"
                }
              ].map((item) => (
                <div key={item.eyebrow} className="admin-config-hero-card rounded-[24px] border border-[#2d2d2d] bg-[#111111]/90 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-[0.18em] text-[#9f988b]">{item.eyebrow}</span>
                    <span className="flex h-9 w-9 items-center justify-center rounded-2xl border border-[#343434] bg-[#171717] text-[#f2eadf]">
                      {item.icon}
                    </span>
                  </div>
                  <p className="mt-3 text-lg font-semibold text-white">{item.value}</p>
                  <p className="mt-1 text-sm text-[#a69f92]">{item.hint}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <Card className="border-[#2a2a2a] bg-[#171717] admin-settings-shell-card">
          <CardHeader className="space-y-3 border-b border-[#262626] pb-5">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#2f2f2f] bg-[#111111] text-[#f3eee6]">
                <Palette className="h-5 w-5" />
              </span>
              <div>
                <CardTitle className="text-white">Temas do painel</CardTitle>
                <p className="mt-1 text-sm text-[#aaa295]">
                  Escolha a atmosfera visual do admin. A mudanca e aplicada na hora.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
            {themeCards.map((item) => {
              const active = theme === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleThemeChange(item.id)}
                  className={[
                    "admin-theme-choice",
                    "rounded-[26px] border p-4 text-left transition-all",
                    active
                      ? "admin-theme-choice-active border-[#5b34ff] bg-[#1a1624] shadow-[0_0_0_1px_rgba(91,52,255,0.18)]"
                      : "border-[#2f2f2f] bg-[#111111] hover:border-[#4a4a4a] hover:bg-[#151515]"
                  ].join(" ")}
                >
                  <div className={`admin-theme-choice-preview h-28 rounded-[22px] border border-white/10 bg-gradient-to-br ${item.preview}`} />
                  <div className="mt-4 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-white">{item.label}</p>
                      <p className="mt-1 text-sm leading-6 text-[#a79f92]">{item.description}</p>
                    </div>
                    {active ? (
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#5b34ff] text-white">
                        <CheckCircle2 className="h-4.5 w-4.5" />
                      </span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border-[#2a2a2a] bg-[#171717] admin-settings-shell-card">
          <CardHeader className="space-y-3 border-b border-[#262626] pb-5">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#2f2f2f] bg-[#111111] text-[#f3eee6]">
                <Sparkles className="h-5 w-5" />
              </span>
              <div>
                <CardTitle className="text-white">Configuracoes gerais</CardTitle>
                <p className="mt-1 text-sm text-[#aaa295]">
                  Bloco principal de identidade comercial e informacoes operacionais.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
            <Input className="border-[#343434] bg-[#111111] text-white" placeholder="Nome do restaurante" defaultValue="Casa do Sheik" />
            <Input className="border-[#343434] bg-[#111111] text-white" placeholder="Telefone / WhatsApp" defaultValue="(64) 99955-9916" />
            <Input className="border-[#343434] bg-[#111111] text-white sm:col-span-2" placeholder="Endereco" defaultValue="Avenida Vinte de Agosto, 2190 - Setor Central, Catalao - GO" />
            <Input className="border-[#343434] bg-[#111111] text-white" placeholder="Pedido minimo delivery" defaultValue="R$ 20,00" />
            <Input className="border-[#343434] bg-[#111111] text-white" placeholder="Taxa de entrega" defaultValue="R$ 0,00" />
            <Textarea
              className="min-h-[140px] border-[#343434] bg-[#111111] text-white sm:col-span-2"
              placeholder="Mensagem de boas-vindas"
              defaultValue="Bem-vindo ao Casa do Sheik! Autentica culinaria arabe."
            />
            <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-[#2c2c2c] bg-[#111111] p-4 admin-settings-dark-block">
              <div>
                <p className="text-sm font-medium text-white">Pronto para salvar?</p>
                <p className="mt-1 text-sm text-[#a69f92]">Esses dados impactam o cardapio do cliente e a apresentacao da operacao.</p>
              </div>
              <Button variant="admin">Salvar configuracoes</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="border-[#2a2a2a] bg-[#171717] admin-settings-shell-card">
          <CardHeader>
            <CardTitle className="text-white">Status da operacao</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-[#c8c2b6]">
            <div className="rounded-[24px] border border-[#2d3d2d] bg-[#102519] p-4">
              <p className="text-sm text-[#8fe3ab]">Aberto agora</p>
              <p className="mt-1 text-2xl font-semibold text-white">Recebendo pedidos</p>
            </div>
            <div className="grid gap-3">
              {[
                { icon: <Phone className="h-4 w-4" />, label: "Contato", value: "(64) 99955-9916" },
                { icon: <CreditCard className="h-4 w-4" />, label: "Pagamentos", value: "Dinheiro, Credito, Debito e Pix" },
                { icon: <Clock3 className="h-4 w-4" />, label: "Horario", value: "Todos os dias - 11:00 as 23:00" }
              ].map((item) => (
                <div key={item.label} className="rounded-[24px] border border-[#2a2a2a] bg-[#111111] p-4">
                  <p className="flex items-center gap-2 text-sm text-[#999488]">
                    {item.icon}
                    {item.label}
                  </p>
                  <p className="mt-2 text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#2a2a2a] bg-[#171717] admin-settings-shell-card">
          <CardHeader>
            <CardTitle className="text-white">Atalhos da operacao</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/admin/configuracoes/impressoras" className="block rounded-[24px] border border-[#2a2a2a] bg-[#111111] p-4 transition-colors hover:border-[#5b34ff]">
              <p className="flex items-center gap-2 text-sm text-[#999488]">
                <Printer className="h-4 w-4" />
                Impressoras
              </p>
              <p className="mt-2 text-white">Cadastrar, testar e ativar impressoras termicas</p>
            </Link>
            <Link href="/admin/pedidos/configuracoes" className="block rounded-[24px] border border-[#2a2a2a] bg-[#111111] p-4 transition-colors hover:border-[#5b34ff]">
              <p className="flex items-center gap-2 text-sm text-[#999488]">
                <Settings2 className="h-4 w-4" />
                Gestor de pedidos
              </p>
              <p className="mt-2 text-white">Ajustar alertas, etapas do fluxo e impressao automatica</p>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
