"use client";

import { create } from "zustand";

type UiStoreState = {
  sidebarOpen: boolean;
  activeOrderId: string | null;
  toggleSidebar: () => void;
  setActiveOrder: (id: string | null) => void;
};

export const useUiStore = create<UiStoreState>((set) => ({
  sidebarOpen: true,
  activeOrderId: null,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setActiveOrder: (id) => set({ activeOrderId: id })
}));
