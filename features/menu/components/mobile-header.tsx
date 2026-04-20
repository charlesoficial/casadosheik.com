import { Store, Truck, User } from "lucide-react";

import { CustomerFlowHeader } from "@/components/customer/customer-flow-header";
import { Badge } from "@/components/ui/badge";
import type { RestaurantConfig } from "@/lib/types";

export function MobileHeader({
  restaurant,
  mesa,
}: {
  restaurant: RestaurantConfig;
  mesa?: string;
}) {
  const modeLabel = mesa ? `Mesa ${mesa}` : "Delivery";

  return (
    <CustomerFlowHeader
      className="bg-transparent px-5 pb-6 lg:hidden"
      title={restaurant.name}
      description={restaurant.welcome}
      leading={
        <div className="flex h-20 w-20 items-center justify-center rounded-full border border-menu-accent-border bg-menu-surface-raised shadow-soft">
          <User className="h-9 w-9 text-menu-accent" strokeWidth={1.5} />
        </div>
      }
      topBar={
        <div className="flex items-center justify-end">
          {restaurant.open ? (
            <Badge className="border-menu-success/40 bg-menu-success-bg text-menu-success">
              Aberto agora
            </Badge>
          ) : (
            <Badge className="border-menu-border bg-menu-accent-bg text-menu-text-muted">
              Fechado
            </Badge>
          )}
        </div>
      }
      badges={
        <>
          <Badge className="w-fit border-menu-accent-border bg-menu-surface/80 text-menu-text-muted">
            {restaurant.cuisine}
          </Badge>
          <Badge className="w-fit border-menu-accent-border bg-menu-accent-bg text-menu-accent">
            {mesa ? (
              <Store className="mr-1 h-3.5 w-3.5" strokeWidth={1.5} />
            ) : (
              <Truck className="mr-1 h-3.5 w-3.5" strokeWidth={1.5} />
            )}
            {modeLabel}
          </Badge>
        </>
      }
    />
  );
}
