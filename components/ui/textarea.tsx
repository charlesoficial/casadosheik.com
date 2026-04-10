import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        data-ui-textarea=""
        className={cn(
          "flex min-h-[110px] w-full rounded-xl border bg-[var(--ui-input-bg)] px-4 py-3 text-sm text-[var(--ui-input-fg)] placeholder:text-[var(--ui-input-placeholder)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
