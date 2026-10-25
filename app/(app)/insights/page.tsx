import InsightsDashboard from "@/components/InsightsDashboard";
import { getCatalog, getOrders } from "@/lib/data";
import { unitCost } from "@/lib/costing";
import { toInsightOrders } from "@/lib/insights";

export const dynamic = "force-dynamic";

// Owner insights: weekly sales / cost / profit trends across every pickup week,
// a summary of the latest week, and a browsable order list.
export default async function InsightsPage() {
  const [orders, catalog] = await Promise.all([getOrders(), getCatalog()]);

  const ingredientsById = new Map(catalog.ingredients.map((i) => [i.id, i]));
  const productsById = new Map(catalog.products.map((p) => [p.id, p]));
  const unitCostById = new Map(
    catalog.products.map((p) => [p.id, unitCost(p, catalog.recipeLines, ingredientsById).total])
  );

  return <InsightsDashboard orders={toInsightOrders(orders, productsById, unitCostById)} />;
}
