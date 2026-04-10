import type { NextRequest } from "next/server";

import { updateAuthSession } from "@/lib/auth/server";

// Este middleware protege o admin e sincroniza a sessao do Supabase
// antes que qualquer rota protegida seja renderizada.
export async function middleware(request: NextRequest) {
  return updateAuthSession(request);
}

export const config = {
  matcher: ["/admin/:path*", "/login"]
};
