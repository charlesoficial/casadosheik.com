"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type CartStoreItem = {
  id: string;
  quantity: number;
  price: number;
  name?: string;
};

type CartStoreState = {
  items: CartStoreItem[];
  total: number;
  addItem: (item: CartStoreItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
};

function getTotal(items: CartStoreItem[]) {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export const useCartStore = create<CartStoreState>()(
  persist(
    (set) => ({
      items: [],
      total: 0,
      addItem: (item) =>
        set((state) => {
          const existing = state.items.find((entry) => entry.id === item.id);
          const items = existing
            ? state.items.map((entry) =>
                entry.id === item.id ? { ...entry, quantity: entry.quantity + item.quantity } : entry
              )
            : [...state.items, item];
          return { items, total: getTotal(items) };
        }),
      removeItem: (id) =>
        set((state) => {
          const items = state.items.filter((item) => item.id !== id);
          return { items, total: getTotal(items) };
        }),
      updateQuantity: (id, quantity) =>
        set((state) => {
          const items = state.items
            .map((item) => (item.id === id ? { ...item, quantity } : item))
            .filter((item) => item.quantity > 0);
          return { items, total: getTotal(items) };
        }),
      clearCart: () => set({ items: [], total: 0 })
    }),
    {
      name: "cart-store"
    }
  )
);
