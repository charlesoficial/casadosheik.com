"use client";

import { Search, ShoppingBag, Store, Truck, User } from "lucide-react";

import { useCart } from "@/components/cart-provider";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { RestaurantConfig } from "@/lib/types";

export function DesktopTopbar({
  restaurant,
  mesa,
  search,
  setSearch,
}: {
  restaurant: RestaurantConfig;
  mesa?: string;
  search: string;
  setSearch: (s: string) => void;
}) {
  const { totalItems } = useCart();
  const modeLabel = mesa ? `Mesa ${mesa}` : "Delivery";

  return (
    <header className="sticky top-0 z-30 hidden items-center gap-6 border-b border-menu-border bg-menu-surface px-8 py-4 lg:flex">
      {/* Logo + nome */}
      <div className="flex shrink-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-menu-accent-border bg-menu-surface-raised">
          <User className="h-5 w-5 text-menu-accent" strokeWidth={1.5} />
        </div>
        <div>
          <p className="font-bold leading-none text-menu-text">{restaurant.name}</p>
          <p className="text-xs text-menu-text-muted">{restaurant.cuisine}</p>
        </div>
      </div>

      {/* Busca central */}
      <div className="mx-auto max-w-lg flex-1">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-menu-text-subtle"
            strokeWidth={1.5}
          />
          <Input
            placeholder="Buscar no cardápio"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 rounded-2xl border-menu-border bg-menu-bg pl-10 text-menu-text placeholder:text-menu-text-subtle focus:border-menu-accent focus:ring-1 focus:ring-menu-accent-border"
          />
        </div>
      </div>

      {/* Direita: mode + status + carrinho */}
      <div className="flex shrink-0 items-center gap-3">
        <Badge className="border-menu-accent-border bg-menu-accent-bg text-menu-accent">
          {mesa ? (
            <Store className="mr-1 h-3.5 w-3.5" strokeWidth={1.5} />
          ) : (
            <Truck className="mr-1 h-3.5 w-3.5" strokeWidth={1.5} />
          )}
          {modeLabel}
        </Badge>

        {restaurant.open ? (
          <Badge className="border-menu-success/40 bg-menu-success-bg text-menu-success">
            Aberto agora
          </Badge>
        ) : (
          <Badge className="border-menu-border bg-menu-accent-bg text-menu-text-muted">
            Fechado
          </Badge>
        )}

        {totalItems > 0 ? (
          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-menu-border bg-menu-surface-soft transition-colors hover:bg-menu-accent-bg">
              <ShoppingBag className="h-5 w-5 text-menu-text" strokeWidth={1.5} />
            </div>
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-menu-cta text-[10px] font-bold text-menu-cta-fg">
              {totalItems}
            </span>
          </div>
        ) : null}
      </div>
    </header>
  );
}
