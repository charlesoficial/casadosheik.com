import { createClient } from "@supabase/supabase-js";

export function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function hasServiceRoleConfigured() {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function isSupabaseSchemaMissingError(error: unknown, relation?: string) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  const missingRelation =
    relation && (message.includes(`public.${relation.toLowerCase()}`) || message.includes(`'${relation.toLowerCase()}'`));

  return message.includes("schema cache") || Boolean(missingRelation);
}

export function isSupabasePermissionError(error: unknown, relation?: string) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  const mentionsRelation =
    relation && (message.includes(`table ${relation.toLowerCase()}`) || message.includes(`public.${relation.toLowerCase()}`));

  return message.includes("permission denied") && (Boolean(mentionsRelation) || !relation);
}

export function getSupabaseServerClient() {
  if (!isSupabaseConfigured()) return null;

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    }
  );
}

export function getSupabaseAdminClient() {
  if (!isSupabaseConfigured()) return null;
  if (!hasServiceRoleConfigured()) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY nao configurada para operacoes administrativas.");
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    }
  );
}
