"use client";

import { useMemo, useState, type ElementType } from "react";
import Link from "next/link";
import {
  Archive,
  ArrowRight,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  FileSearch,
  ReceiptText,
  Search,
  ShieldCheck,
  TrendingUp,
  X,
} from "lucide-react";

import { AdminGrid, AdminPage } from "@/components/layout";
import { DSBadge, DSButton, DSCard, DSEmpty, DSInput } from "@/components/system";
import type { FinancialHistoryEntry } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 25;

type KindKey = FinancialHistoryEntry["kind"];
type KindFilter = "all" | KindKey;

const KIND_CONFIG: Record<KindKey, { label: string; variant: "warning" | "info" | "success" | "new" }> = {
  caixa: {
    label: "Caixa",
    variant: "warning",
  },
  mesa: {
    label: "Mesa",
    variant: "info",
  },
  delivery: {
    label: "Delivery",
    variant: "success",
  },
  retirada: {
    label: "Retirada",
    variant: "new",
  },
};

const KIND_FILTERS: { value: KindFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "caixa", label: "Caixa" },
  { value: "mesa", label: "Mesa" },
  { value: "delivery", label: "Delivery" },
  { value: "retirada", label: "Retirada" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtPayment(method: string) {
  return method.replaceAll("_", " ");
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KindBadge({ kind }: { kind: KindKey }) {
  const cfg = KIND_CONFIG[kind];
  return <DSBadge variant={cfg.variant}>{cfg.label}</DSBadge>;
}

function AuditMetric({
  icon: Icon,
  label,
  value,
  sub,
  tone = "default",
}: {
  icon: ElementType;
  label: string;
  value: string;
  sub: string;
  tone?: "default" | "success" | "warning" | "info" | "new";
}) {
  const toneClass = {
    default: "text-admin-fg",
    success: "text-status-success-fg",
    warning: "text-status-warning-fg",
    info: "text-status-info-fg",
    new: "text-status-new-fg",
  }[tone];

  return (
    <div className="rounded-ds-lg border border-admin-border bg-admin-surface p-4 shadow-soft">
      <div className="flex items-center gap-2.5">
        <span className={`flex h-8 w-8 items-center justify-center rounded-ds-sm border border-admin-border bg-admin-elevated ${toneClass}`}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-xs font-medium uppercase tracking-wider text-admin-fg-faint">
          {label}
        </span>
      </div>
      <p className={`mt-4 text-2xl font-semibold leading-none tabular-nums ${toneClass}`}>
        {value}
      </p>
      <p className="mt-2 text-xs text-admin-fg-faint">{sub}</p>
    </div>
  );
}

function EmptyState({
  filtered,
  onClear,
}: {
  filtered: boolean;
  onClear: () => void;
}) {
  return (
    <DSEmpty
      context={filtered ? "search" : "history"}
      size="lg"
      title={filtered ? "Nenhum registro encontrado" : "Nenhum histórico registrado"}
      description={
        filtered
          ? "Ajuste a busca ou remova filtros para ampliar a auditoria."
          : "Fechamentos de caixa, mesas e pedidos aparecerão aqui."
      }
      action={
        filtered
          ? { label: "Limpar filtros", onClick: onClear, variant: "secondary" }
          : undefined
      }
    />
  );
}

function AuditRail({
  stats,
  filteredCount,
  totalCount,
}: {
  stats: {
    total: number;
    caixaCount: number;
    last?: FinancialHistoryEntry;
    average: number;
    mesaCount: number;
    deliveryCount: number;
    retiradaCount: number;
  };
  filteredCount: number;
  totalCount: number;
}) {
  return (
    <aside className="space-y-5">
      <DSCard padding="lg" className="shadow-card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <DSBadge variant="success">Rastreável</DSBadge>
            <h3 className="mt-3 text-base font-semibold text-admin-fg">
              Confiança operacional
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-admin-fg-muted">
              Base pronta para revisão financeira e inspeção de registros.
            </p>
          </div>
          <ShieldCheck className="h-5 w-5 text-status-success-fg" />
        </div>

        <div className="mt-5 space-y-3">
          <div className="rounded-ds-lg border border-admin-border bg-admin-surface p-4">
            <p className="text-xs text-admin-fg-faint">Registro mais recente</p>
            <p className="mt-2 text-sm font-medium text-admin-fg">
              {stats.last ? stats.last.label : "Sem registros"}
            </p>
            <p className="mt-1 text-xs text-admin-fg-faint">
              {stats.last ? fmtDateTime(stats.last.occurredAt) : "Aguardando fechamentos"}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-ds-lg border border-admin-border bg-admin-surface p-4">
              <p className="text-xs text-admin-fg-faint">Visíveis</p>
              <p className="mt-2 text-xl font-semibold tabular-nums text-admin-fg">
                {filteredCount}
              </p>
            </div>
            <div className="rounded-ds-lg border border-admin-border bg-admin-surface p-4">
              <p className="text-xs text-admin-fg-faint">Total</p>
              <p className="mt-2 text-xl font-semibold tabular-nums text-admin-fg">
                {totalCount}
              </p>
            </div>
          </div>

          <div className="rounded-ds-lg border border-admin-border bg-admin-surface p-4">
            <p className="text-xs text-admin-fg-faint">Ticket médio histórico</p>
            <p className="mt-2 text-xl font-semibold tabular-nums text-brand-gold">
              {formatCurrency(stats.average)}
            </p>
          </div>
        </div>
      </DSCard>

      <DSCard padding="lg" className="shadow-card">
        <div className="flex items-center gap-2">
          <FileSearch className="h-4 w-4 text-status-info-fg" />
          <h3 className="text-base font-semibold text-admin-fg">Distribuição</h3>
        </div>
        <p className="mt-1 text-sm text-admin-fg-muted">
          Volume por origem de registro.
        </p>
        <div className="mt-5 space-y-3">
          {[
            { label: "Caixa", value: stats.caixaCount, variant: "warning" as const },
            { label: "Mesa", value: stats.mesaCount, variant: "info" as const },
            { label: "Delivery", value: stats.deliveryCount, variant: "success" as const },
            { label: "Retirada", value: stats.retiradaCount, variant: "new" as const },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-3">
              <DSBadge variant={item.variant}>{item.label}</DSBadge>
              <span className="text-sm font-semibold tabular-nums text-admin-fg">
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </DSCard>
    </aside>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function HistoryView({ entries }: { entries: FinancialHistoryEntry[] }) {
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [page, setPage] = useState(1);

  // ── Derived stats ──
  const stats = useMemo(() => {
    const total = entries.reduce((sum, e) => sum + e.total, 0);
    const caixaCount = entries.filter((e) => e.kind === "caixa").length;
    const mesaCount = entries.filter((e) => e.kind === "mesa").length;
    const deliveryCount = entries.filter((e) => e.kind === "delivery").length;
    const retiradaCount = entries.filter((e) => e.kind === "retirada").length;
    const average = entries.length ? total / entries.length : 0;
    const last = entries[0];
    return { total, caixaCount, mesaCount, deliveryCount, retiradaCount, average, last };
  }, [entries]);

  // ── Filtered list ──
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return entries.filter((e) => {
      if (kindFilter !== "all" && e.kind !== kindFilter) return false;
      if (!q) return true;
      return (
        e.label.toLowerCase().includes(q) ||
        e.details.toLowerCase().includes(q) ||
        fmtPayment(e.paymentMethod).toLowerCase().includes(q)
      );
    });
  }, [entries, search, kindFilter]);

  // ── Pagination ──
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const hasFilters = search !== "" || kindFilter !== "all";

  function clearFilters() {
    setSearch("");
    setKindFilter("all");
    setPage(1);
  }

  // ── Page numbers for pagination ──
  const pageNumbers = useMemo(() => {
    const count = Math.min(5, totalPages);
    let start = 1;
    if (totalPages > 5) {
      if (currentPage <= 3) start = 1;
      else if (currentPage >= totalPages - 2) start = totalPages - 4;
      else start = currentPage - 2;
    }
    return Array.from({ length: count }, (_, i) => start + i);
  }, [totalPages, currentPage]);

  return (
    <AdminPage gap="relaxed">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl space-y-3">
          <DSBadge variant="admin">Operational History Workspace</DSBadge>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-admin-fg">
              Histórico
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-admin-fg-muted">
              Revise fechamentos, registros financeiros e atividade operacional com rastreabilidade.
            </p>
          </div>
        </div>

        <DSButton type="button" variant="admin" size="sm" asChild>
          <Link href="/admin/caixa">
            <CircleDollarSign className="h-3.5 w-3.5" />
            Ir para caixa
          </Link>
        </DSButton>
      </header>

      <DSCard padding="lg" entering className="overflow-hidden shadow-panel">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)]">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <DSBadge variant="success">Auditoria pronta</DSBadge>
              <span className="text-sm text-admin-fg-muted">
                {entries.length} registro{entries.length !== 1 ? "s" : ""} no arquivo
              </span>
            </div>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-admin-fg">
                Resumo histórico consolidado
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-admin-fg-muted">
                Encontre rapidamente o último fechamento, valores consolidados e registros que precisam de revisão.
              </p>
            </div>
          </div>

          <div className="rounded-ds-xl border border-admin-border bg-admin-surface p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-admin-fg-faint">
              Leitura imediata
            </p>
            <p className="mt-3 text-3xl font-semibold tabular-nums text-brand-gold">
              {formatCurrency(stats.total)}
            </p>
            <p className="mt-2 text-sm text-admin-fg-muted">
              {stats.last
                ? `${stats.last.label} em ${fmtDate(stats.last.occurredAt)}`
                : "Sem registros para auditar"}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <AuditMetric
            icon={ReceiptText}
            label="Registros"
            value={String(entries.length)}
            sub="total no histórico"
            tone="default"
          />
          <AuditMetric
            icon={TrendingUp}
            label="Receita"
            value={formatCurrency(stats.total)}
            sub="valor consolidado"
            tone="warning"
          />
          <AuditMetric
            icon={Archive}
            label="Caixas"
            value={String(stats.caixaCount)}
            sub="fechamentos de caixa"
            tone="info"
          />
          <AuditMetric
            icon={Calendar}
            label="Último"
            value={stats.last ? fmtDate(stats.last.occurredAt) : "—"}
            sub="registro mais recente"
            tone="new"
          />
        </div>
      </DSCard>

      <AdminGrid cols="sidebar-sm" gap="xl">
        <div className="space-y-5">
          <DSCard padding="lg" className="shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <DSBadge variant="secondary">Filtros e navegação</DSBadge>
                <h2 className="mt-3 text-xl font-semibold tracking-tight text-admin-fg">
                  Auditoria dos registros
                </h2>
                <p className="mt-1 text-sm text-admin-fg-muted">
                  Busque por registro, detalhe ou forma de pagamento.
                </p>
              </div>
              {hasFilters && (
                <DSButton type="button" variant="secondary" size="sm" onClick={clearFilters}>
                  <X className="h-3.5 w-3.5" />
                  Limpar filtros
                </DSButton>
              )}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <div className="relative min-w-[220px] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-admin-fg-faint" />
                <DSInput
                  type="text"
                  placeholder="Buscar registro, detalhes ou pagamento..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-9"
                />
              </div>

              <div className="flex flex-wrap gap-1.5">
                {KIND_FILTERS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setKindFilter(opt.value);
                      setPage(1);
                    }}
                    className={[
                      "rounded-ds-sm border px-3 py-2 text-xs font-medium transition-all duration-motion-default ease-motion-in-out",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/30",
                      kindFilter === opt.value
                        ? "border-brand-gold bg-brand-gold text-admin-base"
                        : "border-admin-border bg-admin-surface text-admin-fg-muted hover:border-admin-border-strong hover:text-admin-fg",
                    ].join(" ")}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <p className="mt-4 text-xs text-admin-fg-faint">
              {filtered.length === entries.length
                ? `${entries.length} registro${entries.length !== 1 ? "s" : ""}`
                : `${filtered.length} de ${entries.length} registros`}
            </p>
          </DSCard>

          <DSCard className="overflow-hidden shadow-panel">
            <div className="border-b border-admin-border-faint bg-admin-surface px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-admin-fg">Linha do tempo auditável</h2>
                  <p className="mt-1 text-sm text-admin-fg-muted">
                    Registros ordenados para inspeção e conferência.
                  </p>
                </div>
                <DSBadge variant="admin">
                  {paginated.length} visível{paginated.length !== 1 ? "s" : ""}
                </DSBadge>
              </div>
            </div>

            {paginated.length === 0 ? (
              <EmptyState filtered={hasFilters} onClear={clearFilters} />
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[760px]">
                    <thead>
                      <tr className="border-b border-admin-border-faint bg-admin-elevated">
                        <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-admin-fg-faint">
                          Tipo
                        </th>
                        <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-admin-fg-faint">
                          Registro
                        </th>
                        <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-admin-fg-faint">
                          Detalhes
                        </th>
                        <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-admin-fg-faint">
                          Pagamento
                        </th>
                        <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-admin-fg-faint">
                          Total
                        </th>
                        <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-admin-fg-faint">
                          Data
                        </th>
                        <th className="px-5 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-admin-border-faint">
                      {paginated.map((entry) => (
                        <tr
                          key={entry.id}
                          className="group transition-colors duration-motion-default ease-motion-in-out hover:bg-admin-overlay"
                        >
                          <td className="px-5 py-4">
                            <KindBadge kind={entry.kind} />
                          </td>
                          <td className="px-5 py-4">
                            <span className="text-sm font-medium text-admin-fg">
                              {entry.label}
                            </span>
                          </td>
                          <td className="max-w-[240px] px-5 py-4">
                            <span className="block truncate text-sm text-admin-fg-muted">
                              {entry.details}
                            </span>
                            {entry.note && (
                              <span className="mt-0.5 block truncate text-xs text-admin-fg-faint">
                                {entry.note}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <span className="text-sm capitalize text-admin-fg-muted">
                              {fmtPayment(entry.paymentMethod)}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <span className="text-sm font-semibold tabular-nums text-brand-gold">
                              {formatCurrency(entry.total)}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className="text-xs text-admin-fg-faint">
                              {fmtDateTime(entry.occurredAt)}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <DSButton type="button" variant="secondary" size="xs" asChild>
                              <Link href={`/admin/historico/${entry.id}`}>
                                Ver
                                <ArrowRight className="h-3 w-3" />
                              </Link>
                            </DSButton>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="divide-y divide-admin-border-faint md:hidden">
                  {paginated.map((entry) => (
                    <Link
                      key={entry.id}
                      href={`/admin/historico/${entry.id}`}
                      className="flex items-start justify-between gap-3 px-4 py-4 transition-colors duration-motion-default ease-motion-in-out hover:bg-admin-overlay active:bg-admin-overlay"
                    >
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <KindBadge kind={entry.kind} />
                          <span className="text-xs text-admin-fg-faint">
                            {fmtDate(entry.occurredAt)}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-admin-fg">{entry.label}</p>
                        <p className="truncate text-xs text-admin-fg-muted">{entry.details}</p>
                        <p className="text-xs capitalize text-admin-fg-faint">
                          {fmtPayment(entry.paymentMethod)}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <span className="text-sm font-semibold tabular-nums text-brand-gold">
                          {formatCurrency(entry.total)}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 text-admin-fg-faint" />
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </DSCard>

          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-admin-fg-faint">
                Página {currentPage} de {totalPages} · {filtered.length} registros
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  aria-label="Página anterior"
                  className="flex h-8 w-8 items-center justify-center rounded-ds-sm border border-admin-border bg-admin-surface text-admin-fg-muted transition-colors duration-motion-default ease-motion-in-out hover:border-admin-border-strong hover:text-admin-fg disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                {pageNumbers.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPage(n)}
                    className={[
                      "flex h-8 w-8 items-center justify-center rounded-ds-sm border text-xs font-medium transition-colors duration-motion-default ease-motion-in-out",
                      currentPage === n
                        ? "border-brand-gold bg-brand-gold text-admin-base"
                        : "border-admin-border bg-admin-surface text-admin-fg-muted hover:border-admin-border-strong hover:text-admin-fg",
                    ].join(" ")}
                  >
                    {n}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  aria-label="Próxima página"
                  className="flex h-8 w-8 items-center justify-center rounded-ds-sm border border-admin-border bg-admin-surface text-admin-fg-muted transition-colors duration-motion-default ease-motion-in-out hover:border-admin-border-strong hover:text-admin-fg disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        <AuditRail stats={stats} filteredCount={filtered.length} totalCount={entries.length} />
      </AdminGrid>
    </AdminPage>
  );
}
