import type { Ingredient, Order, Product, ProductIngredient, RecipeGroup } from "./types";

// ---------- Unit cost ----------

export function ingredientCostPerBase(ing: Ingredient): number {
  return ing.base_qty > 0 ? ing.purchase_cost / ing.base_qty : 0;
}

// Cost of one tart/unit of a product. Prefers the structured recipe
// (per-batch quantities / batch_yield); falls back to est_filling_cost.
export function unitCost(
  product: Product,
  recipeLines: ProductIngredient[],
  ingredientsById: Map<string, Ingredient>
): { filling: number; packaging: number; total: number; source: "recipe" | "estimate" | "none" } {
  const lines = recipeLines.filter((l) => l.product_id === product.id);
  const packaging = Number(product.packaging_cost) || 0;
  if (lines.length > 0 && product.batch_yield > 0) {
    const batchCost = lines.reduce((sum, l) => {
      const ing = ingredientsById.get(l.ingredient_id);
      return sum + (ing ? ingredientCostPerBase(ing) * Number(l.qty_base) : 0);
    }, 0);
    const filling = batchCost / product.batch_yield;
    return { filling, packaging, total: filling + packaging, source: "recipe" };
  }
  if (product.est_filling_cost != null) {
    const filling = Number(product.est_filling_cost);
    return { filling, packaging, total: filling + packaging, source: "estimate" };
  }
  return { filling: 0, packaging, total: packaging, source: "none" };
}

// ---------- Recipe (scaled to a bake-day quantity) ----------

export type RecipeIngredientAmount = {
  ingredient: Ingredient;
  amount: number; // in the ingredient's base_unit, scaled to `qty`
  note: string | null;
};

// How much of each ingredient to measure out for `qty` units of a product
// today — not a purchase list, just the recipe scaled up. Empty when the
// product has no structured recipe.
export function recipeForQty(
  product: Product,
  qty: number,
  recipeLines: ProductIngredient[],
  ingredientsById: Map<string, Ingredient>
): RecipeIngredientAmount[] {
  if (product.batch_yield <= 0) return [];
  const lines = recipeLines.filter((l) => l.product_id === product.id);
  if (lines.length === 0) return [];
  const scale = qty / product.batch_yield;
  return lines
    .map((l) => {
      const ingredient = ingredientsById.get(l.ingredient_id);
      if (!ingredient) return null;
      return { ingredient, amount: Number(l.qty_base) * scale, note: l.note };
    })
    .filter((x): x is RecipeIngredientAmount => x !== null);
}

// ---------- Order economics ----------

export type OrderEconomics = {
  revenue: number;      // order total
  received: number;     // after platform fees (falls back to total)
  fees: number;
  cost: number;         // sum of item unit costs × qty (known products only)
  profit: number;       // received − cost
  margin: number;       // profit / received (0 when received is 0)
  uncostedItems: number;
};

export function orderEconomics(
  order: Order,
  unitCostById: Map<string, number>
): OrderEconomics {
  const revenue = Number(order.total) || 0;
  const received = order.amount_received != null ? Number(order.amount_received) : revenue;
  let cost = 0;
  let uncosted = 0;
  for (const item of order.order_items ?? []) {
    if (item.product_id && unitCostById.has(item.product_id)) {
      cost += unitCostById.get(item.product_id)! * item.qty;
    } else {
      uncosted += 1;
    }
  }
  const profit = received - cost;
  return {
    revenue,
    received,
    fees: revenue - received,
    cost,
    profit,
    margin: received > 0 ? profit / received : 0,
    uncostedItems: uncosted,
  };
}

// ---------- Bake sheet ----------

export type BakeSheetLine = { product: Product; qty: number };
export type BakeSheetGroup = {
  group: RecipeGroup | null; // null = products with no shared base
  lines: BakeSheetLine[];
  totalUnits: number;
  batches: number | null;   // round-up batches for grouped products
  leftover: number | null;  // extra units a whole-batch bake produces
};

