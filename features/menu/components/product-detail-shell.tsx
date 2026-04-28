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
  presentation = "cover",
}: {
  product: MenuProduct;
  heroFailed: boolean;
  setHeroFailed: (failed: boolean) => void;
  sizes: string;
  presentation?: "cover" | "showcase";
}) {
  if (heroFailed || !product.image) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_50%_35%,rgba(184,128,25,0.28),rgba(30,23,20,0.92)_68%)]">
        <div className="flex h-28 w-28 items-center justify-center rounded-full border border-menu-overlay-border/25 bg-menu-overlay/30 text-menu-overlay-fg shadow-card backdrop-blur-sm">
          <UtensilsCrossed className="h-14 w-14" strokeWidth={1.4} />
        </div>
      </div>
    );
  }

  if (presentation === "showcase") {
    return (
      <div className="relative h-full w-full overflow-hidden bg-[#fbf4e8]">
        <div className="absolute inset-0 flex items-center justify-center px-10 py-16 xl:px-14 2xl:px-20">
          <div className="relative h-[86vh] max-h-[920px] min-h-[520px] w-full max-w-[760px]">
            <Image
              src={product.image}
              alt={product.name}
              fill
              priority
              sizes={sizes}
              className="object-contain object-center"
              onError={() => setHeroFailed(true)}
            />
          </div>
        </div>
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
    <main className="menu-theme min-h-screen bg-[#fbf4e8] text-menu-text">
      <section className="mx-auto min-h-screen max-w-[480px] bg-menu-bg lg:hidden">
        <div className="relative aspect-square w-full overflow-hidden bg-menu-accent-bg">
          <ProductHero
            product={product}
            heroFailed={heroFailed}
            setHeroFailed={setHeroFailed}
            sizes="(max-width: 1023px) 100vw, 0px"
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

      <section className="hidden min-h-screen lg:block">
        <div className="grid min-h-screen bg-[#fbf4e8] lg:grid-cols-[minmax(520px,50vw)_minmax(0,1fr)] 2xl:grid-cols-[minmax(760px,52vw)_minmax(0,1fr)]">
          <div className="relative min-h-screen overflow-hidden bg-[#fbf4e8] px-8 py-8 xl:px-10 xl:py-10">
            <div className="relative h-full min-h-[calc(100vh-80px)] overflow-hidden rounded-[8px] bg-[#fbf4e8]">
              <ProductHero
                product={product}
                heroFailed={heroFailed}
                setHeroFailed={setHeroFailed}
                sizes="(min-width: 1536px) 52vw, 50vw"
              />
            </div>
            <button
              type="button"
              aria-label="Voltar ao cardápio"
              onClick={() => router.push(menuHref)}
              className="absolute left-14 top-14 flex h-12 w-12 items-center justify-center rounded-full border border-white/25 bg-black/38 text-white shadow-soft backdrop-blur-md transition-colors hover:bg-black/55"
            >
              <ArrowLeft className="h-5 w-5" strokeWidth={1.5} />
            </button>
          </div>

          <div className="grid min-w-0 bg-[#fbf4e8] px-8 py-8 xl:grid-cols-[minmax(0,500px)_390px] xl:gap-10 xl:px-10 xl:py-10 2xl:grid-cols-[minmax(0,560px)_440px] 2xl:gap-12 2xl:px-14">
            <div className="flex min-w-0 flex-col justify-center py-10">
              <div className="mb-6 flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-menu-border bg-menu-surface px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-menu-accent-strong">
                  {mesa ? `Mesa ${mesa}` : "Delivery"}
                </span>
                <span className="rounded-full border border-menu-border bg-menu-surface px-4 py-2 text-xs font-bold text-menu-text-muted">
                  {product.category}
                </span>
              </div>
              <h1 className="max-w-[500px] text-[clamp(2.7rem,2.55vw,3.45rem)] font-black leading-[0.95] tracking-normal text-menu-text">
                {product.name}
              </h1>
              {product.description ? (
                <p className="mt-6 max-w-[650px] text-xl leading-9 text-menu-text-muted xl:mt-7 xl:text-[1.35rem] xl:leading-10">
                  {product.description}
                </p>
              ) : null}

              <div className="mt-10 grid max-w-[560px] gap-4 xl:mt-11">
                <div className="flex items-center justify-between rounded-[8px] border border-menu-border bg-white/78 px-7 py-6 shadow-soft backdrop-blur">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-menu-text-subtle">Preço</p>
                  <p className="text-[2.1rem] font-black leading-none text-menu-accent-strong">{formatCurrency(product.price)}</p>
                </div>
                <div className="flex items-center justify-between rounded-[8px] border border-menu-border bg-white/64 px-7 py-6 shadow-soft backdrop-blur">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-menu-text-subtle">Pedido</p>
                  <p className="text-[1.75rem] font-black leading-none text-menu-text">{mesa ? `Mesa ${mesa}` : "Delivery"}</p>
                </div>
              </div>
            </div>

            <aside className="self-center lg:max-w-[560px] xl:max-w-none">
              <div className="rounded-[8px] border border-menu-border bg-[#fffaf2]/96 p-5 shadow-[0_20px_55px_rgba(30,23,20,0.12)] backdrop-blur xl:p-6 2xl:p-7">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-menu-text-muted">Resumo do pedido</p>
                    <p className="mt-1 text-4xl font-black tracking-tight text-menu-text 2xl:text-5xl">{formatCurrency(total)}</p>
                  </div>
                  <div className="rounded-[8px] bg-menu-cta p-4 text-menu-cta-fg shadow-soft">
                    <ShoppingBag className="h-6 w-6" strokeWidth={1.5} />
                  </div>
                </div>

                <div className="mt-5 rounded-[8px] border border-menu-border bg-white/85 p-4 shadow-soft 2xl:p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-bold text-menu-text">Quantidade</p>
                      <p className="text-xs text-menu-text-subtle">Ajuste antes de seguir</p>
                    </div>
                    <QuantityControl quantity={quantity} setQuantity={setQuantity} compact />
                  </div>
                </div>

                <div className="mt-4 rounded-[8px] border border-menu-border bg-white/85 p-4 shadow-soft 2xl:p-5">
                  <label className="font-bold text-menu-text">Observações</label>
                  <Textarea
                    placeholder="Alguma observação?"
                    maxLength={180}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    className="mt-3 min-h-[112px] rounded-[8px] border-menu-border bg-menu-surface text-menu-text placeholder:text-menu-text-subtle focus:border-menu-accent focus:ring-1 focus:ring-menu-accent-border 2xl:min-h-[148px]"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAdd}
                  className="mt-5 flex h-14 w-full items-center justify-center gap-3 rounded-[8px] bg-menu-cta px-5 text-base font-black text-menu-cta-fg shadow-card transition-colors hover:bg-menu-cta-hover active:scale-[0.99] 2xl:h-16 2xl:text-lg"
                >
                  <ShoppingBag className="h-5 w-5" strokeWidth={1.5} />
                  Adicionar ao pedido
                </button>

                <button
                  type="button"
                  onClick={() => router.push(menuHref)}
                  className="mt-3 w-full rounded-[8px] border border-menu-border bg-white/75 px-5 py-3 text-sm font-bold text-menu-accent-strong transition-colors hover:bg-white"
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
