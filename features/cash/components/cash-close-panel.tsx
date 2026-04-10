"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CircleDollarSign, Loader2, MinusCircle, PlusCircle, Printer, Receipt, Store, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getSupabaseBrowserClient } from "@/lib/realtime/client";
import type { CashClosingSummary, CashMovementType } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

// Esta tela concentra o fechamento operacional do caixa.
// Aqui convivem resumo financeiro, sangria/suprimento e impressao do fechamento.
export function CashClosePanel({ initialSummary }: { initialSummary: CashClosingSummary }) {
  const [summary, setSummary] = useState(initialSummary);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closeNote, setCloseNote] = useState("");
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [movementType, setMovementType] = useState<CashMovementType>("sangria");
  const [movementAmount, setMovementAmount] = useState("");
  const [movementNote, setMovementNote] = useState("");
  const [movementLoading, setMovementLoading] = useState(false);
  const refreshInFlightRef = useRef(false);
  const printAreaRef = useRef<HTMLDivElement | null>(null);
  const movementActionLabel = movementType === "sangria" ? "Registrar sangria" : "Registrar suprimento";
  const movementDescription =
    movementType === "sangria"
      ? "Use para registrar retiradas de dinheiro do caixa durante a operacao."
      : "Use para registrar entrada manual de dinheiro no caixa.";
  const moneyPayment = useMemo(
    () => summary.payments.find((payment) => payment.method === "dinheiro")?.total ?? 0,
    [summary.payments]
  );

  function formatCurrencyField(value: string) {
    const digits = value.replace(/\D/g, "");
    if (!digits) return "";

    return (Number(digits) / 100).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function parseCurrencyField(value: string) {
    const digits = value.replace(/\D/g, "");
    return digits ? Number(digits) / 100 : 0;
  }

  async function refreshSummary(options?: { silent?: boolean }) {
    // Evita concorrencia entre polling, foco da janela e eventos realtime.
    if (refreshInFlightRef.current) return;
    refreshInFlightRef.current = true;

    try {
      if (!options?.silent) {
        setError(null);
      }

      const response = await fetch("/api/admin/cash-close", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Nao foi possivel atualizar o resumo do caixa.");
      }

      setSummary((current) => {
        const next = data as CashClosingSummary;
        return JSON.stringify(current) === JSON.stringify(next) ? current : next;
      });
    } catch (refreshError) {
      if (!options?.silent) {
        setError(refreshError instanceof Error ? refreshError.message : "Erro ao atualizar caixa.");
      }
    } finally {
      refreshInFlightRef.current = false;
    }
  }

  useEffect(() => {
    void refreshSummary({ silent: true });

    function handleVisibilityRefresh() {
      if (document.visibilityState === "visible") {
        void refreshSummary({ silent: true });
      }
    }

    window.addEventListener("focus", handleVisibilityRefresh);
    document.addEventListener("visibilitychange", handleVisibilityRefresh);

    // Polling curto e realtime trabalham juntos para a operacao nao depender
    // de refresh manual durante o expediente.
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refreshSummary({ silent: true });
      }
    }, 5000);

    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      ?.channel("cash-close-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "mesa_contas" }, async () => {
        await refreshSummary({ silent: true });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "caixa_fechamentos" }, async () => {
        await refreshSummary({ silent: true });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "caixa_movimentacoes" }, async () => {
        await refreshSummary({ silent: true });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "pedidos" }, async () => {
        await refreshSummary({ silent: true });
      })
      .subscribe();

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", handleVisibilityRefresh);
      document.removeEventListener("visibilitychange", handleVisibilityRefresh);
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  async function handleCloseCash() {
    try {
      setLoading(true);
      setError(null);
      setMessage(null);

      const response = await fetch("/api/admin/cash-close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: closeNote.trim() || undefined })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Nao foi possivel fechar o caixa.");
      }

      setSummary(data as CashClosingSummary);
      setMessage("Caixa fechado com sucesso. O resumo do dia foi consolidado.");
      setShowCloseModal(false);
      setCloseNote("");
    } catch (closeError) {
      setError(closeError instanceof Error ? closeError.message : "Erro ao fechar caixa.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateMovement() {
    const normalizedAmount = parseCurrencyField(movementAmount);

    if (!(normalizedAmount > 0)) {
      setError("Informe um valor valido para registrar a movimentacao.");
      return;
    }

    try {
      setMovementLoading(true);
      setError(null);
      setMessage(null);

      const response = await fetch("/api/admin/cash-movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: movementType,
          amount: normalizedAmount,
          note: movementNote.trim() || undefined
        })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Nao foi possivel registrar a movimentacao.");
      }

      setShowMovementModal(false);
      setMovementAmount("");
      setMovementNote("");
      setMessage(movementType === "sangria" ? "Sangria registrada com sucesso." : "Suprimento registrado com sucesso.");
      await refreshSummary({ silent: true });
    } catch (movementError) {
      setError(movementError instanceof Error ? movementError.message : "Erro ao registrar movimentacao.");
    } finally {
      setMovementLoading(false);
    }
  }

  function handlePrintSummary() {
    // O fechamento precisa ter saida simples mesmo sem ponte de impressao dedicada.
    const content = printAreaRef.current?.innerHTML;
    if (!content) {
      window.print();
      return;
    }

    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Fechamento de Caixa</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
            h1, h2, h3, p { margin: 0 0 10px; }
            .section { margin-top: 24px; }
            .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #ddd; }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_380px]">
      <div className="space-y-5">
        <Card className="border-[#2a2a2a] bg-[#171717] admin-cash-shell-card">
          <CardHeader>
            <div>
              <p className="text-sm text-[#9f998e]">Caixa do dia</p>
              <CardTitle className="mt-2 text-white">Fechamento operacional</CardTitle>
              <p className="mt-2 text-sm text-[#bdb7ab]">
                Consolide o movimento do dia depois de fechar as mesas e concluir os pedidos de delivery ou retirada.
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {message ? <p className="text-sm font-medium text-emerald-400">{message}</p> : null}
            {error ? <p className="text-sm font-medium text-red-400">{error}</p> : null}

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-[24px] border border-[#2b2b2b] bg-[#121212] p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-[#969183]">Faturamento</p>
                  <CircleDollarSign className="h-4 w-4 text-[#f4c35a]" />
                </div>
                <p className="mt-3 text-3xl font-semibold text-white">{formatCurrency(summary.total)}</p>
                <p className="mt-2 text-sm text-[#8f8a82]">Referencia {summary.referenceDate}</p>
              </div>

              <div className="rounded-[24px] border border-[#2b2b2b] bg-[#121212] p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-[#969183]">Lancamentos</p>
                  <Receipt className="h-4 w-4 text-[#7eb5ff]" />
                </div>
                <p className="mt-3 text-3xl font-semibold text-white">{summary.ordersCount}</p>
                <p className="mt-2 text-sm text-[#8f8a82]">Mesas fechadas: {summary.tablesCount}</p>
              </div>

              <div className="rounded-[24px] border border-[#2b2b2b] bg-[#121212] p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-[#969183]">Status</p>
                  <Wallet className="h-4 w-4 text-[#8ce3b0]" />
                </div>
                <p className="mt-3 text-2xl font-semibold text-white">
                  {summary.alreadyClosed ? "Fechado" : "Aberto"}
                </p>
                <p className="mt-2 text-sm text-[#8f8a82]">
                  {summary.lastClosedAt
                    ? `Ultimo fechamento em ${new Date(summary.lastClosedAt).toLocaleString("pt-BR")}`
                    : "Aguardando fechamento do dia"}
                </p>
                {summary.lastUpdatedAt ? (
                  <p className="mt-2 text-xs text-[#6f6a5f]">
                    Atualizado as {new Date(summary.lastUpdatedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="rounded-[26px] border border-[#2a2a2a] bg-[#111111] p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#8d877b]">Resumo por pagamento</p>
                  <p className="mt-2 text-sm text-[#bfb7ac]">
                    Use este resumo para conferir maquininha, pix e dinheiro antes de encerrar a operacao.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-[#313131] bg-transparent text-[#e5dfd5] hover:bg-[#212121]"
                    onClick={() => {
                      setMovementType("sangria");
                      setShowMovementModal(true);
                    }}
                    disabled={summary.alreadyClosed}
                  >
                    <MinusCircle className="h-4 w-4" />
                    Sangria
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-[#313131] bg-transparent text-[#e5dfd5] hover:bg-[#212121]"
                    onClick={() => {
                      setMovementType("suprimento");
                      setShowMovementModal(true);
                    }}
                    disabled={summary.alreadyClosed}
                  >
                    <PlusCircle className="h-4 w-4" />
                    Suprimento
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-[#313131] bg-transparent text-[#e5dfd5] hover:bg-[#212121]"
                    onClick={handlePrintSummary}
                  >
                    <Printer className="h-4 w-4" />
                    Imprimir fechamento
                  </Button>
                  <Button
                    type="button"
                    variant="admin"
                    disabled={summary.alreadyClosed || loading}
                    onClick={() => setShowCloseModal(true)}
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {summary.alreadyClosed ? "Caixa encerrado" : "Fechar caixa"}
                  </Button>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {summary.payments.length ? (
                  summary.payments.map((payment) => (
                    <div
                      key={payment.method}
                      className="flex items-center justify-between rounded-2xl border border-[#232323] bg-[#181818] px-4 py-3 text-[#ebe4d8]"
                    >
                      <div>
                        <span className="capitalize">{payment.method.replaceAll("_", " ")}</span>
                        <p className="mt-1 text-xs text-[#8f8a82]">{payment.count} lancamentos</p>
                      </div>
                      <span className="font-medium">{formatCurrency(payment.total)}</span>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-[#232323] bg-[#181818] px-4 py-6 text-sm text-[#9d978b]">
                    Ainda nao ha movimentacao consolidada para o fechamento de hoje.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-[26px] border border-[#2a2a2a] bg-[#111111] p-5">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-[#8ce3b0]" />
                <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#8d877b]">Controle do dinheiro</p>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-[#232323] bg-[#181818] px-4 py-4 text-[#ebe4d8]">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#8f8a82]">Vendas em dinheiro</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{formatCurrency(moneyPayment)}</p>
                </div>
                <div className="rounded-2xl border border-[#232323] bg-[#181818] px-4 py-4 text-[#ebe4d8]">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#8f8a82]">Sangrias do dia</p>
                  <p className="mt-2 text-2xl font-semibold text-[#f4c35a]">{formatCurrency(summary.movementTotals.sangria)}</p>
                </div>
                <div className="rounded-2xl border border-[#232323] bg-[#181818] px-4 py-4 text-[#ebe4d8]">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#8f8a82]">Saldo esperado em dinheiro</p>
                  <p className="mt-2 text-2xl font-semibold text-[#8ce3b0]">{formatCurrency(summary.expectedCashBalance)}</p>
                  <p className="mt-2 text-xs text-[#8f8a82]">Dinheiro vendido + suprimentos - sangrias</p>
                </div>
              </div>

              <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="rounded-2xl border border-[#232323] bg-[#181818] p-4">
                  <p className="text-sm font-medium text-white">Movimentacoes registradas hoje</p>
                  <div className="mt-4 space-y-3">
                    {summary.movements.length ? (
                      summary.movements.slice(0, 6).map((movement) => (
                        <div
                          key={movement.id}
                          className="flex items-start justify-between gap-3 rounded-2xl border border-[#262626] bg-[#141414] px-4 py-3 text-[#ebe4d8]"
                        >
                          <div>
                            <p className="font-medium capitalize">
                              {movement.type === "sangria" ? "Sangria" : "Suprimento"}
                            </p>
                            <p className="mt-1 text-xs text-[#8f8a82]">
                              {new Date(movement.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                            {movement.note ? <p className="mt-2 text-xs text-[#bcb5aa]">{movement.note}</p> : null}
                          </div>
                          <span className={movement.type === "sangria" ? "font-medium text-[#f4c35a]" : "font-medium text-[#8ce3b0]"}>
                            {movement.type === "sangria" ? "-" : "+"}
                            {formatCurrency(movement.amount)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-[#262626] bg-[#141414] px-4 py-6 text-sm text-[#9d978b]">
                        Nenhuma sangria ou suprimento registrado hoje.
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-[#232323] bg-[#181818] p-4">
                  <p className="text-sm font-medium text-white">Resumo rapido</p>
                  <div className="mt-4 space-y-3">
                    <div className="rounded-2xl border border-[#262626] bg-[#141414] px-4 py-3 text-[#ebe4d8]">
                      <p className="text-xs uppercase tracking-[0.18em] text-[#8f8a82]">Suprimentos</p>
                      <p className="mt-2 text-xl font-semibold text-[#8ce3b0]">{formatCurrency(summary.movementTotals.suprimento)}</p>
                    </div>
                    <div className="rounded-2xl border border-[#262626] bg-[#141414] px-4 py-3 text-[#ebe4d8]">
                      <p className="text-xs uppercase tracking-[0.18em] text-[#8f8a82]">Ultima movimentacao</p>
                      <p className="mt-2 text-sm text-white">
                        {summary.movements[0]
                          ? `${summary.movements[0].type === "sangria" ? "Sangria" : "Suprimento"} as ${new Date(summary.movements[0].createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
                          : "Sem movimentacoes hoje"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="rounded-[26px] border border-[#2a2a2a] bg-[#111111] p-5">
                <div className="flex items-center gap-2">
                  <Store className="h-4 w-4 text-[#8fd0ff]" />
                  <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#8d877b]">Origem das vendas</p>
                </div>
                <div className="mt-5 space-y-3">
                  {summary.origins.map((origin) => (
                    <div
                      key={origin.key}
                      className="flex items-center justify-between rounded-2xl border border-[#232323] bg-[#181818] px-4 py-3 text-[#ebe4d8]"
                    >
                      <div>
                        <span>{origin.label}</span>
                        <p className="mt-1 text-xs text-[#8f8a82]">{origin.count} fechamentos</p>
                      </div>
                      <span className="font-medium">{formatCurrency(origin.total)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[26px] border border-[#2a2a2a] bg-[#111111] p-5">
                <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#8d877b]">Fechamentos recentes</p>
                <div className="mt-5 space-y-3">
                  {summary.recentClosures.length ? (
                    summary.recentClosures.map((closure) => (
                      <div
                        key={closure.id}
                        className="rounded-2xl border border-[#232323] bg-[#181818] px-4 py-3 text-[#ebe4d8]"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium">{closure.label}</span>
                          <span className="text-[#f4c35a]">{formatCurrency(closure.total)}</span>
                        </div>
                        <p className="mt-2 text-xs text-[#8f8a82]">
                          {closure.paymentMethod} - {new Date(closure.closedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-[#232323] bg-[#181818] px-4 py-6 text-sm text-[#9d978b]">
                      Nenhum fechamento recente encontrado para hoje.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-[#2a2a2a] bg-[#171717] admin-cash-shell-card">
        <CardHeader>
          <CardTitle className="text-white">Como usar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-[#d7d0c5]">
          <div className="rounded-2xl border border-[#2a2a2a] bg-[#111111] p-4">
            <p className="font-medium text-white">1. Feche as mesas</p>
            <p className="mt-2 text-[#bcb5aa]">
              Primeiro finalize as contas das mesas no Gestor de Pedidos usando o botao <span className="font-medium text-white">Fechar mesa</span>.
            </p>
          </div>
          <div className="rounded-2xl border border-[#2a2a2a] bg-[#111111] p-4">
            <p className="font-medium text-white">2. Confira os pagamentos</p>
            <p className="mt-2 text-[#bcb5aa]">
              Valide os totais do dia no dinheiro, pix e maquininha antes de consolidar o fechamento.
            </p>
          </div>
          <div className="rounded-2xl border border-[#2a2a2a] bg-[#111111] p-4">
            <p className="font-medium text-white">3. Registre sangrias</p>
            <p className="mt-2 text-[#bcb5aa]">
              Sempre que tirar dinheiro do caixa, use <span className="font-medium text-white">Sangria</span> para manter o saldo esperado correto.
            </p>
          </div>
          <div className="rounded-2xl border border-[#2a2a2a] bg-[#111111] p-4">
            <p className="font-medium text-white">4. Feche o caixa</p>
            <p className="mt-2 text-[#bcb5aa]">
              Depois do expediente, use <span className="font-medium text-white">Fechar caixa</span> para registrar o resumo final da operacao.
            </p>
          </div>
          <div className="rounded-2xl border border-[#2a2a2a] bg-[#111111] p-4">
            <p className="font-medium text-white">5. Consulte o historico</p>
            <p className="mt-2 text-[#bcb5aa]">
              Confira a linha do tempo dos caixas fechados para validar a operacao do dia.
            </p>
            <Link
              href="/admin/historico"
              className="mt-4 inline-flex rounded-xl border border-[#313131] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#1c1c1c]"
            >
              Abrir historico
            </Link>
          </div>
        </CardContent>
      </Card>

      <div ref={printAreaRef} className="sr-only">
        <h1>Fechamento de caixa</h1>
        <p>Referencia: {summary.referenceDate}</p>
        <p>Total consolidado: {formatCurrency(summary.total)}</p>
        <p>Lancamentos: {summary.ordersCount}</p>
        <p>Mesas fechadas: {summary.tablesCount}</p>

        <div className="section">
          <h2>Pagamentos</h2>
          {summary.payments.map((payment) => (
            <div key={`print-${payment.method}`} className="row">
              <span>{payment.method}</span>
              <span>
                {payment.count} lancamentos - {formatCurrency(payment.total)}
              </span>
            </div>
          ))}
        </div>

        <div className="section">
          <h2>Movimentacoes de caixa</h2>
          {summary.movements.length ? (
            summary.movements.map((movement) => (
              <div key={`movement-${movement.id}`} className="row">
                <span>{movement.type === "sangria" ? "Sangria" : "Suprimento"}</span>
                <span>
                  {movement.type === "sangria" ? "-" : "+"}
                  {formatCurrency(movement.amount)}
                </span>
              </div>
            ))
          ) : (
            <div className="row">
              <span>Sem movimentacoes</span>
              <span>R$ 0,00</span>
            </div>
          )}
        </div>

        <div className="section">
          <h2>Saldo esperado em dinheiro</h2>
          <p>{formatCurrency(summary.expectedCashBalance)}</p>
        </div>

        <div className="section">
          <h2>Origem das vendas</h2>
          {summary.origins.map((origin) => (
            <div key={`origin-${origin.key}`} className="row">
              <span>{origin.label}</span>
              <span>
                {origin.count} fechamentos - {formatCurrency(origin.total)}
              </span>
            </div>
          ))}
        </div>

        <div className="section">
          <h2>Fechamentos recentes</h2>
          {summary.recentClosures.map((closure) => (
            <div key={`closure-${closure.id}`} className="row">
              <span>{closure.label}</span>
              <span>
                {closure.paymentMethod} - {formatCurrency(closure.total)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {showCloseModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={() => setShowCloseModal(false)}>
          <div
            className="w-full max-w-xl rounded-[28px] border border-[#313131] bg-[#171717] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="space-y-5 p-6">
              <div className="space-y-2">
                <p className="text-sm uppercase tracking-[0.2em] text-[#8f8a82]">Fechamento de caixa</p>
                <h3 className="text-2xl font-semibold text-white">Confirmar fechamento do dia</h3>
                <p className="text-sm text-[#bcb5aa]">
                  Revise os valores do caixa antes de encerrar o dia. Depois disso, o fechamento ficara registrado no historico.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-[#2a2a2a] bg-[#111111] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#8d877b]">Total</p>
                  <p className="mt-2 text-2xl font-semibold text-[#f4c35a]">{formatCurrency(summary.total)}</p>
                </div>
                <div className="rounded-2xl border border-[#2a2a2a] bg-[#111111] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#8d877b]">Lancamentos</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{summary.ordersCount}</p>
                </div>
                <div className="rounded-2xl border border-[#2a2a2a] bg-[#111111] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#8d877b]">Mesas</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{summary.tablesCount}</p>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium text-white" htmlFor="cash-close-note">
                  Observacao do fechamento
                </label>
                <Textarea
                  id="cash-close-note"
                  value={closeNote}
                  onChange={(event) => setCloseNote(event.target.value)}
                  placeholder="Ex.: caixa conferido, sem divergencias."
                  className="min-h-[110px] border-[#2f2f2f] bg-[#121212] text-sm text-[#ebe4d8] placeholder:text-[#7f786d]"
                />
                <p className="text-xs text-[#7f786d]">
                  Observacao operacional do fechamento. Se o schema ja estiver atualizado, ela tambem entra no historico.
                </p>
              </div>

              <div className="flex flex-wrap justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="border-[#313131] bg-transparent text-[#e5dfd5] hover:bg-[#212121]"
                  onClick={() => setShowCloseModal(false)}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button type="button" variant="admin" disabled={loading || summary.alreadyClosed} onClick={() => void handleCloseCash()}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Confirmar fechamento
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showMovementModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={() => setShowMovementModal(false)}>
          <div
            className="w-full max-w-xl rounded-[28px] border border-[#313131] bg-[#171717] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="space-y-5 p-6">
              <div className="space-y-2">
                <p className="text-sm uppercase tracking-[0.2em] text-[#8f8a82]">Movimentacao de caixa</p>
                <h3 className="text-2xl font-semibold text-white">{movementActionLabel}</h3>
                <p className="text-sm text-[#bcb5aa]">{movementDescription}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-[#2a2a2a] bg-[#111111] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#8d877b]">Saldo esperado atual</p>
                  <p className="mt-2 text-2xl font-semibold text-[#8ce3b0]">{formatCurrency(summary.expectedCashBalance)}</p>
                </div>
                <div className="rounded-2xl border border-[#2a2a2a] bg-[#111111] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#8d877b]">Dinheiro vendido</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{formatCurrency(moneyPayment)}</p>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium text-white" htmlFor="cash-movement-amount">
                  Valor
                </label>
                <Input
                  id="cash-movement-amount"
                  type="text"
                  inputMode="numeric"
                  value={movementAmount}
                  onChange={(event) => setMovementAmount(formatCurrencyField(event.target.value))}
                  placeholder="0,00"
                  className="border-[#2f2f2f] bg-[#121212] text-sm text-[#ebe4d8] placeholder:text-[#7f786d]"
                />
                <p className="text-xs text-[#7f786d]">Digite em formato brasileiro. Ex.: `1200` vira `12,00`.</p>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium text-white" htmlFor="cash-movement-note">
                  Observacao
                </label>
                <Textarea
                  id="cash-movement-note"
                  value={movementNote}
                  onChange={(event) => setMovementNote(event.target.value)}
                  placeholder={movementType === "sangria" ? "Ex.: retirada para cofre." : "Ex.: troco inicial do caixa."}
                  className="min-h-[96px] border-[#2f2f2f] bg-[#121212] text-sm text-[#ebe4d8] placeholder:text-[#7f786d]"
                />
              </div>

              <div className="flex flex-wrap justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="border-[#313131] bg-transparent text-[#e5dfd5] hover:bg-[#212121]"
                  onClick={() => setShowMovementModal(false)}
                  disabled={movementLoading}
                >
                  Cancelar
                </Button>
                <Button type="button" variant="admin" disabled={movementLoading || summary.alreadyClosed} onClick={() => void handleCreateMovement()}>
                  {movementLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {movementActionLabel}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

