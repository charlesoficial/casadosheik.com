"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";

import { useToastStore, type ToastItem, type ToastVariant } from "@/store/toast.store";
import { cn } from "@/lib/utils";

// ─── DSToast ───────────────────────────────────────────────────────────────────
// Sistema de toast global do Design System.
//
// Arquitetura:
//   store/toast.store.ts  → estado (Zustand)
//   hooks/use-toast.ts    → API pública (useToast)
//   DSToastHost           → renderiza a stack no canto da tela
//   DSToastItem           → card individual de toast
//
// Uso:
//   1. Adicione <DSToastHost /> ao app/(admin)/layout.tsx (feito automaticamente)
//   2. Em qualquer componente client:
//      const toast = useToast();
//      toast.success("Produto salvo com sucesso");
// ──────────────────────────────────────────────────────────────────────────────

// ── Configuração visual por variante ─────────────────────────────────────────

const variantConfig: Record<
  ToastVariant,
  {
    icon: React.ElementType;
    iconClass: string;
    containerClass: string;
    progressClass: string;
    label: string;
  }
> = {
  success: {
    icon: CheckCircle2,
    iconClass: "text-status-success-fg",
    containerClass:
      "border-status-success-border bg-admin-elevated",
    progressClass: "bg-status-success-fg",
    label: "Sucesso",
  },
  error: {
    icon: XCircle,
    iconClass: "text-status-danger-fg",
    containerClass:
      "border-status-danger-border bg-admin-elevated",
    progressClass: "bg-status-danger-fg",
    label: "Erro",
  },
  info: {
    icon: Info,
    iconClass: "text-status-info-fg",
    containerClass:
      "border-status-info-border bg-admin-elevated",
    progressClass: "bg-status-info-fg",
    label: "Informação",
  },
  warning: {
    icon: AlertTriangle,
    iconClass: "text-status-warning-fg",
    containerClass:
      "border-status-warning-border bg-admin-elevated",
    progressClass: "bg-status-warning-fg",
    label: "Atenção",
  },
};

// ── DSToastItem ───────────────────────────────────────────────────────────────

interface DSToastItemProps {
  toast: ToastItem;
  onRemove: (id: string) => void;
}

function DSToastItem({ toast, onRemove }: DSToastItemProps) {
  const config = variantConfig[toast.variant];
  const Icon   = config.icon;

  // Controla animação de entrada/saída
  const [visible, setVisible] = useState(false);
  const removeRef = useRef(onRemove);
  removeRef.current = onRemove;

  // Entrada: atrasa 1 frame para acionar a transição CSS
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Barra de progresso animada (só quando tem auto-dismiss)
  const hasDuration = (toast.duration ?? 0) > 0;

  function handleDismiss() {
    setVisible(false);
    // Aguarda animação de saída antes de remover do store
    setTimeout(() => removeRef.current(toast.id), 250);
  }

  return (
    <div
      role="alert"
      aria-live={toast.variant === "error" ? "assertive" : "polite"}
      aria-label={`${config.label}: ${toast.title}`}
      className={cn(
        // Base
        "relative w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden",
        "rounded-ds-lg border shadow-panel",
        // Motion — entrada por slide + fade
        "transition-[opacity,transform] duration-motion-moderate ease-motion-out",
        visible
          ? "translate-x-0 opacity-100"
          : "translate-x-4 opacity-0 pointer-events-none",
        config.containerClass
      )}
    >
      {/* Conteúdo */}
      <div className="flex items-start gap-3 p-4">
        <Icon
          className={cn("mt-0.5 h-4 w-4 shrink-0", config.iconClass)}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-admin-fg leading-snug">
            {toast.title}
          </p>
          {toast.description && (
            <p className="mt-0.5 text-xs text-admin-fg-muted leading-relaxed">
              {toast.description}
            </p>
          )}
        </div>
        <button
          onClick={handleDismiss}
          aria-label="Fechar notificação"
          className={cn(
            "shrink-0 rounded-ds-xs p-0.5",
            "text-admin-fg-faint transition-colors duration-motion-fast",
            "hover:text-admin-fg focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          )}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Barra de progresso — só para toasts com auto-dismiss */}
      {hasDuration && (
        <div
          className={cn(
            "absolute bottom-0 left-0 h-[2px] w-full origin-left",
            config.progressClass
          )}
          style={{
            animation: `motion-shrink-x ${toast.duration}ms linear both`,
          }}
        />
      )}
    </div>
  );
}

// ── DSToastHost ────────────────────────────────────────────────────────────────
// Coloque este componente UMA VEZ no layout raiz do admin.
// Ele fica fixo no canto inferior direito e renderiza a stack de toasts.
//
// Não usa createPortal — Next.js App Router não precisa pois o layout
// já envolve tudo. Se precisar de portal no futuro, adicione aqui.

export function DSToastHost() {
  const { toasts, remove } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-label="Notificações"
      className={cn(
        "fixed bottom-6 right-6 z-[9999]",
        "flex flex-col-reverse gap-3",
        // Garante que não sobreponha a sidebar
        "max-h-[calc(100vh-3rem)]"
      )}
    >
      {toasts.map((toast) => (
        <DSToastItem key={toast.id} toast={toast} onRemove={remove} />
      ))}
    </div>
  );
}
