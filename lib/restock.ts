import type { Ingredient, Order, Product, ProductIngredient } from "./types";

// Predictive restock: project when each tracked ingredient (or packaging
// consumable) runs out, from stock-on-hand minus consumption implied by paid
// orders. Consumption comes from recipes (base units per tart) and, for
// non-recipe consumables like boxes, from usage_per_tart.

export type RestockStatus = "low" | "soon" | "ok" | "untracked";

export type RestockLine = {
  ingredient: Ingredient;
  weeklyUse: number;      // base units per week (recent average)
  stockNow: number | null; // projected current stock (null = untracked)
  weeksLeft: number | null;
  status: RestockStatus;
};

const LOW_WEEKS = 1.25;
const SOON_WEEKS = 2.5;

// Base units consumed by one paid order, per ingredient.
function orderConsumption(
  order: Order,
  usePerTartByIngredient: Map<string, number>,
  recipePerUnitByProduct: Map<string, Map<string, number>>
): Map<string, number> {
  const out = new Map<string, number>();
  let tarts = 0;
  for (const item of order.order_items ?? []) {
    tarts += item.qty;
    if (!item.product_id) continue;
    const recipe = recipePerUnitByProduct.get(item.product_id);
    if (!recipe) continue;
    for (const [ingredientId, perUnit] of recipe) {
      out.set(ingredientId, (out.get(ingredientId) ?? 0) + perUnit * item.qty);
    }
  }
  for (const [ingredientId, perTart] of usePerTartByIngredient) {
    out.set(ingredientId, (out.get(ingredientId) ?? 0) + perTart * tarts);
  }
  return out;
}

export function restockReport(
  allOrders: Order[],
  products: Product[],
  recipeLines: ProductIngredient[],
  ingredients: Ingredient[],
  now = new Date()
): RestockLine[] {
  // recipe base-units per single tart, per product
  const productsById = new Map(products.map((p) => [p.id, p]));
  const recipePerUnit = new Map<string, Map<string, number>>();
  for (const line of recipeLines) {
    const product = productsById.get(line.product_id);
    if (!product || product.batch_yield <= 0) continue;
    if (!recipePerUnit.has(line.product_id)) recipePerUnit.set(line.product_id, new Map());
    recipePerUnit
      .get(line.product_id)!
      .set(line.ingredient_id, Number(line.qty_base) / product.batch_yield);
  }
  const usePerTart = new Map<string, number>();
  for (const ing of ingredients) {
    if (ing.usage_per_tart != null && Number(ing.usage_per_tart) > 0) {
      usePerTart.set(ing.id, Number(ing.usage_per_tart));
    }
  }

  const paid = allOrders.filter(
    (o) => o.payment_status === "paid" && o.status !== "cancelled"
  );

  // Weekly rate: average over the most recent distinct weeks (up to 4).
  const byWeek = new Map<string, Map<string, number>>();
  for (const order of paid) {
    const week = order.week_label ?? "unknown";
    const consumption = orderConsumption(order, usePerTart, recipePerUnit);
    if (!byWeek.has(week)) byWeek.set(week, new Map());
    const tally = byWeek.get(week)!;
    for (const [id, qty] of consumption) tally.set(id, (tally.get(id) ?? 0) + qty);
  }
  const weekCount = Math.max(1, Math.min(byWeek.size, 4));
  const weeklyUse = new Map<string, number>();
  for (const tally of byWeek.values()) {
    for (const [id, qty] of tally) weeklyUse.set(id, (weeklyUse.get(id) ?? 0) + qty);
  }
  for (const [id, total] of weeklyUse) weeklyUse.set(id, total / weekCount);

  // Projected stock: stock_qty minus consumption from paid orders placed
  // after the stock was last set.
  const lines: RestockLine[] = [];
  for (const ing of ingredients) {
    const rate = weeklyUse.get(ing.id) ?? 0;
    if (ing.stock_qty == null) {
      lines.push({
        ingredient: ing,
        weeklyUse: rate,
        stockNow: null,
        weeksLeft: null,
        status: "untracked",
      });
      continue;
    }
    let consumedSince = 0;
    const since = ing.stock_updated_at ? new Date(ing.stock_updated_at) : null;
    for (const order of paid) {
      if (since && new Date(order.placed_at) <= since) continue;
      const consumption = orderConsumption(order, usePerTart, recipePerUnit);
      consumedSince += consumption.get(ing.id) ?? 0;
    }
    const stockNow = Math.max(0, Number(ing.stock_qty) - consumedSince);
    const weeksLeft = rate > 0 ? stockNow / rate : null;
    const status: RestockStatus =
      rate === 0 ? "ok" : weeksLeft! < LOW_WEEKS ? "low" : weeksLeft! < SOON_WEEKS ? "soon" : "ok";
    lines.push({ ingredient: ing, weeklyUse: rate, stockNow, weeksLeft, status, });
  }

  const rank: Record<RestockStatus, number> = { low: 0, soon: 1, ok: 2, untracked: 3 };
  lines.sort((a, b) =>
    rank[a.status] === rank[b.status]
      ? (a.weeksLeft ?? 99) - (b.weeksLeft ?? 99)
      : rank[a.status] - rank[b.status]
  );
  return lines;
}
