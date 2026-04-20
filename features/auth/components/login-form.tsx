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
        <label className="block text-sm font-medium text-foreground">Email</label>
        <div className="group flex h-14 items-center gap-3 rounded-ds-sm border border-border bg-card px-4 transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
          <Mail className="h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
          <Input
            className="h-auto border-0 bg-transparent px-0 py-0 text-base text-foreground placeholder:text-muted-foreground focus-visible:ring-0"
            placeholder="Digite seu e-mail"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-medium text-foreground">Senha</label>
        <div className="group flex h-14 items-center gap-3 rounded-ds-sm border border-border bg-card px-4 transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
          <LockKeyhole className="h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
          <Input
            className="h-auto border-0 bg-transparent px-0 py-0 text-base text-foreground placeholder:text-muted-foreground focus-visible:ring-0"
            placeholder="Digite sua senha"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            className="text-muted-foreground transition-colors hover:text-foreground"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-ds-sm border border-status-danger-text/50 bg-status-danger-text/15 px-4 py-3 text-sm leading-6 text-status-danger-text">
          {error}
        </div>
      ) : null}

      <Button
        variant="admin"
        className="h-14 w-full rounded-ds-sm bg-foreground text-base font-semibold text-background shadow-soft transition-transform hover:-translate-y-0.5 hover:bg-foreground"
        disabled={loading}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
        {loading ? "Entrando no painel..." : "Entrar"}
      </Button>
    </form>
  );
}
