import { CartProvider } from "@/components/cart-provider";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <CartProvider initialItems={[]}>{children}</CartProvider>;
}
