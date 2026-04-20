import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// ─── AdminPage ─────────────────────────────────────────────────────────────────
// Container raiz de cada página do admin. Substitui o `<div className="space-y-*">`
// que cada página cria de forma diferente.
//
// O layout shell já fornece o padding horizontal/vertical externo
// (px-4 py-4 sm:px-6 sm:py-6 no app/(admin)/layout.tsx).
// AdminPage cuida apenas do espaçamento vertical entre as seções internas.
//
// Variantes de gap:
//   default → gap padrão entre seções (4 → 6 em telas 2xl)
//   compact → para páginas densas com muita informação
//   relaxed → para páginas com poucos blocos grandes
// ──────────────────────────────────────────────────────────────────────────────

const adminPageVariants = cva("flex flex-col w-full", {
  variants: {
    gap: {
      compact: "gap-4",
      default: "gap-4 2xl:gap-6",
      relaxed: "gap-6 2xl:gap-8",
    },
    // Largura máxima opcional — para páginas de formulário estreitas
    maxWidth: {
      none:  "",
      prose: "max-w-3xl",
      form:  "max-w-2xl",
    },
  },
  defaultVariants: {
    gap: "default",
    maxWidth: "none",
  },
});

export interface AdminPageProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof adminPageVariants> {}

export function AdminPage({ className, gap, maxWidth, ...props }: AdminPageProps) {
  return (
    <div
      data-layout="admin-page"
      className={cn(adminPageVariants({ gap, maxWidth }), "animate-motion-slide-up", className)}
      {...props}
    />
  );
}
