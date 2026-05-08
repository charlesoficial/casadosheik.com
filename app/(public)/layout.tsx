import { Suspense } from "react";

import { ScopedCartProvider } from "@/components/scoped-cart-provider";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={children}>
      <ScopedCartProvider>{children}</ScopedCartProvider>
    </Suspense>
  );
}
