"use client";

import { createSupabaseBrowserAuthClient } from "@/lib/supabase/auth";

export function getSupabaseBrowserClient() {
  return createSupabaseBrowserAuthClient();
}
