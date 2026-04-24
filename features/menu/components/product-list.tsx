"use client";

import { useMemo } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { getCategoryAnchor } from "@/features/menu/utils/category-anchor";
import type { MenuProduct } from "@/lib/types";
import { ProductCard } from "./product-card";

export function ProductList({
  categories,
  products,
  mesa,
  search,
  activeCategory,
}: {
  categories: string[];
  products: MenuProduct[];
  mesa?: string;
  search: string;
  activeCategory: string | null;
}) {
  const filteredProducts = useMemo(
    () =>
      products.filter((product) => {
        const searchTerm = search.trim().toLowerCase();
        const matchesCategory = activeCategory ? product.category === activeCategory : true;
        const matchesSearch = searchTerm
          ? `${product.name} ${product.description} ${product.category}`
              .toLowerCase()
              .includes(searchTerm)
          : true;
        return matchesCategory && matchesSearch;
      }),
    [products, search, activeCategory]
  );

  const visibleCategories = useMemo(
    () => categories.filter((cat) => filteredProducts.some((p) => p.category === cat)),
    [categories, filteredProducts]
  );

  if (!visibleCategories.length) {
    return (
      <div className="px-4 py-5 lg:px-6">
        <Card className="rounded-ds-2xl border-menu-border bg-menu-surface">
          <CardContent className="space-y-2 p-6 text-center">
            <p className="text-lg font-semibold text-menu-text">
              {search || activeCategory ? "Nenhum produto encontrado" : "Cardápio indisponível"}
            </p>
            <p className="text-sm leading-6 text-menu-text-muted">
              {search || activeCategory
                ? "Tente limpar a busca ou trocar a categoria selecionada."
                : "Ainda não há produtos publicados. Tente novamente em instantes."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 px-4 py-5 lg:px-6">
      {visibleCategories.map((category) => {
        const anchor = getCategoryAnchor(category);
        const categoryProducts = filteredProducts.filter((p) => p.category === category);

        return (
          <section
            key={category}
            id={`cat-${anchor}`}
            className="scroll-mt-6 space-y-3"
          >
            <div className="flex items-baseline gap-3">
              <h2 className="border-l-[3px] border-menu-accent pl-3 text-xl font-bold text-menu-text">
                {category}
              </h2>
              <span className="shrink-0 text-xs text-menu-text-subtle">
                {categoryProducts.length} itens
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
              {categoryProducts.map((product, index) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  mesa={mesa}
                  priority={category === visibleCategories[0] && index < 2}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
