import {
  closeDirectOrder,
  closeTableAccount,
  createOrderFromCheckout,
  getAdminOrders,
  getCartPreview,
  getOrderDetail,
  updateOrderStatus
} from "@/features/orders/repositories/order.repository";

export const orderService = {
  closeDirectOrder,
  closeTableAccount,
  createOrderFromCheckout,
  getAdminOrders,
  getCartPreview,
  getOrderDetail,
  updateOrderStatus
};
