"use client";

import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function MobileStickyBar({
  search,
  setSearch,
  categories,
  activeCategory,
  setActiveCategory,
}: {
  search: string;
  setSearch: (s: string) => void;
  categories: string[];
  activeCategory: string | null;
  setActiveCategory: (c: string | null) => void;
}) {
  return (
    <section className="sticky top-0 z-20 space-y-3 border-b border-menu-border bg-menu-bg/95 px-4 py-3 backdrop-blur lg:hidden">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-menu-text-subtle"
          strokeWidth={1.5}
        />
        <Input
          placeholder="Buscar no cardápio"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-11 rounded-2xl border-menu-accent-border bg-menu-surface pl-10 text-menu-text placeholder:text-menu-text-subtle focus:border-menu-accent focus:ring-1 focus:ring-menu-accent-border focus:outline-none"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onClick={() => setActiveCategory(null)}
          className={cn(
            "shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors",
            activeCategory === null
              ? "border-menu-accent-strong bg-menu-accent-bg text-menu-accent-strong"
              : "border-menu-border bg-menu-surface text-menu-text-muted hover:border-menu-border-strong hover:text-menu-text"
          )}
        >
          Todos
        </button>
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setActiveCategory(activeCategory === category ? null : category)}
            className={cn(
              "shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors",
              activeCategory === category
                ? "border-menu-accent-strong bg-menu-accent-bg text-menu-accent-strong"
                : "border-menu-border bg-menu-surface text-menu-text-muted hover:border-menu-border-strong hover:text-menu-text"
            )}
          >
            {category}
          </button>
        ))}
      </div>
    </section>
  );
}
