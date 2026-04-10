import { DashboardOverview } from "@/features/history/components/dashboard-overview";
import { getDashboardOverviewData } from "@/lib/data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminHomePage() {
  const data = await getDashboardOverviewData();

  return <DashboardOverview data={data} />;
}
