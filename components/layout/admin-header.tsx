import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// ─── AdminHeader ───────────────────────────────────────────────────────────────
// Cabeçalho padrão de página admin.
//
// Problema que resolve: cada página tinha sua própria combinação de
// h1 + p + badge + div de ações, com cores e espaçamentos diferentes.
// Este componente padroniza a estrutura e os tokens usados.
//
// Anatomia:
//   <AdminHeader>
//     <AdminHeaderContent>          ← coluna esquerda (título + meta)
//       <AdminHeaderEyebrow />      ← rótulo pequeno acima do título (opcional)
//       <AdminHeaderTitle />        ← h1 principal
//       <AdminHeaderDescription />  ← parágrafo de suporte (opcional)
//     </AdminHeaderContent>
//     <AdminHeaderActions>          ← coluna direita (badges, botões, etc.)
//       {children}
//     </AdminHeaderActions>
//   </AdminHeader>
//
// Variant `stacked`:  título e ações em coluna (telas estreitas por padrão)
// Variant `inline`:   título e ações lado a lado (sempre)
// Variant `default`:  wrap responsivo — empilha em mobile, lado a lado em sm+
// ──────────────────────────────────────────────────────────────────────────────

const adminHeaderVariants = cva("flex gap-4", {
  variants: {
    layout: {
      default: "flex-wrap items-start justify-between",
      inline:  "flex-row items-center justify-between",
      stacked: "flex-col",
    },
  },
  defaultVariants: { layout: "default" },
});

export interface AdminHeaderProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof adminHeaderVariants> {}

export function AdminHeader({ className, layout, ...props }: AdminHeaderProps) {
  return (
    <div
      data-layout="admin-header"
      className={cn(adminHeaderVariants({ layout }), className)}
      {...props}
    />
  );
}

// ── AdminHeaderContent ─────────────────────────────────────────────────────────
// Coluna esquerda: eyebrow + título + description

export function AdminHeaderContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("min-w-0 max-w-3xl space-y-1.5", className)}
      {...props}
    />
  );
}

// ── AdminHeaderEyebrow ─────────────────────────────────────────────────────────
// Rótulo pequeno acima do título (ex: "Gerenciamento de acesso ao cardápio")
// Padrão do sistema: text-sm text-admin-fg-muted

export function AdminHeaderEyebrow({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-sm text-admin-fg-muted", className)}
      {...props}
    />
  );
}

// ── AdminHeaderTitle ───────────────────────────────────────────────────────────
// h1 da página — tamanho responsivo padronizado

const adminHeaderTitleVariants = cva(
  "font-semibold tracking-tight text-admin-fg",
  {
    variants: {
      size: {
        // Para páginas com muito conteúdo — título menor
        sm: "text-xl",
        // Padrão — cresce em telas maiores
        md: "text-xl xl:text-2xl 2xl:text-3xl",
        // Para dashboards e páginas de destaque
        lg: "text-2xl xl:text-3xl 2xl:text-4xl",
      },
    },
    defaultVariants: { size: "md" },
  }
);

export interface AdminHeaderTitleProps
  extends React.HTMLAttributes<HTMLHeadingElement>,
    VariantProps<typeof adminHeaderTitleVariants> {
  as?: "h1" | "h2" | "h3";
}

export function AdminHeaderTitle({
  className,
  size,
  as: Tag = "h1",
  ...props
}: AdminHeaderTitleProps) {
  return (
    <Tag
      className={cn(adminHeaderTitleVariants({ size }), className)}
      {...props}
    />
  );
}

// ── AdminHeaderDescription ─────────────────────────────────────────────────────
// Parágrafo de suporte abaixo do título

export function AdminHeaderDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-sm leading-7 text-admin-fg-secondary sm:text-base", className)}
      {...props}
    />
  );
}

// ── AdminHeaderActions ─────────────────────────────────────────────────────────
// Coluna direita — badges, botões, status indicators
// Usa flex-wrap para acomodar múltiplos elementos sem quebrar

export function AdminHeaderActions({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex shrink-0 flex-wrap items-center gap-2", className)}
      {...props}
    />
  );
}

// ── AdminLivePulse ─────────────────────────────────────────────────────────────
// Indicador de status ao vivo — reutilizável em qualquer AdminHeaderActions.
// Padrão: verde (sistema ativo). Substituído em contextos de erro.

const adminLivePulseVariants = cva(
  "inline-flex items-center gap-2 rounded-ds-md border px-3 py-2",
  {
    variants: {
      status: {
        active:  "border-status-success-border bg-status-success-bg",
        warning: "border-status-warning-border bg-status-warning-bg",
        danger:  "border-status-danger-border bg-status-danger-bg",
      },
    },
    defaultVariants: { status: "active" },
  }
);

const pulseColor = {
  active:  "bg-status-success-fg",
  warning: "bg-status-warning-fg",
  danger:  "bg-status-danger-fg",
} as const;

const pulseTextColor = {
  active:  "text-status-success-fg",
  warning: "text-status-warning-fg",
  danger:  "text-status-danger-fg",
} as const;

export interface AdminLivePulseProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof adminLivePulseVariants> {
  label: string;
}

export function AdminLivePulse({
  className,
  status = "active",
  label,
  ...props
}: AdminLivePulseProps) {
  const dot = pulseColor[status ?? "active"];
  const text = pulseTextColor[status ?? "active"];
  return (
    <div
      className={cn(adminLivePulseVariants({ status }), className)}
      {...props}
    >
      <span className="relative flex h-1.5 w-1.5 shrink-0">
        <span
          className={cn(
            "absolute inline-flex h-full w-full animate-ping rounded-full opacity-60",
            dot
          )}
        />
        <span className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", dot)} />
      </span>
      <span className={cn("text-xs font-medium", text)}>{label}</span>
    </div>
  );
}
