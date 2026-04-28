"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Loader2, LockKeyhole, Mail, ShieldCheck, Utensils } from "lucide-react";

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
  const [rememberEmail, setRememberEmail] = useState(true);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const savedEmail = window.localStorage.getItem("admin-login-email");
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberEmail(true);
    }
  }, []);

  function handleEmailChange(value: string) {
    setEmail(value);
    if (notice) setNotice(null);
  }

  async function handlePasswordReset() {
    setError(null);
    setNotice(null);

    if (!email.trim()) {
      setError("Digite seu e-mail para receber o link de recuperacao.");
      return;
    }

    const supabase = createSupabaseBrowserAuthClient();
    if (!supabase) {
      setError("Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY para ativar a recuperacao.");
      return;
    }

    try {
      setResetLoading(true);
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/login`
      });

      if (resetError) {
        throw resetError;
      }

      setNotice("Se este e-mail estiver cadastrado, o link de recuperacao sera enviado.");
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "Nao foi possivel enviar a recuperacao.");
    } finally {
      setResetLoading(false);
    }
  }

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
      if (rememberEmail) {
        window.localStorage.setItem("admin-login-email", email.trim());
      } else {
        window.localStorage.removeItem("admin-login-email");
      }
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
      <div className="grid grid-cols-2 gap-2">
        <Link
          href="/menu"
          className="flex h-11 items-center justify-center gap-2 rounded-xl border border-[#e4d6c5] bg-white/70 text-sm font-semibold text-[#4f392c] transition-colors hover:border-[#b88019] hover:text-[#241914]"
        >
          <Utensils className="h-4 w-4" />
          Cardapio
        </Link>
        <div className="flex h-11 items-center justify-center gap-2 rounded-xl border border-[#e4d6c5] bg-[#f5eadb] text-sm font-semibold text-[#6c4a1d]">
          <ShieldCheck className="h-4 w-4" />
          Seguro
        </div>
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-semibold text-[#241914]">Email</label>
        <div className="group flex h-14 items-center gap-3 rounded-xl border border-[#e4d6c5] bg-white/92 px-4 shadow-[0_12px_28px_rgba(52,31,17,0.06)] transition-colors focus-within:border-[#b88019] focus-within:ring-4 focus-within:ring-[#b88019]/15">
          <Mail className="h-4 w-4 text-[#8d7967] transition-colors group-focus-within:text-[#b88019]" />
          <Input
            className="h-auto border-0 bg-transparent px-0 py-0 text-base text-[#241914] placeholder:text-[#8d7967] focus-visible:ring-0"
            placeholder="Digite seu e-mail"
            type="email"
            value={email}
            onChange={(event) => handleEmailChange(event.target.value)}
          />
        </div>
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-semibold text-[#241914]">Senha</label>
        <div className="group flex h-14 items-center gap-3 rounded-xl border border-[#e4d6c5] bg-white/92 px-4 shadow-[0_12px_28px_rgba(52,31,17,0.06)] transition-colors focus-within:border-[#b88019] focus-within:ring-4 focus-within:ring-[#b88019]/15">
          <LockKeyhole className="h-4 w-4 text-[#8d7967] transition-colors group-focus-within:text-[#b88019]" />
          <Input
            className="h-auto border-0 bg-transparent px-0 py-0 text-base text-[#241914] placeholder:text-[#8d7967] focus-visible:ring-0"
            placeholder="Digite sua senha"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            className="rounded-full p-1 text-[#8d7967] transition-colors hover:bg-[#f2e8db] hover:text-[#241914]"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-[#6d5b4c]">
          <input
            type="checkbox"
            checked={rememberEmail}
            onChange={(event) => setRememberEmail(event.target.checked)}
            className="h-4 w-4 rounded border-[#d9c8b3] accent-[#b88019]"
          />
          Lembrar e-mail
        </label>
        <button
          type="button"
          onClick={handlePasswordReset}
          disabled={resetLoading}
          className="text-sm font-semibold text-[#a06a16] transition-colors hover:text-[#241914] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {resetLoading ? "Enviando..." : "Esqueci minha senha"}
        </button>
      </div>

      {error ? (
        <div className="rounded-ds-sm border border-status-danger-text/50 bg-status-danger-text/15 px-4 py-3 text-sm leading-6 text-status-danger-text">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="rounded-ds-sm border border-[#c6a46b]/50 bg-[#f6ead8] px-4 py-3 text-sm leading-6 text-[#6c4a1d]">
          {notice}
        </div>
      ) : null}

      <Button
        variant="admin"
        className="h-14 w-full rounded-xl border border-[#1e1714] bg-[#1e1714] text-base font-semibold text-white shadow-[0_18px_45px_rgba(30,23,20,0.22)] transition-transform hover:-translate-y-0.5 hover:bg-[#2b211c]"
        disabled={loading}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
        {loading ? "Entrando no painel..." : "Entrar"}
      </Button>
    </form>
  );
}
