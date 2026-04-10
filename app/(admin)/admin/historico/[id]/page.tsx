import Link from "next/link";
import { ArrowLeft, Receipt, Store, Wallet } from "lucide-react";
import { notFound } from "next/navigation";

import { HistoryDetailActions } from "@/features/history/components/history-detail-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getFinancialHistoryDetail } from "@/lib/data";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const kindLabel = {
  caixa: "Caixa",
  mesa: "Mesa",
  delivery: "Delivery",
  retirada: "Retirada"
} as const;

export default async function AdminHistoryDetailPage({
  params
}: {
  params: { id: string };
}) {
  const { id } = params;
  const detail = await getFinancialHistoryDetail(id);

  if (!detail) {
    notFound();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/historico"
          className="inline-flex items-center gap-2 rounded-xl border border-[#313131] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#1b1b1b]"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao historico
        </Link>
        <HistoryDetailActions />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_360px]">
        <Card className="admin-history-shell-card border-[#2a2a2a] bg-[#171717]">
          <CardHeader className="border-b border-[#242424]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="text-sm uppercase tracking-[0.18em] text-[#8f8a82]">Comprovante operacional</p>
                <CardTitle className="text-3xl text-white">{detail.label}</CardTitle>
                <p className="text-sm text-[#bcb5aa]">{detail.details}</p>
              </div>
              <Badge>{kindLabel[detail.kind]}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 p-6">
            <div data-history-print-root className="space-y-5">
              <div className="hidden print:block">
                <p className="text-sm uppercase tracking-[0.18em] text-black">Casa do Sheik</p>
                <h1 className="text-2xl font-semibold text-black">{detail.label}</h1>
                <p className="text-sm text-black">{detail.details}</p>
              </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-[#2a2a2a] bg-[#111111] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[#8d877b]">Total</p>
                <p className="mt-2 text-2xl font-semibold text-[#f4c35a]">{formatCurrency(detail.total)}</p>
              </div>
              <div className="rounded-2xl border border-[#2a2a2a] bg-[#111111] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[#8d877b]">Pagamento</p>
                <p className="mt-2 text-xl font-semibold capitalize text-white">{detail.paymentMethod.replaceAll("_", " ")}</p>
              </div>
              <div className="rounded-2xl border border-[#2a2a2a] bg-[#111111] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[#8d877b]">Horario</p>
                <p className="mt-2 text-lg font-semibold text-white">{new Date(detail.occurredAt).toLocaleString("pt-BR")}</p>
              </div>
            </div>

            {detail.closedBy ? (
              <div className="rounded-2xl border border-[#2a2a2a] bg-[#111111] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[#8d877b]">Responsavel</p>
                <p className="mt-2 text-lg font-semibold text-white">{detail.closedBy}</p>
              </div>
            ) : null}

            <div className="rounded-[24px] border border-[#2a2a2a] bg-[#111111] p-5">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-[#f4c35a]" />
                <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#8d877b]">Itens e composicao</p>
              </div>
              <div className="mt-5 space-y-3">
                {detail.items.length ? (
                  detail.items.map((item, index) => (
                    <div key={`${item.label}-${index}`} className="rounded-2xl border border-[#232323] bg-[#181818] px-4 py-3 text-[#ebe4d8]">
                      <div className="flex items-center justify-between gap-3">
                        <span>
                          {item.quantity ? `${item.quantity}x ` : ""}
                          {item.label}
                        </span>
                        {typeof item.total === "number" ? <span>{formatCurrency(item.total)}</span> : null}
                      </div>
                      {item.note ? <p className="mt-2 text-xs text-[#8f8a82]">{item.note}</p> : null}
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-[#232323] bg-[#181818] px-4 py-6 text-sm text-[#9d978b]">
                    Nao ha detalhes adicionais para este registro.
                  </div>
                )}
              </div>
            </div>

            {detail.note ? (
              <div className="rounded-[24px] border border-[#2a2a2a] bg-[#111111] p-5">
                <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#8d877b]">Observacao</p>
                <p className="mt-3 text-sm text-[#d7d0c5]">{detail.note}</p>
              </div>
            ) : null}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-5 print:hidden">
          <Card className="admin-history-shell-card border-[#2a2a2a] bg-[#171717]">
            <CardHeader>
              <CardTitle className="text-white">Resumo rapido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-[#d7d0c5]">
              <div className="rounded-2xl border border-[#2a2a2a] bg-[#111111] p-4">
                <div className="flex items-center gap-2 text-[#8ce3b0]">
                  <Wallet className="h-4 w-4" />
                  <p className="font-medium text-white">Status</p>
                </div>
                <p className="mt-2 capitalize text-[#bcb5aa]">{detail.status}</p>
              </div>
              {detail.referenceDate ? (
                <div className="rounded-2xl border border-[#2a2a2a] bg-[#111111] p-4">
                  <div className="flex items-center gap-2 text-[#8fd0ff]">
                    <Store className="h-4 w-4" />
                    <p className="font-medium text-white">Referencia</p>
                  </div>
                  <p className="mt-2 text-[#bcb5aa]">{detail.referenceDate}</p>
                </div>
              ) : null}
              <div className="rounded-2xl border border-[#2a2a2a] bg-[#111111] p-4">
                <p className="font-medium text-white">
                  {detail.kind === "caixa" ? "Pedidos e contas incluidos" : "Pedidos vinculados"}
                </p>
                <div className="mt-3 space-y-3">
                  {detail.relatedOrders.length ? (
                    detail.relatedOrders.map((order) => (
                      <div key={order.id} className="rounded-xl border border-[#242424] bg-[#181818] px-3 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium text-white">#{String(order.number).padStart(3, "0")}</span>
                          <span className="text-[#f4c35a]">{formatCurrency(order.total)}</span>
                        </div>
                        <p className="mt-2 text-xs text-[#8f8a82]">{order.customer} - {order.type}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-[#9d978b]">Nenhum pedido relacionado.</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
