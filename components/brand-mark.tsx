export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--admin-brand-tile-bg)] text-lg font-black text-[var(--admin-brand-tile-fg)] shadow-soft">
        CS
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
