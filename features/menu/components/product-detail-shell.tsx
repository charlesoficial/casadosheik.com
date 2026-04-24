"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Minus, Plus, ShoppingBag, UtensilsCrossed } from "lucide-react";

import { useCart } from "@/components/cart-provider";
import { Textarea } from "@/components/ui/textarea";
import { buildCheckoutHref, buildMenuHref } from "@/lib/utils/customer-navigation";
import { formatCurrency } from "@/lib/utils";
import type { MenuProduct } from "@/lib/types";

function ProductHero({
  product,
  heroFailed,
  setHeroFailed,
  sizes,
}: {
  product: MenuProduct;
  heroFailed: boolean;
  setHeroFailed: (failed: boolean) => void;
  sizes: string;
}) {
  if (heroFailed || !product.image) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-menu-accent-bg">
        <UtensilsCrossed className="h-16 w-16 text-menu-accent" strokeWidth={1.5} />
      </div>
    );
  }

  return (
    <Image
      src={product.image}
      alt={product.name}
      fill
      priority
      sizes={sizes}
      className="object-cover object-center"
      onError={() => setHeroFailed(true)}
    />
  );
}

function QuantityControl({
  quantity,
  setQuantity,
  compact = false,
}: {
  quantity: number;
  setQuantity: (updater: (current: number) => number) => void;
  compact?: boolean;
}) {
  const buttonSize = compact ? "h-9 w-9" : "h-10 w-10";

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        aria-label="Diminuir quantidade"
        onClick={() => setQuantity((current) => Math.max(1, current - 1))}
        disabled={quantity <= 1}
        className={`${buttonSize} flex items-center justify-center rounded-full border border-menu-border bg-menu-surface text-menu-text transition-colors hover:bg-menu-surface-soft disabled:opacity-40`}
      >
        <Minus className="h-4 w-4" strokeWidth={1.5} />
      </button>
      <span className="w-7 text-center text-lg font-bold text-menu-text">{quantity}</span>
      <button
        type="button"
        aria-label="Aumentar quantidade"
        onClick={() => setQuantity((current) => current + 1)}
        className={`${buttonSize} flex items-center justify-center rounded-full border border-menu-border bg-menu-surface text-menu-text transition-colors hover:bg-menu-surface-soft`}
      >
        <Plus className="h-4 w-4" strokeWidth={1.5} />
      </button>
    </div>
  );
}

