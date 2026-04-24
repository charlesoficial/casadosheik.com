import Image from "next/image";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--admin-brand-tile-bg)] shadow-soft overflow-hidden">
        <Image src="/logo.png" alt="Casa do Sheik" width={56} height={56} className="object-contain" />
      </div>
      {!compact ? (
        <div className="space-y-0.5">
          <p className="text-sm font-semibold tracking-[0.24em] text-[var(--admin-brand-wordmark)]">CASA DO SHEIK</p>
          <p className="text-xs text-muted-foreground">Sistema de pedidos</p>
        </div>
      ) : null}
    </div>
  );
}
