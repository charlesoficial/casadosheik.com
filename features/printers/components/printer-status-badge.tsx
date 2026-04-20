import { DSBadge } from "@/components/system";
import type { PrinterRecord } from "@/lib/types";

export function PrinterStatusBadge({ printer }: { printer: PrinterRecord }) {
  return (
    <DSBadge variant={printer.isActive ? "success" : "secondary"}>
      {printer.isActive ? "Ativa" : "Inativa"}
    </DSBadge>
  );
}
