"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type CustomerFlowHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  badges?: ReactNode;
  leading?: ReactNode;
  topBar?: ReactNode;
  titleAside?: ReactNode;
  children?: ReactNode;
  className?: string;
};

export function CustomerFlowHeader({
  eyebrow,
  title,
  description,
  badges,
  leading,
  topBar,
  titleAside,
  children,
  className
}: CustomerFlowHeaderProps) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-b-ds-2xl bg-menu-surface-soft px-4 pb-5 pt-5",
        className
      )}
    >
      <div className="absolute inset-0 opacity-40 [background:var(--menu-header-pattern)]" />
      <div className="absolute right-0 top-0 h-28 w-28 rounded-full [background:var(--menu-header-glow)]" />
      <div className="relative space-y-4">
        {topBar}

        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            {leading ? <div className="shrink-0">{leading}</div> : null}
            <div className="min-w-0 space-y-2">
              {eyebrow ? <p className="text-sm font-medium text-menu-accent-strong">{eyebrow}</p> : null}
              <h1 className="text-3xl font-bold leading-none text-menu-text">{title}</h1>
              {description ? <p className="text-sm leading-6 text-menu-text-muted">{description}</p> : null}
              {badges ? <div className="flex flex-wrap items-center gap-2">{badges}</div> : null}
            </div>
          </div>
          {titleAside ? <div className="shrink-0">{titleAside}</div> : null}
        </div>

        {children}
      </div>
    </section>
  );
}
