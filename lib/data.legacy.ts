import { createHmac, timingSafeEqual } from "node:crypto";

import { adminOrders, categories, products, restaurant, sampleCart } from "@/lib/mock-data";
import { sanitizeString } from "@/lib/security/sanitize";
import {
  hasServiceRoleConfigured,
  getSupabaseAdminClient,
  getSupabaseServerClient,
  isSupabaseConfigured,
  isSupabasePermissionError,
  isSupabaseSchemaMissingError
} from "@/lib/supabase/client";
import type {
  AdminOrder,
  CloseDirectOrderResult,
  CashClosingResult,
  CashClosingSummary,
  CashMovementPayload,
  CashMovementRecord,
  CartItem,
  CategoryItem,
  CloseTableAccountResult,
  CheckoutPayload,
  CreateCategoryPayload,
  CreateProductPayload,
  DashboardOverviewData,
  FinancialHistoryEntry,
  FinancialHistoryDetail,
  MenuProduct,
  OrderStatus,
  OrderDetail,
  RestaurantConfig,
  UpdateCategoryPayload,
  UpdateProductPayload
} from "@/lib/types";

// -----------------------------------------------------------------------------
// CALCULO DE HORARIO DE FUNCIONAMENTO
// Verifica se o restaurante esta aberto agora com base no campo `horarios`
// (JSONB do banco). Usa horario de Brasilia (UTC-3) para a comparacao.
//
// Formato esperado de cada entrada do array `horarios`:
//   { dia: string, abertura: string|null, fechamento: string|null, fechado?: boolean }
//
// O campo `aberto` (boolean) do banco funciona como override manual:
//   - false => forcado fechado (feriado, manutencao etc.)
//   - true  => respeita o horario calculado
// -----------------------------------------------------------------------------

type HorarioEntry = {
  dia: string;
  abertura: string | null;
  fechamento: string | null;
  fechado?: boolean;
};

const DIA_MAP: Record<number, string> = {
  0: "domingo",
  1: "segunda",
  2: "terca",
  3: "quarta",
  4: "quinta",
  5: "sexta",
  6: "sabado"
};

function isRestaurantOpenBySchedule(
  horarios: HorarioEntry[],
  overrideAberto: boolean
): boolean {
  // Override manual: admin forcou fechado
  if (!overrideAberto) return false;

  if (!Array.isArray(horarios) || horarios.length === 0) {
    // Sem horarios configurados, confia no override
    return overrideAberto;
  }

  // Hora atual em Brasilia (UTC-3)
  const now = new Date();
  const brasiliaOffset = -3 * 60; // minutos
  const localOffset = now.getTimezoneOffset(); // minutos (positivo = atras de UTC)
  const diff = (brasiliaOffset + localOffset) * 60 * 1000;
  const brasilia = new Date(now.getTime() + diff);

  const weekday = brasilia.getDay(); // 0 = domingo
  const nomeDia = DIA_MAP[weekday];
  const horaAtual = brasilia.getHours() * 60 + brasilia.getMinutes(); // minutos desde meia-noite

  const entrada = horarios.find(
    (h) => h.dia.toLowerCase().trim() === nomeDia
  );

  if (!entrada) return false;
  if (entrada.fechado) return false;
  if (!entrada.abertura || !entrada.fechamento) return false;

  function toMinutes(hhmm: string) {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + (m ?? 0);
  }

  const abre = toMinutes(entrada.abertura);
  const fecha = toMinutes(entrada.fechamento);

  return horaAtual >= abre && horaAtual < fecha;
}

// Este modulo concentra a maior parte da regra de negocio legada do sistema.
// Apesar do nome "legacy", ele ainda alimenta fluxos criticos de menu, pedidos,
// caixa e historico, então alteracoes aqui exigem bastante cuidado.
const nextStatusMap = {
  novo: "aceito",
  aceito: "preparo",
  preparo: "pronto",
  pronto: "concluido",
  concluido: "concluido",
  cancelado: "cancelado"
} as const;

const demoOrderDetails = new Map<string, OrderDetail>();
let demoOrderSequence = 42;
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const publicOrderTokenRegex = /^[a-f0-9]{32}$/i;

function getOrderTokenSecret() {
  return process.env.ORDER_PUBLIC_TOKEN_SECRET || null;
}

function signPublicOrderToken(orderId: string) {
  const secret = getOrderTokenSecret();
  if (!secret) {
    throw new Error("ORDER_PUBLIC_TOKEN_SECRET nao configurado.");
  }

  return createHmac("sha256", secret).update(`pedido-publico:${orderId}`).digest("hex").slice(0, 32);
}

function hasValidPublicOrderToken(orderId: string, token: string) {
  const expected = Buffer.from(signPublicOrderToken(orderId));
  const received = Buffer.from(token);

  if (expected.length !== received.length) {
    return false;
  }

  return timingSafeEqual(expected, received);
}

function sanitizeOptionalText(value?: string | null, maxLength = 255) {
  if (!value) return null;
  const sanitized = sanitizeString(value).slice(0, maxLength).trim();
  return sanitized || null;
}

function sanitizePhone(value?: string | null) {
  if (!value) return null;
  const digitsAndSymbols = value.replace(/[^\d+\-()\s]/g, "").trim().slice(0, 30);
  return digitsAndSymbols || null;
}

function sanitizeAddress(
  address?: CheckoutPayload["enderecoEntrega"]
): CheckoutPayload["enderecoEntrega"] | null {
  if (!address) return null;

  return {
    rua: sanitizeOptionalText(address.rua, 120) ?? undefined,
    numero: sanitizeOptionalText(address.numero, 30) ?? undefined,
    bairro: sanitizeOptionalText(address.bairro, 80) ?? undefined,
    referencia: sanitizeOptionalText(address.referencia, 160) ?? undefined
  };
}

function formatTableCode(table?: string | null) {
  const numeric = Number(table);
  if (Number.isFinite(numeric) && numeric > 0) {
    return String(numeric).padStart(3, "0");
  }
  return table ?? "-";
}

function formatTableLabel(table?: string | null) {
  return `Mesa ${formatTableCode(table)}`;
}

function formatOrderCode(number: number) {
  return String(number).padStart(3, "0");
}

function seedDemoOrders() {
  if (demoOrderDetails.size > 0) return;

  for (const source of adminOrders) {
    demoOrderDetails.set(
      source.id,
      fallbackOrderDetail(source.id)
    );
  }
}

function fallbackOrderDetail(id: string): OrderDetail {
  const source = adminOrders[0];

  return {
    id,
    number: source.number,
    kind: source.type.includes("Mesa") ? "mesa" : source.type === "Delivery" ? "delivery" : "retirada",
    table: source.type.includes("Mesa") ? source.type.replace("Mesa ", "") : null,
    type: source.type.includes("Mesa") ? formatTableLabel(source.type.replace("Mesa ", "")) : source.type,
    status: source.status,
    customer: source.customer,
    phone: "(64) 99955-9916",
    address: {
      rua: "Rua Exemplo",
      numero: "123",
      bairro: "Centro",
      referencia: "Ao lado da praca"
    },
    payment: "Pix",
    changeFor: null,
    notes: "sem cebola no shawarma",
    total: source.total,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    items: sampleCart.map((item) => ({
      id: item.id,
      name: item.name,
      qty: item.qty,
      price: item.price,
      note: "Sem cebola"
    }))
  };
}

function isUuid(value: string) {
  return uuidRegex.test(value);
}

function normalizeProductId(value?: string | null) {
  if (!value) return null;
  return isUuid(value) ? value : null;
}

// Em producao preferimos service role para operacoes operacionais, mas existe
// fallback para o client anonimo/server em ambientes mais simples.
function getPreferredServerClient() {
  return hasServiceRoleConfigured() ? getSupabaseAdminClient() : getSupabaseServerClient();
}

