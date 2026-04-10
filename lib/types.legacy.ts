export type RestaurantConfig = {
  name: string;
  cuisine: string;
  welcome: string;
  open: boolean;
  whatsapp: string;
  logoUrl?: string | null;
};

export type CategoryItem = {
  id: string;
  name: string;
  order: number;
  active?: boolean;
  productCount?: number;
};

export type PrinterType = "usb" | "network";
export type PrinterDestination = "caixa" | "cozinha" | "bar" | "delivery" | "geral";
export type PrintTransportType = PrinterType | "manual";
export type PrintTriggerSource = "test" | "auto_accept" | "manual_reprint";
export type PrintJobStatus = "pending" | "success" | "failed";

export type PrinterRecord = {
  id: string;
  name: string;
  type: PrinterType;
  destination: PrinterDestination;
  printerName?: string | null;
  ipAddress?: string | null;
  port?: number | null;
  isActive: boolean;
  autoPrintOnAccept: boolean;
  copies: number;
  createdAt?: string;
  updatedAt?: string;
};

export type PrinterPayload = {
  name: string;
  type: PrinterType;
  destination: PrinterDestination;
  printerName?: string;
  ipAddress?: string;
  port?: number;
  isActive?: boolean;
  autoPrintOnAccept?: boolean;
  copies?: number;
};

export type AlertFrequency = "none" | "once_per_order" | "repeat_while_pending";
export type AlertSound =
  | "Alerta 1"
  | "Alerta 2"
  | "Alerta 3"
  | "Alerta 4"
  | "Alerta 5"
  | "Alerta 6"
  | "Alerta 7"
  | "Alerta 8";
export type AutoPrintMode = "single_printer" | "by_destination";
export type AutoPrintTriggerStatus = "novo" | "aceito";

export type OrderSettingsRecord = {
  id: string;
  enableTableOrders: boolean;
  enableDeliveryOrders: boolean;
  enableManualOrders: boolean;
  enableStepAccepted: boolean;
  enableStepPreparing: boolean;
  enableStepDelivery: boolean;
  notificationsEnabled: boolean;
  alertSound: AlertSound;
  alertFrequency: AlertFrequency;
  alertVolume: number;
  autoPrintEnabled: boolean;
  autoPrintMode: AutoPrintMode;
  defaultAutoPrintPrinterId?: string | null;
  autoPrintTriggerStatus: AutoPrintTriggerStatus;
  createdAt?: string;
  updatedAt?: string;
};

export type OrderSettingsPayload = Omit<OrderSettingsRecord, "id" | "createdAt" | "updatedAt">;

export type MenuProduct = {
  id: string;
  categoryId?: string;
  category: string;
  name: string;
  description: string;
  price: number;
  image: string;
  available?: boolean;
  highlight?: boolean;
  badge?: string;
};

export type CartItem = {
  id: string;
  productId?: string;
  name: string;
  qty: number;
  price: number;
  image: string;
  note?: string;
};

export type OrderStatus = "novo" | "aceito" | "preparo" | "pronto" | "concluido" | "cancelado";

export type AdminOrder = {
  id: string;
  number: number;
  type: string;
  customer: string;
  status: OrderStatus;
  total: number;
  items: string[];
  minutesAgo: number;
};

export type OrderDetail = {
  id: string;
  number: number;
  kind?: "mesa" | "delivery" | "retirada";
  table?: string | null;
  tableAccountClosed?: boolean;
  tableClosedAt?: string | null;
  tableClosedPayment?: string | null;
  tableClosedTotal?: number | null;
  financialClosed?: boolean;
  financialClosedAt?: string | null;
  financialClosedPayment?: string | null;
  type: string;
  status: OrderStatus;
  customer: string;
  phone?: string | null;
  address?: {
    rua?: string;
    numero?: string;
    bairro?: string;
    referencia?: string;
  } | null;
  payment?: string | null;
  changeFor?: number | null;
  notes?: string | null;
  total: number;
  createdAt?: string;
  updatedAt?: string;
  items: Array<{
    id: string;
    name: string;
    qty: number;
    price: number;
    note?: string | null;
  }>;
};

export type CloseTableAccountPayload = {
  paymentMethod: "dinheiro" | "pix" | "cartao" | "credito" | "debito";
};

export type CloseTableAccountResult = {
  table: string;
  paymentMethod: string;
  total: number;
  orderIds: string[];
  closedAt: string;
  closedBy?: string | null;
};

export type CloseDirectOrderPayload = {
  paymentMethod: "dinheiro" | "pix" | "cartao" | "credito" | "debito";
};

export type CloseDirectOrderResult = {
  orderId: string;
  paymentMethod: string;
  total: number;
  closedAt: string;
  closedBy?: string | null;
};

