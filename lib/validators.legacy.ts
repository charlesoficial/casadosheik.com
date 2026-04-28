import { z } from "zod";

const orderStatusValues = ["novo", "aceito", "preparo", "pronto", "concluido", "cancelado"] as const;
const printerTypeValues = ["usb", "network"] as const;
const printerDestinationValues = ["caixa", "cozinha", "bar", "delivery", "geral"] as const;
const printTriggerSourceValues = ["test", "auto_accept", "manual_reprint"] as const;
const printTransportTypeValues = ["usb", "network", "manual"] as const;
const printJobStatusValues = ["pending", "success", "failed"] as const;
const alertSoundValues = [
  "Alerta 1",
  "Alerta 2",
  "Alerta 3",
  "Alerta 4",
  "Alerta 5",
  "Alerta 6",
  "Alerta 7",
  "Alerta 8"
] as const;
const alertFrequencyValues = ["none", "once_per_order", "repeat_while_pending"] as const;
const autoPrintModeValues = ["single_printer", "by_destination"] as const;
const autoPrintTriggerStatusValues = ["novo", "aceito"] as const;
const closeTablePaymentValues = ["dinheiro", "pix", "cartao", "credito", "debito"] as const;
const cashMovementTypeValues = ["sangria", "suprimento"] as const;

const optionalTrimmedString = z.string().trim().optional();
const nullableOptionalTrimmedString = z.string().trim().nullish();
const ipv4Regex = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
const hostnameRegex = /^(?=.{1,253}$)(?!-)[a-zA-Z0-9-]{1,63}(?<!-)(\.(?!-)[a-zA-Z0-9-]{1,63}(?<!-))*$/;

function normalizeOrderStatus(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  const normalized = value.trim().toLowerCase();
  const aliases: Record<string, (typeof orderStatusValues)[number]> = {
    pending: "novo",
    pendente: "novo",
    accepted: "aceito",
    preparing: "preparo",
    pronto_entrega: "pronto",
    ready: "pronto",
    completed: "concluido",
    entregue: "concluido",
    canceled: "cancelado"
  };

  return aliases[normalized] ?? normalized;
}

export const orderStatusSchema = z.preprocess(normalizeOrderStatus, z.enum(orderStatusValues));
export const printerTypeSchema = z.enum(printerTypeValues);
export const printerDestinationSchema = z.enum(printerDestinationValues);
export const printTriggerSourceSchema = z.enum(printTriggerSourceValues);
export const printTransportTypeSchema = z.enum(printTransportTypeValues);
export const printJobStatusSchema = z.enum(printJobStatusValues);
export const alertSoundSchema = z.enum(alertSoundValues);
export const alertFrequencySchema = z.enum(alertFrequencyValues);
export const autoPrintModeSchema = z.enum(autoPrintModeValues);
export const autoPrintTriggerStatusSchema = z.enum(autoPrintTriggerStatusValues);
export const closeTablePaymentSchema = z.enum(closeTablePaymentValues);
export const cashMovementTypeSchema = z.enum(cashMovementTypeValues);

// Valida o checkout publico antes da regra de negocio executar.
// A integridade financeira final ainda acontece no servidor, durante a criacao do pedido.
export const checkoutPayloadSchema = z
  .object({
    mesa: optionalTrimmedString,
    tipo: z.enum(["mesa", "delivery", "retirada"]),
    clienteNome: optionalTrimmedString,
    clienteTelefone: optionalTrimmedString,
    enderecoEntrega: z
      .object({
        rua: optionalTrimmedString,
        numero: optionalTrimmedString,
        bairro: optionalTrimmedString,
        referencia: optionalTrimmedString
      })
      .nullable()
      .optional(),
    formaPagamento: optionalTrimmedString,
    trocoPara: z.number().nonnegative().nullable().optional(),
    observacaoGeral: z.string().trim().max(500).optional(),
    itens: z
      .array(
        z.object({
          produtoId: z.string().trim().min(1),
          nome: z.string().trim().min(1).max(160),
          quantidade: z.number().int().positive(),
          preco: z.number().nonnegative(),
          observacao: z.string().trim().max(180).optional(),
          image: optionalTrimmedString
        })
      )
      .min(1, "Pedido sem itens")
  })
  .superRefine((payload, context) => {
    if (payload.tipo === "delivery") {
      if (!payload.clienteNome?.trim()) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["clienteNome"],
          message: "Nome e obrigatorio para delivery."
        });
      }
      if (!payload.clienteTelefone?.trim()) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["clienteTelefone"],
          message: "Telefone e obrigatorio para delivery."
        });
      }
      if (!payload.enderecoEntrega?.rua?.trim()) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["enderecoEntrega", "rua"],
          message: "Rua e obrigatoria para delivery."
        });
      }
      if (!payload.enderecoEntrega?.numero?.trim()) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["enderecoEntrega", "numero"],
          message: "Numero e obrigatorio para delivery."
        });
      }
      if (!payload.enderecoEntrega?.bairro?.trim()) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["enderecoEntrega", "bairro"],
          message: "Bairro e obrigatorio para delivery."
        });
      }
    }
  });

