export * from "@/features/orders/repositories/order.repository";
export * from "@/features/menu/repositories/menu.repository";
export * from "@/features/cash/repositories/cash.repository";
export * from "@/features/tables/repositories/table.repository";
export * from "@/features/printers/repositories/printer.repository";
export * from "@/features/history/repositories/history.repository";

// Funções legadas usadas pelo cardápio público e outras páginas.
// Mantidas aqui para não quebrar imports existentes de @/lib/data.
export {
  getRestaurantConfig,
  getMenuData,
  getMenuManagementData,
  getProductById,
  getCartPreview,
  getAdminOrders,
  getOrderDetail,
  createOrderFromCheckout,
  updateOrderStatus,
  closeTableAccount,
  closeDirectOrder,
  moveProductToCategory,
  reorderCategories,
  reorderProducts,
} from "@/lib/data.legacy";
