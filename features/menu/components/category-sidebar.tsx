"use client";

import { cn } from "@/lib/utils";

export function CategorySidebar({
  categories,
  activeAnchor,
  onCategoryClick,
  categoryCounts,
}: {
  categories: string[];
  activeAnchor: string;
  onCategoryClick: (anchor: string) => void;
  categoryCounts: Record<string, number>;
}) {
  return (
    <aside className="sticky top-[73px] hidden h-[calc(100vh-73px)] w-56 shrink-0 flex-col overflow-y-auto border-r border-menu-border bg-menu-surface px-4 py-6 lg:flex">
      <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-menu-text-subtle">
        Cardápio
      </p>

      {categories.map((category) => {
        const anchor = getCategoryAnchor(category);
        return (
          <button
            key={category}
            type="button"
            aria-label={`Ir para categoria ${category}`}
            onClick={() => onCategoryClick(anchor)}
            className={cn(
              "mb-1 w-full rounded-xl px-3 py-2 text-left text-sm transition-colors",
              activeAnchor === anchor
                ? "bg-menu-accent-bg font-semibold text-menu-accent-strong"
                : "text-menu-text-muted hover:bg-menu-surface-soft hover:text-menu-text"
            )}
          >
            <span>{category}</span>
            <span className="float-right text-xs text-menu-text-subtle">
              {categoryCounts[category] ?? 0}
            </span>
          </button>
        );
      })}
    </aside>
  );
}

function getCategoryAnchor(category: string): string {
  return category
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
