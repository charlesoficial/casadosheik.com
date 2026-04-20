"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html>
      <body className="flex min-h-screen flex-col items-center justify-center gap-4">
        <h2 className="text-xl font-semibold">Erro crítico</h2>
        <button
          onClick={reset}
          className="rounded-ds-sm bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90"
        >
          Tentar novamente
        </button>
      </body>
    </html>
  );
}
