"use client";

import { createBrowserClient } from "@supabase/ssr";

let browserAuthClient: ReturnType<typeof createBrowserClient> | null = null;

// Centraliza a leitura das envs publicas para impedir que a UI tente autenticar
// quando o projeto ainda nao foi configurado com Supabase.
function getEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return null;
  }

  return { url, key };
}

export function isAuthConfigured() {
  return Boolean(getEnv());
}

// Mantem um singleton no browser para evitar recriar cliente e perder contexto
// de sessao entre telas do fluxo admin.
export function createSupabaseBrowserAuthClient() {
  const env = getEnv();
  if (!env) return null;

  if (!browserAuthClient) {
    browserAuthClient = createBrowserClient(env.url, env.key);
  }

  return browserAuthClient;
}
