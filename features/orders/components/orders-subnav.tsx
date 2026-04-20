import Link from "next/link";

import { cn } from "@/lib/utils";

const items = [
  { href: "/admin/pedidos", label: "Gestor de Pedidos" },
  { href: "/admin/pedidos/configuracoes", label: "Configurações de pedidos" }
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
              ? "border-status-new-border bg-status-new-bg text-status-new-fg"
              : "border-admin-border bg-admin-elevated text-admin-fg-secondary hover:bg-admin-overlay"
          )}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