function roundCurrencyValue(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

async function getConfiguredDeliveryFee() {
  if (!isSupabaseConfigured()) return 0;

  const supabase = getPreferredServerClient();
  const { data, error } = await supabase!
    .from("restaurante_config")
    .select("taxa_entrega")
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return roundCurrencyValue(Number(data?.taxa_entrega ?? 0));
}

// Esta etapa garante que o pedido use o catalogo do servidor como fonte de verdade.
// Nome, preco e disponibilidade nunca devem depender do payload enviado pelo cliente.
async function resolveCheckoutItems(
  items: CheckoutPayload["itens"]
): Promise<Array<{ produtoId: string | null; nome: string; preco: number; quantidade: number; observacao?: string; image?: string }>> {
  if (!items.length) {
    throw new Error("Pedido sem itens");
  }

  const requestedProductIds = items.map((item) => normalizeProductId(item.produtoId)).filter((value): value is string => Boolean(value));

  if (requestedProductIds.length !== items.length) {
    throw new Error("Carrinho com produto invalido.");
  }

  if (!isSupabaseConfigured()) {
    return Promise.all(
      items.map(async (item) => {
        const product = await getProductById(item.produtoId);

        if (!product) {
          throw new Error("Produto indisponivel para este pedido.");
        }

        return {
          produtoId: normalizeProductId(product.id),
          nome: product.name,
          preco: product.price,
          quantidade: item.quantidade,
          observacao: item.observacao,
          image: product.image
        };
      })
    );
  }

  const supabase = getPreferredServerClient();
  const { data: productRows, error } = await supabase!
    .from("produtos")
    .select("id, nome, preco, foto_url")
    .in("id", requestedProductIds)
    .eq("disponivel", true)
    .is("deleted_at", null);

  if (error) {
    throw new Error(error.message);
  }

  const productMap = new Map(
    (productRows ?? []).map((product) => [
      product.id,
      {
        nome: product.nome,
        preco: Number(product.preco),
        image: product.foto_url || products[0].image
      }
    ])
  );

  return items.map((item) => {
    const produtoId = normalizeProductId(item.produtoId);
    const product = produtoId ? productMap.get(produtoId) : null;

    if (!produtoId || !product) {
      throw new Error("Produto indisponivel para este pedido.");
    }

    return {
      produtoId,
      nome: product.nome,
      preco: product.preco,
      quantidade: item.quantidade,
      observacao: item.observacao,
      image: product.image
    };
  });
}

function getReferenceDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDayRange(referenceDate: string) {
  return {
    start: `${referenceDate}T00:00:00`,
    end: `${referenceDate}T23:59:59.999`
  };
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function toIso(date: Date) {
  return date.toISOString();
}

async function getClosedTableOrderIds() {
  if (!isSupabaseConfigured()) {
    return new Set<string>();
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase!
      .from("mesa_contas")
      .select("pedido_ids")
      .order("fechada_em", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return new Set(
      (data ?? [])
        .flatMap((account) => account.pedido_ids ?? [])
        .filter((value): value is string => typeof value === "string" && value.length > 0)
    );
  } catch (error) {
    if (isSupabaseSchemaMissingError(error, "mesa_contas") || isSupabasePermissionError(error, "mesa_contas")) {
      return new Set<string>();
    }
    throw error;
  }
}

async function getTableAccountInfo(orderId: string) {
  if (!isSupabaseConfigured()) {
    return {
      tableAccountClosed: false,
      tableClosedAt: null,
      tableClosedPayment: null,
      tableClosedTotal: null
    };
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase!
      .from("mesa_contas")
      .select("forma_pagamento, fechada_em, total, pedido_ids")
      .contains("pedido_ids", [orderId])
      .order("fechada_em", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return {
        tableAccountClosed: false,
        tableClosedAt: null,
        tableClosedPayment: null,
        tableClosedTotal: null
      };
    }

    return {
      tableAccountClosed: true,
      tableClosedAt: data.fechada_em ?? null,
      tableClosedPayment: data.forma_pagamento ?? null,
      tableClosedTotal: data.total ? Number(data.total) : null
    };
  } catch (error) {
    if (isSupabaseSchemaMissingError(error, "mesa_contas") || isSupabasePermissionError(error, "mesa_contas")) {
      return {
        tableAccountClosed: false,
        tableClosedAt: null,
        tableClosedPayment: null,
        tableClosedTotal: null
      };
    }
    throw error;
  }
}

function isMissingFinancialColumnsError(error: unknown) {
  return (
    error instanceof Error &&
    (
      error.message.includes("financeiro_fechado_em") ||
      error.message.includes("financeiro_forma_pagamento") ||
      error.message.includes("financeiro_fechado_por") ||
      error.message.includes("fechada_por")
    )
  );
}

function normalizeClosedBy(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export async function getRestaurantConfig(): Promise<RestaurantConfig> {
  // O cardapio publico e o checkout dependem dessas informacoes para montar
  // identidade visual e canais de contato do restaurante.
  if (!isSupabaseConfigured()) {
    return {
      name: restaurant.name,
      cuisine: restaurant.cuisine,
      welcome: restaurant.welcome,
      open: restaurant.open,
      whatsapp: restaurant.whatsapp,
      logoUrl: restaurant.logoUrl ?? null,
      deliveryFee: 0
    };
  }

  try {
    const supabase = getPreferredServerClient();
    const { data, error } = await supabase!
      .from("restaurante_config")
      .select("nome, telefone, whatsapp, logo_url, aberto, horarios, mensagem_boas_vindas, taxa_entrega")
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    // Calcula aberto/fechado com base no horario configurado.
    // Se o campo `aberto` for false, o restaurante e considerado fechado
    // independente do horario (override manual do admin).
    const overrideAberto = data?.aberto ?? true;
    const horarios: HorarioEntry[] = Array.isArray(data?.horarios) ? data.horarios : [];
    const estaAberto = isRestaurantOpenBySchedule(horarios, overrideAberto);

    return {
      name: data?.nome ?? restaurant.name,
      cuisine: "Culinaria Arabe",
      welcome: data?.mensagem_boas_vindas ?? restaurant.welcome,
      open: estaAberto,
      // Preferencia: whatsapp dedicado; fallback legado: telefone
      whatsapp: data?.whatsapp ?? data?.telefone ?? restaurant.whatsapp,
      logoUrl: data?.logo_url ?? restaurant.logoUrl ?? null,
      deliveryFee: roundCurrencyValue(Number(data?.taxa_entrega ?? 0))
    };
  } catch (error) {
    if (
      isSupabaseSchemaMissingError(error, "restaurante_config") ||
      isSupabasePermissionError(error, "restaurante_config")
    ) {
      return {
        name: restaurant.name,
        cuisine: restaurant.cuisine,
        welcome: restaurant.welcome,
        open: restaurant.open,
        whatsapp: restaurant.whatsapp,
        logoUrl: restaurant.logoUrl ?? null,
        deliveryFee: 0
      };
    }
    throw error;
  }
}

export async function getMenuData(): Promise<{ categories: string[]; products: MenuProduct[] }> {
  // Publica apenas categorias ativas e produtos disponiveis para nao expor itens
  // em preparacao ou indisponiveis no admin.
  if (!isSupabaseConfigured()) {
    return { categories, products };
  }

  try {
    const supabase = hasServiceRoleConfigured() ? getSupabaseAdminClient() : getSupabaseServerClient();

    const [{ data: categoryRows, error: categoryError }, { data: productRows, error: productError }] = await Promise.all([
      supabase!.from("categorias").select("id, nome, ordem").eq("ativa", true).is("deleted_at", null).order("ordem"),
      supabase!
        .from("produtos")
        .select("id, nome, descricao, preco, foto_url, destaque, ordem, categorias(nome)")
        .eq("disponivel", true)
        .is("deleted_at", null)
        .order("ordem")
    ]);

    if (categoryError) {
      throw new Error(categoryError.message);
    }

    if (productError) {
      throw new Error(productError.message);
    }

    const mappedProducts: MenuProduct[] =
      productRows?.map((product) => ({
        id: product.id,
        category: (product.categorias as { nome?: string } | null)?.nome ?? "Sem categoria",
        name: product.nome,
        description: product.descricao ?? "",
        price: Number(product.preco),
        image: product.foto_url || products[0].image,
        order: product.ordem ?? 0,
        badge: product.destaque ? "Destaque" : undefined
      })) ?? [];

    const resolvedCategories =
      categoryRows?.map((item) => item.nome) ??
      Array.from(new Set(mappedProducts.map((product) => product.category).filter(Boolean)));

    return {
      categories: resolvedCategories,
      products: mappedProducts
    };
  } catch (error) {
    if (
      isSupabaseSchemaMissingError(error, "categorias") ||
      isSupabaseSchemaMissingError(error, "produtos") ||
      isSupabasePermissionError(error, "categorias") ||
      isSupabasePermissionError(error, "produtos")
    ) {
      return { categories: [], products: [] };
    }
    throw error;
  }
}

export async function getMenuManagementData(): Promise<{
  categories: CategoryItem[];
  products: MenuProduct[];
}> {
  if (!isSupabaseConfigured()) {
    return {
      categories: categories.map((name, index) => ({
        id: `mock-category-${index + 1}`,
        name,
        order: index + 1,
        active: true,
        productCount: products.filter((product) => product.category === name).length
      })),
      products
    };
  }

  const supabase = getSupabaseAdminClient();
  const [{ data: categoryRows }, { data: productRows }] = await Promise.all([
    supabase!.from("categorias").select("id, nome, ordem, ativa").order("ordem"),
    supabase!
      .from("produtos")
      .select("id, categoria_id, nome, descricao, preco, foto_url, destaque, disponivel, ordem, categorias(nome)")
      .order("ordem")
  ]);

  return {
    categories:
      categoryRows?.map((item) => ({
        id: item.id,
        name: item.nome,
        order: item.ordem ?? 0,
        active: item.ativa ?? true,
        productCount: productRows?.filter((product) => product.categoria_id === item.id).length ?? 0
      })) ?? [],
    products:
      productRows?.map((product) => ({
        id: product.id,
        categoryId: typeof product.categoria_id === "string" ? product.categoria_id : undefined,
        category: (product.categorias as { nome?: string } | null)?.nome ?? "Sem categoria",
        name: product.nome,
        description: product.descricao ?? "",
        price: Number(product.preco),
        image: product.foto_url || products[0].image,
        order: product.ordem ?? 0,
        available: product.disponivel ?? true,
        highlight: product.destaque ?? false,
        badge: product.destaque ? "Destaque" : undefined
      })) ?? []
  };
}

export async function getProductById(id: string): Promise<MenuProduct | null> {
  const menu = await getMenuData();
  return menu.products.find((product) => product.id === id) ?? null;
}

export async function getCartPreview(): Promise<CartItem[]> {
  return sampleCart;
}

export async function getAdminOrders(): Promise<AdminOrder[]> {
  // O board do operador precisa ignorar mesas ja fechadas e pedidos financeiros
  // concluidos para manter a fila operacional limpa.
  if (!isSupabaseConfigured()) {
    seedDemoOrders();
    return getDemoAdminOrders();
  }

    try {
      const supabase = getSupabaseAdminClient();
      let orders:
        | Array<{
            id: string;
            numero: number;
            tipo: string;
            mesa: string | null;
            status: string;
            cliente_nome: string | null;
            total: number;
            created_at: string;
            financeiro_fechado_em?: string | null;
            pedido_itens?: Array<{ produto_nome: string; quantidade: number }>;
          }>
        | null = null;
      const closedOrderIds = await getClosedTableOrderIds();

      const { data: primaryOrders, error } = await supabase!
        .from("pedidos")
        .select("id, numero, tipo, mesa, status, cliente_nome, total, created_at, financeiro_fechado_em, pedido_itens(produto_nome, quantidade)")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        if (isMissingFinancialColumnsError(new Error(error.message))) {
          const { data: fallbackOrders, error: fallbackError } = await supabase!
            .from("pedidos")
            .select("id, numero, tipo, mesa, status, cliente_nome, total, created_at, pedido_itens(produto_nome, quantidade)")
            .order("created_at", { ascending: false })
            .limit(50);

          if (fallbackError) {
            throw new Error(fallbackError.message);
          }
          orders = fallbackOrders;
        } else {
          throw new Error(error.message);
        }
      } else {
        orders = primaryOrders;
      }

      const visibleOrders =
        orders?.filter(
          (order) =>
            !(order.tipo === "mesa" && closedOrderIds.has(order.id)) &&
            !(order.tipo !== "mesa" && order.financeiro_fechado_em)
        ) ?? [];

    if (!visibleOrders.length) {
      return [];
    }

    return visibleOrders.map((order) => ({
      id: order.id,
      number: Number(order.numero),
      type:
        order.tipo === "mesa"
          ? formatTableLabel(order.mesa)
          : order.tipo === "delivery"
            ? "Delivery"
            : "Retirada",
      customer: order.cliente_nome || (order.tipo === "mesa" ? "Salao principal" : "Cliente"),
      status: order.status as AdminOrder["status"],
      total: Number(order.total),
      items:
        order.pedido_itens?.slice(0, 2).map((item) => `${item.quantidade}x ${item.produto_nome}`) ??
        ["Itens vinculados ao pedido"],
      minutesAgo: Math.max(
        1,
        Math.floor((Date.now() - new Date(order.created_at).getTime()) / (1000 * 60))
      )
    }));
  } catch (error) {
    if (
      isSupabaseSchemaMissingError(error, "pedidos") ||
      isSupabasePermissionError(error, "pedidos") ||
      isSupabasePermissionError(error, "pedido_itens")
    ) {
      return [];
    }
    throw error;
  }
}

export async function getOrderDetail(
  id: string,
  options?: { publicToken?: string | null; requirePublicToken?: boolean }
): Promise<OrderDetail> {
  // Este detalhe alimenta tanto o painel do operador quanto o status publico do cliente.
  if (!isSupabaseConfigured()) {
    seedDemoOrders();
    if (options?.requirePublicToken) {
      const expectedToken = `demo-token-${id}`;
      if (options.publicToken !== expectedToken) {
        throw new Error("Pedido nao encontrado");
      }
    }
    return demoOrderDetails.get(id) ?? fallbackOrderDetail(id);
  }

  if (!isUuid(id)) {
    throw new Error("Pedido nao encontrado");
  }

  if (options?.requirePublicToken) {
    if (!options.publicToken || !publicOrderTokenRegex.test(options.publicToken) || !hasValidPublicOrderToken(id, options.publicToken)) {
      throw new Error("Pedido nao encontrado");
    }
  }

    try {
      const supabase = getSupabaseAdminClient();
      let order:
        | {
            id: string;
            numero: number;
            tipo: "mesa" | "delivery" | "retirada";
            mesa: string | null;
            status: string;
            cliente_nome: string | null;
            cliente_telefone: string | null;
            endereco_entrega: OrderDetail["address"];
            forma_pagamento: string | null;
            financeiro_forma_pagamento?: string | null;
            financeiro_fechado_em?: string | null;
            troco_para: number | null;
            observacao_geral: string | null;
            total: number;
            created_at: string;
            updated_at: string;
            pedido_itens?: Array<{
              id: string;
              produto_nome: string;
              quantidade: number;
              produto_preco: number;
              observacao: string | null;
            }>;
          }
        | null = null;

      const { data: primaryOrder, error } = await supabase!
        .from("pedidos")
        .select(
          "id, numero, tipo, mesa, status, cliente_nome, cliente_telefone, endereco_entrega, forma_pagamento, financeiro_forma_pagamento, financeiro_fechado_em, troco_para, observacao_geral, total, created_at, updated_at, pedido_itens(id, produto_nome, quantidade, produto_preco, observacao)"
        )
        .eq("id", id)
        .maybeSingle();

      if (error) {
        if (isMissingFinancialColumnsError(new Error(error.message))) {
          const { data: fallbackOrder, error: fallbackError } = await supabase!
            .from("pedidos")
            .select(
              "id, numero, tipo, mesa, status, cliente_nome, cliente_telefone, endereco_entrega, forma_pagamento, troco_para, observacao_geral, total, created_at, updated_at, pedido_itens(id, produto_nome, quantidade, produto_preco, observacao)"
            )
            .eq("id", id)
            .maybeSingle();

          if (fallbackError) {
            throw new Error(fallbackError.message);
          }
          order = fallbackOrder;
        } else {
          throw new Error(error.message);
        }
      } else {
        order = primaryOrder;
      }

      if (!order) {
      throw new Error("Pedido nao encontrado");
    }

    const tableAccountInfo =
      order.tipo === "mesa" ? await getTableAccountInfo(order.id) : {
        tableAccountClosed: false,
        tableClosedAt: null,
        tableClosedPayment: null,
        tableClosedTotal: null
      };

    return {
      id: order.id,
      number: Number(order.numero),
      kind: order.tipo as OrderDetail["kind"],
      table: order.mesa ?? null,
      ...tableAccountInfo,
      financialClosed: Boolean(order.financeiro_fechado_em),
      financialClosedAt: order.financeiro_fechado_em ?? null,
      financialClosedPayment: order.financeiro_forma_pagamento ?? null,
      type:
        order.tipo === "mesa"
          ? formatTableLabel(order.mesa)
          : order.tipo === "delivery"
            ? "Delivery"
            : "Retirada",
      status: order.status as OrderDetail["status"],
      customer: order.cliente_nome || "Cliente",
      phone: order.cliente_telefone,
      address: order.endereco_entrega,
      payment: order.forma_pagamento,
      changeFor: order.troco_para ? Number(order.troco_para) : null,
      notes: order.observacao_geral,
      total: Number(order.total),
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      items:
        order.pedido_itens?.map((item) => ({
          id: item.id,
          name: item.produto_nome,
          qty: item.quantidade,
          price: Number(item.produto_preco),
          note: item.observacao
        })) ?? []
    };
  } catch (error) {
    throw error;
  }
}

export async function createOrderFromCheckout(payload: CheckoutPayload) {
  // Delivery exige dados minimos de contato para viabilizar entrega real.
  const requestedItems = payload.itens ?? [];

  if (payload.tipo === "delivery") {
    if (!payload.clienteNome?.trim() || !payload.clienteTelefone?.trim()) {
      throw new Error("Nome e telefone sao obrigatorios para delivery.");
    }
  }

  // Recalcula os itens com dados do servidor antes de gravar total e subtotais.
  const items = await resolveCheckoutItems(requestedItems);
  const itemsTotal = roundCurrencyValue(items.reduce((sum, item) => sum + item.quantidade * item.preco, 0));
  const deliveryFee = payload.tipo === "delivery" ? await getConfiguredDeliveryFee() : 0;
  const total = roundCurrencyValue(itemsTotal + deliveryFee);
  const sanitizedCustomerName = sanitizeOptionalText(payload.clienteNome, 80);
  const sanitizedCustomerPhone = sanitizePhone(payload.clienteTelefone);
  const sanitizedAddress = sanitizeAddress(payload.enderecoEntrega);
  const sanitizedNotes = sanitizeOptionalText(payload.observacaoGeral, 500);
  const sanitizedTable = payload.mesa ? sanitizeOptionalText(payload.mesa, 20) : null;

  if (payload.tipo === "mesa" && !sanitizedTable) {
    throw new Error("Mesa invalida para este pedido.");
  }

  if (!isSupabaseConfigured()) {
    // O modo demo continua util para apresentacao, mas replica o mesmo contrato
    // do pedido real para evitar divergencia de comportamento.
    seedDemoOrders();
    demoOrderSequence += 1;
    const id = `ped-${demoOrderSequence}`;
    const detail: OrderDetail = {
      id,
      number: demoOrderSequence,
      kind: payload.tipo,
      table: sanitizedTable,
      type: payload.tipo === "mesa" ? formatTableLabel(sanitizedTable) : payload.tipo === "delivery" ? "Delivery" : "Retirada",
      status: "novo",
      customer:
        sanitizedCustomerName ||
        (payload.tipo === "mesa" ? formatTableLabel(sanitizedTable) : "Cliente"),
      phone: sanitizedCustomerPhone,
      address: sanitizedAddress,
      payment: payload.formaPagamento ?? null,
      changeFor: payload.trocoPara ?? null,
      notes: sanitizedNotes,
      total,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: items.map((item, index) => ({
        id: `${id}-item-${index + 1}`,
        name: item.nome,
        qty: item.quantidade,
        price: item.preco,
        note: item.observacao ?? null
      }))
    };
    demoOrderDetails.set(id, detail);
    return { id, publicToken: `demo-token-${id}` };
  }

  try {
    const supabase = getSupabaseAdminClient();

    // Tenta resolver mesa_numero a partir do texto da mesa para manter FK tipada.
    // So popula quando o valor for um inteiro valido.
    const parsedMesaNumero =
      payload.tipo === "mesa" && sanitizedTable && /^\d+$/.test(sanitizedTable)
        ? Number(sanitizedTable)
        : null;

    const orderInsert = {
      tipo: payload.tipo,
      mesa: sanitizedTable,
      mesa_numero: parsedMesaNumero,
      cliente_nome: sanitizedCustomerName,
      cliente_telefone: sanitizedCustomerPhone,
      endereco_entrega: sanitizedAddress,
      forma_pagamento: payload.formaPagamento ?? null,
      troco_para: payload.trocoPara ?? null,
      observacao_geral: sanitizedNotes,
      total
    };

    const { data: order, error: orderError } = await supabase!
      .from("pedidos")
      .insert(orderInsert)
      .select("id")
      .single();

    if (orderError || !order) {
      throw new Error(orderError?.message ?? "Nao foi possivel criar o pedido");
    }

    const itemsInsert = items.map((item) => ({
      pedido_id: order.id,
      produto_id: item.produtoId,
      produto_nome: item.nome,
      produto_preco: item.preco,
      quantidade: item.quantidade,
      observacao: sanitizeOptionalText(item.observacao, 300),
      subtotal: item.quantidade * item.preco
    }));

    const { error: itemsError } = await supabase!.from("pedido_itens").insert(itemsInsert);

    if (itemsError) {
      throw new Error(itemsError.message);
    }

    return { id: order.id, publicToken: signPublicOrderToken(order.id) };
  } catch (error) {
    throw error;
  }
}

export async function updateOrderStatus(id: string, status?: AdminOrder["status"]) {
  if (!isSupabaseConfigured()) {
    seedDemoOrders();
    const source = demoOrderDetails.get(id) ?? fallbackOrderDetail(id);
    const updated = {
      ...source,
      status: status ?? nextStatusMap[source.status],
      updatedAt: new Date().toISOString()
    } satisfies OrderDetail;
    demoOrderDetails.set(id, updated);
    return updated;
  }

  if (!isUuid(id)) {
    throw new Error("Pedido nao encontrado");
  }

  try {
    const current = await getOrderDetail(id);
    const nextStatus = status ?? nextStatusMap[current.status];
    const supabase = getSupabaseAdminClient();

    const { error } = await supabase!
      .from("pedidos")
      .update({
        status: nextStatus,
        updated_at: new Date().toISOString()
      })
      .eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    return getOrderDetail(id);
  } catch (error) {
    throw error;
  }
}

export async function closeTableAccount(
  orderId: string,
  paymentMethod: "dinheiro" | "pix" | "cartao" | "credito" | "debito",
  closedBy?: string | null
): Promise<CloseTableAccountResult> {
  if (!isSupabaseConfigured()) {
    throw new Error("Fechamento de mesa requer Supabase configurado.");
  }

  if (!isUuid(orderId)) {
    throw new Error("Pedido nao encontrado");
  }

  try {
    const supabase = getSupabaseAdminClient();
    const order = await getOrderDetail(orderId);

    if (order.kind !== "mesa" || !order.table) {
      throw new Error("Somente pedidos de mesa podem ser fechados por conta.");
    }

    if (order.tableAccountClosed) {
      throw new Error("Essa mesa ja foi fechada.");
    }

    const closedOrderIds = await getClosedTableOrderIds();
    const { data: tableOrders, error } = await supabase!
      .from("pedidos")
      .select("id, status, total, mesa, tipo")
      .eq("tipo", "mesa")
      .eq("mesa", order.table)
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    const openTableOrders = (tableOrders ?? []).filter((item) => !closedOrderIds.has(item.id));
    const ordersInProgress = openTableOrders.filter((item) => !["concluido", "cancelado"].includes(item.status));

    if (ordersInProgress.length) {
      throw new Error("Ainda existem pedidos dessa mesa em andamento. Conclua todos antes de fechar a conta.");
    }

    const closableOrders = openTableOrders.filter((item) => item.status === "concluido");
    if (!closableOrders.length) {
      throw new Error("Nao ha pedidos concluidos pendentes para fechar nessa mesa.");
    }

    const total = closableOrders.reduce((sum, item) => sum + Number(item.total), 0);
    const closedAt = new Date().toISOString();
    const normalizedClosedBy = normalizeClosedBy(closedBy);

    const primaryInsert = await supabase!
      .from("mesa_contas")
      .insert({
        mesa: order.table,
        status: "fechada",
        pedido_ids: closableOrders.map((item) => item.id),
        total,
        forma_pagamento: paymentMethod,
        fechada_em: closedAt,
        fechada_por: normalizedClosedBy
      });

    const insertError =
      primaryInsert.error?.message?.includes("fechada_por")
        ? (
            await supabase!
              .from("mesa_contas")
              .insert({
                mesa: order.table,
                status: "fechada",
                pedido_ids: closableOrders.map((item) => item.id),
                total,
                forma_pagamento: paymentMethod,
                fechada_em: closedAt
              })
          ).error
        : primaryInsert.error;

    if (insertError) {
      throw new Error(insertError.message);
    }

    return {
      table: order.table,
      paymentMethod,
      total,
      orderIds: closableOrders.map((item) => item.id),
      closedAt,
      closedBy: normalizedClosedBy
    };
  } catch (error) {
    if (isSupabaseSchemaMissingError(error, "mesa_contas") || isSupabasePermissionError(error, "mesa_contas")) {
      throw new Error("Aplique o schema atualizado antes de usar o fechamento de mesa.");
    }
    throw error;
  }
}

export async function closeDirectOrder(
  orderId: string,
  paymentMethod: "dinheiro" | "pix" | "cartao" | "credito" | "debito",
  closedBy?: string | null
): Promise<CloseDirectOrderResult> {
  if (!isSupabaseConfigured()) {
    throw new Error("Fechamento do pedido requer Supabase configurado.");
  }

  if (!isUuid(orderId)) {
    throw new Error("Pedido nao encontrado");
  }

  const order = await getOrderDetail(orderId);
  if (order.kind === "mesa") {
    throw new Error("Pedidos de mesa devem ser fechados pela conta da mesa.");
  }
  if (order.status !== "concluido") {
    throw new Error("Somente pedidos concluidos podem ser fechados.");
  }
  if (order.financialClosed) {
    throw new Error("Esse pedido ja foi fechado no caixa.");
  }

  const closedAt = new Date().toISOString();
  const normalizedClosedBy = normalizeClosedBy(closedBy);
  const supabase = getSupabaseAdminClient();
  const primaryUpdate = await supabase!
    .from("pedidos")
    .update({
      financeiro_forma_pagamento: paymentMethod,
      financeiro_fechado_em: closedAt,
      financeiro_fechado_por: normalizedClosedBy,
      forma_pagamento: paymentMethod,
      updated_at: closedAt
    })
    .eq("id", orderId);

  const error =
    primaryUpdate.error?.message?.includes("financeiro_fechado_por")
      ? (
          await supabase!
            .from("pedidos")
            .update({
              financeiro_forma_pagamento: paymentMethod,
              financeiro_fechado_em: closedAt,
              forma_pagamento: paymentMethod,
              updated_at: closedAt
            })
            .eq("id", orderId)
        ).error
      : primaryUpdate.error;

  if (error) {
    if (isMissingFinancialColumnsError(new Error(error.message))) {
      throw new Error("Aplique o schema atualizado antes de usar o fechamento de pedidos de delivery e retirada.");
    }
    throw new Error(error.message);
  }

  return {
    orderId,
    paymentMethod,
    total: order.total,
    closedAt,
    closedBy: normalizedClosedBy
  };
}

export async function getCashClosingSummary(referenceDate = getReferenceDateKey()): Promise<CashClosingSummary> {
  if (!isSupabaseConfigured()) {
    return {
      referenceDate,
      total: 0,
      ordersCount: 0,
      tablesCount: 0,
      payments: [],
      origins: [],
      recentClosures: [],
      movements: [],
      movementTotals: {
        sangria: 0,
        suprimento: 0
      },
      expectedCashBalance: 0,
      alreadyClosed: false,
      lastClosedAt: null,
      lastUpdatedAt: new Date().toISOString()
    };
  }

  try {
    const supabase = getSupabaseAdminClient();
    const dayRange = getDayRange(referenceDate);
    const [cashCloseResult, tableAccountsResult, directOrdersResult, cashMovementsResult] = await Promise.all([
      supabase!
        .from("caixa_fechamentos")
        .select("id, fechado_em")
        .eq("referencia_data", referenceDate)
        .order("fechado_em", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase!
        .from("mesa_contas")
        .select("id, mesa, total, forma_pagamento, fechada_em")
        .gte("fechada_em", dayRange.start)
        .lt("fechada_em", dayRange.end),
      supabase!
        .from("pedidos")
        .select("id, numero, total, forma_pagamento, financeiro_forma_pagamento, tipo, financeiro_fechado_em")
        .in("tipo", ["delivery", "retirada"])
        .not("financeiro_fechado_em", "is", null)
        .gte("financeiro_fechado_em", dayRange.start)
        .lt("financeiro_fechado_em", dayRange.end),
      supabase!
        .from("caixa_movimentacoes")
        .select("id, tipo, valor, observacao, created_at")
        .eq("referencia_data", referenceDate)
        .order("created_at", { ascending: false })
    ]);

    if (cashCloseResult.error) throw new Error(cashCloseResult.error.message);
    if (tableAccountsResult.error) throw new Error(tableAccountsResult.error.message);
    if (directOrdersResult.error) throw new Error(directOrdersResult.error.message);
    if (cashMovementsResult.error) throw new Error(cashMovementsResult.error.message);

    const paymentTotals = new Map<string, { total: number; count: number }>();
    const originTotals = new Map<"mesa" | "delivery" | "retirada", { total: number; count: number }>();
    const addPayment = (method: string | null | undefined, total: number) => {
      const key = method?.trim() || "nao_informado";
      const current = paymentTotals.get(key) ?? { total: 0, count: 0 };
      current.total += total;
      current.count += 1;
      paymentTotals.set(key, current);
    };
    const addOrigin = (origin: "mesa" | "delivery" | "retirada", total: number) => {
      const current = originTotals.get(origin) ?? { total: 0, count: 0 };
      current.total += total;
      current.count += 1;
      originTotals.set(origin, current);
    };

    const lastClosedAt = cashCloseResult.data?.fechado_em ?? null;
    const isAfterLastClose = (value: string | null | undefined) =>
      !lastClosedAt || (typeof value === "string" && new Date(value).getTime() > new Date(lastClosedAt).getTime());

    const closedTables = (tableAccountsResult.data ?? []).filter((account) => isAfterLastClose(account.fechada_em));
    const directOrders = (directOrdersResult.data ?? []).filter((order) => isAfterLastClose(order.financeiro_fechado_em));
    const movements: CashMovementRecord[] =
      cashMovementsResult.data?.map((movement) => ({
        id: movement.id,
        type: movement.tipo as CashMovementRecord["type"],
        amount: Number(movement.valor),
        note: movement.observacao ?? null,
        createdAt: movement.created_at
      })).filter((movement) => isAfterLastClose(movement.createdAt)) ?? [];
    const recentClosures: CashClosingSummary["recentClosures"] = [];

    for (const account of closedTables) {
      addPayment(account.forma_pagamento, Number(account.total));
      addOrigin("mesa", Number(account.total));
      recentClosures.push({
        id: account.id,
        label: `Mesa ${account.mesa}`,
        type: "mesa",
        paymentMethod: account.forma_pagamento?.trim() || "nao_informado",
        total: Number(account.total),
        closedAt: account.fechada_em
      });
    }

    for (const order of directOrders) {
      const finalPaymentMethod = order.financeiro_forma_pagamento ?? order.forma_pagamento;
      addPayment(finalPaymentMethod, Number(order.total));
      addOrigin(order.tipo as "delivery" | "retirada", Number(order.total));
      recentClosures.push({
        id: order.id,
        label: `#${String(order.numero).padStart(3, "0")} - ${order.tipo === "delivery" ? "Delivery" : "Retirada"}`,
        type: order.tipo as "delivery" | "retirada",
        paymentMethod: finalPaymentMethod?.trim() || "nao_informado",
        total: Number(order.total),
        closedAt: order.financeiro_fechado_em as string
      });
    }

    const total =
      closedTables.reduce((sum, item) => sum + Number(item.total), 0) +
      directOrders.reduce((sum, item) => sum + Number(item.total), 0);
    const cashSales = paymentTotals.get("dinheiro")?.total ?? 0;
    const movementTotals = {
      sangria: movements.filter((movement) => movement.type === "sangria").reduce((sum, movement) => sum + movement.amount, 0),
      suprimento: movements.filter((movement) => movement.type === "suprimento").reduce((sum, movement) => sum + movement.amount, 0)
    };
    const hasPendingEntries = closedTables.length > 0 || directOrders.length > 0 || movements.length > 0;

    return {
      referenceDate,
      total,
      ordersCount: closedTables.length + directOrders.length,
      tablesCount: closedTables.length,
      payments: Array.from(paymentTotals.entries())
        .map(([method, value]) => ({
        method,
          total: value.total,
          count: value.count
        }))
        .sort((left, right) => right.total - left.total),
      origins: ([
        ["mesa", "Mesas"],
        ["delivery", "Delivery"],
        ["retirada", "Retirada"]
      ] as const).map(([key, label]) => ({
        key,
        label,
        total: originTotals.get(key)?.total ?? 0,
        count: originTotals.get(key)?.count ?? 0
      })),
      recentClosures: recentClosures
        .sort((left, right) => new Date(right.closedAt).getTime() - new Date(left.closedAt).getTime())
        .slice(0, 6),
      movements,
      movementTotals,
      expectedCashBalance: cashSales + movementTotals.suprimento - movementTotals.sangria,
      alreadyClosed: Boolean(lastClosedAt) && !hasPendingEntries,
      lastClosedAt,
      lastUpdatedAt: new Date().toISOString()
    };
  } catch (error) {
    if (
      isSupabaseSchemaMissingError(error, "caixa_fechamentos") ||
      isSupabaseSchemaMissingError(error, "caixa_movimentacoes") ||
      isSupabaseSchemaMissingError(error, "mesa_contas") ||
      isSupabasePermissionError(error, "caixa_fechamentos") ||
      isSupabasePermissionError(error, "caixa_movimentacoes") ||
      isSupabasePermissionError(error, "mesa_contas")
    ) {
      return {
        referenceDate,
        total: 0,
        ordersCount: 0,
        tablesCount: 0,
        payments: [],
        origins: [],
        recentClosures: [],
        movements: [],
        movementTotals: {
          sangria: 0,
          suprimento: 0
        },
        expectedCashBalance: 0,
        alreadyClosed: false,
        lastClosedAt: null,
        lastUpdatedAt: new Date().toISOString()
      };
    }
    throw error;
  }
}

export async function closeCashRegister(
  referenceDate = getReferenceDateKey(),
  options?: { note?: string | null; closedBy?: string | null }
): Promise<CashClosingResult> {
  if (!isSupabaseConfigured()) {
    throw new Error("Fechamento de caixa requer Supabase configurado.");
  }

  try {
    const supabase = getSupabaseAdminClient();
    const summary = await getCashClosingSummary(referenceDate);

    if (summary.alreadyClosed) {
      throw new Error("O caixa deste dia ja foi fechado.");
    }

    if (summary.ordersCount === 0 && summary.movements.length === 0) {
      throw new Error("Nao ha novos lancamentos para fechar neste caixa.");
    }

    const baseInsert = {
      referencia_data: referenceDate,
      total: summary.total,
      pedidos_count: summary.ordersCount,
      mesas_count: summary.tablesCount,
      totais_por_pagamento: summary.payments,
      fechado_por: normalizeClosedBy(options?.closedBy),
      fechado_em: new Date().toISOString()
    };

    let data:
      | {
          id: string;
          fechado_em: string;
        }
      | null = null;
    let error: { message?: string } | null = null;

    const primaryResult = await supabase!
      .from("caixa_fechamentos")
      .insert({
        ...baseInsert,
        observacao: options?.note?.trim() ? options.note.trim() : null
      })
      .select("id, fechado_em")
      .single();

    if (
      primaryResult.error?.message?.includes("observacao") ||
      primaryResult.error?.message?.includes("fechado_por")
    ) {
      const fallbackResult = await supabase!
        .from("caixa_fechamentos")
        .insert({
          referencia_data: referenceDate,
          total: summary.total,
          pedidos_count: summary.ordersCount,
          mesas_count: summary.tablesCount,
          totais_por_pagamento: summary.payments,
          fechado_em: new Date().toISOString()
        })
        .select("id, fechado_em")
        .single();
      data = fallbackResult.data;
      error = fallbackResult.error;
    } else {
      data = primaryResult.data;
      error = primaryResult.error;
    }

    if (error || !data) {
      throw new Error(error?.message ?? "Nao foi possivel fechar o caixa.");
    }

    return {
      ...summary,
      id: data.id,
      alreadyClosed: true,
      lastClosedAt: data.fechado_em
    };
  } catch (error) {
    if (
      error instanceof Error &&
      (
        error.message.includes("idx_caixa_fechamentos_referencia_unique") ||
        error.message.includes("caixa_fechamentos_referencia_data_key") ||
        error.message.includes("unique constraint") && error.message.includes("caixa_fechamentos")
      )
    ) {
      throw new Error("O caixa deste dia ja foi fechado anteriormente. Para corrigir, entre em contato com o suporte.");
    }
    if (isSupabaseSchemaMissingError(error, "caixa_fechamentos") || isSupabasePermissionError(error, "caixa_fechamentos")) {
      throw new Error("Aplique o schema atualizado antes de usar o fechamento de caixa.");
    }
    throw error;
  }
}

export async function createCashMovement(payload: CashMovementPayload, referenceDate = getReferenceDateKey()) {
  if (!isSupabaseConfigured()) {
    throw new Error("Movimentacao de caixa requer Supabase configurado.");
  }

  const summary = await getCashClosingSummary(referenceDate);
  if (summary.alreadyClosed) {
    throw new Error("O caixa deste dia ja foi fechado. Nao e possivel registrar movimentacoes.");
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase!
      .from("caixa_movimentacoes")
      .insert({
        referencia_data: referenceDate,
        tipo: payload.type,
        valor: payload.amount,
        observacao: payload.note?.trim() ? payload.note.trim() : null
      })
      .select("id, tipo, valor, observacao, created_at")
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Nao foi possivel registrar movimentacao de caixa.");
    }

    return {
      id: data.id,
      type: data.tipo as CashMovementRecord["type"],
      amount: Number(data.valor),
      note: data.observacao ?? null,
      createdAt: data.created_at
    } satisfies CashMovementRecord;
  } catch (error) {
    if (
      isSupabaseSchemaMissingError(error, "caixa_movimentacoes") ||
      isSupabasePermissionError(error, "caixa_movimentacoes")
    ) {
      throw new Error("Aplique o schema atualizado antes de usar sangria e suprimento.");
    }
    throw error;
  }
}

export async function getDashboardOverviewData(): Promise<DashboardOverviewData> {
  const now = new Date();
  const todayStart = startOfDay(now);
  const tomorrowStart = addDays(todayStart, 1);
  const currentPeriodStart = addDays(todayStart, -29);
  const previousPeriodStart = addDays(todayStart, -59);
  const chartPeriodStart = addDays(todayStart, -11);

  const emptyDailyRevenue = Array.from({ length: 12 }, (_, index) => {
    const date = addDays(chartPeriodStart, index);
    return {
      label: String(date.getDate()).padStart(2, "0"),
      total: 0
    };
  });

  if (!isSupabaseConfigured()) {
    return {
      generatedAt: now.toISOString(),
      storeName: restaurant.name,
      currentRevenue: 0,
      previousRevenue: 0,
      currentOrdersCount: 0,
      previousOrdersCount: 0,
      currentAverageTicket: 0,
      previousAverageTicket: 0,
      todayRevenue: 0,
      todayClosedTables: 0,
      pendingOrdersCount: 0,
      dailyRevenue: emptyDailyRevenue,
      topItems: [],
      channels: [
        { key: "mesa", label: "Mesa", count: 0, revenue: 0, share: 0 },
        { key: "delivery", label: "Delivery", count: 0, revenue: 0, share: 0 },
        { key: "retirada", label: "Retirada", count: 0, revenue: 0, share: 0 }
      ]
    };
  }

  try {
    const supabase = getPreferredServerClient();
    const [
      restaurantResult,
      ordersResult,
      itemsResult,
      tableAccountsResult,
      directFinancialOrdersResult,
      pendingOrdersResult
    ] = await Promise.all([
      supabase!.from("restaurante_config").select("nome").limit(1).maybeSingle(),
      supabase!
        .from("pedidos")
        .select("id, tipo, status, total, created_at")
        .gte("created_at", toIso(previousPeriodStart))
        .lt("created_at", toIso(tomorrowStart))
        .order("created_at", { ascending: true }),
      supabase!
        .from("pedido_itens")
        .select("produto_nome, quantidade, subtotal, created_at")
        .gte("created_at", toIso(currentPeriodStart))
        .lt("created_at", toIso(tomorrowStart)),
      supabase!
        .from("mesa_contas")
        .select("total, fechada_em")
        .gte("fechada_em", toIso(previousPeriodStart))
        .lt("fechada_em", toIso(tomorrowStart)),
      supabase!
        .from("pedidos")
        .select("id, total, tipo, financeiro_fechado_em")
        .in("tipo", ["delivery", "retirada"])
        .not("financeiro_fechado_em", "is", null)
        .gte("financeiro_fechado_em", toIso(previousPeriodStart))
        .lt("financeiro_fechado_em", toIso(tomorrowStart)),
      supabase!
        .from("pedidos")
        .select("id", { count: "exact", head: true })
        .in("status", ["novo", "aceito", "preparo", "pronto"])
    ]);

    if (restaurantResult.error) throw new Error(restaurantResult.error.message);
    if (ordersResult.error) throw new Error(ordersResult.error.message);
    if (itemsResult.error) throw new Error(itemsResult.error.message);
    if (tableAccountsResult.error) throw new Error(tableAccountsResult.error.message);
    if (directFinancialOrdersResult.error) throw new Error(directFinancialOrdersResult.error.message);
    if (pendingOrdersResult.error) throw new Error(pendingOrdersResult.error.message);

    const storeName = restaurantResult.data?.nome ?? restaurant.name;
    const orders = ordersResult.data ?? [];
    const itemRows = itemsResult.data ?? [];
    const tableAccounts = tableAccountsResult.data ?? [];
    const directFinancialOrders = directFinancialOrdersResult.data ?? [];
    const pendingOrdersCount = pendingOrdersResult.count ?? 0;

    const currentOrders = orders.filter((order) => new Date(order.created_at) >= currentPeriodStart);
    const previousOrders = orders.filter((order) => {
      const createdAt = new Date(order.created_at);
      return createdAt >= previousPeriodStart && createdAt < currentPeriodStart;
    });

    const channelsBase = [
      { key: "mesa", label: "Mesa" },
      { key: "delivery", label: "Delivery" },
      { key: "retirada", label: "Retirada" }
    ] as const;
    const totalCurrentOrderCount = currentOrders.length;
    const channels = channelsBase.map((channel) => {
      const channelOrders = currentOrders.filter((order) => order.tipo === channel.key);
      const revenue = channelOrders.reduce((sum, order) => sum + Number(order.total), 0);
      return {
        key: channel.key,
        label: channel.label,
        count: channelOrders.length,
        revenue,
        share: totalCurrentOrderCount ? channelOrders.length / totalCurrentOrderCount : 0
      };
    });

    const topItemsMap = new Map<string, { quantity: number; revenue: number }>();
    for (const item of itemRows) {
      const current = topItemsMap.get(item.produto_nome) ?? { quantity: 0, revenue: 0 };
      current.quantity += Number(item.quantidade);
      current.revenue += Number(item.subtotal);
      topItemsMap.set(item.produto_nome, current);
    }

    const topItems = Array.from(topItemsMap.entries())
      .map(([name, totals]) => ({
        name,
        quantity: totals.quantity,
        revenue: totals.revenue
      }))
      .sort((left, right) => right.revenue - left.revenue)
      .slice(0, 5);

    const financialEvents = [
      ...tableAccounts.map((account) => ({
        amount: Number(account.total),
        occurredAt: account.fechada_em
      })),
      ...directFinancialOrders.map((order) => ({
        amount: Number(order.total),
        occurredAt: order.financeiro_fechado_em as string
      }))
    ];

    const currentRevenue = financialEvents
      .filter((event) => {
        const occurredAt = new Date(event.occurredAt);
        return occurredAt >= currentPeriodStart && occurredAt < tomorrowStart;
      })
      .reduce((sum, event) => sum + event.amount, 0);

    const previousRevenue = financialEvents
      .filter((event) => {
        const occurredAt = new Date(event.occurredAt);
        return occurredAt >= previousPeriodStart && occurredAt < currentPeriodStart;
      })
      .reduce((sum, event) => sum + event.amount, 0);

    const todayRevenue = financialEvents
      .filter((event) => {
        const occurredAt = new Date(event.occurredAt);
        return occurredAt >= todayStart && occurredAt < tomorrowStart;
      })
      .reduce((sum, event) => sum + event.amount, 0);

    const todayClosedTables = tableAccounts.filter((account) => {
      const occurredAt = new Date(account.fechada_em);
      return occurredAt >= todayStart && occurredAt < tomorrowStart;
    }).length;

    const dailyRevenueMap = new Map<string, number>();
    for (const point of emptyDailyRevenue) {
      dailyRevenueMap.set(point.label, 0);
    }
    for (const event of financialEvents) {
      const occurredAt = new Date(event.occurredAt);
      if (occurredAt >= chartPeriodStart && occurredAt < tomorrowStart) {
        const key = String(occurredAt.getDate()).padStart(2, "0");
        dailyRevenueMap.set(key, (dailyRevenueMap.get(key) ?? 0) + event.amount);
      }
    }

    const dailyRevenue = emptyDailyRevenue.map((point) => ({
      ...point,
      total: dailyRevenueMap.get(point.label) ?? 0
    }));

    return {
      generatedAt: now.toISOString(),
      storeName,
      currentRevenue,
      previousRevenue,
      currentOrdersCount: currentOrders.length,
      previousOrdersCount: previousOrders.length,
      currentAverageTicket: currentOrders.length ? currentOrders.reduce((sum, order) => sum + Number(order.total), 0) / currentOrders.length : 0,
      previousAverageTicket: previousOrders.length ? previousOrders.reduce((sum, order) => sum + Number(order.total), 0) / previousOrders.length : 0,
      todayRevenue,
      todayClosedTables,
      pendingOrdersCount,
      dailyRevenue,
      topItems,
      channels
    };
  } catch (error) {
    if (
      isSupabasePermissionError(error, "pedidos") ||
      isSupabasePermissionError(error, "pedido_itens") ||
      isSupabasePermissionError(error, "mesa_contas") ||
      isSupabasePermissionError(error, "restaurante_config") ||
      isSupabaseSchemaMissingError(error, "pedidos") ||
      isSupabaseSchemaMissingError(error, "pedido_itens") ||
      isSupabaseSchemaMissingError(error, "mesa_contas")
    ) {
      return {
        generatedAt: now.toISOString(),
        storeName: restaurant.name,
        currentRevenue: 0,
        previousRevenue: 0,
        currentOrdersCount: 0,
        previousOrdersCount: 0,
        currentAverageTicket: 0,
        previousAverageTicket: 0,
        todayRevenue: 0,
        todayClosedTables: 0,
        pendingOrdersCount: 0,
        dailyRevenue: emptyDailyRevenue,
        topItems: [],
        channels: [
          { key: "mesa", label: "Mesa", count: 0, revenue: 0, share: 0 },
          { key: "delivery", label: "Delivery", count: 0, revenue: 0, share: 0 },
          { key: "retirada", label: "Retirada", count: 0, revenue: 0, share: 0 }
        ]
      };
    }

    throw error;
  }
}

export async function getFinancialHistory(): Promise<FinancialHistoryEntry[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    const supabase = getPreferredServerClient();
    const [cashClosingsResult, tableAccountsResult, directOrdersResult] = await Promise.all([
      supabase!
        .from("caixa_fechamentos")
        .select("id, referencia_data, total, pedidos_count, mesas_count, fechado_em, observacao")
        .order("fechado_em", { ascending: false })
        .limit(20),
      supabase!
        .from("mesa_contas")
        .select("id, mesa, total, forma_pagamento, pedido_ids, fechada_em")
        .order("fechada_em", { ascending: false })
        .limit(30),
      supabase!
        .from("pedidos")
        .select("id, numero, tipo, total, financeiro_forma_pagamento, financeiro_fechado_em")
        .in("tipo", ["delivery", "retirada"])
        .not("financeiro_fechado_em", "is", null)
        .order("financeiro_fechado_em", { ascending: false })
        .limit(30)
    ]);

    if (cashClosingsResult.error) throw new Error(cashClosingsResult.error.message);
    if (tableAccountsResult.error) throw new Error(tableAccountsResult.error.message);
    if (directOrdersResult.error) throw new Error(directOrdersResult.error.message);

    const cashEntries: FinancialHistoryEntry[] = (cashClosingsResult.data ?? []).map((entry) => ({
      id: `caixa-${entry.id}`,
      sourceId: entry.id,
      label: `Caixa ${entry.referencia_data}`,
      kind: "caixa",
      paymentMethod: "consolidado",
      total: Number(entry.total),
      status: "fechado",
      occurredAt: entry.fechado_em,
      details: `${entry.pedidos_count} lancamentos · ${entry.mesas_count} mesas`
    }));

    const tableEntries: FinancialHistoryEntry[] = (tableAccountsResult.data ?? []).map((entry) => ({
      id: `mesa-${entry.id}`,
      sourceId: entry.id,
      label: `Mesa ${entry.mesa}`,
      kind: "mesa",
      paymentMethod: entry.forma_pagamento?.trim() || "nao_informado",
      total: Number(entry.total),
      status: "fechada",
      occurredAt: entry.fechada_em,
      details: `${entry.pedido_ids?.length ?? 0} pedidos vinculados`
    }));

    const directEntries: FinancialHistoryEntry[] = (directOrdersResult.data ?? []).map((entry) => ({
      id: `pedido-${entry.id}`,
      sourceId: entry.id,
      label: `#${String(entry.numero).padStart(3, "0")} - ${entry.tipo === "delivery" ? "Delivery" : "Retirada"}`,
      kind: entry.tipo as "delivery" | "retirada",
      paymentMethod: entry.financeiro_forma_pagamento?.trim() || "nao_informado",
      total: Number(entry.total),
      status: "fechado",
      occurredAt: entry.financeiro_fechado_em as string,
      details: "Pedido fechado financeiramente"
    }));

    const normalizedCashEntries = cashEntries.map((entry, index) => ({
      ...entry,
      details: entry.details.replace("Â·", "-"),
      note:
        typeof cashClosingsResult.data?.[index]?.observacao === "string"
          ? cashClosingsResult.data[index]?.observacao
          : null
    }));

    const normalizedTableEntries = tableEntries.map((entry) => ({
      ...entry,
      details: entry.details.replace("Â·", "-"),
      note: null
    }));

    const normalizedDirectEntries = directEntries.map((entry) => ({
      ...entry,
      note: null
    }));

    return [...normalizedCashEntries, ...normalizedTableEntries, ...normalizedDirectEntries].sort(
      (left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime()
    );
  } catch (error) {
    if (
      isSupabaseSchemaMissingError(error, "caixa_fechamentos") ||
      isSupabaseSchemaMissingError(error, "mesa_contas") ||
      isSupabasePermissionError(error, "caixa_fechamentos") ||
      isSupabasePermissionError(error, "mesa_contas")
    ) {
      return [];
    }

    if (isMissingFinancialColumnsError(error)) {
      return [];
    }

    throw error;
  }
}

export async function getFinancialHistoryDetail(entryId: string): Promise<FinancialHistoryDetail | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const supabase = getPreferredServerClient();

    if (entryId.startsWith("caixa-")) {
      const cashId = entryId.replace("caixa-", "");
      const { data, error } = await supabase!
        .from("caixa_fechamentos")
        .select("id, referencia_data, total, pedidos_count, mesas_count, totais_por_pagamento, observacao, fechado_por, fechado_em")
        .eq("id", cashId)
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!data) return null;

      const referenceDate = new Date(`${data.referencia_data}T00:00:00`);
      const previousClosingResult = await supabase!
        .from("caixa_fechamentos")
        .select("fechado_em")
        .eq("referencia_data", data.referencia_data)
        .lt("fechado_em", data.fechado_em)
        .order("fechado_em", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (previousClosingResult.error) {
        throw new Error(previousClosingResult.error.message);
      }

      const previousClosedAt = previousClosingResult.data?.fechado_em ?? null;
      const rangeStart = previousClosedAt ?? toIso(referenceDate);
      const rangeEnd = data.fechado_em;

      const tableAccountsQuery = supabase!
        .from("mesa_contas")
        .select("id, mesa, total, forma_pagamento, pedido_ids, fechada_em")
        .lte("fechada_em", rangeEnd)
        .order("fechada_em", { ascending: false });
      const directFinancialOrdersQuery = supabase!
        .from("pedidos")
        .select("id, numero, tipo, cliente_nome, total, status, financeiro_forma_pagamento, financeiro_fechado_em")
        .in("tipo", ["delivery", "retirada"])
        .not("financeiro_fechado_em", "is", null)
        .lte("financeiro_fechado_em", rangeEnd)
        .order("financeiro_fechado_em", { ascending: false });

      const [tableAccountsResult, directFinancialOrdersResult] = await Promise.all([
        previousClosedAt
          ? tableAccountsQuery.gt("fechada_em", rangeStart)
          : tableAccountsQuery.gte("fechada_em", rangeStart),
        previousClosedAt
          ? directFinancialOrdersQuery.gt("financeiro_fechado_em", rangeStart)
          : directFinancialOrdersQuery.gte("financeiro_fechado_em", rangeStart)
      ]);

      if (tableAccountsResult.error) throw new Error(tableAccountsResult.error.message);
      if (directFinancialOrdersResult.error) throw new Error(directFinancialOrdersResult.error.message);

      const tableAccounts = tableAccountsResult.data ?? [];
      const directOrders = directFinancialOrdersResult.data ?? [];

      const allTableOrderIds = tableAccounts.flatMap((account) => account.pedido_ids ?? []);
      const relatedTableOrders = allTableOrderIds.length
        ? (
            await supabase!
              .from("pedidos")
              .select("id, numero, tipo, mesa, cliente_nome, total, status")
              .in("id", allTableOrderIds)
          ).data ?? []
        : [];

      const relatedOrders = [
        ...relatedTableOrders.map((order) => ({
          id: order.id,
          number: Number(order.numero),
          type: order.tipo === "mesa" ? formatTableLabel(order.mesa) : order.tipo === "delivery" ? "Delivery" : "Retirada",
          customer: order.cliente_nome || (order.tipo === "mesa" ? formatTableLabel(order.mesa) : "Cliente"),
          total: Number(order.total),
          status: order.status as OrderStatus
        })),
        ...directOrders.map((order) => ({
          id: order.id,
          number: Number(order.numero),
          type: order.tipo === "delivery" ? "Delivery" : "Retirada",
          customer: order.cliente_nome || "Cliente",
          total: Number(order.total),
          status: order.status as OrderStatus
        }))
      ].sort((left, right) => right.number - left.number);

      const closingItems = [
        ...tableAccounts.map((account) => ({
          label: `Mesa ${formatTableCode(account.mesa)}`,
          quantity: (account.pedido_ids ?? []).length,
          total: Number(account.total),
          note: `${account.forma_pagamento ?? "nao_informado"} - ${new Date(account.fechada_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
        })),
        ...directOrders.map((order) => ({
          label: `#${formatOrderCode(Number(order.numero))} - ${order.tipo === "delivery" ? "Delivery" : "Retirada"}`,
          quantity: 1,
          total: Number(order.total),
          note: `${order.financeiro_forma_pagamento ?? "nao_informado"} - ${new Date(order.financeiro_fechado_em as string).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
        }))
      ];

      return {
        id: entryId,
        label: `Caixa ${data.referencia_data}`,
        kind: "caixa",
        paymentMethod: "consolidado",
        total: Number(data.total),
        status: "fechado",
        occurredAt: data.fechado_em,
        details: `${data.pedidos_count} lancamentos - ${data.mesas_count} mesas`,
        note: typeof data.observacao === "string" ? data.observacao : null,
        closedBy: normalizeClosedBy(typeof data.fechado_por === "string" ? data.fechado_por : null),
        referenceDate: data.referencia_data,
        items: closingItems,
        relatedOrders
      };
    }

    if (entryId.startsWith("mesa-")) {
      const tableAccountId = entryId.replace("mesa-", "");
      const { data, error } = await supabase!
        .from("mesa_contas")
        .select("id, mesa, total, forma_pagamento, pedido_ids, fechada_por, fechada_em")
        .eq("id", tableAccountId)
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!data) return null;

      const relatedOrders = (data.pedido_ids?.length
        ? (
            await supabase!
              .from("pedidos")
              .select("id, numero, tipo, mesa, cliente_nome, total, status")
              .in("id", data.pedido_ids)
          ).data ?? []
        : []
      ).map((order) => ({
        id: order.id,
        number: Number(order.numero),
        type: order.tipo === "mesa" ? formatTableLabel(order.mesa) : order.tipo === "delivery" ? "Delivery" : "Retirada",
        customer: order.cliente_nome || (order.tipo === "mesa" ? formatTableLabel(order.mesa) : "Cliente"),
        total: Number(order.total),
        status: order.status as OrderStatus
      }));

      const itemLines = relatedOrders.map((order) => ({
        label: `Pedido #${formatOrderCode(order.number)} - ${order.customer}`,
        quantity: null,
        total: order.total,
        note: order.type
      }));

      return {
        id: entryId,
        label: `Mesa ${formatTableCode(data.mesa)}`,
        kind: "mesa",
        paymentMethod: data.forma_pagamento?.trim() || "nao_informado",
        total: Number(data.total),
        status: "fechada",
        occurredAt: data.fechada_em,
        details: `${data.pedido_ids?.length ?? 0} pedidos vinculados`,
        note: null,
        closedBy: normalizeClosedBy(typeof data.fechada_por === "string" ? data.fechada_por : null),
        referenceDate: null,
        items: itemLines,
        relatedOrders
      };
    }

    if (entryId.startsWith("pedido-")) {
      const orderId = entryId.replace("pedido-", "");
      const { data, error } = await supabase!
        .from("pedidos")
        .select(
          "id, numero, tipo, mesa, cliente_nome, total, status, financeiro_forma_pagamento, financeiro_fechado_em, financeiro_fechado_por, updated_at, pedido_itens(produto_nome, quantidade, subtotal, observacao)"
        )
        .eq("id", orderId)
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!data) return null;

      const relatedOrder = {
        id: data.id,
        number: Number(data.numero),
        type: data.tipo === "mesa" ? formatTableLabel(data.mesa) : data.tipo === "delivery" ? "Delivery" : "Retirada",
        customer: data.cliente_nome || "Cliente",
        total: Number(data.total),
        status: data.status as OrderStatus
      };

      return {
        id: entryId,
        label: `#${formatOrderCode(relatedOrder.number)} - ${relatedOrder.type}`,
        kind: data.tipo as "delivery" | "retirada",
        paymentMethod: data.financeiro_forma_pagamento?.trim() || "nao_informado",
        total: Number(data.total),
        status: "fechado",
        occurredAt: data.financeiro_fechado_em ?? data.updated_at,
        details: "Pedido fechado financeiramente",
        note: null,
        closedBy: normalizeClosedBy(typeof data.financeiro_fechado_por === "string" ? data.financeiro_fechado_por : null),
        referenceDate: null,
        items:
          data.pedido_itens?.map((item) => ({
            label: item.produto_nome,
            quantity: Number(item.quantidade),
            total: Number(item.subtotal),
            note: item.observacao
          })) ?? [],
        relatedOrders: [relatedOrder]
      };
    }

    return null;
  } catch (error) {
    if (
      isSupabaseSchemaMissingError(error, "caixa_fechamentos") ||
      isSupabaseSchemaMissingError(error, "mesa_contas") ||
      isSupabasePermissionError(error, "caixa_fechamentos") ||
      isSupabasePermissionError(error, "mesa_contas") ||
      isMissingFinancialColumnsError(error)
    ) {
      return null;
    }

    throw error;
  }
}

function getDemoAdminOrders(): AdminOrder[] {
  seedDemoOrders();
  return Array.from(demoOrderDetails.values())
    .sort((a, b) => (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0))
    .map((order) => ({
      id: order.id,
      number: order.number,
      type: order.type,
      customer: order.customer,
      status: order.status,
      total: order.total,
      items: order.items.slice(0, 2).map((item) => `${item.qty}x ${item.name}`),
      minutesAgo: Math.max(
        1,
        Math.floor((Date.now() - new Date(order.createdAt ?? new Date().toISOString()).getTime()) / (1000 * 60))
      )
    }));
}

export async function createCategory(payload: CreateCategoryPayload) {
  if (!payload.name.trim()) {
    throw new Error("Nome da categoria e obrigatorio");
  }

  if (!isSupabaseConfigured()) {
    return {
      id: `mock-category-${Date.now()}`,
      name: payload.name.trim(),
      order: categories.length + 1,
      active: true
    } satisfies CategoryItem;
  }

  const supabase = getSupabaseAdminClient();
  const { data: latest } = await supabase!
    .from("categorias")
    .select("ordem")
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase!
    .from("categorias")
    .insert({
      nome: payload.name.trim(),
      ordem: (latest?.ordem ?? 0) + 1
    })
    .select("id, nome, ordem, ativa")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Nao foi possivel criar categoria");
  }

  return {
    id: data.id,
    name: data.nome,
    order: data.ordem ?? 0,
    active: data.ativa ?? true
  } satisfies CategoryItem;
}

