import Link from "next/link";
import IngredientRow from "@/components/IngredientRow";
import { getCatalog } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function IngredientsPage() {
  const { ingredients } = await getCatalog();
  return (
    <div className="space-y-4">
      <div>
        <Link href="/products" className="text-xs text-stone-400 underline">
          ← Menu
        </Link>
        <h1 className="text-xl font-bold">Ingredient library</h1>
        <p className="mt-1 text-xs text-stone-500">
          Purchase prices drive all costing. Update a price when you shop — past weeks keep
          their numbers. Zero-cost rows were auto-created by the recipe importer and need a
          real price.
        </p>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-amber-100 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-amber-100 text-left text-xs text-stone-400">
              <th className="px-4 py-2 font-medium">Ingredient</th>
              <th className="px-2 py-2 font-medium">You buy</th>
              <th className="px-2 py-2 font-medium">Price</th>
              <th className="px-2 py-2 font-medium">= per base unit</th>
              <th className="px-2 py-2 font-medium">Stock on hand</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {ingredients.map((i) => (
              <IngredientRow key={i.id} ingredient={i} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
