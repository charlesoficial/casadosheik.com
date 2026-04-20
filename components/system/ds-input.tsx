import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// ─── DSInput ───────────────────────────────────────────────────────────────────
// Input do Design System. Todos os estilos vêm de tokens.
//
// Variantes:
//   admin  → fundo escuro (admin-surface), borda admin-border — painel admin
//   public → fundo branco, borda do tema claro — cardápio público
// ──────────────────────────────────────────────────────────────────────────────

const dsInputVariants = cva(
  [
    "flex w-full text-sm",
    "transition-[background-color,border-color,box-shadow] duration-[180ms] ease-[ease]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    "disabled:cursor-not-allowed disabled:opacity-40",
    "placeholder:transition-colors",
  ],
  {
    variants: {
      variant: {
        admin: [
          "rounded-ds-md border h-11 px-4 py-2",
          "bg-admin-surface border-admin-border",
          "text-admin-fg placeholder:text-admin-fg-faint",
          "hover:border-admin-border-strong",
          "focus-visible:border-brand-gold focus-visible:ring-brand-gold/20",
        ],
        public: [
          "rounded-ds-md border h-11 px-4 py-2",
          "bg-white border-border",
          "text-foreground placeholder:text-muted-foreground",
          "hover:border-ring/50",
          "focus-visible:border-ring",
        ],
      },
      inputSize: {
        sm: "h-9 text-xs px-3",
        md: "h-11 px-4",
        lg: "h-13 px-5 text-base",
      },
    },
    defaultVariants: {
      variant: "admin",
      inputSize: "md",
    },
  }
);

export interface DSInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof dsInputVariants> {}

const DSInput = React.forwardRef<HTMLInputElement, DSInputProps>(
  ({ className, variant, inputSize, type, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      data-ds-input={variant ?? "admin"}
      className={cn(dsInputVariants({ variant, inputSize }), className)}
      {...props}
    />
  )
);
DSInput.displayName = "DSInput";

// ── DSLabel ────────────────────────────────────────────────────────────────────

const dsLabelVariants = cva("block text-sm font-medium", {
  variants: {
    variant: {
      admin:  "text-admin-fg-secondary",
      public: "text-foreground",
    },
  },
  defaultVariants: { variant: "admin" },
});

export interface DSLabelProps
  extends React.LabelHTMLAttributes<HTMLLabelElement>,
    VariantProps<typeof dsLabelVariants> {}

function DSLabel({ className, variant, ...props }: DSLabelProps) {
  return (
    <label
      data-ds-label={variant ?? "admin"}
      className={cn(dsLabelVariants({ variant }), className)}
      {...props}
    />
  );
}

// ── DSFieldGroup ───────────────────────────────────────────────────────────────
// Wrapper conveniente: DSLabel + DSInput com gap correto

interface DSFieldGroupProps {
  label: string;
  id?: string;
  inputProps?: DSInputProps;
  className?: string;
  variant?: "admin" | "public";
}

function DSFieldGroup({
  label,
  id,
  inputProps,
  className,
  variant = "admin",
}: DSFieldGroupProps) {
  const fieldId = id ?? label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <DSLabel htmlFor={fieldId} variant={variant}>
        {label}
      </DSLabel>
      <DSInput id={fieldId} variant={variant} {...inputProps} />
    </div>
  );
}

export { DSInput, DSLabel, DSFieldGroup, dsInputVariants };
