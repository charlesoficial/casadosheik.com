import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// ─── DSButton ──────────────────────────────────────────────────────────────────
// Botão do Design System. Todos os estilos vêm de tokens — nunca use hex
// hardcoded ao usar este componente.
//
// Variantes:
//   primary   → CTA dourado (brand-gold) — ação principal
//   secondary → Fundo sutil (admin-overlay) — ação secundária
//   ghost     → Sem fundo — ação terciária / ícone
//   outline   → Borda explícita sem fundo — alternativa ao ghost
//   admin     → Roxo (brand-purple) — ações de sistema no admin
//   danger    → Vermelho (status-danger) — ações destrutivas
//   success   → Verde (status-success) — confirmações
// ──────────────────────────────────────────────────────────────────────────────

const dsButtonVariants = cva(
  [
    // Layout
    "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium",
    // Transição de cores — motion system tier "default" (200ms)
    "transition-[background-color,border-color,color,opacity]",
    "duration-motion-default ease-motion-in-out",
    // Press — .motion-press aplica scale(0.97) no :active
    "motion-press",
    // Focus — ring de acessibilidade (aparece instantaneamente)
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
    "disabled:pointer-events-none disabled:opacity-40",
  ],
  {
    variants: {
      variant: {
        // CTA principal — dourado
        primary: [
          "bg-brand-gold text-admin-base",
          "hover:opacity-90 active:opacity-80",
        ],
        // Ação secundária — fundo sutil
        secondary: [
          "border border-admin-border bg-admin-overlay text-admin-fg-secondary",
          "hover:bg-admin-elevated hover:border-admin-border-strong hover:text-admin-fg",
        ],
        // Ação terciária — sem fundo
        ghost: [
          "text-admin-fg-muted",
          "hover:bg-admin-overlay hover:text-admin-fg",
        ],
        // Contorno explícito
        outline: [
          "border border-admin-border bg-transparent text-admin-fg-secondary",
          "hover:bg-admin-overlay hover:text-admin-fg",
        ],
        // Ação de sistema — roxo brand
        admin: [
          "bg-brand-purple text-admin-fg",
          "hover:opacity-90 active:opacity-80",
        ],
        // Ação destrutiva
        danger: [
          "border border-status-danger-border bg-status-danger-bg text-status-danger-fg",
          "hover:bg-status-danger-border hover:text-admin-fg",
        ],
        // Confirmação
        success: [
          "border border-status-success-border bg-status-success-bg text-status-success-fg",
          "hover:opacity-90",
        ],
        // Área pública — usa variáveis do tema claro
        "public-primary": [
          "bg-primary text-primary-foreground",
          "hover:opacity-95 active:opacity-90",
        ],
        "public-secondary": [
          "bg-secondary text-secondary-foreground",
          "hover:bg-accent",
        ],
      },

      size: {
        xs:   "h-8 rounded-ds-sm px-3 text-xs",
        sm:   "h-9 rounded-ds-sm px-4 text-sm",
        md:   "h-11 rounded-ds-md px-5 text-sm",
        lg:   "h-14 rounded-ds-lg px-7 text-base",
        icon: "h-10 w-10 rounded-ds-md",
        "icon-sm": "h-8 w-8 rounded-ds-sm",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface DSButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof dsButtonVariants> {
  asChild?: boolean;
}

const DSButton = React.forwardRef<HTMLButtonElement, DSButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        data-ds-button={variant ?? "primary"}
        data-size={size ?? "md"}
        className={cn(dsButtonVariants({ variant, size }), className)}
        {...props}
      />
    );
  }
);
DSButton.displayName = "DSButton";

export { DSButton, dsButtonVariants };
