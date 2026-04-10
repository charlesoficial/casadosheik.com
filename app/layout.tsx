import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { CartProvider } from "@/components/cart-provider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Casa do Sheik",
  description: "Sistema de pedidos em Next.js + Tailwind + shadcn/ui"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <CartProvider initialItems={[]}>{children}</CartProvider>
      </body>
    </html>
  );
}
