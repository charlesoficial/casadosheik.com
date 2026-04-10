"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Search, ShoppingBag, Store, Truck } from "lucide-react";

function ProductImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-2xl bg-[#f1e2c2]">
        <span className="text-2xl">🍽️</span>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      className="object-cover"
      onError={() => setFailed(true)}
    />
  );
}

import { useCart } from "@/components/cart-provider";
import { CustomerFlowHeader } from "@/components/customer/customer-flow-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import type { MenuProduct, RestaurantConfig } from "@/lib/types";

// Este componente representa a vitrine publica do restaurante.
// Aqui o cliente escolhe categoria, consulta produtos e segue para o checkout.
export function MenuShell({
  mesa,
  restaurant,
  categories,
  products
}: {
  mesa?: string;
  restaurant: RestaurantConfig;
  categories: string[];
  products: MenuProduct[];
}) {
  const { totalItems, totalPrice } = useCart();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const modeLabel = mesa ? `Mesa ${mesa}` : "Delivery";
  const logoInitials = restaurant.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
  const getCategoryAnchor = (category: string) =>
    category
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  const filteredProducts = useMemo(
    () =>
      products.filter((product) => {
        const searchTerm = search.trim().toLowerCase();
        const matchesCategory = activeCategory ? product.category === activeCategory : true;
        const matchesSearch = searchTerm
          ? `${product.name} ${product.description} ${product.category}`.toLowerCase().includes(searchTerm)
          : true;

        return matchesCategory && matchesSearch;
      }),
    [activeCategory, products, search]
  );
  const visibleCategories = useMemo(
    () => categories.filter((category) => filteredProducts.some((product) => product.category === category)),
    [categories, filteredProducts]
  );

  return (
    <main className="mx-auto min-h-screen max-w-[480px] bg-[linear-gradient(180deg,#f8f1e2_0%,#f1e2c2_38%,#ead4a7_100%)] pb-28">
      <CustomerFlowHeader
        className="px-5 pb-6"
        title={restaurant.name}
        description={restaurant.welcome}
        leading={
          <div className="rounded-full border border-[#ead9ae] bg-white p-1.5 shadow-soft">
            {restaurant.logoUrl ? (
              <div className="relative h-16 w-16 overflow-hidden rounded-full">
                <Image src={restaurant.logoUrl} alt={restaurant.name} fill className="object-cover" />
              </div>
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#2b1705] text-lg font-black text-[#f4c35a]">
                {logoInitials}
              </div>
            )}
          </div>
        }
        topBar={
          <div className="flex items-center justify-end">
            {restaurant.open ? (
              <Badge className="border-[#b7dfc4] bg-[#edf7f1] text-[#2d7a50]">Aberto agora</Badge>
            ) : (
              <Badge className="border-[#ddd0bf] bg-[#f5ede0] text-[#7a6040]">Fechado</Badge>
            )}
          </div>
        }
        badges={
          <>
            <Badge className="w-fit border-[#ddc08a] bg-white/80 text-[#6c5840]">{restaurant.cuisine}</Badge>
            <Badge className="w-fit border-[#c9a644] bg-[#fdf3d4] text-[#8f6d1e]">
              {mesa ? <Store className="mr-1 h-3.5 w-3.5" /> : <Truck className="mr-1 h-3.5 w-3.5" />}
              {modeLabel}
            </Badge>
          </>
        }
      />

      <section className="sticky top-0 z-20 space-y-3 border-b border-[#e1cc9c] bg-[#f6ecd7]/95 px-4 py-3 backdrop-blur">
        {/* Busca e filtros ficam fixos para o uso no celular continuar rapido
            mesmo em cardapios longos. */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8f8576]" />
          <Input
            placeholder="Buscar no cardápio"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-11 rounded-2xl border-[#ddc28c] bg-[#fff7e8] pl-10 text-[#2a1d12] placeholder:text-[#9a907f]"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => setActiveCategory(null)}
            className={[
              "shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors",
              activeCategory === null
                ? "border-[#8f6d1e] bg-[#f1d38a] text-[#8f6d1e]"
                : "border-[#dcc291] bg-[#fbf1db] text-[#5f5340]"
            ].join(" ")}
          >
            Todos
          </button>
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory((current) => (current === category ? null : category))}
              className={[
                "shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                activeCategory === category
                  ? "border-[#8f6d1e] bg-[#f1d38a] text-[#8f6d1e]"
                  : "border-[#dcc291] bg-[#fbf1db] text-[#5f5340]"
              ].join(" ")}
            >
              {category}
            </button>
          ))}
        </div>
      </section>

      <div className="space-y-8 px-4 py-5">
        {visibleCategories.length ? (
          visibleCategories.map((category) => (
            <section key={category} id={getCategoryAnchor(category)} className="space-y-3 scroll-mt-28">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-xl font-semibold text-[#22180d]">{category}</h2>
                <span className="shrink-0 text-xs text-[#9a8a72]">
                  {filteredProducts.filter((product) => product.category === category).length} itens
                </span>
              </div>
              <div className="space-y-3">
                {filteredProducts
                  .filter((product) => product.category === category)
                  .map((product) => (
                    <Link key={product.id} href={mesa ? `/produto/${product.id}?mesa=${mesa}` : `/produto/${product.id}`}>
                      <Card className="rounded-[26px] border-[#dfc691] bg-[#fff9eb] transition-transform hover:-translate-y-0.5 hover:border-[#cda25d]">
                        <CardContent className="flex items-start gap-4 p-4">
                          <div className="min-w-0 flex-1 space-y-2">
                            <div className="flex items-start justify-between gap-3">
                              <h3 className="line-clamp-2 text-base font-semibold text-[#21180f]">
                                {product.name}
                              </h3>
                              {product.badge ? (
                                <Badge className="shrink-0 border-[#c9a644] bg-[#f1d38a] text-[#8f6d1e]">
                                  {product.badge}
                                </Badge>
                              ) : null}
                            </div>
                            <p className="line-clamp-2 text-sm leading-5 text-[#6d604c]">
                              {product.description}
                            </p>
                            <p className="text-base font-semibold text-[#8f6d1e]">
                              {formatCurrency(product.price)}
                            </p>
                          </div>
                          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl">
                            <ProductImage src={product.image} alt={product.name} />
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
              </div>
            </section>
          ))
        ) : (
          <Card className="rounded-[28px] border-[#dfc691] bg-[#fff8e9]">
            <CardContent className="space-y-2 p-6 text-center">
              <p className="text-lg font-semibold text-[#22180d]">
                {search || activeCategory ? "Nenhum produto encontrado" : "Cardápio indisponível no momento"}
              </p>
              <p className="text-sm leading-6 text-[#6d604c]">
                {search || activeCategory
                  ? "Tente limpar a busca ou trocar a categoria selecionada para ver mais opções."
                  : "Ainda não existem categorias ou produtos publicados. Tente novamente em alguns instantes."}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {totalItems > 0 ? (
        // O CTA fixo mantem o carrinho sempre acessivel sem forcar scroll ate o topo.
        <div className="fixed bottom-4 left-1/2 z-30 w-[calc(100%-24px)] max-w-[456px] -translate-x-1/2">
          <Button asChild className="h-16 w-full justify-between rounded-[24px] px-5 text-base shadow-soft">
            <Link href={mesa ? `/checkout?mesa=${mesa}` : "/checkout"}>
              <span className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                  <ShoppingBag className="h-5 w-5" />
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
      ) : null}
    </main>
  );
}
