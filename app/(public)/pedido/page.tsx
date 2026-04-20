import Link from "next/link";
import { ArrowLeft, ReceiptText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function OrderIndexPage() {
  return (
    <main className="menu-theme flex min-h-screen w-full items-center [background:var(--menu-bg-gradient-soft)] px-4 py-8 text-menu-text lg:px-8">
      <Card className="mx-auto w-full max-w-[520px] border-menu-border bg-menu-surface-raised text-menu-text shadow-card lg:max-w-[860px]">
        <CardContent className="grid gap-6 p-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-center lg:p-8">
          <div className="flex aspect-square items-center justify-center rounded-3xl border border-menu-border bg-menu-accent-bg text-menu-accent-strong">
            <ReceiptText className="h-16 w-16" strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-menu-accent-strong">
              Acompanhamento
            </p>
            <h1 className="mt-3 text-3xl font-black leading-tight text-menu-text lg:text-5xl">
              Abra o link do seu pedido
            </h1>
            <p className="mt-4 text-sm leading-6 text-menu-text-muted lg:max-w-xl lg:text-base lg:leading-7">
              O status aparece pelo link gerado depois da compra. Se você ainda não fez um pedido, volte ao cardápio
              para escolher seus itens.
            </p>
            <Button asChild className="mt-6 w-full rounded-2xl bg-menu-cta text-menu-cta-fg hover:bg-menu-cta-hover lg:w-auto lg:px-8">
              <Link href="/menu">
                <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
                Ver cardápio
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
