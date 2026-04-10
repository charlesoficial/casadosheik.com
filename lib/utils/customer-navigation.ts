export function buildMenuHref(mesa?: string) {
  return mesa ? `/menu?mesa=${mesa}` : "/menu";
}

export function buildProductHref(productId: string, mesa?: string) {
  return mesa ? `/produto/${productId}?mesa=${mesa}` : `/produto/${productId}`;
}

export function buildCheckoutHref(mesa?: string, fromProduct?: string) {
  const base = mesa ? `/checkout?mesa=${mesa}` : "/checkout";
  if (!fromProduct) return base;
  return `${base}${mesa ? "&" : "?"}fromProduct=${fromProduct}`;
}
