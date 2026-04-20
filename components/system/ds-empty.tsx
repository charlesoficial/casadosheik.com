import * as React from "react";
import {
  Inbox,
  ReceiptText,
  ShoppingBag,
  UtensilsCrossed,
  Printer,
  Search,
  CalendarX2,
  PackageSearch,
} from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { DSButton, type DSButtonProps } from "./ds-button";

// ─── DSEmpty ───────────────────────────────────────────────────────────────────
// Estado vazio padronizado para listas, tabelas e seções sem dados.
//
// Substitui textos soltos como:
//   "Nenhum pedido em {status} no momento"
//   "Nenhuma sangria ou suprimento hoje."
//   "Ainda nao ha itens vendidos suficientes para analise."
//
// Variantes de tamanho:
//   sm  → linha de tabela ou célula de grid (ícone menor, sem descrição)
//   md  → seção ou card (padrão)
//   lg  → página inteira sem dados
//
// Ícones predefinidos (context):
//   orders, menu, tables, printers, history, search, date, generic
//
// Uso:
//   <DSEmpty context="orders" title="Nenhum pedido" description="..." />
//   <DSEmpty icon={CustomIcon} title="Sem dados" action={{ label: "Criar", onClick: fn }} />
// ──────────────────────────────────────────────────────────────────────────────

const dsEmptyVariants = cva(
  "flex flex-col items-center justify-center text-center",
  {
    variants: {
      size: {
        sm: "gap-2 py-6 px-4",
        md: "gap-4 py-10 px-6",
        lg: "gap-5 py-16 px-8",
      },
    },
    defaultVariants: { size: "md" },
  }
);

const iconWrapVariants = cva(
  "flex items-center justify-center rounded-ds-xl border",
  {
    variants: {
      size: {
        sm: "h-8 w-8",
        md: "h-12 w-12",
        lg: "h-16 w-16",
      },
    },
    defaultVariants: { size: "md" },
  }
);

const iconSizeClass = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-7 w-7",
} as const;

// Ícone predefinido por contexto de uso
const contextIcon: Record<string, React.ElementType> = {
  orders:   ShoppingBag,
  menu:     UtensilsCrossed,
  tables:   ReceiptText,
  printers: Printer,
  history:  CalendarX2,
  search:   Search,
  products: PackageSearch,
  generic:  Inbox,
};

export interface DSEmptyAction
  extends Pick<DSButtonProps, "onClick" | "asChild"> {
  label: string;
  variant?: DSButtonProps["variant"];
}

export interface DSEmptyProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof dsEmptyVariants> {
  /** Ícone predefinido por contexto. */
  context?: keyof typeof contextIcon;
  /** Ícone customizado (sobrescreve `context`). */
  icon?: React.ElementType;
  /** Título da mensagem de estado vazio. */
  title: string;
  /** Descrição mais longa (opcional). */
  description?: string;
  /** Ação principal (opcional). */
  action?: DSEmptyAction;
  /** Ação secundária (opcional). */
  secondaryAction?: DSEmptyAction;
}

export function DSEmpty({
  context = "generic",
  icon,
  title,
  description,
  action,
  secondaryAction,
  size = "md",
  className,
  ...props
}: DSEmptyProps) {
  const Icon = icon ?? contextIcon[context] ?? Inbox;
  const safeSize = size ?? "md";

  return (
    <div
      data-ds-empty=""
      className={cn(dsEmptyVariants({ size }), className)}
      {...props}
    >
      {/* Ícone */}
      <span
        className={cn(
          iconWrapVariants({ size }),
          "bg-admin-surface border-admin-border text-admin-fg-faint"
        )}
        aria-hidden
      >
        <Icon className={iconSizeClass[safeSize]} />
      </span>

      {/* Texto */}
      <div className="max-w-xs space-y-1">
        <p
          className={cn(
            "font-medium text-admin-fg",
            safeSize === "sm" ? "text-sm" : safeSize === "lg" ? "text-base" : "text-sm"
          )}
        >
          {title}
        </p>
        {description && safeSize !== "sm" && (
          <p className="text-sm leading-relaxed text-admin-fg-muted">
            {description}
          </p>
        )}
      </div>

      {/* Ações */}
      {(action || secondaryAction) && safeSize !== "sm" && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {action && (
            <DSButton
              variant={action.variant ?? "secondary"}
              size="sm"
              onClick={action.onClick}
              asChild={action.asChild}
            >
              {action.label}
            </DSButton>
          )}
          {secondaryAction && (
            <DSButton
              variant={secondaryAction.variant ?? "ghost"}
              size="sm"
              onClick={secondaryAction.onClick}
              asChild={secondaryAction.asChild}
            >
              {secondaryAction.label}
            </DSButton>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Presets de contexto ───────────────────────────────────────────────────────
// Componentes pré-configurados para os contextos mais comuns do sistema.
// Reduzem boilerplate e garantem linguagem consistente.

export function EmptyOrders({
  status,
  size,
}: {
  status?: string;
  size?: DSEmptyProps["size"];
}) {
  return (
    <DSEmpty
      context="orders"
      size={size ?? "md"}
      title={status ? `Nenhum pedido em ${status}` : "Nenhum pedido"}
      description="Quando novos pedidos chegarem eles aparecerão aqui automaticamente."
    />
  );
}

export function EmptyProducts({
  hasFilter,
  onClear,
  size,
}: {
  hasFilter?: boolean;
  onClear?: () => void;
  size?: DSEmptyProps["size"];
}) {
  return (
    <DSEmpty
      context={hasFilter ? "search" : "products"}
      size={size ?? "md"}
      title={hasFilter ? "Nenhum produto encontrado" : "Nenhum produto ainda"}
      description={
        hasFilter
          ? "Tente remover os filtros ou usar termos diferentes."
          : "Adicione o primeiro produto para começar."
      }
      action={
        hasFilter && onClear
          ? { label: "Limpar filtros", onClick: onClear }
          : undefined
      }
    />
  );
}

export function EmptyHistory({ size }: { size?: DSEmptyProps["size"] }) {
  return (
    <DSEmpty
      context="history"
      size={size ?? "md"}
      title="Nenhum registro"
      description="O histórico aparecerá aqui conforme as operações forem sendo concluídas."
    />
  );
}

export function EmptyPrinters({
  onAdd,
  size,
}: {
  onAdd?: () => void;
  size?: DSEmptyProps["size"];
}) {
  return (
    <DSEmpty
      context="printers"
      size={size ?? "md"}
      title="Nenhuma impressora cadastrada"
      description="Cadastre uma impressora para habilitar impressão automática de comandas."
      action={onAdd ? { label: "Cadastrar impressora", onClick: onAdd } : undefined}
    />
  );
}

export function EmptySearch({ query, size }: { query?: string; size?: DSEmptyProps["size"] }) {
  return (
    <DSEmpty
      context="search"
      size={size ?? "md"}
      title="Nenhum resultado"
      description={
        query
          ? `Nenhum item encontrado para "${query}".`
          : "Tente usar termos diferentes na busca."
      }
    />
  );
}
