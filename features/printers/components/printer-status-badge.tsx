import { Badge } from "@/components/ui/badge";
import type { PrinterRecord } from "@/lib/types";

export function PrinterStatusBadge({ printer }: { printer: PrinterRecord }) {
  return (
    <Badge variant={printer.isActive ? "success" : "secondary"}>
      {printer.isActive ? "Ativa" : "Inativa"}
    </Badge>
  );
}
