"use client";

import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";

export function HistoryDetailActions() {
  function handlePrint() {
    const content = document.querySelector("[data-history-print-root]")?.innerHTML;
    if (!content) {
      window.print();
      return;
    }

    const printWindow = window.open("", "_blank", "width=420,height=760");
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Comprovante operacional</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 18px; color: #111; width: 320px; margin: 0 auto; }
            h1,h2,h3,p { margin: 0 0 8px; }
            .ticket { border-top: 2px dashed #999; border-bottom: 2px dashed #999; padding: 12px 0; }
            .row { display: flex; justify-content: space-between; gap: 12px; padding: 6px 0; border-bottom: 1px dashed #ccc; }
            .muted { color: #555; font-size: 12px; }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  }

  return (
    <Button type="button" variant="outline" className="border-[#313131] bg-transparent text-[#e5dfd5] hover:bg-[#212121]" onClick={handlePrint}>
      <Printer className="h-4 w-4" />
      Imprimir comprovante
    </Button>
  );
}
