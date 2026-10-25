import InsightsDashboard from "@/components/InsightsDashboard";
import { getCatalog, getInquiries, getOrders } from "@/lib/data";
import { unitCost } from "@/lib/costing";
import { toInsightOrders } from "@/lib/insights";
import { weekLabelFor } from "@/lib/orders";

export const dynamic = "force-dynamic";

// Owner insights: weekly sales / cost / profit trends across every pickup week,
// a summary of the latest week, and a browsable order list.
export default async function InsightsPage() {
  const [orders, catalog, inquiries] = await Promise.all([getOrders(), getCatalog(), getInquiries()]);

  const ingredientsById = new Map(catalog.ingredients.map((i) => [i.id, i]));
  const productsById = new Map(catalog.products.map((p) => [p.id, p]));
  const unitCostById = new Map(
    catalog.products.map((p) => [p.id, unitCost(p, catalog.recipeLines, ingredientsById).total])
  );

  // inquiries: null = migration not applied yet (dashboard falls back to sample data)
  const orderWeek = new Map(orders.map((o) => [o.id, o.week_label]));
  const linked = new Set((inquiries ?? []).map((i) => i.order_id).filter((id): id is string => !!id));
  const insightInquiries = inquiries?.map((i) => ({
    channel: i.channel,
    weekLabel: (i.order_id && orderWeek.get(i.order_id)) || weekLabelFor(new Date(i.created_at)),
  })) ?? null;

  return (
    <InsightsDashboard
      orders={toInsightOrders(orders, productsById, unitCostById, linked)}
      inquiries={insightInquiries}
    />
  );
}
