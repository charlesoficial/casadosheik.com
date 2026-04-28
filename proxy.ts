import type { NextRequest } from "next/server";

import { updateAuthSession } from "@/lib/auth/server";

// Protege o admin e sincroniza a sessao do Supabase antes das rotas protegidas.
export async function proxy(request: NextRequest) {
  return updateAuthSession(request);
}

export const config = {
  matcher: ["/admin/:path*", "/login"]
};
