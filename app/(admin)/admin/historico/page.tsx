import Link from "next/link";
import { ArrowRight, Receipt, Store, Wallet } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getFinancialHistory } from "@/lib/data";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminHistoryPage() {
  const allEntries = await getFinancialHistory();
  const entries = allEntries.filter((entry) => entry.kind === "caixa");
  const latestEntries = entries.slice(0, 5);
  const totalClosedCash = entries.reduce((sum, entry) => sum + entry.total, 0);

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_360px]">
      <Card className="border-[#2a2a2a] bg-[#171717] admin-history-shell-card">
        <CardHeader>
          <CardTitle className="text-white">Historico de caixas fechados</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm text-[#ddd7cc]">
            <thead>
              <tr className="border-b border-[#2a2a2a] text-[#8f8a82]">
                <th className="pb-4 font-medium">Registro</th>
                <th className="pb-4 font-medium">Detalhes</th>
                <th className="pb-4 font-medium">Pagamento</th>
                <th className="pb-4 font-medium">Total</th>
                <th className="pb-4 font-medium">Horario</th>
                <th className="pb-4 font-medium text-right">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {entries.length ? (
                entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-[#222222]">
                    <td className="py-4 font-medium text-white">{entry.label}</td>
                    <td className="py-4 text-[#c3bcaf] admin-history-details-cell">
                      <div className="space-y-1">
                        <p>{entry.details}</p>
                        {entry.note ? <p className="text-xs text-[#8f8a82]">Obs.: {entry.note}</p> : null}
                      </div>
                    </td>
                    <td className="py-4 capitalize">{entry.paymentMethod.replaceAll("_", " ")}</td>
                    <td className="py-4">{formatCurrency(entry.total)}</td>
                    <td className="py-4">{new Date(entry.occurredAt).toLocaleString("pt-BR")}</td>
                    <td className="py-4">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/admin/historico/${entry.id}`}
                          className="inline-flex items-center gap-2 rounded-xl border border-[#313131] px-3 py-2 text-xs font-medium text-white transition hover:bg-[#1b1b1b]"
                        >
                          Ver detalhe
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-[#9d978b]">
                    Ainda nao ha caixas fechados suficientes para preencher o historico.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card className="border-[#2a2a2a] bg-[#171717] admin-history-shell-card">
        <CardHeader>
          <CardTitle className="text-white">Resumo do historico</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-[#d7d0c5]">
          <div className="rounded-2xl border border-[#2a2a2a] bg-[#111111] p-4">
            <div className="flex items-center gap-2 text-[#f4c35a]">
              <Receipt className="h-4 w-4" />
              <p className="font-medium text-white">Caixas registrados</p>
            </div>
            <p className="mt-3 text-3xl font-semibold text-white">{entries.length}</p>
            <p className="mt-2 text-[#bcb5aa]">Somente os fechamentos oficiais de caixa aparecem nesta listagem.</p>
          </div>

          <div className="rounded-2xl border border-[#2a2a2a] bg-[#111111] p-4">
            <div className="flex items-center gap-2 text-[#8ce3b0]">
              <Wallet className="h-4 w-4" />
              <p className="font-medium text-white">Total consolidado</p>
            </div>
            <p className="mt-3 text-3xl font-semibold text-white">{formatCurrency(totalClosedCash)}</p>
            <p className="mt-2 text-[#bcb5aa]">Soma de todos os caixas fechados que ja entraram no historico.</p>
          </div>

          <div className="rounded-2xl border border-[#2a2a2a] bg-[#111111] p-4">
            <div className="flex items-center gap-2 text-[#8fd0ff]">
              <Store className="h-4 w-4" />
              <p className="font-medium text-white">Ultimos caixas</p>
            </div>
            <div className="mt-4 space-y-3">
              {latestEntries.length ? (
                latestEntries.map((entry) => (
                  <div key={`summary-${entry.id}`} className="rounded-xl border border-[#242424] bg-[#181818] px-3 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-white">{entry.label}</span>
                      <span className="text-[#f4c35a]">{formatCurrency(entry.total)}</span>
                    </div>
                    <p className="mt-2 text-xs text-[#8f8a82]">
                      Fechado as {new Date(entry.occurredAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-[#9d978b]">Nenhum caixa fechado recente disponivel.</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-[#2a2a2a] bg-[#111111] p-4">
            <div className="flex items-center gap-2 text-[#8ce3b0]">
              <Wallet className="h-4 w-4" />
              <p className="font-medium text-white">Atalhos</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/admin/caixa"
                className="inline-flex items-center gap-2 rounded-xl border border-[#313131] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#1b1b1b]"
              >
                Abrir caixa
              </Link>
              <Link
                href="/admin/pedidos"
                className="inline-flex items-center gap-2 rounded-xl border border-[#313131] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#1b1b1b]"
              >
                Abrir pedidos
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