export const orderStatusUpdateSchema = z.object({
  status: orderStatusSchema
});

export const categoryCreateSchema = z.object({
  name: z.string().trim().min(1).max(120)
});

export const categoryUpdateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  active: z.boolean().optional()
});

export const productCreateSchema = z.object({
  categoryId: optionalTrimmedString,
  categoryName: optionalTrimmedString,
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(800).optional(),
  price: z.number().positive(),
  image: optionalTrimmedString,
  highlight: z.boolean().optional(),
  available: z.boolean().optional()
});

export const productUpdateSchema = z.object({
  categoryId: optionalTrimmedString,
  categoryName: optionalTrimmedString,
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(800).optional(),
  price: z.number().positive(),
  image: optionalTrimmedString,
  highlight: z.boolean().optional(),
  available: z.boolean().optional()
});

export const printerPayloadSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    type: printerTypeSchema,
    destination: printerDestinationSchema,
    printerName: optionalTrimmedString,
    ipAddress: optionalTrimmedString,
    port: z.number().int().min(1).max(65535).optional(),
    isActive: z.boolean().optional(),
    autoPrintOnAccept: z.boolean().optional(),
    copies: z.number().int().min(1).max(10).optional()
  })
  .superRefine((payload, context) => {
    if (payload.type === "usb" && !payload.printerName?.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["printerName"],
        message: "printerName e obrigatorio para impressoras USB."
      });
    }
    if (payload.type === "network" && !payload.ipAddress?.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ipAddress"],
        message: "ipAddress e obrigatorio para impressoras de rede."
      });
    }

    if (
      payload.type === "network" &&
      payload.ipAddress?.trim() &&
      !ipv4Regex.test(payload.ipAddress.trim()) &&
      !hostnameRegex.test(payload.ipAddress.trim())
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ipAddress"],
        message: "Informe um IP ou hostname valido para a impressora de rede."
      });
    }
  });

export const orderPrintRequestSchema = z.object({
  destination: z.union([printerDestinationSchema, z.literal("all")]).optional(),
  triggerSource: printTriggerSourceSchema.optional(),
  printerId: optionalTrimmedString
});

export const orderSettingsUpdateSchema = z.object({
  enableTableOrders: z.boolean(),
  enableDeliveryOrders: z.boolean(),
  enableManualOrders: z.boolean(),
  enableStepAccepted: z.boolean(),
  enableStepPreparing: z.boolean(),
  enableStepDelivery: z.boolean(),
  notificationsEnabled: z.boolean(),
  alertSound: alertSoundSchema,
  alertFrequency: alertFrequencySchema,
  alertVolume: z.number().int().min(0).max(100),
  autoPrintEnabled: z.boolean(),
  autoPrintMode: autoPrintModeSchema,
  defaultAutoPrintPrinterId: z.string().trim().optional().nullable(),
  autoPrintTriggerStatus: autoPrintTriggerStatusSchema
});

export const createPrintJobSchema = z.object({
  orderId: z.string().trim().optional().nullable(),
  printerId: z.string().trim().optional().nullable(),
  printerName: z.string().trim().max(160).optional().nullable(),
  destination: printerDestinationSchema,
  transportType: printTransportTypeSchema,
  triggerSource: printTriggerSourceSchema,
  payloadPreview: z.string().max(4000).optional().nullable(),
  attemptCount: z.number().int().min(1).max(20).optional(),
  status: printJobStatusSchema.optional()
});

export const updatePrintJobSchema = z.object({
  status: z.enum(["success", "failed"]),
  errorMessage: z.string().max(1000).optional().nullable(),
  printedAt: nullableOptionalTrimmedString
});

export const closeTableAccountSchema = z.object({
  paymentMethod: closeTablePaymentSchema
});

export const closeDirectOrderSchema = z.object({
  paymentMethod: closeTablePaymentSchema
});

export const cashCloseRequestSchema = z.object({
  note: z.string().trim().max(500).optional()
});

export const cashMovementRequestSchema = z.object({
  type: cashMovementTypeSchema,
  amount: z.number().positive(),
  note: z.string().trim().max(500).optional()
});

export function formatZodError(error: z.ZodError) {
  return error.issues.map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`).join(" | ");
}
