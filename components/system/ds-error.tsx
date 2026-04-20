import * as React from "react";
import { AlertTriangle, RefreshCw, ServerCrash, WifiOff } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { DSButton } from "./ds-button";

// ─── DSError ───────────────────────────────────────────────────────────────────
// Estado de erro padronizado — substitui divs inline de erro por toda a base.
//
// Variantes de escopo:
//   inline  → dentro de um card ou seção (compacto)
//   section → ocupa uma seção inteira da página
//   page    → erro de página completa (ex: falha no fetch server)
//
// Variantes de tipo:
//   generic     → Algo deu errado
//   network     → Falha de conexão
//   server      → Erro do servidor (5xx)
//   notfound    → Recurso não encontrado
//   permission  → Acesso negado
//
// Uso:
//   <DSError title="Falha ao carregar pedidos" onRetry={() => refetch()} />
//   <DSError type="network" scope="page" />
//   {fetchError && <DSError scope="inline" title={fetchError.message} />}
// ──────────────────────────────────────────────────────────────────────────────

const dsErrorVariants = cva(
  "flex flex-col items-center justify-center text-center",
  {
    variants: {
      scope: {
        inline:  "gap-2 rounded-ds-lg border border-status-danger-border bg-status-danger-bg px-4 py-4",
        section: "gap-4 py-12 px-6",
        page:    "gap-6 min-h-[50vh] px-8",
      },
    },
    defaultVariants: { scope: "section" },
  }
);

type ErrorType = "generic" | "network" | "server" | "notfound" | "permission";

interface ErrorTypeConfig {
  icon: React.ElementType;
  title: string;
  description: string;
}

const errorTypeConfig: Record<ErrorType, ErrorTypeConfig> = {
  generic: {
    icon: AlertTriangle,
    title: "Algo deu errado",
    description: "Ocorreu um erro inesperado. Tente novamente ou recarregue a página.",
  },
  network: {
    icon: WifiOff,
    title: "Falha de conexão",
    description: "Verifique sua conexão com a internet e tente novamente.",
  },
  server: {
    icon: ServerCrash,
    title: "Erro no servidor",
    description: "O servidor retornou um erro. Nossa equipe foi notificada.",
  },
  notfound: {
    icon: AlertTriangle,
    title: "Não encontrado",
    description: "O recurso solicitado não existe ou foi removido.",
  },
  permission: {
    icon: AlertTriangle,
    title: "Acesso negado",
    description: "Você não tem permissão para acessar este recurso.",
  },
};

export interface DSErrorProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof dsErrorVariants> {
  /** Tipo do erro — define ícone e mensagem padrão. */
  type?: ErrorType;
  /** Título customizado (sobrescreve o do tipo). */
  title?: string;
  /** Descrição customizada (sobrescreve a do tipo). */
  description?: string;
  /** Ícone customizado (sobrescreve o do tipo). */
  icon?: React.ElementType;
  /** Callback de retry. Se fornecido, exibe botão "Tentar novamente". */
  onRetry?: () => void;
  /** Indica que o retry está em andamento. */
  retrying?: boolean;
}

export function DSError({
  type = "generic",
  title,
  description,
  icon,
  scope = "section",
  onRetry,
  retrying,
  className,
  ...props
}: DSErrorProps) {
  const config = errorTypeConfig[type];
  const Icon   = icon ?? config.icon;
  const safeScope = scope ?? "section";

  const resolvedTitle       = title       ?? config.title;
  const resolvedDescription = description ?? config.description;

  return (
    <div
      role="alert"
      data-ds-error={type}
      className={cn(dsErrorVariants({ scope }), className)}
      {...props}
    >
      {/* Ícone — só exibe em section e page */}
      {safeScope !== "inline" && (
        <span
          className="flex h-12 w-12 items-center justify-center rounded-ds-xl border border-status-danger-border bg-status-danger-bg"
          aria-hidden
        >
          <Icon className="h-5 w-5 text-status-danger-fg" />
        </span>
      )}

      {/* Inline: ícone + texto lado a lado */}
      {safeScope === "inline" && (
        <div className="flex w-full items-start gap-3 text-left">
          <Icon className="mt-0.5 h-4 w-4 shrink-0 text-status-danger-fg" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-status-danger-text">{resolvedTitle}</p>
            {resolvedDescription && (
              <p className="mt-0.5 text-xs text-status-danger-fg opacity-80">
                {resolvedDescription}
              </p>
            )}
          </div>
          {onRetry && (
            <button
              onClick={onRetry}
              disabled={retrying}
              aria-label="Tentar novamente"
              className="shrink-0 text-status-danger-fg opacity-70 transition-opacity hover:opacity-100 disabled:opacity-40"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", retrying && "animate-motion-spin")} />
            </button>
          )}
        </div>
      )}

      {/* Section e page: layout vertical */}
      {safeScope !== "inline" && (
        <>
          <div className="max-w-sm space-y-1.5">
            <p
              className={cn(
                "font-semibold text-admin-fg",
                safeScope === "page" ? "text-xl" : "text-base"
              )}
            >
              {resolvedTitle}
            </p>
            <p className="text-sm leading-relaxed text-admin-fg-muted">
              {resolvedDescription}
            </p>
          </div>

          {onRetry && (
            <DSButton
              variant="secondary"
              size="sm"
              onClick={onRetry}
              disabled={retrying}
              className="gap-2"
            >
              <RefreshCw
                className={cn("h-3.5 w-3.5", retrying && "animate-motion-spin")}
              />
              {retrying ? "Tentando…" : "Tentar novamente"}
            </DSButton>
          )}
        </>
      )}
    </div>
  );
}

// ─── useErrorState ─────────────────────────────────────────────────────────────
// Hook que gerencia estado de erro com suporte a retry.
//
// Uso:
//   const err = useErrorState();
//   try { await fetch(...) } catch (e) { err.set(e) }
//   return err.hasError ? <DSError {...err.props} /> : <Content />

export function useErrorState() {
  const [error, setErrorState] = React.useState<string | null>(null);
  const [retrying, setRetrying] = React.useState(false);

  function set(e: unknown) {
    const message =
      e instanceof Error
        ? e.message
        : typeof e === "string"
          ? e
          : "Erro desconhecido.";
    setErrorState(message);
  }

  function clear() {
    setErrorState(null);
  }

  async function retry(fn: () => Promise<void>) {
    setRetrying(true);
    try {
      await fn();
      clear();
    } catch (e) {
      set(e);
    } finally {
      setRetrying(false);
    }
  }

  return {
    set,
    clear,
    retry,
    retrying,
    hasError: error !== null,
    message: error,
    /** Props prontos para passar ao <DSError /> */
    props: {
      title: error ?? "",
      retrying,
    },
  };
}