export async function createProduct(payload: CreateProductPayload) {
  if (!payload.name.trim()) {
    throw new Error("Nome do produto e obrigatorio");
  }

  if (!(payload.price > 0)) {
    throw new Error("Preco invalido");
  }

  if (!isSupabaseConfigured()) {
    return {
      id: `mock-product-${Date.now()}`,
      categoryId: payload.categoryId,
      category: payload.categoryName ?? "Sem categoria",
      name: payload.name.trim(),
      description: payload.description ?? "",
      price: payload.price,
      image: payload.image || products[0].image,
      available: payload.available ?? true,
      highlight: payload.highlight ?? false,
      badge: payload.highlight ? "Destaque" : undefined
    } satisfies MenuProduct;
  }

  const supabase = getSupabaseAdminClient();
  let latestOrderQuery = supabase!
    .from("produtos")
    .select("ordem")
    .is("deleted_at", null)
    .order("ordem", { ascending: false })
    .limit(1);

  latestOrderQuery = payload.categoryId
    ? latestOrderQuery.eq("categoria_id", payload.categoryId)
    : latestOrderQuery.is("categoria_id", null);

  const { data: latest } = await latestOrderQuery.maybeSingle();

  const { data, error } = await supabase!
    .from("produtos")
    .insert({
      categoria_id: payload.categoryId ?? null,
      nome: payload.name.trim(),
      descricao: payload.description ?? null,
      preco: payload.price,
      foto_url: payload.image ?? null,
      ordem: (latest?.ordem ?? 0) + 1,
      destaque: payload.highlight ?? false,
      disponivel: payload.available ?? true
    })
    .select("id, categoria_id, nome, descricao, preco, foto_url, destaque, disponivel, ordem, categorias(nome)")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Nao foi possivel criar produto");
  }

  return {
    id: data.id,
    categoryId: data.categoria_id ?? undefined,
    category: (data.categorias as { nome?: string } | null)?.nome ?? payload.categoryName ?? "Sem categoria",
    name: data.nome,
    description: data.descricao ?? "",
    price: Number(data.preco),
    image: data.foto_url || products[0].image,
    order: data.ordem ?? 0,
    available: data.disponivel ?? true,
    highlight: data.destaque ?? false,
    badge: data.destaque ? "Destaque" : undefined
  } satisfies MenuProduct;
}

