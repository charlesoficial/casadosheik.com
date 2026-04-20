import { Suspense } from "react";
import Image from "next/image";

import { FloatingParticles } from "@/features/auth/components/floating-particles";
import { LoginForm } from "@/features/auth/components/login-form";

export default function AdminLoginPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="grid min-h-screen xl:grid-cols-[minmax(440px,0.92fr)_minmax(0,1.08fr)]">
        <section className="order-1 flex min-h-screen items-center justify-center bg-background px-6 py-10 sm:px-8 lg:px-12 lg:py-12 xl:order-2 xl:px-20">
          <div className="w-full max-w-md">
            <div className="mb-8 space-y-3">
              <h1 className="text-4xl font-semibold tracking-tight text-foreground">Bem-vindo de volta</h1>
              <p className="text-base leading-7 text-muted-foreground">
                Entre com suas credenciais para acessar o painel de gerenciamento.
              </p>
            </div>

            <div className="space-y-6">
              <Suspense fallback={null}>
                <LoginForm />
              </Suspense>
            </div>
          </div>
        </section>

        <section className="order-2 relative min-h-[320px] overflow-hidden xl:order-1 xl:min-h-screen">
          <Image
            src="/restaurant-hero.jpg"
            alt="Painel de gerenciamento de restaurante"
            fill
            priority
            sizes="(min-width: 1280px) 54vw, 100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-foreground/75 via-foreground/45 to-transparent" />
          <div className="absolute inset-0 bg-arabesque opacity-80" />
          <FloatingParticles />
        </section>
      </div>
    </main>
  );
}
