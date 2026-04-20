"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  CircleDollarSign,
  History,
  Loader2,
  MinusCircle,
  Printer,
  PlusCircle,
  Receipt,
  Store,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DSFeedback } from "@/components/system";
import {
  AdminPage,
  AdminHeader,
  AdminHeaderContent,
  AdminHeaderTitle,
  AdminHeaderDescription,
  AdminHeaderActions,
} from "@/components/layout";
import { getSupabaseBrowserClient } from "@/lib/realtime/client";
import { ReceiptPrintHost } from "@/components/receipt/receipt-print-host";
import { mapCashClosingToReceipt } from "@/lib/receipt/layout";
import { printReceiptFromDom } from "@/lib/receipt/print";
import type { CashClosingSummary, CashMovementType } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export function CashClosePanel({ initialSummary }: { initialSummary: CashClosingSummary }) {
  const [summary, setSummary] = useState(initialSummary);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
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
  const receipt = useMemo(() => mapCashClosingToReceipt(summary), [summary]);
  const movementActionLabel = movementType === "sangria" ? "Registrar sangria" : "Registrar suprimento";
  const moneyPayment = useMemo(
    () => summary.payments.find((payment) => payment.method === "dinheiro")?.total ?? 0,
    [summary.payments]
  );

  function formatCurrencyField(value: string) {
    const digits = value.replace(/\D/g, "");
    if (!digits) return "";
    return (Number(digits) / 100).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function parseCurrencyField(value: string) {
    const digits = value.replace(/\D/g, "");
    return digits ? Number(digits) / 100 : 0;
  }

  async function refreshSummary(options?: { silent?: boolean }) {
    if (refreshInFlightRef.current) return;
    refreshInFlightRef.current = true;
    if (!options?.silent) setRefreshing(true);

    try {
      if (!options?.silent) setError(null);

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
      setRefreshing(false);
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
        body: JSON.stringify({ note: closeNote.trim() || undefined }),
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
          note: movementNote.trim() || undefined,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Nao foi possivel registrar a movimentacao.");
      }

      setShowMovementModal(false);
      setMovementAmount("");
      setMovementNote("");
      setMessage(
        movementType === "sangria" ? "Sangria registrada com sucesso." : "Suprimento registrado com sucesso."
      );
      await refreshSummary({ silent: true });
    } catch (movementError) {
      setError(movementError instanceof Error ? movementError.message : "Erro ao registrar movimentacao.");
    } finally {
      setMovementLoading(false);
    }
  }

  async function handlePrintSummary() {
    try {
      await printReceiptFromDom();
    } catch (printError) {
      setError(printError instanceof Error ? printError.message : "Erro ao imprimir cupom.");
    }
  }

  return (
    <AdminPage gap="default">
      <ReceiptPrintHost receipt={receipt} />

      {/* ── Page header ── */}
      <AdminHeader>
        <AdminHeaderContent>
          <AdminHeaderTitle>Caixa</AdminHeaderTitle>
          <AdminHeaderDescription>
            Operação do dia — {summary.referenceDate}
            {refreshing && (
              <Loader2 className="ml-2 inline h-3.5 w-3.5 animate-spin text-admin-fg-faint" />
            )}
          </AdminHeaderDescription>
        </AdminHeaderContent>
        <AdminHeaderActions>
          {summary.lastUpdatedAt && (
            <span className="hidden text-xs text-admin-fg-faint sm:block">
              Atualizado às{" "}
              {new Date(summary.lastUpdatedAt).toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${
              summary.alreadyClosed
                ? "bg-status-success-fg/10 text-status-success-fg ring-status-success-border/30"
                : "bg-status-warning-fg/10 text-status-warning-fg ring-status-warning-border/30"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                summary.alreadyClosed
                  ? "bg-status-success-fg"
                  : "bg-status-warning-fg animate-pulse"
              }`}
            />
            {summary.alreadyClosed ? "Fechado" : "Aberto"}
          </span>
        </AdminHeaderActions>
      </AdminHeader>

      {/* ── Main grid ── */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_304px] 2xl:grid-cols-[minmax(0,1fr)_344px]">

      {/* ── Main column ── */}
      <div className="min-w-0 space-y-6">

        {/* Feedback */}
        {message && (
          <DSFeedback variant="success" title={message} onDismiss={() => setMessage(null)} />
        )}
        {error && (
          <DSFeedback variant="error" title={error} onDismiss={() => setError(null)} />
        )}

        {/* ── KPI strip ── */}
        <div className="grid gap-4 sm:grid-cols-3">

          {/* Faturamento */}
          <div className="group relative overflow-hidden rounded-ds-xl border border-[var(--admin-panel-border)] bg-[var(--admin-panel-bg)] p-6 shadow-soft transition-all duration-motion-default hover:shadow-card">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-status-warning-fg/60 to-transparent" />
            <div className="flex items-start justify-between">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-admin-fg-faint">
                Faturamento
              </p>
              <div className="rounded-ds-md bg-status-warning-fg/10 p-2 ring-1 ring-status-warning-fg/20">
                <CircleDollarSign className="h-3.5 w-3.5 text-status-warning-fg" />
              </div>
            </div>
            <p className="mt-4 text-3xl font-bold tracking-tight text-admin-fg">
              {formatCurrency(summary.total)}
            </p>
            <p className="mt-1.5 text-xs text-admin-fg-faint">Total do dia</p>
          </div>

          {/* Pedidos */}
          <div className="group relative overflow-hidden rounded-ds-xl border border-[var(--admin-panel-border)] bg-[var(--admin-panel-bg)] p-6 shadow-soft transition-all duration-motion-default hover:shadow-card">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-status-info-fg/60 to-transparent" />
            <div className="flex items-start justify-between">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-admin-fg-faint">
                Pedidos
              </p>
              <div className="rounded-ds-md bg-status-info-fg/10 p-2 ring-1 ring-status-info-fg/20">
                <Receipt className="h-3.5 w-3.5 text-status-info-fg" />
              </div>
            </div>
            <p className="mt-4 text-3xl font-bold tracking-tight text-admin-fg">
              {summary.ordersCount}
            </p>
            <p className="mt-1.5 text-xs text-admin-fg-faint">
              {summary.tablesCount} mesa{summary.tablesCount !== 1 ? "s" : ""} fechadas
            </p>
          </div>

          {/* Saldo em dinheiro */}
          <div className="group relative overflow-hidden rounded-ds-xl border border-[var(--admin-panel-border)] bg-[var(--admin-panel-bg)] p-6 shadow-soft transition-all duration-motion-default hover:shadow-card">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-status-success-fg/60 to-transparent" />
            <div className="flex items-start justify-between">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-admin-fg-faint">
                Saldo em dinheiro
              </p>
              <div className="rounded-ds-md bg-status-success-fg/10 p-2 ring-1 ring-status-success-fg/20">
                <Wallet className="h-3.5 w-3.5 text-status-success-fg" />
              </div>
            </div>
            <p className="mt-4 text-3xl font-bold tracking-tight text-status-success-fg">
              {formatCurrency(summary.expectedCashBalance)}
            </p>
            <p className="mt-1.5 text-xs text-admin-fg-faint">Saldo a conferir no caixa</p>
          </div>
        </div>

        {/* ── Pagamentos por método ── */}
        <div className="overflow-hidden rounded-ds-xl border border-[var(--admin-panel-border)] bg-[var(--admin-panel-bg)] shadow-soft">
          {/* Section header */}
          <div className="border-b border-[var(--admin-panel-header-border)] bg-[var(--admin-panel-header-bg)] px-6 py-4">
            <p className="text-sm font-semibold text-admin-fg">Pagamentos por método</p>
            <p className="mt-0.5 text-xs text-admin-fg-faint">
              Totais consolidados por forma de pagamento
            </p>
          </div>

          {summary.payments.length ? (
            <table className="w-full">
              <thead>
                <tr className="border-b border-admin-border-faint bg-admin-shell/60">
                  <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-[0.18em] text-admin-fg-faint">
                    Método
                  </th>
                  <th className="px-6 py-3 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-admin-fg-faint">
                    Lançamentos
                  </th>
                  <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-[0.18em] text-admin-fg-faint">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {summary.payments.map((payment, index) => (
                  <tr
                    key={payment.method}
                    className={`group transition-colors duration-motion-fast hover:bg-admin-surface/60 ${
                      index !== 0 ? "border-t border-admin-border-faint" : ""
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-ds-md bg-admin-overlay ring-1 ring-admin-border-faint">
                          <span className="text-[9px] font-bold uppercase text-admin-fg-faint">
                            {payment.method.slice(0, 2)}
                          </span>
                        </div>
                        <span className="text-sm font-medium capitalize text-admin-fg-secondary">
                          {payment.method.replaceAll("_", " ")}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center text-sm tabular-nums text-admin-fg-faint">
                      {payment.count}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-bold tabular-nums text-admin-fg">
                      {formatCurrency(payment.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-admin-border-faint bg-admin-shell/80">
                  <td className="px-6 py-4 text-xs font-bold uppercase tracking-[0.14em] text-admin-fg-faint">
                    Total do dia
                  </td>
                  <td className="px-6 py-4 text-center text-xs tabular-nums text-admin-fg-faint">
                    {summary.payments.reduce((sum, p) => sum + p.count, 0)}
                  </td>
                  <td className="px-6 py-4 text-right text-base font-bold tabular-nums text-status-warning-fg">
                    {formatCurrency(summary.total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          ) : (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-admin-overlay ring-1 ring-admin-border-faint">
                <Receipt className="h-5 w-5 text-admin-fg-faint" />
              </div>
              <p className="text-sm font-semibold text-admin-fg-secondary">
                Nenhum pagamento consolidado
              </p>
              <p className="mt-1.5 max-w-[240px] text-xs leading-relaxed text-admin-fg-faint">
                Feche as mesas para os totais aparecerem aqui.
              </p>
            </div>
          )}
        </div>

        {/* ── Movimentações do dia ── */}
        <div className="overflow-hidden rounded-ds-xl border border-[var(--admin-panel-border)] bg-[var(--admin-panel-bg)] shadow-soft">
          <div className="border-b border-[var(--admin-panel-header-border)] bg-[var(--admin-panel-header-bg)] px-6 py-4">
            <p className="text-sm font-semibold text-admin-fg">Movimentações do dia</p>
            <p className="mt-0.5 text-xs text-admin-fg-faint">
              Sangrias e suprimentos registrados hoje
            </p>
          </div>

          {summary.movements.length ? (
            <table className="w-full">
              <thead>
                <tr className="border-b border-admin-border-faint bg-admin-shell/60">
                  <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-[0.18em] text-admin-fg-faint">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-[0.18em] text-admin-fg-faint">
                    Horário
                  </th>
                  <th className="hidden px-6 py-3 text-left text-[10px] font-bold uppercase tracking-[0.18em] text-admin-fg-faint sm:table-cell">
                    Observação
                  </th>
                  <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-[0.18em] text-admin-fg-faint">
                    Valor
                  </th>
                </tr>
              </thead>
              <tbody>
                {summary.movements.map((movement, index) => (
                  <tr
                    key={movement.id}
                    className={`group transition-colors duration-motion-fast hover:bg-admin-surface/60 ${
                      index !== 0 ? "border-t border-admin-border-faint" : ""
                    }`}
                  >
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
                          movement.type === "sangria"
                            ? "bg-status-danger-fg/10 text-status-danger-fg ring-status-danger-fg/20"
                            : "bg-status-success-fg/10 text-status-success-fg ring-status-success-fg/20"
                        }`}
                      >
                        {movement.type === "sangria" ? (
                          <ArrowDownLeft className="h-3 w-3" />
                        ) : (
                          <ArrowUpRight className="h-3 w-3" />
                        )}
                        {movement.type === "sangria" ? "Sangria" : "Suprimento"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm tabular-nums text-admin-fg-faint">
                      {new Date(movement.createdAt).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="hidden px-6 py-4 text-sm text-admin-fg-faint sm:table-cell">
                      {movement.note ?? (
                        <span className="text-admin-fg-faint/40">—</span>
                      )}
                    </td>
                    <td
                      className={`px-6 py-4 text-right text-sm font-bold tabular-nums ${
                        movement.type === "sangria"
                          ? "text-status-danger-fg"
                          : "text-status-success-fg"
                      }`}
                    >
                      {movement.type === "sangria" ? "−" : "+"}
                      {formatCurrency(movement.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-admin-overlay ring-1 ring-admin-border-faint">
                <Wallet className="h-5 w-5 text-admin-fg-faint" />
              </div>
              <p className="text-sm font-semibold text-admin-fg-secondary">
                Nenhuma movimentação hoje
              </p>
              <p className="mt-1.5 max-w-[240px] text-xs leading-relaxed text-admin-fg-faint">
                Use Sangria ou Suprimento no painel ao lado para registrar entradas e saídas.
              </p>
            </div>
          )}
        </div>

        {/* ── Origem + Fechamentos recentes ── */}
        <div className="grid gap-4 xl:grid-cols-2">

          <div className="overflow-hidden rounded-ds-xl border border-[var(--admin-panel-border)] bg-[var(--admin-panel-bg)] shadow-soft">
            <div className="flex items-center gap-2.5 border-b border-[var(--admin-panel-header-border)] bg-[var(--admin-panel-header-bg)] px-6 py-4">
              <div className="flex h-6 w-6 items-center justify-center rounded-ds-sm bg-status-info-fg/10">
                <Store className="h-3.5 w-3.5 text-status-info-fg" />
              </div>
              <p className="text-sm font-semibold text-admin-fg">Origem dos fechamentos</p>
            </div>
            <div className="divide-y divide-admin-border-faint">
              {summary.origins.length ? (
                summary.origins.map((origin) => (
                  <div
                    key={origin.key}
                    className="flex items-center justify-between px-6 py-4 transition-colors duration-motion-fast hover:bg-admin-surface/60"
                  >
                    <div>
                      <p className="text-sm font-medium text-admin-fg-secondary">
                        {origin.label}
                      </p>
                      <p className="mt-0.5 text-xs text-admin-fg-faint">
                        {origin.count} fechamento{origin.count !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <p className="text-sm font-bold tabular-nums text-admin-fg">
                      {formatCurrency(origin.total)}
                    </p>
                  </div>
                ))
              ) : (
                <div className="px-6 py-10 text-center text-sm text-admin-fg-faint">
                  Nenhum fechamento registrado hoje.
                </div>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-ds-xl border border-[var(--admin-panel-border)] bg-[var(--admin-panel-bg)] shadow-soft">
            <div className="border-b border-[var(--admin-panel-header-border)] bg-[var(--admin-panel-header-bg)] px-6 py-4">
              <p className="text-sm font-semibold text-admin-fg">Fechamentos recentes</p>
            </div>
            <div className="divide-y divide-admin-border-faint">
              {summary.recentClosures.length ? (
                summary.recentClosures.map((closure) => (
                  <div
                    key={closure.id}
                    className="flex items-center justify-between px-6 py-4 transition-colors duration-motion-fast hover:bg-admin-surface/60"
                  >
                    <div>
                      <p className="text-sm font-medium text-admin-fg-secondary">
                        {closure.label}
                      </p>
                      <p className="mt-0.5 text-xs text-admin-fg-faint">
                        {closure.paymentMethod} ·{" "}
                        {new Date(closure.closedAt).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <p className="text-sm font-bold tabular-nums text-admin-fg">
                      {formatCurrency(closure.total)}
                    </p>
                  </div>
                ))
              ) : (
                <div className="px-6 py-10 text-center text-sm text-admin-fg-faint">
                  Nenhum fechamento recente hoje.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Right sidebar ── */}
      <div className="space-y-4">

        {/* Controle de dinheiro */}
        <div className="overflow-hidden rounded-ds-xl border border-[var(--admin-panel-border)] bg-[var(--admin-panel-bg)] shadow-soft">
          <div className="border-b border-[var(--admin-panel-header-border)] bg-[var(--admin-panel-header-bg)] px-5 py-4">
            <p className="text-sm font-semibold text-admin-fg">Controle de dinheiro</p>
            <p className="mt-0.5 text-xs text-admin-fg-faint">Conferência do saldo físico</p>
          </div>

          <div className="p-4">
            <div className="space-y-1">
              <div className="flex items-center justify-between rounded-ds-lg px-3 py-3 transition-colors duration-motion-fast hover:bg-admin-surface/60">
                <p className="text-xs text-admin-fg-faint">Vendas em dinheiro</p>
                <p className="text-sm font-semibold tabular-nums text-admin-fg">
                  {formatCurrency(moneyPayment)}
                </p>
              </div>
              <div className="flex items-center justify-between rounded-ds-lg px-3 py-3 transition-colors duration-motion-fast hover:bg-admin-surface/60">
                <div className="flex items-center gap-1.5">
                  <ArrowDownLeft className="h-3 w-3 text-status-danger-fg/70" />
                  <p className="text-xs text-admin-fg-faint">Total de sangrias</p>
                </div>
                <p className="text-sm font-semibold tabular-nums text-status-danger-fg">
                  −{formatCurrency(summary.movementTotals.sangria)}
                </p>
              </div>
              <div className="flex items-center justify-between rounded-ds-lg px-3 py-3 transition-colors duration-motion-fast hover:bg-admin-surface/60">
                <div className="flex items-center gap-1.5">
                  <ArrowUpRight className="h-3 w-3 text-status-success-fg/70" />
                  <p className="text-xs text-admin-fg-faint">Total de suprimentos</p>
                </div>
                <p className="text-sm font-semibold tabular-nums text-status-success-fg">
                  +{formatCurrency(summary.movementTotals.suprimento)}
                </p>
              </div>
            </div>

            {/* Saldo total */}
            <div className="mt-3 overflow-hidden rounded-ds-lg border border-status-success-border/20 bg-status-success-fg/[0.06]">
              <div className="flex items-center justify-between px-4 py-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-status-success-fg/70">
                    Saldo a conferir
                  </p>
                  <p className="mt-0.5 text-xs text-admin-fg-faint">Físico no caixa</p>
                </div>
                <p className="text-xl font-bold tabular-nums text-status-success-fg">
                  {formatCurrency(summary.expectedCashBalance)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Ações */}
        <div className="overflow-hidden rounded-ds-xl border border-[var(--admin-panel-border)] bg-[var(--admin-panel-bg)] shadow-soft">
          <div className="border-b border-[var(--admin-panel-header-border)] bg-[var(--admin-panel-header-bg)] px-5 py-4">
            <p className="text-sm font-semibold text-admin-fg">Ações de caixa</p>
          </div>

          <div className="space-y-2 p-4">
            {/* Sangria */}
            <button
              type="button"
              disabled={summary.alreadyClosed}
              onClick={() => {
                setMovementType("sangria");
                setShowMovementModal(true);
              }}
              className="group flex w-full items-center gap-3.5 rounded-ds-lg border border-admin-border-faint bg-admin-surface/80 px-4 py-3.5 text-left transition-all duration-motion-default hover:border-status-danger-fg/30 hover:bg-admin-elevated disabled:pointer-events-none disabled:opacity-40"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-ds-md bg-status-danger-fg/10 ring-1 ring-status-danger-fg/20 transition-colors group-hover:bg-status-danger-fg/15">
                <MinusCircle className="h-3.5 w-3.5 text-status-danger-fg" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-admin-fg">Sangria</p>
                <p className="text-xs text-admin-fg-faint">Registrar retirada de dinheiro</p>
              </div>
            </button>

            {/* Suprimento */}
            <button
              type="button"
              disabled={summary.alreadyClosed}
              onClick={() => {
                setMovementType("suprimento");
                setShowMovementModal(true);
              }}
              className="group flex w-full items-center gap-3.5 rounded-ds-lg border border-admin-border-faint bg-admin-surface/80 px-4 py-3.5 text-left transition-all duration-motion-default hover:border-status-success-fg/30 hover:bg-admin-elevated disabled:pointer-events-none disabled:opacity-40"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-ds-md bg-status-success-fg/10 ring-1 ring-status-success-fg/20 transition-colors group-hover:bg-status-success-fg/15">
                <PlusCircle className="h-3.5 w-3.5 text-status-success-fg" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-admin-fg">Suprimento</p>
                <p className="text-xs text-admin-fg-faint">Registrar entrada de dinheiro</p>
              </div>
            </button>

            {/* Imprimir */}
            <button
              type="button"
              onClick={handlePrintSummary}
              className="group flex w-full items-center gap-3.5 rounded-ds-lg border border-admin-border-faint bg-admin-surface/80 px-4 py-3.5 text-left transition-all duration-motion-default hover:bg-admin-elevated"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-ds-md bg-admin-overlay ring-1 ring-admin-border-faint">
                <Printer className="h-3.5 w-3.5 text-admin-fg-secondary" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-admin-fg">Imprimir resumo</p>
                <p className="text-xs text-admin-fg-faint">Gerar comprovante do caixa</p>
              </div>
            </button>

            <div className="pt-1">
              {!summary.alreadyClosed ? (
                <Button
                  type="button"
                  variant="admin"
                  className="h-10 w-full rounded-ds-lg text-sm font-semibold"
                  disabled={loading}
                  onClick={() => setShowCloseModal(true)}
                >
                  {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  Fechar caixa
                </Button>
              ) : (
                <div className="flex items-center gap-3 rounded-ds-lg border border-status-success-border/20 bg-status-success-fg/[0.06] px-4 py-3.5">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-status-success-fg" />
                  <div>
                    <p className="text-sm font-semibold text-status-success-fg">
                      Caixa fechado
                    </p>
                    {summary.lastClosedAt && (
                      <p className="text-xs text-admin-fg-faint">
                        Registrado às{" "}
                        {new Date(summary.lastClosedAt).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Como usar */}
        <div className="overflow-hidden rounded-ds-xl border border-[var(--admin-panel-border)] bg-[var(--admin-panel-bg)] shadow-soft">
          <div className="border-b border-[var(--admin-panel-header-border)] bg-[var(--admin-panel-header-bg)] px-5 py-4">
            <p className="text-sm font-semibold text-admin-fg">Como usar</p>
            <p className="mt-0.5 text-xs text-admin-fg-faint">Etapas ao final do expediente</p>
          </div>

          <ol className="divide-y divide-admin-border-faint">
            {[
              {
                label: "Feche as mesas",
                desc: "Finalize as contas no Gestor de Pedidos.",
              },
              {
                label: "Confira os pagamentos",
                desc: "Valide os totais por método antes de consolidar.",
              },
              {
                label: "Registre sangrias",
                desc: "Toda retirada de dinheiro deve ser registrada.",
              },
              {
                label: "Feche o caixa",
                desc: "Consolida o resumo financeiro do dia.",
              },
              {
                label: "Consulte o histórico",
                desc: "Valide os caixas anteriores quando necessário.",
              },
            ].map((step, index) => (
              <li
                key={index}
                className="flex items-start gap-4 px-5 py-4 transition-colors duration-motion-fast hover:bg-admin-surface/60"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-admin-overlay text-[10px] font-bold tabular-nums text-admin-fg-faint ring-1 ring-admin-border-faint">
                  {index + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold text-admin-fg">{step.label}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-admin-fg-muted">
                    {step.desc}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          <div className="border-t border-admin-border-faint p-4">
            <Link
              href="/admin/historico"
              className="flex items-center gap-2.5 rounded-ds-lg border border-admin-border px-4 py-3 text-sm font-medium text-admin-fg transition-all duration-motion-default hover:bg-admin-overlay"
            >
              <History className="h-3.5 w-3.5 text-admin-fg-faint" />
              Ver histórico de caixas
            </Link>
          </div>
        </div>
      </div>
      </div>{/* ── /main grid ── */}

      {/* ── Modal: Fechar caixa ── */}
      <Dialog
        open={showCloseModal}
        onOpenChange={(open) => {
          if (!open && !loading) setShowCloseModal(false);
        }}
      >
        <DialogContent className="overflow-hidden rounded-ds-2xl border-admin-border bg-admin-surface p-0 shadow-panel sm:max-w-lg [&>button]:text-admin-fg-muted [&>button]:hover:text-admin-fg [&>button]:top-5 [&>button]:right-5">
          <DialogHeader className="px-7 pt-7 pb-5">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-admin-fg-muted">
              Fechamento de caixa
            </p>
            <DialogTitle className="mt-1.5 text-2xl font-bold text-admin-fg">
              Confirmar fechamento do dia
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-3 border-t border-admin-border-faint bg-admin-shell/60">
            <div className="border-r border-admin-border-faint px-6 py-5">
              <p className="text-[10px] uppercase tracking-[0.14em] text-admin-fg-muted">Total</p>
              <p className="mt-2 text-2xl font-bold tabular-nums text-status-warning-fg">
                {formatCurrency(summary.total)}
              </p>
            </div>
            <div className="border-r border-admin-border-faint px-6 py-5">
              <p className="text-[10px] uppercase tracking-[0.14em] text-admin-fg-muted">Pedidos</p>
              <p className="mt-2 text-2xl font-bold tabular-nums text-admin-fg">
                {summary.ordersCount}
              </p>
            </div>
            <div className="px-6 py-5">
              <p className="text-[10px] uppercase tracking-[0.14em] text-admin-fg-muted">Mesas</p>
              <p className="mt-2 text-2xl font-bold tabular-nums text-admin-fg">
                {summary.tablesCount}
              </p>
            </div>
          </div>

          <div className="border-t border-admin-border-faint px-7 py-6">
            <label
              className="text-xs font-bold uppercase tracking-[0.2em] text-admin-fg-muted"
              htmlFor="cash-close-note"
            >
              Observação
            </label>
            <Textarea
              id="cash-close-note"
              value={closeNote}
              onChange={(event) => setCloseNote(event.target.value)}
              placeholder="Ex.: caixa conferido, sem divergencias."
              className="mt-3 min-h-[90px] border-admin-border bg-admin-elevated text-sm text-admin-fg-secondary placeholder:text-admin-fg-faint focus-visible:ring-brand-gold/30"
            />
          </div>

          <DialogFooter className="flex-row items-center justify-between border-t border-admin-border-faint px-7 py-5 sm:justify-between">
            <button
              type="button"
              className="text-sm font-medium text-admin-fg-muted transition-colors hover:text-admin-fg disabled:opacity-40"
              onClick={() => setShowCloseModal(false)}
              disabled={loading}
            >
              Cancelar
            </button>
            <Button
              type="button"
              variant="admin"
              className="h-10 rounded-ds-lg px-6 text-sm font-semibold"
              disabled={loading || summary.alreadyClosed}
              onClick={() => void handleCloseCash()}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Confirmar fechamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Sangria / Suprimento ── */}
      <Dialog
        open={showMovementModal}
        onOpenChange={(open) => {
          if (!open && !movementLoading) setShowMovementModal(false);
        }}
      >
        <DialogContent className="overflow-hidden rounded-ds-2xl border-admin-border bg-admin-surface p-0 shadow-panel sm:max-w-lg [&>button]:text-admin-fg-muted [&>button]:hover:text-admin-fg [&>button]:top-5 [&>button]:right-5">
          <DialogHeader className="px-7 pt-7 pb-5">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-admin-fg-muted">
              Movimentação de caixa
            </p>
            <DialogTitle className="mt-1.5 text-2xl font-bold text-admin-fg">
              {movementActionLabel}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 border-t border-admin-border-faint bg-admin-shell/60">
            <div className="border-r border-admin-border-faint px-7 py-5">
              <p className="text-[10px] uppercase tracking-[0.14em] text-admin-fg-muted">
                Saldo esperado
              </p>
              <p className="mt-2 text-xl font-bold tabular-nums text-status-success-fg">
                {formatCurrency(summary.expectedCashBalance)}
              </p>
            </div>
            <div className="px-7 py-5">
              <p className="text-[10px] uppercase tracking-[0.14em] text-admin-fg-muted">
                Dinheiro vendido
              </p>
              <p className="mt-2 text-xl font-bold tabular-nums text-admin-fg">
                {formatCurrency(moneyPayment)}
              </p>
            </div>
          </div>

          <div className="space-y-5 border-t border-admin-border-faint px-7 py-6">
            <div className="space-y-2">
              <label
                className="text-xs font-bold uppercase tracking-[0.2em] text-admin-fg-muted"
                htmlFor="cash-movement-amount"
              >
                Valor
              </label>
              <Input
                id="cash-movement-amount"
                type="text"
                inputMode="numeric"
                value={movementAmount}
                onChange={(event) => setMovementAmount(formatCurrencyField(event.target.value))}
                placeholder="0,00"
                className="border-admin-border bg-admin-elevated text-sm text-admin-fg-secondary placeholder:text-admin-fg-faint focus-visible:ring-brand-gold/30"
              />
            </div>
            <div className="space-y-2">
              <label
                className="text-xs font-bold uppercase tracking-[0.2em] text-admin-fg-muted"
                htmlFor="cash-movement-note"
              >
                Observação
              </label>
              <Textarea
                id="cash-movement-note"
                value={movementNote}
                onChange={(event) => setMovementNote(event.target.value)}
                placeholder={
                  movementType === "sangria"
                    ? "Ex.: retirada para cofre."
                    : "Ex.: troco inicial do caixa."
                }
                className="min-h-[80px] border-admin-border bg-admin-elevated text-sm text-admin-fg-secondary placeholder:text-admin-fg-faint focus-visible:ring-brand-gold/30"
              />
            </div>
          </div>

          <DialogFooter className="flex-row items-center justify-between border-t border-admin-border-faint px-7 py-5 sm:justify-between">
            <button
              type="button"
              className="text-sm font-medium text-admin-fg-muted transition-colors hover:text-admin-fg disabled:opacity-40"
              onClick={() => setShowMovementModal(false)}
              disabled={movementLoading}
            >
              Cancelar
            </button>
            <Button
              type="button"
              variant="admin"
              className="h-10 rounded-ds-lg px-6 text-sm font-semibold"
              disabled={movementLoading || summary.alreadyClosed}
              onClick={() => void handleCreateMovement()}
            >
              {movementLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {movementActionLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
}