// Counts per product per pickup day, PAID orders only, grouped by recipe group.
export function bakeSheet(
  orders: Order[],
  productsById: Map<string, Product>,
  groups: RecipeGroup[]
): Map<string, BakeSheetGroup[]> {
  // pickup_day -> product_id -> qty
  const days = new Map<string, Map<string, number>>();
  for (const order of orders) {
    if (order.payment_status !== "paid") continue;
    if (order.status === "cancelled") continue;
    const day = order.pickup_day ?? "Unscheduled";
    if (!days.has(day)) days.set(day, new Map());
    const tally = days.get(day)!;
    for (const item of order.order_items ?? []) {
      if (!item.product_id) continue;
      tally.set(item.product_id, (tally.get(item.product_id) ?? 0) + item.qty);
    }
  }

  const groupsById = new Map(groups.map((g) => [g.id, g]));
  const result = new Map<string, BakeSheetGroup[]>();
  for (const [day, tally] of days) {
    const byGroup = new Map<string | null, BakeSheetLine[]>();
    for (const [productId, qty] of tally) {
      const product = productsById.get(productId);
      if (!product) continue;
      const key = product.recipe_group_id;
      if (!byGroup.has(key)) byGroup.set(key, []);
      byGroup.get(key)!.push({ product, qty });
    }
    const groupsOut: BakeSheetGroup[] = [];
    for (const [groupId, lines] of byGroup) {
      lines.sort((a, b) => b.qty - a.qty);
      const totalUnits = lines.reduce((s, l) => s + l.qty, 0);
      const group = groupId ? groupsById.get(groupId) ?? null : null;
      const batches = group ? Math.ceil(totalUnits / group.batch_size) : null;
      const leftover = group && batches ? batches * group.batch_size - totalUnits : null;
      groupsOut.push({ group, lines, totalUnits, batches, leftover });
    }
    // shared-base groups first, then singles
    groupsOut.sort((a, b) => (a.group ? 0 : 1) - (b.group ? 0 : 1));
    result.set(day, groupsOut);
  }
  return result;
}

// ---------- Shopping list ----------

export type ShoppingLine = {
  ingredient: Ingredient;
  totalBase: number;      // total base units needed
  purchases: number;      // round-up purchase units to buy
  estCost: number;
};

// Aggregated ingredient needs across PAID orders in a window, in purchase units.
// Products without structured recipes are returned in `missingRecipes`.
export function shoppingList(
  orders: Order[],
  productsById: Map<string, Product>,
  recipeLines: ProductIngredient[],
  ingredients: Ingredient[]
): { lines: ShoppingLine[]; missingRecipes: { product: Product; qty: number }[] } {
  const ingredientsById = new Map(ingredients.map((i) => [i.id, i]));
  const linesByProduct = new Map<string, ProductIngredient[]>();
  for (const l of recipeLines) {
    if (!linesByProduct.has(l.product_id)) linesByProduct.set(l.product_id, []);
    linesByProduct.get(l.product_id)!.push(l);
  }

  // product_id -> units ordered (paid only)
  const unitsByProduct = new Map<string, number>();
  for (const order of orders) {
    if (order.payment_status !== "paid" || order.status === "cancelled") continue;
    for (const item of order.order_items ?? []) {
      if (!item.product_id) continue;
      unitsByProduct.set(item.product_id, (unitsByProduct.get(item.product_id) ?? 0) + item.qty);
    }
  }

  const needBase = new Map<string, number>(); // ingredient_id -> base units
  const missing: { product: Product; qty: number }[] = [];
  for (const [productId, units] of unitsByProduct) {
    const product = productsById.get(productId);
    if (!product) continue;
    const recipe = linesByProduct.get(productId);
    if (!recipe || recipe.length === 0 || product.batch_yield <= 0) {
      if (!product.is_bundle) missing.push({ product, qty: units });
      continue;
    }
    const batches = units / product.batch_yield; // fractional: shopping, not baking
    for (const line of recipe) {
      needBase.set(
        line.ingredient_id,
        (needBase.get(line.ingredient_id) ?? 0) + Number(line.qty_base) * batches
      );
    }
  }

  const lines: ShoppingLine[] = [];
  for (const [ingredientId, totalBase] of needBase) {
    const ingredient = ingredientsById.get(ingredientId);
    if (!ingredient) continue;
    const purchases = ingredient.base_qty > 0 ? Math.ceil(totalBase / ingredient.base_qty) : 0;
    lines.push({
      ingredient,
      totalBase,
      purchases,
      estCost: purchases * Number(ingredient.purchase_cost),
    });
  }
  lines.sort((a, b) => b.estCost - a.estCost);
  missing.sort((a, b) => b.qty - a.qty);
  return { lines, missingRecipes: missing };
}
