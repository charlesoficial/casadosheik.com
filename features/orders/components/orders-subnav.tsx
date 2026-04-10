import Link from "next/link";

import { cn } from "@/lib/utils";

const items = [
  { href: "/admin/pedidos", label: "Gestor de Pedidos" },
  { href: "/admin/pedidos/configuracoes", label: "Configuracoes" }
];

export function OrdersSubnav({ pathname }: { pathname: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "rounded-2xl border px-4 py-2.5 text-sm font-medium transition-colors",
            pathname === item.href
              ? "border-[#6a45ff] bg-[#21153d] text-[#ccbaff]"
              : "border-[#2b2b2b] bg-[#171717] text-[#c5bfb3] hover:bg-[#1f1f1f]"
          )}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
