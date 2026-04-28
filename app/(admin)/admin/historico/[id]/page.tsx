import Link from "next/link";
import { ArrowLeft, Clock, CreditCard, Hash, Receipt, User } from "lucide-react";
import { notFound } from "next/navigation";

import { HistoryDetailActions } from "@/features/history/components/history-detail-actions";
import { ReceiptPrintHost } from "@/components/receipt/receipt-print-host";
import { getFinancialHistoryDetail } from "@/lib/data";
import { mapFinancialHistoryToReceipt } from "@/lib/receipt/layout";
import { formatCurrency } from "@/lib/utils";
import {
  AdminPage,
  AdminHeader,
  AdminHeaderContent,
  AdminHeaderTitle,
  AdminHeaderDescription,
  AdminHeaderActions,
} from "@/components/layout";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const KIND_CONFIG = {
  caixa: { label: "Caixa", chip: "border-status-warning-border bg-status-warning-bg text-status-warning-fg" },
  mesa: { label: "Mesa", chip: "border-status-info-border bg-status-info-bg text-status-info-text" },
  delivery: { label: "Delivery", chip: "border-status-success-border bg-status-success-bg text-status-success-fg" },
  retirada: { label: "Retirada", chip: "border-status-new-border bg-status-new-bg text-status-new-fg" },
} as const;

function MetaBlock({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-ds-md border border-admin-border bg-admin-surface p-4">
      <div className="flex items-center gap-2 text-admin-fg-faint">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[11px] font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className="mt-2 text-sm font-medium capitalize text-admin-fg">{value}</p>
    </div>
  );
}