export async function updateCategory(id: string, payload: UpdateCategoryPayload) {
  if (!payload.name.trim()) {
    throw new Error("Nome da categoria e obrigatorio");
  }

  if (!isSupabaseConfigured()) {
    return {
      id,
      name: payload.name.trim(),
      order: 0,
      active: payload.active ?? true
    } satisfies CategoryItem;
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase!
    .from("categorias")
    .update({
      nome: payload.name.trim(),
      ativa: payload.active ?? true
    })
    .eq("id", id)
    .select("id, nome, ordem, ativa")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Nao foi possivel atualizar categoria");
  }

  return {
    id: data.id,
    name: data.nome,
    order: data.ordem ?? 0,
    active: data.ativa ?? true
  } satisfies CategoryItem;
}

export async function deleteCategory(id: string) {
  if (!isSupabaseConfigured()) {
    const mockCategoryIndex = Number(id.replace("mock-category-", "")) - 1;
    const mockName = categories[mockCategoryIndex];
    if (products.some((product) => product.category === mockName)) {
      throw new Error("Nao e possivel excluir categoria com produtos vinculados.");
    }
    return { success: true };
  }

  const supabase = getSupabaseAdminClient();
  const { data: category } = await supabase!.from("categorias").select("nome").eq("id", id).maybeSingle();
  const categoryName = category?.nome;

  // Conta apenas produtos ativos (nao deletados logicamente) para validar vinculo
  const { count, error: countError } = await supabase!
    .from("produtos")
    .select("id", { count: "exact", head: true })
    .eq("categoria_id", id)
    .is("deleted_at", null);

  if (countError) {
    throw new Error(countError.message);
  }

  if ((count ?? 0) > 0) {
    throw new Error("Nao e possivel excluir categoria com produtos vinculados.");
  }

  // Soft delete: marca deleted_at em vez de excluir permanentemente
  const { error } = await supabase!
    .from("categorias")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    throw new Error(error.message || `Nao foi possivel excluir categoria ${categoryName ?? ""}`.trim());
  }

  return { success: true };
}

