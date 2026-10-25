import Link from "next/link";
import PrintButton from "@/components/PrintButton";
import ShoppingCheckoff from "@/components/ShoppingCheckoff";
import { getCatalog, getOrders, getShoppingCheckoff, getWeekLabels } from "@/lib/data";
import { shoppingList } from "@/lib/costing";
import { money } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ShoppingPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;
  const weeks = await getWeekLabels();
  const activeWeek = week ?? weeks[0];
  const [orders, catalog, checkoff] = await Promise.all([
    getOrders(activeWeek),
    getCatalog(),
    getShoppingCheckoff(activeWeek),
  ]);

  const productsById = new Map(catalog.products.map((p) => [p.id, p]));
  const { lines, missingRecipes } = shoppingList(
    orders,
    productsById,
    catalog.recipeLines,
    catalog.ingredients
  );
  const totalCost = lines.reduce((s, l) => s + l.estCost, 0);
  const boughtByIngredient = new Map(checkoff.map((c) => [c.ingredient_id, c.bought]));
  const boughtCount = lines.filter((l) => boughtByIngredient.get(l.ingredient.id)).length;

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
      <p className="text-xs text-stone-500 print:hidden">
        Aggregated across paid orders, rounded up to what you can actually buy. Check items off
        as you grab them at the store — {boughtCount}/{lines.length} bought.
      </p>

      <section className="overflow-hidden rounded-2xl border border-amber-100 bg-white print:border-stone-300">
        {lines.length === 0 && (
          <p className="p-6 text-sm text-stone-400">
            Nothing to buy — no paid orders with structured recipes this week.
          </p>
        )}
        {lines.map((l) => {
          const bought = boughtByIngredient.get(l.ingredient.id) ?? false;
          return (
            <div
              key={l.ingredient.id}
              className={`flex items-center gap-3 border-b border-amber-50 px-4 py-3 text-sm last:border-0 ${
                bought ? "bg-green-50/60" : ""
              }`}
            >
              <span className="print:hidden">
                <ShoppingCheckoff
                  weekLabel={activeWeek}
                  ingredientId={l.ingredient.id}
                  bought={bought}
                />
              </span>
              <div
                className={`flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2 ${
                  bought ? "text-stone-400 line-through" : ""
                }`}
              >
                <span className="font-medium">{l.ingredient.name}</span>
                <span className="text-xs text-stone-400">
                  need {Math.ceil(l.totalBase)} {l.ingredient.base_unit}
                </span>
                <span className="font-semibold">
                  buy {l.purchases} × {l.ingredient.purchase_unit}
                </span>
              </div>
              <span className="w-16 shrink-0 text-right text-stone-500">{money(l.estCost)}</span>
            </div>
          );
        })}
        {lines.length > 0 && (
          <div className="flex justify-between bg-amber-50/60 px-4 py-3 text-sm font-bold">
            <span>Estimated grocery cost</span>
            <span>{money(totalCost)}</span>
          </div>
        )}
      </section>

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
