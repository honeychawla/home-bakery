import Link from "next/link";
import RecipeImporter from "@/components/RecipeImporter";
import { getCatalog } from "@/lib/data";
import { money } from "@/lib/format";
import { unitCost } from "@/lib/costing";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const catalog = await getCatalog();
  const ingredientsById = new Map(catalog.ingredients.map((i) => [i.id, i]));
  const groupsById = new Map(catalog.groups.map((g) => [g.id, g]));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Menu & recipes</h1>
        <Link href="/ingredients" className="text-sm text-amber-700 underline">
          Ingredient library →
        </Link>
      </div>
      <p className="text-xs text-stone-500">
        Cost per tart comes from the structured recipe when one exists, otherwise from the
        estimate column of your cost sheet. Paste a recipe into any flavor to upgrade it —
        Claude structures it into the ingredient library.
      </p>

      <div className="space-y-3">
        {catalog.products.map((p) => {
          const cost = unitCost(p, catalog.recipeLines, ingredientsById);
          const group = p.recipe_group_id ? groupsById.get(p.recipe_group_id) : null;
          const margin = Number(p.price) > 0 ? (Number(p.price) - cost.total) / Number(p.price) : 0;
          return (
            <details
              key={p.id}
              className="rounded-2xl border border-amber-100 bg-white p-4 open:border-amber-300"
            >
              <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2">
                <span className="font-semibold">
                  {p.name_en}
                  {p.name_zh && <span className="ml-1 text-sm font-normal text-stone-400">{p.name_zh}</span>}
                  {p.is_bundle && (
                    <span className="ml-2 rounded bg-stone-100 px-1.5 py-0.5 text-[10px] text-stone-500">
                      bundle
                    </span>
                  )}
                </span>
                <span className="flex items-center gap-3 text-sm">
                  <span className="text-stone-400">{group?.name ?? ""}</span>
                  <span>{money(Number(p.price))}</span>
                  {!p.is_bundle && (
                    <>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          cost.source === "recipe"
                            ? "bg-green-100 text-green-800"
                            : cost.source === "estimate"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        cost {money(cost.total)} ({cost.source})
                      </span>
                      <span className="text-xs text-stone-500">{Math.round(margin * 100)}% margin</span>
                    </>
                  )}
                </span>
              </summary>
              {!p.is_bundle && (
                <div className="mt-3 border-t border-amber-50 pt-3">
                  <RecipeLines
                    productId={p.id}
                    recipeLines={catalog.recipeLines}
                    ingredientsById={ingredientsById}
                    batchYield={p.batch_yield}
                  />
                  <RecipeImporter product={p} />
                </div>
              )}
            </details>
          );
        })}
      </div>
    </div>
  );
}

function RecipeLines({
  productId,
  recipeLines,
  ingredientsById,
  batchYield,
}: {
  productId: string;
  recipeLines: { product_id: string; ingredient_id: string; qty_base: number; note: string | null }[];
  ingredientsById: Map<string, { name: string; base_unit: string }>;
  batchYield: number;
}) {
  const lines = recipeLines.filter((l) => l.product_id === productId);
  if (lines.length === 0) {
    return (
      <p className="text-xs text-stone-400">
        No structured recipe yet — costing uses the estimate. Paste the recipe below.
      </p>
    );
  }
  return (
    <div className="text-sm">
      <p className="text-xs font-semibold text-stone-500">
        Per batch (makes {batchYield}):
      </p>
      <ul className="mt-1 grid gap-x-6 gap-y-0.5 sm:grid-cols-2">
        {lines.map((l, i) => {
          const ing = ingredientsById.get(l.ingredient_id);
          return (
            <li key={i} className="flex justify-between text-stone-600">
              <span>
                {ing?.name ?? "?"}
                {l.note && <span className="ml-1 text-[10px] text-stone-400">({l.note})</span>}
              </span>
              <span className="tabular-nums">
                {Number(l.qty_base)} {ing?.base_unit}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
