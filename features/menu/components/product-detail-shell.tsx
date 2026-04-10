"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Minus, Plus, Sparkles, UtensilsCrossed } from "lucide-react";

import { useCart } from "@/components/cart-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { buildCheckoutHref, buildMenuHref } from "@/lib/utils/customer-navigation";
import { formatCurrency } from "@/lib/utils";
import type { MenuProduct } from "@/lib/types";

// Detalhe do produto no fluxo publico.
// Aqui o cliente ajusta quantidade e observacoes antes de cair no checkout.
export function ProductDetailShell({ product, mesa }: { product: MenuProduct; mesa?: string }) {
  const router = useRouter();
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [heroFailed, setHeroFailed] = useState(false);
  const menuHref = buildMenuHref(mesa);
  const checkoutHref = buildCheckoutHref(mesa, product.id);

  function handleAdd() {
    // Ao adicionar, o fluxo segue direto para o checkout para reduzir friccao no celular.
    addItem(product, quantity, note);
    router.push(checkoutHref);
  }

  return (
    <main className="mx-auto min-h-screen max-w-[480px] bg-[#fbf7f0]">
      <Card className="min-h-screen w-full rounded-none border-0 bg-transparent shadow-none">
        <div className="relative aspect-[16/10] overflow-hidden">
          {!heroFailed && product.image ? (
            <Image src={product.image} alt={product.name} fill className="object-cover" onError={() => setHeroFailed(true)} />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[#f1e2c2]">
              <UtensilsCrossed className="h-16 w-16 text-[#c4a97a]" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#1f140c]/60 via-[#1f140c]/10 to-transparent" />
          <div className="absolute left-4 top-4 right-4 flex items-start justify-between">
            <button
              type="button"
              onClick={() => router.push(menuHref)}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/35 bg-[#2b1705]/45 text-white backdrop-blur"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            {product.highlight ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-[#2b1705]/45 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white backdrop-blur">
                <Sparkles className="h-3.5 w-3.5" />
                Destaque da casa
              </div>
            ) : null}
          </div>
        </div>

        <div className="-mt-7 px-4">
          <div className="rounded-[30px] border border-[#f0e4d2] bg-white/96 p-5 shadow-[0_20px_60px_rgba(74,45,6,0.12)] backdrop-blur">
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="inline-flex items-center rounded-full bg-[#faf3e1] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#8f6d1e]">
                      {product.category}
                    </div>
                    <h1 className="text-[2rem] font-bold leading-none text-[#22180d]">{product.name}</h1>
                  </div>
                  <div className="rounded-[22px] bg-[#f7eed8] px-4 py-3 text-right shadow-sm">
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#8f6d1e]">Preco</p>
                    <span className="text-xl font-bold text-[#8f6d1e]">{formatCurrency(product.price)}</span>
                  </div>
                </div>
                <p className="text-sm leading-7 text-[#695b48]">{product.description}</p>
              </div>

              <div className="grid gap-4 rounded-[26px] border border-[#f1e7d9] bg-[#fdfaf5] p-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[#2f251a]">Observacoes</label>
                  <p className="text-xs leading-5 text-[#8b7d69]">
                    Personalize o preparo do jeito que fizer mais sentido para este item.
                  </p>
                </div>
                <Textarea
                  placeholder="Alguma observacao? Ex: sem cebola"
                  maxLength={180}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  className="min-h-[124px] rounded-[22px] border-[#eadfca] bg-white px-4 py-3 text-[#2a1d12] placeholder:text-[#a1937e]"
                />
              </div>

              <div className="flex items-center justify-between rounded-[26px] border border-[#eadfca] bg-[#faf7f1] p-4">
                <div className="space-y-1">
                  <p className="font-semibold text-[#2b2114]">Quantidade</p>
                  <p className="text-xs text-[#8b7d69]">Ajuste antes de adicionar ao pedido</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-[#e5d9c5] bg-white text-[#8f6d1e] transition-colors hover:bg-[#fff8ea]"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-8 text-center text-xl font-bold text-[#2b2114]">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity((current) => current + 1)}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-[#e5d9c5] bg-white text-[#8f6d1e] transition-colors hover:bg-[#fff8ea]"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="fixed bottom-4 left-1/2 w-[calc(100%-24px)] max-w-[456px] -translate-x-1/2">
          <Button
            size="lg"
            className="h-16 w-full rounded-[24px] bg-[linear-gradient(90deg,#d8a11c_0%,#c89417_100%)] text-base font-semibold shadow-[0_18px_40px_rgba(169,117,8,0.35)] hover:opacity-95"
            onClick={handleAdd}
          >
            Adicionar {formatCurrency(product.price * quantity)}
          </Button>
        </div>
      </Card>
    </main>
  );
}
