import { getFinancialHistory } from "@/lib/data";
import { HistoryView } from "@/features/history/components/history-view";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminHistoryPage() {
  const entries = await getFinancialHistory();

  return <HistoryView entries={entries} />;
}
