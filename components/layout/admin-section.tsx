import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// ─── AdminSection ──────────────────────────────────────────────────────────────
// Bloco semântico dentro de uma AdminPage. Agrupa conteúdo relacionado
// com espaçamento consistente entre o título da seção e seu conteúdo.
//
// Uso simples:
//   <AdminSection>
//     <AdminSectionHeader title="Canais de venda" />
//     <AdminGrid cols="cols-3">...</AdminGrid>
//   </AdminSection>
//
// Uso com card visual:
//   <AdminSection card>
//     <AdminSectionHeader title="..." description="..." />
//     ...
//   </AdminSection>
// ──────────────────────────────────────────────────────────────────────────────

const adminSectionVariants = cva("flex flex-col", {
  variants: {
    gap: {
      sm: "gap-3",
      md: "gap-4 2xl:gap-5",
      lg: "gap-5 2xl:gap-6",
    },
    // Quando `card` é true, envolve o conteúdo num painel admin-panel
    card: {
      true:  [
        "rounded-ds-xl border overflow-hidden",
        "bg-admin-elevated border-admin-border",
      ],
      false: "",
    },
  },
  defaultVariants: {
    gap: "md",
    card: false,
  },
});

export interface AdminSectionProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof adminSectionVariants> {}

export function AdminSection({
  className,
  gap,
  card,
  ...props
}: AdminSectionProps) {
  return (
    <section
      data-layout="admin-section"
      className={cn(adminSectionVariants({ gap, card }), className)}
      {...props}
    />
  );
}

// ── AdminSectionHeader ─────────────────────────────────────────────────────────
// Cabeçalho de seção — menor que AdminHeaderTitle (usa h2).
// Aparece dentro de AdminSection, acima do conteúdo.

export interface AdminSectionHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  /** Slot direito: botão de ação, badge de período, etc. */
  action?: React.ReactNode;
  /** Com padding para uso dentro de um AdminSection card={true} */
  padded?: boolean;
}

export function AdminSectionHeader({
  title,
  description,
  action,
  padded = false,
  className,
  ...props
}: AdminSectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3",
        padded && "px-6 py-5 border-b border-admin-border-faint",
        className
      )}
      {...props}
    >
      <div className="min-w-0 space-y-1">
        <h2 className="text-base font-semibold text-admin-fg">{title}</h2>
        {description && (
          <p className="text-sm text-admin-fg-muted">{description}</p>
        )}
      </div>
      {action && (
        <div className="shrink-0">{action}</div>
      )}
    </div>
  );
}

// ── AdminSectionIconHeader ─────────────────────────────────────────────────────
// Variante do cabeçalho com ícone à esquerda — padrão da página de configurações.
// Substitui o `SectionHeader` local definido em configuracoes/page.tsx.

export interface AdminSectionIconHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  icon: React.ElementType;
  title: string;
  description?: string;
  padded?: boolean;
}

export function AdminSectionIconHeader({
  icon: Icon,
  title,
  description,
  padded = false,
  className,
  ...props
}: AdminSectionIconHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-3.5",
        padded && "px-6 py-5 border-b border-admin-border-faint",
        className
      )}
      {...props}
    >
      {/* Icon wrap — token: admin-surface + admin-border */}
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-ds-md border border-admin-border bg-admin-surface text-admin-fg-secondary">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-admin-fg">{title}</h2>
        {description && (
          <p className="mt-0.5 text-sm text-admin-fg-muted">{description}</p>
        )}
      </div>
    </div>
  );
}

// ── AdminSectionContent ────────────────────────────────────────────────────────
// Área de conteúdo com padding padronizado — usado dentro de AdminSection card={true}

export interface AdminSectionContentProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: "sm" | "md" | "lg" | "none";
}

const contentPaddingMap = {
  none: "",
  sm:   "p-4",
  md:   "p-5 2xl:p-6",
  lg:   "p-6 2xl:p-8",
};

export function AdminSectionContent({
  padding = "md",
  className,
  ...props
}: AdminSectionContentProps) {
  return (
    <div
      className={cn(contentPaddingMap[padding], className)}
      {...props}
    />
  );
}

// ── AdminDivider ───────────────────────────────────────────────────────────────
// Separador horizontal semântico — substitui `<div className="border-t border-[#1e1e1e]">`

export function AdminDivider({ className, ...props }: React.HTMLAttributes<HTMLHRElement>) {
  return (
    <hr
      className={cn("border-t border-admin-border-faint", className)}
      {...props}
    />
  );
}

// ── AdminFieldGroup ────────────────────────────────────────────────────────────
// Grupo de campo com label + hint — substitui o `Field` local de configuracoes/page.tsx.
// Para inputs, use em conjunto com DSInput.

export interface AdminFieldGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  hint?: string;
  htmlFor?: string;
}

export function AdminFieldGroup({
  label,
  hint,
  htmlFor,
  className,
  children,
  ...props
}: AdminFieldGroupProps) {
  return (
    <div className={cn("space-y-1.5", className)} {...props}>
      <label htmlFor={htmlFor} className="block">
        <span className="text-xs font-medium text-admin-fg-muted">{label}</span>
        {hint && (
          <span className="mt-0.5 block text-xs text-admin-fg-faint">{hint}</span>
        )}
      </label>
      {children}
    </div>
  );
}
