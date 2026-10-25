import Link from "next/link";
import PrintButton from "@/components/PrintButton";
import ShoppingChecklist from "@/components/ShoppingChecklist";
import { createClient } from "@/lib/supabase/server";
import { getCatalog, getOrders, getWeekLabels } from "@/lib/data";
import { shoppingList } from "@/lib/costing";
import { restockReport } from "@/lib/restock";

export const dynamic = "force-dynamic";

export default async function ShoppingPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;
  const weeks = await getWeekLabels();
  const activeWeek = week ?? weeks[0];
  const [orders, allOrders, catalog] = await Promise.all([
    getOrders(activeWeek),
    getOrders(), // all weeks — consumption history for restock projection
    getCatalog(),
  ]);

  const productsById = new Map(catalog.products.map((p) => [p.id, p]));
  const { lines, missingRecipes } = shoppingList(
    orders,
    productsById,
    catalog.recipeLines,
    catalog.ingredients
  );

  const supabase = await createClient();
  const { data: checks } = await supabase
    .from("shopping_checks")
    .select("ingredient_id")
    .eq("week_label", activeWeek);
  const initialChecked = (checks ?? []).map((c) => c.ingredient_id);

  const restock = restockReport(
    allOrders,
    catalog.products,
    catalog.recipeLines,
    catalog.ingredients
  );
  const attention = restock.filter((r) => r.status === "low" || r.status === "soon");
  const untrackedCount = restock.filter((r) => r.status === "untracked").length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <h1 className="text-xl font-bold">Shopping list — {activeWeek}</h1>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {weeks.slice(0, 4).map((w) => (
              <Link
                key={w}
                href={`/shopping?week=${encodeURIComponent(w)}`}
                className={`rounded-full border px-3 py-1 text-xs ${
                  w === activeWeek
                    ? "border-amber-400 bg-amber-100 font-semibold text-amber-900"
                    : "border-stone-200 bg-white text-stone-500"
                }`}
              >
                {w}
              </Link>
            ))}
          </div>
          <PrintButton />
        </div>
      </div>

      <h1 className="hidden text-xl font-bold print:block">Shopping list — {activeWeek}</h1>
      <p className="text-xs text-stone-500">
        Aggregated across paid orders, rounded up to what you can actually buy. Tap items to
        check them off as you shop — checks sync between your computer and phone.
      </p>

      {attention.length > 0 && (
        <section className="rounded-2xl border border-red-200 bg-red-50/70 p-4 print:hidden">
          <h2 className="text-sm font-bold text-red-900">📉 Restock radar</h2>
          <p className="mt-0.5 text-[11px] text-stone-500">
            Projected from your stock-on-hand and recent weekly usage — not tied to this
            week&apos;s orders. Checking items off below tops stock back up automatically.
          </p>
          <ul className="mt-2 space-y-1.5">
            {attention.map((r) => (
              <li key={r.ingredient.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="font-medium">
                  {r.ingredient.name}
                  <span
                    className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      r.status === "low" ? "bg-red-500 text-white" : "bg-orange-200 text-orange-900"
                    }`}
                  >
                    {r.status === "low" ? "running low" : "reorder soon"}
                  </span>
                </span>
                <span className="text-xs text-stone-500">
                  ~{Math.round(r.stockNow ?? 0)} {r.ingredient.base_unit} left ·{" "}
                  {r.weeksLeft != null ? `${r.weeksLeft.toFixed(1)} wk at current pace` : ""}
                </span>
              </li>
            ))}
          </ul>
          {untrackedCount > 0 && (
            <p className="mt-2 text-[11px] text-stone-400">
              {untrackedCount} ingredients untracked — set stock-on-hand on the{" "}
              <Link href="/ingredients" className="underline">
                Ingredients
              </Link>{" "}
              page to get predictions for them too.
            </p>
          )}
        </section>
      )}

      <ShoppingChecklist
        weekLabel={activeWeek}
        initialChecked={initialChecked}
        lines={lines.map((l) => ({
          ingredientId: l.ingredient.id,
          name: l.ingredient.name,
          purchaseUnit: l.ingredient.purchase_unit,
          purchases: l.purchases,
          totalBase: l.totalBase,
          baseUnit: l.ingredient.base_unit,
          estCost: l.estCost,
          baseQtyPerPurchase: Number(l.ingredient.base_qty),
          tracked: l.ingredient.stock_qty != null,
        }))}
      />

      {missingRecipes.length > 0 && (
        <section className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm">
          <h2 className="font-bold text-orange-900">Not included — no structured recipe yet</h2>
          <p className="mt-1 text-xs text-stone-500">
            These flavors are ordered this week but their recipes aren&apos;t in the ingredient
            library. Add them on the <Link href="/products" className="underline">Menu</Link> page
            (paste the recipe text and let Claude structure it).
          </p>
          <ul className="mt-2 space-y-1">
            {missingRecipes.map((m) => (
              <li key={m.product.id}>
                {m.product.name_en} — {m.qty} tart{m.qty === 1 ? "" : "s"}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