export async function updateProduct(id: string, payload: UpdateProductPayload) {
  if (!payload.name?.trim()) {
    throw new Error("Nome do produto e obrigatorio");
  }

  if (!(Number(payload.price) > 0)) {
    throw new Error("Preco invalido");
  }

  if (!isSupabaseConfigured()) {
    return {
      id,
      categoryId: payload.categoryId,
      category: payload.categoryName ?? "Sem categoria",
      name: payload.name.trim(),
      description: payload.description ?? "",
      price: Number(payload.price),
      image: payload.image || products[0].image,
      available: payload.available ?? true,
      highlight: payload.highlight ?? false,
      badge: payload.highlight ? "Destaque" : undefined
    } satisfies MenuProduct;
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase!
    .from("produtos")
    .update({
      categoria_id: payload.categoryId ?? null,
      nome: payload.name.trim(),
      descricao: payload.description ?? null,
      preco: payload.price,
      foto_url: payload.image ?? null,
      destaque: payload.highlight ?? false,
      disponivel: payload.available ?? true
    })
    .eq("id", id)
    .select("id, categoria_id, nome, descricao, preco, foto_url, destaque, disponivel, ordem, categorias(nome)")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Nao foi possivel atualizar produto");
  }

  return {
    id: data.id,
    categoryId: data.categoria_id ?? undefined,
    category: (data.categorias as { nome?: string } | null)?.nome ?? payload.categoryName ?? "Sem categoria",
    name: data.nome,
    description: data.descricao ?? "",
    price: Number(data.preco),
    image: data.foto_url || products[0].image,
    order: data.ordem ?? 0,
    available: data.disponivel ?? true,
    highlight: data.destaque ?? false,
    badge: data.destaque ? "Destaque" : undefined
  } satisfies MenuProduct;
}