export default async function AdminHistoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getFinancialHistoryDetail(id);

  if (!detail) {
    notFound();
  }

  const kind = KIND_CONFIG[detail.kind];
  const formattedDate = new Date(detail.occurredAt).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <AdminPage gap="default">
      <ReceiptPrintHost receipt={mapFinancialHistoryToReceipt(detail)} />

      {/* ── Page header ─────────────────────────────────── */}
      <AdminHeader className="print:hidden">
        <AdminHeaderContent>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/historico"
              className="inline-flex items-center gap-1.5 rounded-ds-md border border-admin-border bg-admin-elevated px-3 py-1.5 text-xs font-medium text-admin-fg-secondary transition-colors hover:border-admin-border-strong hover:bg-admin-overlay hover:text-admin-fg"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Histórico
            </Link>
            <span className={`inline-flex items-center rounded-ds-sm border px-2 py-0.5 text-xs font-medium ${kind.chip}`}>
              {kind.label}
            </span>
          </div>
          <AdminHeaderTitle size="sm" className="mt-1">
            {detail.label}
          </AdminHeaderTitle>
          <AdminHeaderDescription>{detail.details}</AdminHeaderDescription>
        </AdminHeaderContent>
        <AdminHeaderActions className="self-start">
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-admin-fg-faint">Total</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-brand-gold">
              {formatCurrency(detail.total)}
            </p>
          </div>
          <HistoryDetailActions />
        </AdminHeaderActions>
      </AdminHeader>

      {/* ── Meta row ────────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-3">
        <MetaBlock
          icon={CreditCard}
          label="Pagamento"
          value={detail.paymentMethod.replaceAll("_", " ")}
        />
        <MetaBlock
          icon={Clock}
          label="Horário"
          value={formattedDate}
        />
        {detail.closedBy ? (
          <MetaBlock
            icon={User}
            label="Responsável"
            value={detail.closedBy}
          />
        ) : (
          <MetaBlock
            icon={Hash}
            label="Status"
            value={detail.status}
          />
        )}
      </div>

      {/* ── Body ────────────────────────────────────────── */}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_340px]">

        {/* Left: items */}
        <div className="space-y-5">
          <div className="rounded-ds-xl border border-admin-border bg-admin-elevated overflow-hidden">
            <div className="flex items-center gap-2.5 border-b border-admin-border-faint bg-admin-surface/60 px-5 py-4">
              <Receipt className="h-4 w-4 text-brand-gold" />
              <h2 className="text-sm font-medium text-admin-fg">Itens e composição</h2>
            </div>

            <div className="p-5">
              {detail.items.length ? (
                <div className="space-y-2">
                  {detail.items.map((item, index) => (
                    <div
                      key={`${item.label}-${index}`}
                      className="flex items-start justify-between gap-4 rounded-ds-md border border-admin-border-faint bg-admin-surface px-4 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-admin-fg-secondary">
                          {item.quantity ? (
                            <span className="mr-1.5 text-admin-fg-faint">{item.quantity}×</span>
                          ) : null}
                          {item.label}
                        </p>
                        {item.note && (
                          <p className="mt-0.5 text-xs text-admin-fg-faint">{item.note}</p>
                        )}
                      </div>
                      {typeof item.total === "number" && (
                        <span className="shrink-0 text-sm font-medium text-admin-fg-secondary">
                          {formatCurrency(item.total)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-6 text-center text-sm text-admin-fg-faint">
                  Itens não registrados neste fechamento.
                </p>
              )}
            </div>
          </div>

          {detail.note && (
            <div className="rounded-ds-xl border border-admin-border bg-admin-elevated p-5">
              <p className="text-[11px] font-medium uppercase tracking-wider text-admin-fg-faint">
                Observação
              </p>
              <p className="mt-3 text-sm leading-relaxed text-admin-fg-secondary">{detail.note}</p>
            </div>
          )}
        </div>

        {/* Right: sidebar */}
        <div className="space-y-5 print:hidden">

          {/* Quick summary */}
          <div className="rounded-ds-xl border border-admin-border bg-admin-elevated overflow-hidden">
            <div className="border-b border-admin-border-faint bg-admin-surface/60 px-5 py-4">
              <h2 className="text-sm font-medium text-admin-fg">Resumo rápido</h2>
            </div>
            <div className="space-y-3 p-5">
              <div className="flex items-center justify-between rounded-ds-md border border-admin-border-faint bg-admin-surface px-4 py-3">
                <span className="text-xs text-admin-fg-faint">Status</span>
                <span className="text-xs font-medium capitalize text-admin-fg">{detail.status}</span>
              </div>
              {detail.referenceDate && (
                <div className="flex items-center justify-between rounded-ds-md border border-admin-border-faint bg-admin-surface px-4 py-3">
                  <span className="text-xs text-admin-fg-faint">Referência</span>
                  <span className="text-xs font-medium text-admin-fg">{detail.referenceDate}</span>
                </div>
              )}
              <div className="flex items-center justify-between rounded-ds-md border border-admin-border-faint bg-admin-surface px-4 py-3">
                <span className="text-xs text-admin-fg-faint">Total do registro</span>
                <span className="text-sm font-semibold text-brand-gold">{formatCurrency(detail.total)}</span>
              </div>
            </div>
          </div>

          {/* Related orders */}
          <div className="rounded-ds-xl border border-admin-border bg-admin-elevated overflow-hidden">
            <div className="border-b border-admin-border-faint bg-admin-surface/60 px-5 py-4">
              <h2 className="text-sm font-medium text-admin-fg">
                {detail.kind === "caixa" ? "Pedidos e contas incluídos" : "Pedidos vinculados"}
              </h2>
            </div>
            <div className="p-5">
              {detail.relatedOrders.length ? (
                <div className="space-y-2">
                  {detail.relatedOrders.map((order) => (
                    <div
                      key={order.id}
                      className="rounded-ds-md border border-admin-border-faint bg-admin-surface px-4 py-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium text-admin-fg">
                          #{String(order.number).padStart(3, "0")}
                        </span>
                        <span className="text-sm font-semibold text-brand-gold">
                          {formatCurrency(order.total)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-admin-fg-faint">
                        {order.customer} · {order.type}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-4 text-center text-sm text-admin-fg-faint">
                  Sem pedidos vinculados a este registro.
                </p>
              )}
            </div>
          </div>

          {/* Print shortcut */}
          <div className="rounded-ds-xl border border-admin-border bg-admin-elevated p-5">
            <p className="text-xs text-admin-fg-faint">Comprovante</p>
            <p className="mt-1 text-sm font-medium text-admin-fg">Imprimir comprovante</p>
            <p className="mt-1.5 text-xs text-admin-fg-faint">
              Gera um comprovante formatado para impressão térmica ou PDF.
            </p>
            <div className="mt-4">
              <HistoryDetailActions />
            </div>
          </div>
        </div>
      </div>
    </AdminPage>
  );
}
