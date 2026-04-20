import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { CartProvider } from "@/components/cart-provider";
import "./globals.css";
import "@/styles/receipt-print.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Casa do Sheik",
  description: "Sistema de pedidos em Next.js + Tailwind + shadcn/ui",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-16.png", type: "image/png", sizes: "16x16" },
    ],
    apple: { url: "/apple-touch-icon.png", sizes: "180x180" },
  },
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
