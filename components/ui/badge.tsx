import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-[var(--ui-badge-default-bg)] text-[var(--ui-badge-default-fg)]",
        secondary: "border-[var(--ui-badge-secondary-border)] bg-[var(--ui-badge-secondary-bg)] text-[var(--ui-badge-secondary-fg)]",
        success: "border-status-success-border bg-status-success-bg text-status-success-fg",
        info: "border-status-info-border bg-status-info-bg text-status-info-fg",
        admin: "border-[var(--ui-badge-admin-border)] bg-[var(--ui-badge-admin-bg)] text-[var(--ui-badge-admin-fg)]"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} data-ui-badge="" data-variant={variant ?? "default"} {...props} />;
}
