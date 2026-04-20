"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";

import { useCart } from "@/components/cart-provider";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

export function MobileCartButton({ mesa }: { mesa?: string }) {
  const { totalItems, totalPrice } = useCart();
  const href = mesa ? `/checkout?mesa=${mesa}` : "/checkout";

  if (totalItems === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-30 w-[calc(100%-24px)] max-w-[456px] -translate-x-1/2 lg:hidden">
      <Button
        asChild
        className="h-16 w-full justify-between rounded-[24px] bg-menu-cta px-5 text-base text-menu-cta-fg shadow-soft hover:bg-menu-cta-hover hover:opacity-100"
      >
        <Link href={href}>
          <span className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
              <ShoppingBag className="h-5 w-5" strokeWidth={1.5} />
            </span>
            <span className="flex flex-col items-start">
              <span className="text-sm font-medium text-white/80">{totalItems} itens</span>
              <span>Ver pedido</span>
            </span>
          </span>
          <span>{formatCurrency(totalPrice)}</span>
        </Link>
      </Button>
    </div>
  );
}