export async function deleteProduct(id: string) {
  if (!isSupabaseConfigured()) {
    return { success: true };
  }

  // Soft delete: marca deleted_at em vez de excluir permanentemente.
  // O snapshot de produto_nome/produto_preco em pedido_itens permanece intacto.
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase!
    .from("produtos")
    .update({ deleted_at: new Date().toISOString(), disponivel: false })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  return { success: true };
}

export async function reorderCategories(ids: string[]) {
  if (!ids.length) return { success: true };

  if (!isSupabaseConfigured()) {
    return { success: true };
  }

  const supabase = getSupabaseAdminClient();
  const updates = ids.map((id, index) =>
    supabase!
      .from("categorias")
      .update({ ordem: index + 1 })
      .eq("id", id)
      .is("deleted_at", null)
  );

  const results = await Promise.all(updates);
  const failed = results.find((result) => result.error);
  if (failed?.error) {
    throw new Error(failed.error.message);
  }

  return { success: true };
}

export async function reorderProducts(categoryId: string, ids: string[]) {
  if (!categoryId || !ids.length) return { success: true };

  if (!isSupabaseConfigured()) {
    return { success: true };
  }

  const supabase = getSupabaseAdminClient();
  const updates = ids.map((id, index) =>
    supabase!
      .from("produtos")
      .update({ ordem: index + 1 })
      .eq("id", id)
      .eq("categoria_id", categoryId)
      .is("deleted_at", null)
  );

  const results = await Promise.all(updates);
  const failed = results.find((result) => result.error);
  if (failed?.error) {
    throw new Error(failed.error.message);
  }

  return { success: true };
}

