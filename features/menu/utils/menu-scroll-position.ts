const MENU_SCROLL_STORAGE_KEY = "casa-do-sheik:menu-scroll-position";

type MenuScrollPosition = {
  productId?: string;
  y: number;
  savedAt: number;
};

export function saveMenuScrollPosition(productId?: string) {
  if (typeof window === "undefined") return;

  const payload: MenuScrollPosition = {
    productId,
    y: window.scrollY,
    savedAt: Date.now(),
  };

  window.sessionStorage.setItem(MENU_SCROLL_STORAGE_KEY, JSON.stringify(payload));
}

export function restoreMenuScrollPosition() {
  if (typeof window === "undefined") return;

  const raw = window.sessionStorage.getItem(MENU_SCROLL_STORAGE_KEY);
  if (!raw) return;

  window.sessionStorage.removeItem(MENU_SCROLL_STORAGE_KEY);

  try {
    const payload = JSON.parse(raw) as Partial<MenuScrollPosition>;
    if (typeof payload.y !== "number") return;
    if (payload.savedAt && Date.now() - payload.savedAt > 30 * 60 * 1000) return;

    requestAnimationFrame(() => {
      if (payload.productId) {
        const productCard = document.getElementById(`menu-product-${payload.productId}`);
        if (productCard) {
          productCard.scrollIntoView({ block: "center", behavior: "auto" });
          return;
        }
      }

      window.scrollTo({ top: payload.y ?? 0, behavior: "auto" });
    });
  } catch {
    // Ignora estado antigo/corrompido de sessão.
  }
}
