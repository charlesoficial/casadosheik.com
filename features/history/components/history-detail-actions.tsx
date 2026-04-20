"use client";

import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { printReceiptFromDom } from "@/lib/receipt/print";

export function HistoryDetailActions() {
  return (
    <Button
      type="button"
      variant="outline"
      className="border-admin-border-strong bg-transparent text-admin-fg-secondary hover:bg-admin-overlay"
      onClick={() => { printReceiptFromDom().catch(console.error); }}
    >
      <Printer className="h-4 w-4" />
      Imprimir comprovante
    </Button>
  );
}
