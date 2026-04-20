import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// ─── AdminGrid ─────────────────────────────────────────────────────────────────
// Grid responsivo com presets baseados nos padrões reais do projeto.
//
// Problema que resolve: cada tela definia seu próprio grid ad-hoc:
//   mesas:         grid gap-4 md:grid-cols-3
//   configuracoes: grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_300px] 2xl:grid-cols-[...]
//   dashboard:     grid gap-4 2xl:gap-6 xl:grid-cols-[minmax(0,1.65fr)_320px] 2xl:grid-cols-[...]
//
// Presets disponíveis:
//   cols-2         → 2 colunas iguais a partir de sm
//   cols-3         → 3 colunas a partir de md (métricas, stat cards)
//   cols-4         → 4 colunas a partir de lg
//   sidebar-sm     → conteúdo + sidebar estreita (300px) — configurações
//   sidebar-md     → conteúdo + sidebar média (340px) — configurações 2xl
//   sidebar-lg     → conteúdo + sidebar larga (380px) — dashboard
//   auto           → grid sem colunas fixas (para uso com col-span manual)
// ──────────────────────────────────────────────────────────────────────────────

const adminGridVariants = cva("grid", {
  variants: {
    cols: {
      // Colunas simétricas
      "cols-2": "grid-cols-1 sm:grid-cols-2",
      "cols-3": "grid-cols-1 sm:grid-cols-2 md:grid-cols-3",
      "cols-4": "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",

      // Layouts assimétricos com sidebar — retirados das páginas existentes
      // conteúdo principal + sidebar 300/340px (configurações)
      "sidebar-sm": [
        "grid-cols-1",
        "xl:grid-cols-[minmax(0,1.15fr)_300px]",
        "2xl:grid-cols-[minmax(0,1.15fr)_340px]",
      ],
      // conteúdo principal + sidebar 320/380px (dashboard)
      "sidebar-lg": [
        "grid-cols-1",
        "xl:grid-cols-[minmax(0,1.65fr)_320px]",
        "2xl:grid-cols-[minmax(0,1.65fr)_380px]",
      ],
      // Sem preset — children controlam col-span
      auto: "grid-cols-1",
    },

    gap: {
      sm:      "gap-3",
      md:      "gap-4",
      lg:      "gap-4 2xl:gap-6",
      xl:      "gap-6 2xl:gap-8",
      // Gap diferente por eixo — útil em grids de formulário
      "form":  "gap-x-4 gap-y-5",
    },
  },
  defaultVariants: {
    cols: "cols-2",
    gap: "lg",
  },
});

export interface AdminGridProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof adminGridVariants> {}

export function AdminGrid({ className, cols, gap, ...props }: AdminGridProps) {
  return (
    <div
      data-layout="admin-grid"
      data-cols={cols ?? "cols-2"}
      className={cn(adminGridVariants({ cols, gap }), className)}
      {...props}
    />
  );
}

// ── AdminGridItem ──────────────────────────────────────────────────────────────
// Item de grid com controle de col-span semântico.
// Uso: <AdminGridItem span="full"> para elementos que ocupam toda a linha.

const adminGridItemVariants = cva("", {
  variants: {
    span: {
      1:    "col-span-1",
      2:    "col-span-1 sm:col-span-2",
      3:    "col-span-1 sm:col-span-2 md:col-span-3",
      full: "col-span-full",
    },
  },
});

export interface AdminGridItemProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof adminGridItemVariants> {}

export function AdminGridItem({ className, span, ...props }: AdminGridItemProps) {
  return (
    <div
      className={cn(span ? adminGridItemVariants({ span }) : "", className)}
      {...props}
    />
  );
}
