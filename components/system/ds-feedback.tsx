import * as React from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// ─── DSFeedback ────────────────────────────────────────────────────────────────
// Banner de feedback INLINE — substitui todos os `FeedbackBanner` locais.
//
// Diferença do Toast:
//   Toast     → flutuante, global, auto-dismiss, para confirmar ações
//   DSFeedback → fixo dentro da página/card, persiste enquanto o estado durar
//
// Uso típico:
//   {error && <DSFeedback variant="error" title={error} onDismiss={() => setError(null)} />}
//   {saved  && <DSFeedback variant="success" title="Configurações salvas." />}
// ──────────────────────────────────────────────────────────────────────────────

const dsFeedbackVariants = cva(
  "flex items-start gap-3 rounded-ds-lg border px-4 py-3 animate-motion-fade-in",
  {
    variants: {
      variant: {
        success: "border-status-success-border bg-status-success-bg text-status-success-text",
        error:   "border-status-danger-border  bg-status-danger-bg  text-status-danger-text",
        info:    "border-status-info-border    bg-status-info-bg    text-status-info-text",
        warning: "border-status-warning-border bg-status-warning-bg text-status-warning-text",
      },
    },
    defaultVariants: { variant: "info" },
  }
);

const feedbackIcon: Record<
  NonNullable<VariantProps<typeof dsFeedbackVariants>["variant"]>,
  React.ElementType
> = {
  success: CheckCircle2,
  error:   XCircle,
  info:    Info,
  warning: AlertTriangle,
};

const feedbackIconClass: Record<
  NonNullable<VariantProps<typeof dsFeedbackVariants>["variant"]>,
  string
> = {
  success: "text-status-success-fg",
  error:   "text-status-danger-fg",
  info:    "text-status-info-fg",
  warning: "text-status-warning-fg",
};

export interface DSFeedbackProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title">,
    VariantProps<typeof dsFeedbackVariants> {
  /** Mensagem principal. */
  title: string;
  /** Detalhe opcional abaixo do título. */
  description?: string;
  /** Se fornecido, exibe botão X de dismiss. */
  onDismiss?: () => void;
}

export function DSFeedback({
  variant = "info",
  title,
  description,
  onDismiss,
  className,
  ...props
}: DSFeedbackProps) {
  const safeVariant = variant ?? "info";
  const Icon = feedbackIcon[safeVariant];
  const iconClass = feedbackIconClass[safeVariant];

  return (
    <div
      role={safeVariant === "error" ? "alert" : "status"}
      className={cn(dsFeedbackVariants({ variant }), className)}
      {...props}
    >
      <Icon
        className={cn("mt-0.5 h-4 w-4 shrink-0", iconClass)}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-snug">{title}</p>
        {description && (
          <p className="mt-1 text-xs opacity-80 leading-relaxed">{description}</p>
        )}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="Fechar"
          className="shrink-0 opacity-60 transition-opacity duration-motion-fast hover:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

// ─── useFeedback ───────────────────────────────────────────────────────────────
// Hook que gerencia estado de feedback inline (error/success) dentro de um componente.
// Substitui o padrão manual:  const [error, setError] = useState<string|null>(null)
//                              const [success, setSuccess] = useState<string|null>(null)
//
// Uso:
//   const fb = useFeedback();
//   // na ação:
//   fb.setError("Falha ao salvar produto.");
//   fb.setSuccess("Produto salvo com sucesso.");
//   // na renderização:
//   <fb.Banner />

export function useFeedback() {
  const [state, setState] = React.useState<{
    variant: "success" | "error" | "info" | "warning";
    title: string;
    description?: string;
  } | null>(null);

  function setError(title: string, description?: string) {
    setState({ variant: "error", title, description });
  }

  function setSuccess(title: string, description?: string) {
    setState({ variant: "success", title, description });
  }

  function setInfo(title: string, description?: string) {
    setState({ variant: "info", title, description });
  }

  function setWarning(title: string, description?: string) {
    setState({ variant: "warning", title, description });
  }

  function clear() {
    setState(null);
  }

  function Banner({ className }: { className?: string }) {
    if (!state) return null;
    return (
      <DSFeedback
        variant={state.variant}
        title={state.title}
        description={state.description}
        onDismiss={clear}
        className={className}
      />
    );
  }

  return {
    setError,
    setSuccess,
    setInfo,
    setWarning,
    clear,
    /** Renderiza o banner de feedback. Retorna null se não houver mensagem. */
    Banner,
    /** true se houver alguma mensagem ativa. */
    hasMessage: state !== null,
    /** Variante atual. */
    variant: state?.variant ?? null,
  };
}
