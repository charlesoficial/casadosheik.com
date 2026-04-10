import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        data-ui-input=""
        className={cn(
          "flex h-11 w-full rounded-xl border bg-[var(--ui-input-bg)] px-4 py-2 text-sm text-[var(--ui-input-fg)] placeholder:text-[var(--ui-input-placeholder)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
