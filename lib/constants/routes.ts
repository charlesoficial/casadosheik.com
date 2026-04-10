export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  PUBLIC: {
    MENU: "/menu",
    CHECKOUT: "/checkout"
  },
  ADMIN: {
    ROOT: "/admin",
    ORDERS: "/admin/pedidos",
    ORDERS_SETTINGS: "/admin/pedidos/configuracoes",
    KITCHEN: "/admin/pedidos/cozinha",
    MENU: "/admin/cardapio",
    TABLES: "/admin/mesas",
    CASH: "/admin/caixa",
    HISTORY: "/admin/historico",
    SETTINGS: "/admin/configuracoes",
    PRINTERS: "/admin/configuracoes/impressoras"
  }
} as const;