export async function moveProductToCategory(productId: string, categoryId: string) {
  if (!productId || !categoryId) {
    throw new Error("Produto ou categoria invalida");
  }

  if (!isSupabaseConfigured()) {
    return { success: true };
  }

  const supabase = getSupabaseAdminClient();
  const { data: latest } = await supabase!
    .from("produtos")
    .select("ordem")
    .eq("categoria_id", categoryId)
    .is("deleted_at", null)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase!
    .from("produtos")
    .update({
      categoria_id: categoryId,
      ordem: (latest?.ordem ?? 0) + 1,
    })
    .eq("id", productId)
    .is("deleted_at", null)
    .select("id, categoria_id, nome, descricao, preco, foto_url, destaque, disponivel, ordem, categorias(nome)")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Nao foi possivel mover produto");
  }

  return {
    id: data.id,
    categoryId: data.categoria_id ?? undefined,
    category: (data.categorias as { nome?: string } | null)?.nome ?? "Sem categoria",
    name: data.nome,
    description: data.descricao ?? "",
    price: Number(data.preco),
    image: data.foto_url || products[0].image,
    order: data.ordem ?? 0,
    available: data.disponivel ?? true,
    highlight: data.destaque ?? false,
    badge: data.destaque ? "Destaque" : undefined
  } satisfies MenuProduct;
}
