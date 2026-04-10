import { formatCurrency } from "@/lib/utils/currency";

export function calculateSubtotal(quantity: number, unitPrice: number) {
  return quantity * unitPrice;
}

export function calculateTotal(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

export function formatOrderTotal(total: number) {
  return formatCurrency(total);
}
