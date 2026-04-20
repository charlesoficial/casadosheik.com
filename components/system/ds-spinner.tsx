import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// ─── DSSpinner ─────────────────────────────────────────────────────────────────
// Substitui todos os `<Loader2 className="animate-spin" />` espalhados no código.
// Usa .motion-spinner do globals.css (border-top transparent, 700ms linear).
//
// Variantes de tamanho:
//   xs  → 12px — dentro de badges, chips
//   sm  → 16px — dentro de botões pequenos
//   md  → 20px — botões padrão, inline loaders
//   lg  → 32px — loading de card/seção
//   xl  → 48px — loading de página inteira
//
// Variantes de cor:
//   current → herda a cor do texto (padrão — funciona em qualquer contexto)
//   gold    → brand-gold (para botões primários)
//   muted   → admin-fg-faint (para estados de fundo)
//   white   → sempre branco (sobre fundos escuros)
// ──────────────────────────────────────────────────────────────────────────────

const dsSpinnerVariants = cva(
  // Base: usa a classe .motion-spinner do globals.css
  "motion-spinner shrink-0",
  {
    variants: {
      size: {
        xs: "h-3 w-3",
        sm: "h-4 w-4",
        md: "h-5 w-5",
        lg: "h-8 w-8 border-[3px]",
        xl: "h-12 w-12 border-[3px]",
      },
      color: {
        current: "text-current",
        gold:    "text-brand-gold",
        muted:   "text-admin-fg-faint",
        white:   "text-white",
      },
    },
    defaultVariants: {
      size: "md",
      color: "current",
    },
  }
);

export interface DSSpinnerProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "color"> {
  size?:  VariantProps<typeof dsSpinnerVariants>["size"];
  color?: VariantProps<typeof dsSpinnerVariants>["color"];
  /** Texto para screen readers. Default: "Carregando…" */
  label?: string;
}

export function DSSpinner({
  className,
  size,
  color,
  label = "Carregando…",
  ...props
}: DSSpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      data-ds-spinner=""
      className={cn(dsSpinnerVariants({ size, color }), className)}
      {...props}
    />
  );
}

// ─── DSLoadingOverlay ──────────────────────────────────────────────────────────
// Overlay de loading centralizado — para cards e seções inteiras.

export interface DSLoadingOverlayProps {
  loading: boolean;
  children: React.ReactNode;
  spinnerSize?: DSSpinnerProps["size"];
  className?: string;
}

export function DSLoadingOverlay({
  loading,
  children,
  spinnerSize = "lg",
  className,
}: DSLoadingOverlayProps) {
  return (
    <div className={cn("relative", className)}>
      {children}
      {loading && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center rounded-[inherit] bg-admin-surface/80 backdrop-blur-[2px] animate-motion-fade-in"
          aria-hidden="false"
        >
          <DSSpinner size={spinnerSize} color="gold" />
        </div>
      )}
    </div>
  );
}

// ─── DSLoadingPage ─────────────────────────────────────────────────────────────
// Loading de página inteira — centralizado na tela.

export function DSLoadingPage({ label = "Carregando…" }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] w-full items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <DSSpinner size="xl" color="gold" label={label} />
        <p className="text-sm text-admin-fg-faint">{label}</p>
      </div>
    </div>
  );
}

// ─── DSLoadingButton ──────────────────────────────────────────────────────────
// Helper inline para estados de loading dentro de um botão.
// Uso: {loading ? <DSLoadingButton /> : "Salvar configurações"}

export function DSLoadingButton({ label = "Salvando…" }: { label?: string }) {
  return (
    <>
      <DSSpinner size="sm" color="current" />
      <span>{label}</span>
    </>
  );
}

// ─── DSSkeleton ────────────────────────────────────────────────────────────────
// Placeholder de conteúdo carregando.
// Usa .motion-skeleton do globals.css (pulse + shimmer).

export interface DSSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Formato da área. Default: "rect" */
  shape?: "rect" | "circle" | "text";
  /** Largura. Para "text", representa quantas linhas. */
  lines?: number;
}

export function DSSkeleton({
  shape = "rect",
  lines = 1,
  className,
  ...props
}: DSSkeletonProps) {
  if (shape === "circle") {
    return (
      <span
        className={cn("motion-skeleton block aspect-square rounded-full", className)}
        {...props}
      />
    );
  }

  if (shape === "text") {
    return (
      <div className={cn("space-y-2", className)}>
        {Array.from({ length: lines }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "motion-skeleton block h-4 rounded-ds-xs",
              // Última linha de texto é mais curta (realista)
              i === lines - 1 && lines > 1 ? "w-3/4" : "w-full"
            )}
          />
        ))}
      </div>
    );
  }

  return (
    <span
      className={cn("motion-skeleton block rounded-ds-md", className)}
      {...props}
    />
  );
}
