"use client";

import { useMemo, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";

import { CartProvider } from "@/components/cart-provider";

function normalizeCartScopeMesa(value: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32) || null;
}

export function ScopedCartProvider({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const mesa = normalizeCartScopeMesa(searchParams.get("mesa"));
  const storageScope = useMemo(() => (mesa ? `mesa-${mesa}` : "delivery"), [mesa]);

  return (
    <CartProvider initialItems={[]} storageScope={storageScope}>
      {children}
    </CartProvider>
  );
}
