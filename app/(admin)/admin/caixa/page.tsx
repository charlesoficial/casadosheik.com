import { CashClosePanel } from "@/features/cash/components/cash-close-panel";
import { getCashClosingSummary } from "@/lib/data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminCashPage() {
  const summary = await getCashClosingSummary();

  return <CashClosePanel initialSummary={summary} />;
}
