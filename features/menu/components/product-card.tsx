"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { UtensilsCrossed } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import type { MenuProduct } from "@/lib/types";

function ProductImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-menu-accent-bg">
        <UtensilsCrossed className="h-8 w-8 text-menu-accent" strokeWidth={1.5} />
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      loading="lazy"
      sizes="(max-width: 768px) 80px, 96px"
      className="object-cover transition-transform duration-300 group-hover:scale-105"
      onError={() => setFailed(true)}
    />
  );
}

export function ProductCard({ product, mesa }: { product: MenuProduct; mesa?: string }) {
  const href = mesa ? `/produto/${product.id}?mesa=${mesa}` : `/produto/${product.id}`;

  return (
    <Link href={href}>
      <article className="group flex cursor-pointer flex-row items-start gap-3 rounded-2xl border border-menu-border bg-menu-surface p-3 transition-all duration-150 hover:border-menu-border-strong hover:shadow-md active:scale-[0.99] lg:gap-4 lg:p-4">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-2 text-sm font-semibold text-menu-text lg:text-base">
              {product.name}
            </h3>
            {product.badge ? (
              <Badge className="shrink-0 border-menu-accent-border bg-menu-accent-bg text-[10px] text-menu-accent">
                {product.badge}
              </Badge>
            ) : null}
          </div>
          <p className="line-clamp-2 text-xs leading-5 text-menu-text-muted lg:text-sm">
            {product.description}
          </p>
          <p className="pt-1 text-sm font-bold text-menu-accent lg:text-base">
            {formatCurrency(product.price)}
          </p>
        </div>

        {product.image ? (
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl lg:h-24 lg:w-24">
            <ProductImage src={product.image} alt={product.name} />
          </div>
        ) : null}
      </article>
    </Link>
  );
}
