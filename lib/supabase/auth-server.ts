import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

// Esta camada concentra toda a integracao server-side com o Supabase Auth.
// Qualquer ajuste de sessao, cookie ou protecao do admin deve partir daqui.
function getEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return null;
  }

  return { url, key };
}

export function isServerAuthConfigured() {
  return Boolean(getEnv());
}

function hasAdminRole(user: { app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> }) {
  return user.app_metadata?.role === "admin" || user.user_metadata?.role === "admin";
}

// Cria o client autenticado no servidor reutilizando os cookies da request atual.
// Isso permite que rotas e layouts leiam a sessao sem vazar credenciais ao cliente.
export async function createSupabaseServerAuthClient() {
  const env = getEnv();
  if (!env) return null;

  const cookieStore = await cookies();

  return createServerClient(env.url, env.key, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        cookieStore.set({ name, value: "", ...options });
      }
    }
  });
}

export async function requireAdminUser() {
  // Importante: sem env valida, o sistema deve falhar fechado para nao expor
  // o admin em deploys incompletos.
  if (!isServerAuthConfigured()) {
    throw new Error("UNAUTHORIZED");
  }

  const supabase = await createSupabaseServerAuthClient();
  if (!supabase) {
    throw new Error("UNAUTHORIZED");
  }

  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user || !hasAdminRole(user)) {
    throw new Error("UNAUTHORIZED");
  }

  return user;
}

export async function updateAuthSession(request: NextRequest) {
  // O pathname segue no header para que o layout admin consiga destacar a navegacao
  // correta sem depender de hooks client-side.
  const env = getEnv();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  let response = NextResponse.next({
    request: {
      headers: requestHeaders
    }
  });

  if (!env) {
    // Sem Supabase configurado, o login ainda pode abrir para diagnostico,
    // mas o admin precisa redirecionar de volta para a tela de entrada.
    const pathname = request.nextUrl.pathname;
    const isLoginRoute = pathname === "/login";
    const isProtectedAdminRoute = pathname.startsWith("/admin") && !isLoginRoute;

    if (isProtectedAdminRoute) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      redirectUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(redirectUrl);
    }

    return response;
  }

  const supabase = createServerClient(env.url, env.key, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({ name, value, ...options });
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({ name, value: "", ...options });
        response.cookies.set({ name, value: "", ...options });
      }
    }
  });

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isLoginRoute = pathname === "/login";
  const isProtectedAdminRoute = pathname.startsWith("/admin") && !isLoginRoute;

  // Toda rota de operacao admin exige usuario autenticado.
  if (isProtectedAdminRoute && (!user || !hasAdminRole(user))) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Se o operador ja tem sessao valida, evitamos que ele volte ao login por engano.
  if (isLoginRoute && user && hasAdminRole(user)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/admin/pedidos";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
