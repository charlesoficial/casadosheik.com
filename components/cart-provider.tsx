"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";

import type { CartItem, MenuProduct } from "@/lib/types";

type CartContextValue = {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
  addItem: (product: MenuProduct, quantity: number, note?: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
};

const STORAGE_KEY = "casa-do-sheik-cart";

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({
  children,
  initialItems
}: {
  children: ReactNode;
  initialItems: CartItem[];
}) {
  const [items, setItems] = useState<CartItem[]>(initialItems);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as CartItem[];
        if (Array.isArray(parsed)) {
          setItems(parsed);
        }
      }
    } catch {
      // Ignore invalid local storage payloads and keep defaults.
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [hydrated, items]);

  const value = useMemo<CartContextValue>(() => {
    const totalItems = items.reduce((sum, item) => sum + item.qty, 0);
    const totalPrice = items.reduce((sum, item) => sum + item.qty * item.price, 0);

    return {
      items,
      totalItems,
      totalPrice,
      addItem(product, quantity, note) {
        setItems((current) => {
          const normalizedNote = note?.trim() || "";
          const existing = current.find(
            (item) => (item.productId ?? item.id) === product.id && (item.note?.trim() || "") === normalizedNote
          );
          if (existing) {
            return current.map((item) =>
              item.id === existing.id ? { ...item, qty: item.qty + quantity } : item
            );
          }

          return [
            ...current,
            {
              id: `cart-${product.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              productId: product.id,
              name: product.name,
              qty: quantity,
              price: product.price,
              image: product.image,
              note: normalizedNote || undefined
            }
          ];
        });
      },
      updateQuantity(id, quantity) {
        setItems((current) =>
          current
            .map((item) => (item.id === id ? { ...item, qty: quantity } : item))
            .filter((item) => item.qty > 0)
        );
      },
      removeItem(id) {
        setItems((current) => current.filter((item) => item.id !== id));
      },
      clearCart() {
        setItems([]);
      }
    };
  }, [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }

  return context;
}
