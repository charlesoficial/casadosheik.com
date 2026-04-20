import { create } from "zustand";

// ─── Toast Store ───────────────────────────────────────────────────────────────
// Estado global de toasts via Zustand.
// Consumido pelo hook `useToast` e renderizado pelo `DSToastHost` no layout.
//
// Ciclo de vida:
//   1. useToast().success("...") → add() → toast entra na fila com id único
//   2. DSToastHost renderiza o toast com animação de entrada
//   3. Após `duration` ms, remove() é chamado → animação de saída
//   4. Toast some da DOM
// ──────────────────────────────────────────────────────────────────────────────

export type ToastVariant = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: string;
  variant: ToastVariant;
  title: string;
  /** Texto de suporte opcional abaixo do título. */
  description?: string;
  /**
   * Duração em ms antes do auto-dismiss.
   * 0 = permanente até o usuário fechar.
   * Default por variante: success/info = 4000ms, warning = 5000ms, error = 0 (manual)
   */
  duration?: number;
}

interface ToastStore {
  toasts: ToastItem[];
  /** Adiciona um novo toast. Retorna o id gerado. */
  add: (toast: Omit<ToastItem, "id">) => string;
  /** Remove um toast pelo id. */
  remove: (id: string) => void;
  /** Remove todos os toasts. */
  clear: () => void;
}

let counter = 0;

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],

  add(toast) {
    const id = `toast-${++counter}`;
    set((state) => ({
      // Máximo de 5 toasts simultâneos — remove o mais antigo se necessário
      toasts: [
        ...(state.toasts.length >= 5 ? state.toasts.slice(1) : state.toasts),
        { ...toast, id },
      ],
    }));
    return id;
  },

  remove(id) {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  clear() {
    set({ toasts: [] });
  },
}));
