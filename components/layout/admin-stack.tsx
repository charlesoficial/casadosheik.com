import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// ─── AdminStack ────────────────────────────────────────────────────────────────
// Espaçamento vertical padronizado entre elementos filhos.
//
// Substitui os `space-y-*` soltos espalhados pelas páginas.
// A diferença do AdminPage (que controla gap entre seções da página) é que
// AdminStack é para espaçamento dentro de um componente ou seção.
//
// Usa `gap` em vez de `space-y` pois funciona corretamente com flex e grid,
// não quebra com elementos hidden e é semanticamente mais preciso.
//
// Variantes de espaçamento (baseadas na escala do design-tokens.json):
//   xs  → 0.5rem  (8px)  — entre chips, ícones, elementos inline
//   sm  → 0.75rem (12px) — entre itens de lista densa
//   md  → 1rem    (16px) — padrão geral dentro de cards
//   lg  → 1.5rem  (24px) — entre grupos de campos
//   xl  → 2rem    (32px) — entre blocos distintos dentro de uma seção
// ──────────────────────────────────────────────────────────────────────────────

const adminStackVariants = cva("flex", {
  variants: {
    direction: {
      vertical:   "flex-col",
      horizontal: "flex-row flex-wrap",
    },

    gap: {
      xs: "gap-2",
      sm: "gap-3",
      md: "gap-4",
      lg: "gap-6",
      xl: "gap-8",
    },

    // Alinhamento horizontal dos filhos (só faz efeito em direction=vertical)
    align: {
      start:   "items-start",
      center:  "items-center",
      end:     "items-end",
      stretch: "items-stretch",
    },

    // Justificação dos filhos (só faz efeito em direction=horizontal)
    justify: {
      start:   "justify-start",
      center:  "justify-center",
      end:     "justify-end",
      between: "justify-between",
    },
  },
  defaultVariants: {
    direction: "vertical",
    gap: "md",
    align: "stretch",
    justify: "start",
  },
});

export interface AdminStackProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof adminStackVariants> {
  as?: React.ElementType;
}

export function AdminStack({
  className,
  direction,
  gap,
  align,
  justify,
  as: Tag = "div",
  ...props
}: AdminStackProps) {
  return (
    <Tag
      data-layout="admin-stack"
      className={cn(adminStackVariants({ direction, gap, align, justify }), className)}
      {...props}
    />
  );
}

// ── AdminInline ────────────────────────────────────────────────────────────────
// Atalho para AdminStack direction="horizontal" — alinhamento em linha.
// Uso: badges, grupos de botões, labels com ícone.

export interface AdminInlineProps
  extends React.HTMLAttributes<HTMLDivElement>,
    Pick<VariantProps<typeof adminStackVariants>, "gap" | "justify"> {
  align?: "start" | "center" | "end";
}

export function AdminInline({
  className,
  gap = "sm",
  align = "center",
  justify = "start",
  ...props
}: AdminInlineProps) {
  return (
    <div
      data-layout="admin-inline"
      className={cn(
        adminStackVariants({ direction: "horizontal", gap, justify }),
        // align em flex-row controla cross-axis (vertical)
        align === "start"  && "items-start",
        align === "center" && "items-center",
        align === "end"    && "items-end",
        className
      )}
      {...props}
    />
  );
}
