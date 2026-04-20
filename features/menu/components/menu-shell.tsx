"use client";

import { useMemo, useState } from "react";

import { useActiveCategory } from "@/hooks/use-active-category";
import { getCategoryAnchor } from "@/features/menu/utils/category-anchor";
import type { MenuProduct, RestaurantConfig } from "@/lib/types";

import { CartPanel } from "./cart-panel";
import { CategorySidebar } from "./category-sidebar";
import { DesktopTopbar } from "./desktop-topbar";
import { MobileCartButton } from "./mobile-cart-button";
import { MobileHeader } from "./mobile-header";
import { MobileStickyBar } from "./mobile-sticky-bar";
import { ProductList } from "./product-list";

export function MenuShell({
  mesa,
  restaurant,
  categories,
  products,
}: {
  mesa?: string;
  restaurant: RestaurantConfig;
  categories: string[];
  products: MenuProduct[];
}) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const categoryAnchors = useMemo(
    () => categories.map(getCategoryAnchor),
    [categories]
  );

  const activeSidebarAnchor = useActiveCategory(categoryAnchors);

  const categoryCounts = useMemo(
    () =>
      Object.fromEntries(
        categories.map((cat) => [cat, products.filter((p) => p.category === cat).length])
      ),
    [categories, products]
  );

  function scrollToCategory(anchor: string) {
    const el = document.getElementById(`cat-${anchor}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="flex min-h-screen w-full flex-col [background:var(--menu-bg-gradient-soft)] lg:bg-menu-bg">

      {/* Topbar — desktop only */}
      <DesktopTopbar
        restaurant={restaurant}
        mesa={mesa}
        search={search}
        setSearch={setSearch}
      />

      {/* Header — mobile only */}
      <MobileHeader restaurant={restaurant} mesa={mesa} />

      {/* Busca + pills — mobile only */}
      <MobileStickyBar
        search={search}
        setSearch={setSearch}
        categories={categories}
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
      />

      {/* Corpo — 3 colunas no desktop, 1 no mobile */}
      <div className="flex flex-1">

        {/* Sidebar esquerda — desktop only */}
        <CategorySidebar
          categories={categories}
          activeAnchor={activeSidebarAnchor}
          onCategoryClick={scrollToCategory}
          categoryCounts={categoryCounts}
        />

        {/* Lista central — sempre visível */}
        <main className="min-w-0 flex-1 pb-28 lg:pb-6">
          <ProductList
            categories={categories}
            products={products}
            mesa={mesa}
            search={search}
            activeCategory={activeCategory}
          />
        </main>

        {/* Painel carrinho — desktop only */}
        <CartPanel mesa={mesa} />
      </div>

      {/* Botão carrinho fixo — mobile only */}
      <MobileCartButton mesa={mesa} />
    </div>
  );
}