export function ProductDetailShell({ product, mesa }: { product: MenuProduct; mesa?: string }) {
  const router = useRouter();
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [heroFailed, setHeroFailed] = useState(false);
  const menuHref = buildMenuHref(mesa);
  const checkoutHref = buildCheckoutHref(mesa, product.id);
  const total = product.price * quantity;

  function handleAdd() {
    addItem(product, quantity, note);
    router.push(checkoutHref);
  }

  return (
    <main className="menu-theme min-h-screen bg-menu-bg text-menu-text lg:[background:var(--menu-bg-gradient-soft)]">
      <section className="mx-auto min-h-screen max-w-[480px] bg-menu-bg lg:hidden">
        <div className="relative aspect-square w-full overflow-hidden bg-menu-accent-bg">
          <ProductHero
            product={product}
            heroFailed={heroFailed}
            setHeroFailed={setHeroFailed}
            sizes="100vw"
          />
        </div>

        <div className="bg-menu-bg px-4 pb-6 pt-5">
          <button
            type="button"
            onClick={() => router.push(menuHref)}
            className="mb-4 inline-flex items-center gap-2 rounded-full border border-menu-border bg-menu-surface-raised px-3 py-2 text-sm font-bold text-menu-accent-strong shadow-soft transition-colors hover:bg-menu-accent-bg"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
            Voltar ao cardápio
          </button>

          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-[2rem] font-black leading-[1.04] text-menu-text">
                {product.name}
              </h1>
            </div>
            <div className="shrink-0 rounded-2xl bg-menu-cta px-4 py-2 text-right shadow-soft">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-menu-accent-border">Preço</p>
              <p className="text-lg font-black leading-none text-menu-cta-fg">{formatCurrency(product.price)}</p>
            </div>
          </div>

          {product.description ? (
            <p className="mt-3 text-[15px] leading-6 text-menu-text-muted">{product.description}</p>
          ) : null}

          <div className="mt-5 rounded-3xl border border-menu-border bg-menu-surface-raised p-4 shadow-soft">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-bold text-menu-text">Quantidade</p>
                <p className="mt-1 text-xs leading-5 text-menu-text-subtle">Ajuste antes de adicionar.</p>
              </div>
              <QuantityControl quantity={quantity} setQuantity={setQuantity} compact />
            </div>
          </div>

          <div className="mt-3 rounded-3xl border border-menu-border bg-menu-surface-raised p-4 shadow-soft">
            <label className="font-bold text-menu-text">Observações</label>
            <Textarea
              placeholder="Alguma observação? Ex: sem cebola"
              maxLength={180}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="mt-3 min-h-[108px] rounded-2xl border-menu-border bg-menu-surface text-menu-text placeholder:text-menu-text-subtle focus:border-menu-accent focus:ring-1 focus:ring-menu-accent-border"
            />
          </div>

          <div className="mt-3 rounded-3xl border border-menu-border bg-menu-surface-raised p-2 shadow-card">
            <div className="mb-2 flex items-center justify-between px-3 pt-1 text-sm">
              <span className="text-menu-text-muted">
                {quantity} {quantity === 1 ? "item" : "itens"}
              </span>
              <span className="font-black text-menu-accent-strong">{formatCurrency(total)}</span>
            </div>
            <button
              type="button"
              onClick={handleAdd}
              className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-menu-cta px-5 text-base font-black text-menu-cta-fg shadow-soft transition-colors hover:bg-menu-cta-hover active:scale-[0.99]"
            >
              <ShoppingBag className="h-5 w-5" strokeWidth={1.5} />
              Adicionar ao pedido
            </button>
          </div>
        </div>
      </section>

      <section className="hidden min-h-screen px-6 py-6 lg:flex lg:items-center lg:justify-center xl:px-8">
        <div className="grid w-full max-w-[1280px] overflow-hidden rounded-ds-2xl border border-menu-border bg-menu-surface-raised shadow-card lg:grid-cols-[minmax(340px,42%)_minmax(0,1fr)] xl:grid-cols-[minmax(440px,43%)_minmax(0,1fr)] 2xl:max-w-[1520px]">
          <div className="relative min-h-[520px] overflow-hidden bg-menu-accent-bg lg:min-h-[620px] xl:min-h-[680px] 2xl:min-h-[760px]">
            <ProductHero
              product={product}
              heroFailed={heroFailed}
              setHeroFailed={setHeroFailed}
              sizes="(min-width: 1280px) 520px, 44vw"
            />
            <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-menu-overlay/50 to-transparent" />
            <button
              type="button"
              aria-label="Voltar ao cardápio"
              onClick={() => router.push(menuHref)}
              className="absolute left-6 top-6 flex h-12 w-12 items-center justify-center rounded-full border border-menu-overlay-border/35 bg-menu-overlay/45 text-menu-overlay-fg backdrop-blur-sm transition-colors hover:bg-menu-overlay/65"
            >
              <ArrowLeft className="h-5 w-5" strokeWidth={1.5} />
            </button>
          </div>

          <div className="grid min-w-0 gap-4 p-5 xl:grid-cols-[minmax(0,1fr)_360px] xl:gap-5 xl:p-9">
            <div className="flex min-w-0 flex-col justify-center">
              <h1 className="max-w-2xl text-4xl font-black leading-[0.98] text-menu-text xl:text-6xl">
                {product.name}
              </h1>
              {product.description ? (
                <p className="mt-4 max-w-xl text-base leading-7 text-menu-text-muted xl:mt-5 xl:text-lg xl:leading-8">
                  {product.description}
                </p>
              ) : null}

              <div className="mt-5 grid max-w-xl grid-cols-2 gap-3 xl:mt-7">
                <div className="rounded-2xl border border-menu-border bg-menu-surface p-3 xl:p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-menu-text-subtle">Preço</p>
                  <p className="mt-1 text-2xl font-black text-menu-accent-strong">{formatCurrency(product.price)}</p>
                </div>
                <div className="rounded-2xl border border-menu-border bg-menu-surface p-3 xl:p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-menu-text-subtle">Pedido</p>
                  <p className="mt-1 text-xl font-black text-menu-text">{mesa ? `Mesa ${mesa}` : "Delivery"}</p>
                </div>
              </div>
            </div>

            <aside className="self-center lg:max-w-[560px] xl:max-w-none">
              <div className="rounded-ds-2xl border border-menu-border bg-menu-bg p-4 shadow-soft xl:p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-menu-text-muted">Adicionar ao pedido</p>
                    <p className="mt-1 text-3xl font-black tracking-tight text-menu-text xl:text-4xl">{formatCurrency(total)}</p>
                  </div>
                  <div className="rounded-2xl bg-menu-cta p-3 text-menu-cta-fg">
                    <ShoppingBag className="h-6 w-6" strokeWidth={1.5} />
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-menu-border bg-menu-surface-raised p-3 xl:p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-bold text-menu-text">Quantidade</p>
                      <p className="text-xs text-menu-text-subtle">Ajuste antes de seguir</p>
                    </div>
                    <QuantityControl quantity={quantity} setQuantity={setQuantity} compact />
                  </div>
                </div>

                <div className="mt-3 rounded-2xl border border-menu-border bg-menu-surface-raised p-3 xl:mt-4 xl:p-4">
                  <label className="font-bold text-menu-text">Observações</label>
                  <Textarea
                    placeholder="Alguma observação?"
                    maxLength={180}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    className="mt-3 min-h-[86px] rounded-2xl border-menu-border bg-menu-surface text-menu-text placeholder:text-menu-text-subtle focus:border-menu-accent focus:ring-1 focus:ring-menu-accent-border xl:min-h-[112px]"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAdd}
                  className="mt-4 flex h-12 w-full items-center justify-center gap-3 rounded-2xl bg-menu-cta px-5 text-base font-black text-menu-cta-fg shadow-soft transition-colors hover:bg-menu-cta-hover active:scale-[0.99] xl:mt-5 xl:h-14"
                >
                  <ShoppingBag className="h-5 w-5" strokeWidth={1.5} />
                  Adicionar ao pedido
                </button>

                <button
                  type="button"
                  onClick={() => router.push(menuHref)}
                  className="mt-3 w-full rounded-2xl border border-menu-border bg-menu-surface px-5 py-3 text-sm font-bold text-menu-accent-strong transition-colors hover:bg-menu-accent-bg"
                >
                  Voltar ao cardápio
                </button>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}
