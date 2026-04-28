"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { ReceiptTemplateBase } from "@/components/receipt/receipt-base";
import { installReceiptPrintPageSizing, prepareReceiptPrintPage } from "@/lib/receipt/print";
import type { ReceiptData } from "@/lib/receipt/types";

export function ReceiptPrintHost({ receipt }: { receipt: ReceiptData | null }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const cleanup = installReceiptPrintPageSizing();
    return cleanup;
  }, []);

  useEffect(() => {
    if (!receipt) return;
    window.requestAnimationFrame(() => {
      prepareReceiptPrintPage();
    });
  }, [receipt]);

  if (!receipt) return null;

  const resolvedReceipt = { ...receipt, paperWidth: receipt.paperWidth === "58mm" ? "58mm" : "80mm" } as const;
  const content = <ReceiptTemplateBase receipt={resolvedReceipt} />;
  if (!mounted) return null;
  return createPortal(content, document.body);
}
