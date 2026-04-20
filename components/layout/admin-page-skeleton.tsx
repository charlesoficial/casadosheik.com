import { DSCard, DSSkeleton, DSSpinner } from "@/components/system";

export function AdminPageSkeleton() {
  return (
    <div
      className="flex w-full flex-col gap-4 2xl:gap-6"
      role="status"
      aria-label="Carregando pagina"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <DSSkeleton className="h-7 w-full max-w-56" />
          <DSSkeleton className="h-4 w-full max-w-80 opacity-70" />
        </div>
        <div className="hidden items-center gap-2 rounded-ds-md border border-admin-border bg-admin-surface px-3 py-2 text-sm text-admin-fg-muted sm:flex">
          <DSSpinner size="sm" color="muted" label="Carregando conteudo" />
          <span>Carregando</span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <DSCard
            key={i}
            variant="admin-panel"
            padding="md"
            className="min-h-36"
          >
            <div className="flex items-start justify-between gap-4">
              <DSSkeleton className="h-10 w-10 rounded-ds-lg opacity-80" />
              <DSSkeleton className="h-6 w-16 rounded-full opacity-70" />
            </div>
            <div className="mt-6 space-y-3">
              <DSSkeleton className="h-5 w-2/5" />
              <DSSkeleton className="h-4 w-full opacity-60" />
              <DSSkeleton className="h-4 w-3/5 opacity-50" />
            </div>
          </DSCard>
        ))}
      </div>

      <DSCard variant="admin-panel" padding="md">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div className="space-y-3">
            <DSSkeleton className="h-5 w-40" />
            <DSSkeleton className="h-4 w-64 max-w-full opacity-60" />
          </div>
          <DSSkeleton className="hidden h-9 w-24 opacity-70 sm:block" />
        </div>

        <div className="grid gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="grid min-h-16 grid-cols-[2.5rem_1fr] items-center gap-4 rounded-ds-lg bg-admin-surface px-4 py-3 sm:grid-cols-[2.5rem_1fr_5rem]"
          >
            <DSSkeleton className="h-10 w-10 rounded-full opacity-70" />
            <div className="min-w-0 space-y-2">
              <DSSkeleton className="h-4 w-full max-w-72" />
              <DSSkeleton className="h-3 w-3/5 opacity-50" />
            </div>
            <DSSkeleton className="hidden h-7 w-20 rounded-full opacity-60 sm:block" />
          </div>
        ))}
      </div>
      </DSCard>
    </div>
  );
}
