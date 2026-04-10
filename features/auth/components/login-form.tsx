"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Loader2, LockKeyhole, Mail } from "lucide-react";

import { createSupabaseBrowserAuthClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Formulario de autenticacao do painel admin.
// O login depende exclusivamente do Supabase Auth e respeita o redirect seguro via `next`.
export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    // Sem cliente configurado, exibimos erro orientativo em vez de fingir um login local.
    const supabase = createSupabaseBrowserAuthClient();
    if (!supabase) {
      setError("Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY para ativar o login.");
      return;
    }

    try {
      setLoading(true);
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) {
        throw signInError;
      }

      // O redirect precisa permanecer interno para evitar open redirect via query string.
      const next = searchParams.get("next");
      const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/admin/pedidos";
      router.push(safeNext);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Nao foi possivel entrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div className="space-y-3">
        <label className="block text-sm font-medium text-[#17130f]">Email</label>
        <div className="group flex h-14 items-center gap-3 rounded-[14px] border border-[#e3d8c7] bg-white px-4 transition-colors focus-within:border-[#7f5b19] focus-within:ring-2 focus-within:ring-[#f4c35a]/20">
          <Mail className="h-4 w-4 text-[#8d8578] transition-colors group-focus-within:text-[#8f6d1e]" />
          <Input
            className="h-auto border-0 bg-transparent px-0 py-0 text-base text-[#1a1610] placeholder:text-[#9d9587] focus-visible:ring-0"
            placeholder="Digite seu e-mail"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-medium text-[#17130f]">Password</label>
        <div className="group flex h-14 items-center gap-3 rounded-[14px] border border-[#e3d8c7] bg-white px-4 transition-colors focus-within:border-[#7f5b19] focus-within:ring-2 focus-within:ring-[#f4c35a]/20">
          <LockKeyhole className="h-4 w-4 text-[#8d8578] transition-colors group-focus-within:text-[#8f6d1e]" />
          <Input
            className="h-auto border-0 bg-transparent px-0 py-0 text-base text-[#1a1610] placeholder:text-[#9d9587] focus-visible:ring-0"
            placeholder="Digite sua senha"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            className="text-[#8d8578] transition-colors hover:text-[#1a1610]"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 text-sm">
        <label className="flex items-center gap-2 text-[#6e665a]">
          <input type="checkbox" className="h-4 w-4 rounded border-[#d7cab5] text-[#0e0e10] focus:ring-[#f4c35a]" />
          Manter-me conectado
        </label>
        <button type="button" className="font-medium text-[#17130f] transition-colors hover:text-[#8f6d1e]">
          Esqueceu a senha?
        </button>
      </div>

      {error ? (
        <div className="rounded-[14px] border border-[#efc3c3] bg-[#fff1f1] px-4 py-3 text-sm leading-6 text-[#a23b3b]">
          {error}
        </div>
      ) : null}

      <Button
        variant="admin"
        className="h-14 w-full rounded-[14px] bg-[#0e0e10] text-base font-semibold text-white shadow-[0_16px_35px_-24px_rgba(0,0,0,0.45)] transition-transform hover:-translate-y-0.5 hover:bg-[#0e0e10]"
        disabled={loading}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
        {loading ? "Entrando no painel..." : "Entrar"}
      </Button>
    </form>
  );
}
