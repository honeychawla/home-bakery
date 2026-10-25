import Link from "next/link";
import PrintButton from "@/components/PrintButton";
import ShoppingChecklist from "@/components/ShoppingChecklist";
import { createClient } from "@/lib/supabase/server";
import { getCatalog, getOrders, getWeekLabels } from "@/lib/data";
import { shoppingList } from "@/lib/costing";

export const dynamic = "force-dynamic";

export default async function ShoppingPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;
  const weeks = await getWeekLabels();
  const activeWeek = week ?? weeks[0];
  const [orders, catalog] = await Promise.all([getOrders(activeWeek), getCatalog()]);

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
