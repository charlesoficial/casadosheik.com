"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Minus, Plus, ReceiptText, Store, Trash2, Truck } from "lucide-react";

import { useCart } from "@/components/cart-provider";
import { CustomerFlowHeader } from "@/components/customer/customer-flow-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { buildMenuHref, buildProductHref } from "@/lib/utils/customer-navigation";
import { formatCurrency } from "@/lib/utils";
import type { CheckoutPayload } from "@/lib/types";

// O checkout concentra os dados finais do pedido.
// Apesar da UX acontecer no cliente, a validacao financeira e de itens continua no servidor.
const paymentOptions = ["dinheiro", "pix", "credito", "debito"] as const;
const paymentLabels: Record<(typeof paymentOptions)[number], string> = {
  dinheiro: "Dinheiro",
  pix: "Pix",
  credito: "Credito",
  debito: "Debito"
};

export function CheckoutShell({ mesa, fromProduct }: { mesa?: string; fromProduct?: string }) {
  const router = useRouter();
  const { items: cart, updateQuantity, removeItem, clearCart } = useCart();
  const [clienteNome, setClienteNome] = useState("");
  const [clienteTelefone, setClienteTelefone] = useState("");
  const [rua, setRua] = useState("");
  const [numero, setNumero] = useState("");
  const [bairro, setBairro] = useState("");
  const [referencia, setReferencia] = useState("");
  const [formaPagamento, setFormaPagamento] = useState<(typeof paymentOptions)[number]>("dinheiro");
  const [trocoPara, setTrocoPara] = useState("");
  const [observacaoGeral, setObservacaoGeral] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = useMemo(() => cart.reduce((sum, item) => sum + item.qty * item.price, 0), [cart]);
  const totalQuantity = useMemo(() => cart.reduce((sum, item) => sum + item.qty, 0), [cart]);
  const deliveryMode = !mesa;
  const menuHref = buildMenuHref(mesa);
  const backHref = fromProduct ? buildProductHref(fromProduct, mesa) : menuHref;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    // Evita submissoes vazias antes mesmo de chegar na API.
    if (cart.length === 0) {
      setError("Pedido sem itens.");
      return;
    }

    if (deliveryMode && (!clienteNome.trim() || !clienteTelefone.trim())) {
      setError("Preencha nome e telefone para delivery.");
      return;
    }

    const payload: CheckoutPayload = {
      mesa,
      tipo: mesa ? "mesa" : "delivery",
      clienteNome: clienteNome.trim() || undefined,
      clienteTelefone: clienteTelefone.trim() || undefined,
      enderecoEntrega: deliveryMode
        ? {
            rua,
            numero,
            bairro,
            referencia
          }
        : null,
      formaPagamento: deliveryMode ? formaPagamento : undefined,
      trocoPara: deliveryMode && formaPagamento === "dinheiro" && trocoPara ? Number(trocoPara.replace(",", ".")) : null,
      observacaoGeral: observacaoGeral.trim() || undefined,
      // O cliente envia referencia dos itens, mas o servidor recalcula preco e nome
      // com base no catalogo persistido.
      itens: cart.map((item) => ({
        produtoId: item.productId ?? item.id,
        nome: item.name,
        quantidade: item.qty,
        preco: item.price,
        observacao: item.note,
        image: item.image
      }))
    };

    try {
      setLoading(true);
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Nao foi possivel criar o pedido");
      }

      clearCart();
      const params = new URLSearchParams();
      if (mesa) {
        params.set("mesa", mesa);
      }
      if (typeof data.publicToken === "string" && data.publicToken.trim()) {
        params.set("token", data.publicToken);
      }
      const statusHref = `/pedido/${data.id}/status${params.toString() ? `?${params.toString()}` : ""}`;
      router.push(statusHref);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Erro ao enviar pedido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto min-h-screen max-w-[480px] bg-[#f7f3ec] pb-32">
      <CustomerFlowHeader
        eyebrow="Revisao do pedido"
        title="Seu carrinho"
        description="Confira os itens e envie o pedido com tudo do jeito certo."
        leading={
          <button
            type="button"
            onClick={() => router.push(backHref)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#eadfca] bg-white/90 text-[#6c5840] shadow-sm transition-colors hover:bg-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-[24px] border border-[#ecdcc0] bg-white/80 p-4">
            <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#f7eed8] text-[#8f6d1e]">
              {deliveryMode ? <Truck className="h-4 w-4" /> : <Store className="h-4 w-4" />}
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9c8b72]">
              {deliveryMode ? "Modo do pedido" : "Mesa identificada"}
            </p>
            <p className="mt-1 text-lg font-semibold text-[#24190d]">{deliveryMode ? "Delivery" : `Mesa ${mesa}`}</p>
          </div>

          <div className="rounded-[24px] border border-[#ecdcc0] bg-white/80 p-4">
            <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#f7eed8] text-[#8f6d1e]">
              <ReceiptText className="h-4 w-4" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9c8b72]">Resumo rapido</p>
            <p className="mt-1 text-lg font-semibold text-[#24190d]">
              {totalQuantity} {totalQuantity === 1 ? "item" : "itens"}
            </p>
            <p className="text-sm text-[#8f6d1e]">{formatCurrency(total)}</p>
          </div>
        </div>
      </CustomerFlowHeader>

      <div className="space-y-5 px-4 pt-5">
      {cart.length > 0 ? (
      <Card className="ticket-cut border-[#eadfca] bg-white shadow-[0_18px_45px_rgba(84,60,14,0.08)]">
        <CardHeader>
          <CardTitle>Resumo do pedido</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {cart.map((item) => (
            <div key={item.id} className="flex gap-3 rounded-[24px] border border-[#eee4d4] bg-[#fffdfa] p-3">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl">
                {item.image?.trim() ? (
                  <Image src={item.image} alt={item.name} fill className="object-cover" />
                ) : (
                  // Produtos sem foto nao devem bloquear o checkout nem quebrar o Image.
                  <div className="flex h-full w-full items-center justify-center bg-[#f5ecdb] text-[#8f6d1e]">
                    <Store className="h-6 w-6" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-[#20160b]">{item.name}</p>
                    <p className="text-sm text-muted-foreground">{formatCurrency(item.price)} cada</p>
                    {item.note ? <p className="text-sm text-[#8a7d68]">Obs: {item.note}</p> : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-[#f6f0e4]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 rounded-full border border-[#eadfca] px-2 py-1">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, item.qty - 1)}
                      className="rounded-full p-1 hover:bg-[#f6f0e4]"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-5 text-center text-sm font-medium">{item.qty}</span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, item.qty + 1)}
                      className="rounded-full p-1 hover:bg-[#f6f0e4]"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="font-semibold text-[#8f6d1e]">{formatCurrency(item.qty * item.price)}</p>
                </div>
              </div>
            </div>
          ))}

          <Link href={`/menu${mesa ? `?mesa=${mesa}` : ""}`} className="inline-block text-sm font-medium text-[#8f6d1e]">
            Adicionar mais itens
          </Link>
          <div className="wave-separator" />
          <div className="flex items-center justify-between rounded-[22px] bg-[#fcf7ed] px-4 py-3 text-lg font-semibold">
            <span>Total</span>
            <span className="text-[#8f6d1e]">{formatCurrency(total)}</span>
          </div>
        </CardContent>
      </Card>
      ) : (
        <Card className="border-[#eadfca] bg-white shadow-[0_16px_40px_rgba(84,60,14,0.06)]">
          <CardContent className="space-y-3 p-6 text-center">
            <p className="text-base font-semibold text-[#2d2114]">Seu carrinho esta vazio</p>
            <p className="text-sm leading-6 text-muted-foreground">
              Adicione itens no cardapio para continuar com o pedido.
            </p>
            <Button asChild variant="outline" className="rounded-full border-[#eadfca] bg-[#fffaf1] text-[#8f6d1e]">
              <Link href={`/menu${mesa ? `?mesa=${mesa}` : ""}`}>Voltar ao cardapio</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="border-[#eadfca] bg-white shadow-[0_18px_45px_rgba(84,60,14,0.08)]">
        <CardHeader>
          <CardTitle>Dados do pedido</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {mesa ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="w-fit border-[#c9a644] bg-[#fdf3d4] text-[#8f6d1e]">Mesa {mesa}</Badge>
                <span className="text-xs text-[#8b7d69]">Consumo identificado automaticamente pelo QR.</span>
              </div>
              <Textarea
                placeholder="Observacao geral do pedido"
                value={observacaoGeral}
                onChange={(event) => setObservacaoGeral(event.target.value)}
              />
              <Input
                placeholder="Seu nome (opcional)"
                value={clienteNome}
                onChange={(event) => setClienteNome(event.target.value)}
              />
              <Input
                placeholder="WhatsApp (opcional)"
                value={clienteTelefone}
                onChange={(event) => setClienteTelefone(event.target.value)}
              />
            </>
          ) : (
            <>
              <Input placeholder="Nome completo" value={clienteNome} onChange={(event) => setClienteNome(event.target.value)} />
              <Input
                placeholder="Telefone / WhatsApp"
                value={clienteTelefone}
                onChange={(event) => setClienteTelefone(event.target.value)}
              />
              <Input placeholder="Rua" value={rua} onChange={(event) => setRua(event.target.value)} />
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Numero" value={numero} onChange={(event) => setNumero(event.target.value)} />
                <Input placeholder="Bairro" value={bairro} onChange={(event) => setBairro(event.target.value)} />
              </div>
              <Input
                placeholder="Ponto de referencia"
                value={referencia}
                onChange={(event) => setReferencia(event.target.value)}
              />
              <Textarea
                placeholder="Observacao geral do pedido"
                value={observacaoGeral}
                onChange={(event) => setObservacaoGeral(event.target.value)}
              />
              <div className="grid grid-cols-2 gap-2">
                {paymentOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setFormaPagamento(option)}
                    className={`rounded-2xl border px-3 py-3 text-sm font-medium capitalize transition-colors ${
                      formaPagamento === option
                        ? "border-[#c9a644] bg-[#fdf3d4] text-[#8f6d1e]"
                        : "border-[#eadfca]"
                    }`}
                  >
                    {paymentLabels[option]}
                  </button>
                ))}
              </div>
              {formaPagamento === "dinheiro" ? (
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Troco para (R$)"
                  value={trocoPara}
                  onChange={(event) => setTrocoPara(event.target.value)}
                />
              ) : null}
            </>
          )}

          {error ? (
            <div className="rounded-[20px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          ) : null}
        </CardContent>
      </Card>
      </div>

      <div className="fixed bottom-4 left-1/2 z-30 w-[calc(100%-24px)] max-w-[456px] -translate-x-1/2">
        <div className="rounded-[28px] border border-[#e4d0a1] bg-white/96 p-2 shadow-[0_18px_45px_rgba(114,81,18,0.18)] backdrop-blur">
          <div className="mb-2 flex items-center justify-between px-3 pt-1 text-sm">
            <span className="text-[#766a59]">{totalQuantity} {totalQuantity === 1 ? "item" : "itens"}</span>
            <span className="font-semibold text-[#8f6d1e]">{formatCurrency(total)}</span>
          </div>
          <Button
            type="submit"
            size="lg"
            className="h-14 w-full rounded-[22px]"
            disabled={loading || cart.length === 0}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {loading ? "Enviando pedido..." : "Fazer pedido agora"}
          </Button>
        </div>
      </div>
    </form>
  );
}
