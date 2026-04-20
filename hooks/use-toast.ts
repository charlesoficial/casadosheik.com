"use client";

import { useToastStore, type ToastVariant } from "@/store/toast.store";

// ─── useToast ──────────────────────────────────────────────────────────────────
// API pública do sistema de toast. Use este hook em qualquer componente client.
//
// Uso:
//   const toast = useToast();
//   toast.success("Produto salvo");
//   toast.error("Falha ao salvar", "Verifique sua conexão e tente novamente.");
//   toast.info("Impressora offline", "Usando fallback do navegador.");
//   toast.warning("Caixa não fechado", "O turno ainda está aberto.");
//   toast.dismiss(id);
//
// Duração padrão por variante:
//   success  → 4s (ação concluída, não precisa de atenção prolongada)
//   info     → 4s
//   warning  → 6s (requer leitura)
//   error    → permanente (requer ação do usuário)
// ──────────────────────────────────────────────────────────────────────────────

const DEFAULT_DURATION: Record<ToastVariant, number> = {
  success: 4000,
  info:    4000,
  warning: 6000,
  error:   0,       // 0 = permanente até dismiss manual
};

export function useToast() {
  const { add, remove, clear } = useToastStore();

  function show(
    variant: ToastVariant,
    title: string,
    description?: string,
    durationOverride?: number
  ): string {
    const duration = durationOverride ?? DEFAULT_DURATION[variant];
    const id = add({ variant, title, description, duration });

    if (duration > 0) {
      setTimeout(() => remove(id), duration);
    }

    return id;
  }

  return {
    /** Ação concluída com sucesso. Auto-dismiss em 4s. */
    success: (title: string, description?: string, duration?: number) =>
      show("success", title, description, duration),

    /** Falha ou erro. Permanente por padrão — requer dismiss manual. */
    error: (title: string, description?: string, duration?: number) =>
      show("error", title, description, duration),

    /** Informação neutra. Auto-dismiss em 4s. */
    info: (title: string, description?: string, duration?: number) =>
      show("info", title, description, duration),

    /** Aviso que requer atenção. Auto-dismiss em 6s. */
    warning: (title: string, description?: string, duration?: number) =>
      show("warning", title, description, duration),

    /** Remove um toast pelo id retornado pelas funções acima. */
    dismiss: (id: string) => remove(id),

    /** Remove todos os toasts da fila. */
    dismissAll: () => clear(),
  };
}
