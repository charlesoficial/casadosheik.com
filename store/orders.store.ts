"use client";

import { create } from "zustand";

type AdminOrderSnapshot = {
  id: string;
  status?: string;
  [key: string]: unknown;
};

type OrdersStoreState = {
  orders: AdminOrderSnapshot[];
  setOrders: (orders: AdminOrderSnapshot[]) => void;
  addOrder: (order: AdminOrderSnapshot) => void;
  updateOrderStatus: (id: string, status: string) => void;
  removeOrder: (id: string) => void;
};

export const useOrdersStore = create<OrdersStoreState>((set) => ({
  orders: [],
  setOrders: (orders) => set({ orders }),
  addOrder: (order) => set((state) => ({ orders: [order, ...state.orders.filter((item) => item.id !== order.id)] })),
  updateOrderStatus: (id, status) =>
    set((state) => ({
      orders: state.orders.map((order) => (order.id === id ? { ...order, status } : order))
    })),
  removeOrder: (id) => set((state) => ({ orders: state.orders.filter((order) => order.id !== id) }))
}));