export type CashClosingSummary = {
  referenceDate: string;
  total: number;
  ordersCount: number;
  tablesCount: number;
  payments: Array<{
    method: string;
    total: number;
    count: number;
  }>;
  origins: Array<{
    key: "mesa" | "delivery" | "retirada";
    label: string;
    total: number;
    count: number;
  }>;
  recentClosures: Array<{
    id: string;
    label: string;
    type: "mesa" | "delivery" | "retirada";
    paymentMethod: string;
    total: number;
    closedAt: string;
  }>;
  movements: CashMovementRecord[];
  movementTotals: {
    sangria: number;
    suprimento: number;
  };
  expectedCashBalance: number;
  alreadyClosed: boolean;
  lastClosedAt?: string | null;
  lastUpdatedAt?: string | null;
};

export type CashClosingResult = CashClosingSummary & {
  id: string;
};

export type CashCloseRequestPayload = {
  note?: string;
};

export type CashMovementType = "sangria" | "suprimento";

export type CashMovementRecord = {
  id: string;
  type: CashMovementType;
  amount: number;
  note?: string | null;
  createdAt: string;
};

export type CashMovementPayload = {
  type: CashMovementType;
  amount: number;
  note?: string;
};

export type FinancialHistoryEntry = {
  id: string;
  label: string;
  kind: "caixa" | "mesa" | "delivery" | "retirada";
  paymentMethod: string;
  total: number;
  status: string;
  occurredAt: string;
  details: string;
  note?: string | null;
  sourceId?: string;
};

export type FinancialHistoryDetail = {
  id: string;
  label: string;
  kind: "caixa" | "mesa" | "delivery" | "retirada";
  paymentMethod: string;
  total: number;
  status: string;
  occurredAt: string;
  details: string;
  note?: string | null;
  closedBy?: string | null;
  referenceDate?: string | null;
  items: Array<{
    label: string;
    quantity?: number | null;
    total?: number | null;
    note?: string | null;
  }>;
  relatedOrders: Array<{
    id: string;
    number: number;
    type: string;
    customer: string;
    total: number;
    status: OrderStatus;
  }>;
};

export type DashboardChannel = {
  key: "mesa" | "delivery" | "retirada";
  label: string;
  count: number;
  revenue: number;
  share: number;
};

export type DashboardTopItem = {
  name: string;
  revenue: number;
  quantity: number;
};

export type DashboardDailyPoint = {
  label: string;
  total: number;
};

export type DashboardOverviewData = {
  generatedAt: string;
  storeName: string;
  currentRevenue: number;
  previousRevenue: number;
  currentOrdersCount: number;
  previousOrdersCount: number;
  currentAverageTicket: number;
  previousAverageTicket: number;
  todayRevenue: number;
  todayClosedTables: number;
  pendingOrdersCount: number;
  dailyRevenue: DashboardDailyPoint[];
  topItems: DashboardTopItem[];
  channels: DashboardChannel[];
};

export type PrintDispatchResult = {
  printerId: string;
  printerName: string;
  destination: PrinterDestination;
  type: PrinterType;
  success: boolean;
  mode: PrintTransportType;
  message: string;
};

export type PrintJobPayload = {
  orderId: string;
  destination?: PrinterDestination | "all";
  triggerSource?: PrintTriggerSource;
  printerId?: string;
};

export type PrintJobRecord = {
  id: string;
  orderId?: string | null;
  printerId?: string | null;
  printerName?: string | null;
  destination: PrinterDestination;
  transportType: PrintTransportType;
  triggerSource: PrintTriggerSource;
  status: PrintJobStatus;
  attemptCount: number;
  errorMessage?: string | null;
  payloadPreview?: string | null;
  createdAt: string;
  printedAt?: string | null;
};

export type CreatePrintJobPayload = {
  orderId?: string | null;
  printerId?: string | null;
  printerName?: string | null;
  destination: PrinterDestination;
  transportType: PrintTransportType;
  triggerSource: PrintTriggerSource;
  payloadPreview?: string | null;
  attemptCount?: number;
  status?: PrintJobStatus;
};

export type UpdatePrintJobPayload = {
  status: Extract<PrintJobStatus, "success" | "failed">;
  errorMessage?: string | null;
  printedAt?: string | null;
};

export type CheckoutPayload = {
  mesa?: string;
  tipo: "mesa" | "delivery" | "retirada";
  clienteNome?: string;
  clienteTelefone?: string;
  enderecoEntrega?: {
    rua?: string;
    numero?: string;
    bairro?: string;
    referencia?: string;
  } | null;
  formaPagamento?: string;
  trocoPara?: number | null;
  observacaoGeral?: string;
  itens: Array<{
    produtoId: string;
    nome: string;
    quantidade: number;
    preco: number;
    observacao?: string;
    image?: string;
  }>;
};

export type CreateCategoryPayload = {
  name: string;
};

export type UpdateCategoryPayload = {
  name: string;
  active?: boolean;
};

export type CreateProductPayload = {
  categoryId?: string;
  categoryName?: string;
  name: string;
  description?: string;
  price: number;
  image?: string;
  highlight?: boolean;
  available?: boolean;
};

export type UpdateProductPayload = {
  categoryId?: string;
  categoryName?: string;
  name: string;
  description?: string;
  price: number;
  image?: string;
  highlight?: boolean;
  available?: boolean;
};
