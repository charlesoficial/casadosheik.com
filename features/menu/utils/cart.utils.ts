import type { CartItem, MenuProduct } from "@/lib/types";

export function addItemToCart(items: CartItem[], product: MenuProduct, qty = 1, note?: string) {
  const existing = items.find((item) => item.id === product.id && (item.note ?? "") === (note ?? ""));
  if (!existing) {
    return [...items, { id: product.id, productId: product.id, name: product.name, qty, price: product.price, image: product.image, note }];
  }

  return items.map((item) =>
    item === existing
      ? {
          ...item,
          qty: item.qty + qty
        }
      : item
  );
}

export function removeItemFromCart(items: CartItem[], productId: string) {
  return items.filter((item) => item.productId !== productId && item.id !== productId);
}

export function calculateCartTotal(items: CartItem[]) {
  return items.reduce((total, item) => total + item.qty * item.price, 0);
}
