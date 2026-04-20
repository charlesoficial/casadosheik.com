"use client";

import Link from "next/link";
import { UtensilsCrossed } from "lucide-react";

import { useCart } from "@/components/cart-provider";
import { formatCurrency } from "@/lib/utils";

export function CartPanel({ mesa }: { mesa?: string }) {
  const { items, totalPrice } = useCart();
  const checkoutHref = mesa ? `/checkout?mesa=${mesa}` : "/checkout";

  return (
    <aside className="sticky top-[73px] hidden h-[calc(100vh-73px)] w-80 shrink-0 flex-col overflow-y-auto border-l border-menu-border bg-menu-surface px-5 py-6 lg:flex">
      <p className="mb-4 font-bold text-menu-text">Seu pedido</p>

      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <UtensilsCrossed className="h-10 w-10 text-menu-text-subtle opacity-30" strokeWidth={1.5} />
          <p className="text-sm text-menu-text-subtle">
            Adicione itens para montar seu pedido
          </p>
        </div>
      ) : (
        <>
          <div className="flex-1 space-y-3 overflow-y-auto">
            {items.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-menu-text">{item.name}</p>
                  <p className="text-xs text-menu-text-muted">
                    {item.qty}× {formatCurrency(item.price)}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold text-menu-accent">
                  {formatCurrency(item.price * item.qty)}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-3 border-t border-menu-border pt-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-menu-text">Total</p>
              <p className="text-lg font-bold text-menu-accent">{formatCurrency(totalPrice)}</p>
            </div>
            <Link
              href={checkoutHref}
              className="block w-full rounded-2xl bg-menu-cta py-3 text-center font-semibold text-menu-cta-fg transition-colors hover:bg-menu-cta-hover"
            >
              Finalizar pedido
            </Link>
          </div>
        </>
      )}
    </aside>
  );
}
