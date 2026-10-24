import { Card } from "@/components/card";
import { PageHeader } from "@/components/page-header";
import { RevenueChart } from "@/components/revenue-chart";
import { getDailyStats } from "@/lib/data";
import { formatPercent, formatPounds, revenueByDay, summariseByChannel } from "@/lib/stats";
import { CHANNELS } from "@/lib/types";

export default async function OverviewPage() {
  const stats = await getDailyStats();
  const summaries = summariseByChannel(stats);
  const total = summaries.reduce((t, s) => t + s.revenuePence, 0);
  const orders = summaries.reduce((t, s) => t + s.orders, 0);
  const label = (id: string) => CHANNELS.find((c) => c.id === id)!.label;

  return (
    <>
      <PageHeader title="Overview" description="Last 30 days across Amazon, Shopify and the website." />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Total revenue" value={formatPounds(total)} />
        <Kpi label="Orders" value={String(orders)} />
        <Kpi label="Average order" value={formatPounds(orders ? Math.round(total / orders) : 0)} />
        <Kpi
          label="Top channel"
          value={label([...summaries].sort((a, b) => b.revenuePence - a.revenuePence)[0].channel)}
        />
      </div>

      <Card title="Daily revenue" className="mb-6">
        <RevenueChart days={revenueByDay(stats)} />
      </Card>

      <Card title="By channel">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-muted">
                <th scope="col" className="py-2 pr-4 font-medium">Channel</th>
                <th scope="col" className="py-2 pr-4 text-right font-medium">Revenue</th>
                <th scope="col" className="py-2 pr-4 text-right font-medium">Orders</th>
                <th scope="col" className="py-2 pr-4 text-right font-medium">Units</th>
                <th scope="col" className="py-2 pr-4 text-right font-medium">Avg order</th>
                <th scope="col" className="py-2 pr-4 text-right font-medium">Sessions</th>
                <th scope="col" className="py-2 text-right font-medium">Conversion</th>
              </tr>
            </thead>
            <tbody>
              {summaries.map((s) => (
                <tr key={s.channel} className="border-b border-line last:border-0">
                  <th scope="row" className="py-2 pr-4 font-medium">{label(s.channel)}</th>
                  <td className="py-2 pr-4 text-right tabular-nums">{formatPounds(s.revenuePence)}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">{s.orders}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">{s.units}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">{formatPounds(s.averageOrderPence)}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">{s.sessions}</td>
                  <td className="py-2 text-right tabular-nums">{formatPercent(s.conversionRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </Card>
  );
}
