import { Suspense } from "react";
import Image from "next/image";

import { LoginForm } from "@/features/auth/components/login-form";

export default function AdminLoginPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#100b08]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(184,128,25,0.24)_0%,rgba(184,128,25,0.08)_26%,rgba(0,0,0,0)_55%),linear-gradient(135deg,#120c08_0%,#1b120d_48%,#0a0705_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:44px_44px] opacity-30" />
      <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black/70 to-transparent" />

      <section className="relative z-10 flex min-h-screen items-center justify-center px-5 py-10 sm:px-8 lg:px-12">
        <div className="w-full max-w-[460px]">
          <div className="mb-6 flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/95 shadow-[0_20px_55px_rgba(0,0,0,0.35)]">
              <Image
                src="/logo.png"
                alt="Casa do Sheik"
                width={72}
                height={72}
                className="h-16 w-16 object-contain"
                priority
              />
            </div>
          </div>

          <div className="rounded-[28px] border border-white/14 bg-[#fffaf2]/95 p-7 shadow-[0_32px_90px_rgba(0,0,0,0.45)] backdrop-blur-md sm:p-9">
            <div className="mb-8 space-y-3 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#a06a16]">
                Casa do Sheik
              </p>
              <h1 className="text-4xl font-semibold tracking-tight text-[#18110d]">Bem-vindo de volta</h1>
              <p className="mx-auto max-w-[340px] text-base leading-7 text-[#6d5b4c]">
                Entre com suas credenciais para acessar o painel de gerenciamento.
              </p>
            </div>

            <Suspense fallback={null}>
              <LoginForm />
            </Suspense>

            <p className="mt-6 text-center text-xs font-medium text-[#8a7664]">
              Acesso restrito a operadores autorizados.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
