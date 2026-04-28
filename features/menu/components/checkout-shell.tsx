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
import type { CartItem, CheckoutPayload } from "@/lib/types";

const paymentOptions = ["dinheiro", "pix", "credito", "debito"] as const;
const paymentLabels: Record<(typeof paymentOptions)[number], string> = {
  dinheiro: "Dinheiro",
  pix: "Pix",
  credito: "Crédito",
  debito: "Débito",
};

function CheckoutMetric({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-2xl border border-menu-border bg-menu-surface p-4">
      <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-menu-accent-bg text-menu-accent-strong">
        {icon}
      </div>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-menu-text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold text-menu-text">{value}</p>
      {detail ? <p className="text-sm text-menu-accent-strong">{detail}</p> : null}
    </div>
  );
}

function CartLine({
  item,
  updateQuantity,
  removeItem,
}: {
  item: CartItem;
  updateQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
}) {
  return (
    <div className="flex gap-3 rounded-2xl border border-menu-border bg-menu-surface p-3 lg:p-4">
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl lg:h-24 lg:w-24">
        {item.image?.trim() ? (
          <Image
            src={item.image}
            alt={item.name}
            fill
            sizes="(max-width: 768px) 80px, 96px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-menu-surface-soft text-menu-accent-strong">
            <Store className="h-6 w-6" strokeWidth={1.5} />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="line-clamp-2 font-semibold text-menu-text">{item.name}</p>
            <p className="text-sm text-menu-text-muted">{formatCurrency(item.price)} cada</p>
            {item.note ? <p className="mt-1 text-sm text-menu-text-muted">Obs: {item.note}</p> : null}
          </div>
          <button
            type="button"
            aria-label={`Remover ${item.name}`}
            onClick={() => removeItem(item.id)}
            className="shrink-0 rounded-full p-2 text-menu-text-muted transition-colors hover:bg-menu-accent-bg hover:text-menu-accent-strong"
          >
            <Trash2 className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 rounded-full border border-menu-border bg-menu-surface-raised px-2 py-1">
            <button
              type="button"
              aria-label={`Diminuir quantidade de ${item.name}`}
              onClick={() => updateQuantity(item.id, item.qty - 1)}
              className="rounded-full p-1 transition-colors hover:bg-menu-accent-bg"
            >
              <Minus className="h-4 w-4" strokeWidth={1.5} />
            </button>
            <span className="w-5 text-center text-sm font-medium">{item.qty}</span>
            <button
              type="button"
              aria-label={`Aumentar quantidade de ${item.name}`}
              onClick={() => updateQuantity(item.id, item.qty + 1)}
              className="rounded-full p-1 transition-colors hover:bg-menu-accent-bg"
            >
              <Plus className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
          <p className="shrink-0 font-semibold text-menu-accent-strong">
            {formatCurrency(item.qty * item.price)}
          </p>
        </div>
      </div>
    </div>
  );
}

export function CheckoutShell({
  mesa,
  fromProduct,
  deliveryFee = 0,
}: {
  mesa?: string;
  fromProduct?: string;
  deliveryFee?: number;
}) {
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

  const totalQuantity = useMemo(() => cart.reduce((sum, item) => sum + item.qty, 0), [cart]);
  const deliveryMode = !mesa;
  const itemsTotal = useMemo(() => cart.reduce((sum, item) => sum + item.qty * item.price, 0), [cart]);
  const deliveryFeeTotal = deliveryMode && cart.length > 0 ? deliveryFee : 0;
  const total = itemsTotal + deliveryFeeTotal;
  const menuHref = buildMenuHref(mesa);
  const backHref = fromProduct ? buildProductHref(fromProduct, mesa) : menuHref;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (cart.length === 0) {
      setError("Pedido sem itens.");
      return;
    }

    if (deliveryMode && (!clienteNome.trim() || !clienteTelefone.trim())) {
      setError("Preencha nome e telefone para delivery.");
      return;
    }

    if (deliveryMode && (!rua.trim() || !numero.trim() || !bairro.trim())) {
      setError("Preencha rua, numero e bairro para delivery.");
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
            referencia,
          }
        : null,
      formaPagamento: deliveryMode ? formaPagamento : undefined,
      trocoPara: deliveryMode && formaPagamento === "dinheiro" && trocoPara ? Number(trocoPara.replace(",", ".")) : null,
      observacaoGeral: observacaoGeral.trim() || undefined,
      itens: cart.map((item) => ({
        produtoId: item.productId ?? item.id,
        nome: item.name,
        quantidade: item.qty,
        preco: item.price,
        observacao: item.note,
        image: item.image,
      })),
    };

    try {
      setLoading(true);
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Não foi possível criar o pedido");
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

  const submitLabel = loading ? "Enviando pedido..." : "Fazer pedido agora";

  return (
    <form
      onSubmit={handleSubmit}
      className="menu-theme min-h-screen w-full [background:var(--menu-bg-gradient-soft)] pb-32 text-menu-text lg:pb-0"
    >
      <div className="mx-auto max-w-[480px] lg:hidden">
        <CustomerFlowHeader
          eyebrow="Revisão do pedido"
          title="Seu carrinho"
          description="Confira os itens e envie o pedido com tudo do jeito certo."
          leading={
            <button
              type="button"
              aria-label="Voltar"
              onClick={() => router.push(backHref)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-menu-border bg-menu-surface-raised text-menu-text-muted shadow-sm transition-colors hover:bg-menu-surface-soft"
            >
              <ArrowLeft className="h-5 w-5" strokeWidth={1.5} />
            </button>
          }
        >
          <div className="grid grid-cols-2 gap-3">
            <CheckoutMetric
              icon={deliveryMode ? <Truck className="h-4 w-4" strokeWidth={1.5} /> : <Store className="h-4 w-4" strokeWidth={1.5} />}
              label={deliveryMode ? "Modo do pedido" : "Mesa identificada"}
              value={deliveryMode ? "Delivery" : `Mesa ${mesa}`}
            />
            <CheckoutMetric
              icon={<ReceiptText className="h-4 w-4" strokeWidth={1.5} />}
              label="Resumo rápido"
              value={`${totalQuantity} ${totalQuantity === 1 ? "item" : "itens"}`}
              detail={formatCurrency(total)}
            />
          </div>
        </CustomerFlowHeader>
      </div>

      <header className="sticky top-0 z-30 hidden border-b border-menu-border bg-menu-surface/95 px-8 py-4 backdrop-blur lg:block">
        <div className="mx-auto flex max-w-[1640px] items-center justify-between gap-6">
          <button
            type="button"
            onClick={() => router.push(backHref)}
            className="flex items-center gap-3 rounded-full border border-menu-border bg-menu-surface-raised px-4 py-2 text-sm font-semibold text-menu-text transition-colors hover:bg-menu-surface-soft"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
            Voltar
          </button>
          <div className="min-w-0 flex-1 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-menu-accent-strong">
              Checkout
            </p>
            <h1 className="mt-1 truncate text-2xl font-black text-menu-text">Finalize seu pedido</h1>
          </div>
          <Badge className="border-menu-accent-border bg-menu-accent-bg px-4 py-2 text-menu-accent-strong">
            {deliveryMode ? "Delivery" : `Mesa ${mesa}`}
          </Badge>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-[1640px] gap-6 px-4 py-5 lg:grid-cols-[minmax(0,1fr)_420px] lg:px-8 lg:py-6 xl:grid-cols-[360px_minmax(0,1fr)_440px]">
        <aside className="hidden space-y-4 xl:block">
          <CheckoutMetric
            icon={deliveryMode ? <Truck className="h-4 w-4" strokeWidth={1.5} /> : <Store className="h-4 w-4" strokeWidth={1.5} />}
            label={deliveryMode ? "Entrega" : "Atendimento"}
            value={deliveryMode ? "Delivery" : `Mesa ${mesa}`}
            detail={deliveryMode ? "Receba no endereço informado" : "Pedido identificado pelo QR"}
          />
          <CheckoutMetric
            icon={<ReceiptText className="h-4 w-4" strokeWidth={1.5} />}
            label="Resumo"
            value={`${totalQuantity} ${totalQuantity === 1 ? "item" : "itens"}`}
            detail={formatCurrency(total)}
          />
          <div className="rounded-3xl border border-menu-border bg-menu-surface-raised p-5 shadow-soft">
            <p className="font-semibold text-menu-text">Antes de enviar</p>
            <p className="mt-2 text-sm leading-6 text-menu-text-muted">
              Confira quantidades, observações e dados de contato. O restaurante recebe tudo organizado para preparar sem ruído.
            </p>
            <Link
              href={menuHref}
              className="mt-4 inline-flex rounded-full border border-menu-border bg-menu-surface px-4 py-2 text-sm font-semibold text-menu-accent-strong transition-colors hover:bg-menu-accent-bg"
            >
              Adicionar mais itens
            </Link>
          </div>
        </aside>

        <section className="min-w-0 space-y-5">
          {cart.length > 0 ? (
            <Card className="ticket-cut border-menu-border bg-menu-surface-raised text-menu-text shadow-card">
              <CardHeader className="gap-1">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-menu-accent-strong">
                  Carrinho
                </p>
                <CardTitle>Resumo do pedido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 2xl:grid-cols-2">
                  {cart.map((item) => (
                    <CartLine
                      key={item.id}
                      item={item}
                      updateQuantity={updateQuantity}
                      removeItem={removeItem}
                    />
                  ))}
                </div>

                <div className="space-y-3 border-t border-menu-border pt-4">
                  <div className="space-y-2 rounded-2xl bg-menu-surface-soft px-4 py-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-menu-text-muted">Itens</span>
                      <span className="font-semibold text-menu-text">{formatCurrency(itemsTotal)}</span>
                    </div>
                    {deliveryMode ? (
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-menu-text-muted">Taxa de entrega</span>
                        <span className="font-semibold text-menu-text">{formatCurrency(deliveryFeeTotal)}</span>
                      </div>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Link href={menuHref} className="text-sm font-semibold text-menu-accent-strong">
                      Adicionar mais itens
                    </Link>
                    <div className="flex min-w-[220px] items-center justify-between rounded-2xl bg-menu-surface-soft px-4 py-3 text-lg font-semibold">
                      <span>Total</span>
                      <span className="text-menu-accent-strong">{formatCurrency(total)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-menu-border bg-menu-surface-raised text-menu-text shadow-card">
              <CardContent className="space-y-4 p-8 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-menu-accent-bg text-menu-accent-strong">
                  <ReceiptText className="h-6 w-6" strokeWidth={1.5} />
                </div>
                <p className="text-lg font-semibold text-menu-text">Seu carrinho está vazio</p>
                <p className="mx-auto max-w-md text-sm leading-6 text-menu-text-muted">
                  Adicione itens no cardápio para continuar com o pedido.
                </p>
                <Button asChild variant="outline" className="rounded-full border-menu-border bg-menu-surface text-menu-accent-strong hover:bg-menu-accent-bg">
                  <Link href={menuHref}>Voltar ao cardápio</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </section>

        <section className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <Card className="border-menu-border bg-menu-surface-raised text-menu-text shadow-card">
            <CardHeader className="pb-3 lg:p-5 lg:pb-3">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-menu-accent-strong">
                Dados finais
              </p>
              <CardTitle>Como vamos identificar o pedido?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 lg:space-y-3 lg:p-5 lg:pt-0">
              {mesa ? (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="w-fit border-menu-accent-border bg-menu-accent-bg text-menu-accent-strong">Mesa {mesa}</Badge>
                    <span className="text-xs text-menu-text-muted">Consumo identificado automaticamente pelo QR.</span>
                  </div>
                  <Textarea
                    placeholder="Observação geral do pedido"
                    value={observacaoGeral}
                    onChange={(event) => setObservacaoGeral(event.target.value)}
                    className="lg:min-h-[84px]"
                  />
                  <Input
                    placeholder="Seu nome (opcional)"
                    value={clienteNome}
                    onChange={(event) => setClienteNome(event.target.value)}
                    className="lg:h-10"
                  />
                  <Input
                    placeholder="WhatsApp (opcional)"
                    value={clienteTelefone}
                    onChange={(event) => setClienteTelefone(event.target.value)}
                    className="lg:h-10"
                  />
                </>
              ) : (
                <>
                  <Input placeholder="Nome completo" value={clienteNome} onChange={(event) => setClienteNome(event.target.value)} className="lg:h-10" />
                  <Input
                    placeholder="Telefone / WhatsApp"
                    value={clienteTelefone}
                    onChange={(event) => setClienteTelefone(event.target.value)}
                    className="lg:h-10"
                  />
                  <Input placeholder="Rua" value={rua} onChange={(event) => setRua(event.target.value)} className="lg:h-10" />
                  <div className="grid grid-cols-2 gap-3">
                    <Input placeholder="Número" value={numero} onChange={(event) => setNumero(event.target.value)} className="lg:h-10" />
                    <Input placeholder="Bairro" value={bairro} onChange={(event) => setBairro(event.target.value)} className="lg:h-10" />
                  </div>
                  <Input
                    placeholder="Ponto de referência"
                    value={referencia}
                    onChange={(event) => setReferencia(event.target.value)}
                    className="lg:h-10"
                  />
                  <Textarea
                    placeholder="Observação geral do pedido"
                    value={observacaoGeral}
                    onChange={(event) => setObservacaoGeral(event.target.value)}
                    className="lg:min-h-[84px]"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    {paymentOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setFormaPagamento(option)}
                        className={`rounded-2xl border px-3 py-3 text-sm font-medium capitalize transition-colors lg:py-2 ${
                          formaPagamento === option
                            ? "border-menu-accent-border bg-menu-accent-bg text-menu-accent-strong"
                            : "border-menu-border bg-menu-surface text-menu-text-muted hover:bg-menu-surface-soft"
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
                      className="lg:h-10"
                    />
                  ) : null}
                </>
              )}

              {error ? (
                <div className="rounded-2xl border border-status-danger-border bg-status-danger-bg px-4 py-3 text-sm font-medium text-status-danger-text">
                  {error}
                </div>
              ) : null}

              <div className="hidden border-t border-menu-border pt-4 lg:block">
                <div className="mb-3 space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-menu-text-muted">
                      {totalQuantity} {totalQuantity === 1 ? "item" : "itens"}
                    </span>
                    <span className="font-semibold text-menu-text">{formatCurrency(itemsTotal)}</span>
                  </div>
                  {deliveryMode ? (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-menu-text-muted">Entrega</span>
                      <span className="font-semibold text-menu-text">{formatCurrency(deliveryFeeTotal)}</span>
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between gap-3 border-t border-menu-border pt-2">
                    <span className="font-semibold text-menu-text">Total</span>
                    <span className="font-semibold text-menu-accent-strong">{formatCurrency(total)}</span>
                  </div>
                </div>
                <Button
                  type="submit"
                  size="lg"
                  className="h-14 w-full rounded-2xl bg-menu-cta text-menu-cta-fg hover:bg-menu-cta-hover lg:h-12"
                  disabled={loading || cart.length === 0}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} /> : null}
                  {submitLabel}
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>

      <div className="fixed bottom-4 left-1/2 z-30 w-[calc(100%-24px)] max-w-[456px] -translate-x-1/2 lg:hidden">
        <div className="rounded-ds-2xl border border-menu-border bg-menu-surface-raised p-2 shadow-card">
          <div className="mb-2 flex items-center justify-between px-3 pt-1 text-sm">
            <span className="text-menu-text-muted">
              {deliveryMode ? "Total com entrega" : `${totalQuantity} ${totalQuantity === 1 ? "item" : "itens"}`}
            </span>
            <span className="font-semibold text-menu-accent-strong">{formatCurrency(total)}</span>
          </div>
          <Button
            type="submit"
            size="lg"
            className="h-14 w-full rounded-ds-lg bg-menu-cta text-menu-cta-fg hover:bg-menu-cta-hover"
            disabled={loading || cart.length === 0}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} /> : null}
            {submitLabel}
          </Button>
        </div>
      </div>
    </form>
  );
}
