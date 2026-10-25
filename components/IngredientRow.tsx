"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Ingredient } from "@/lib/types";

export default function IngredientRow({ ingredient }: { ingredient: Ingredient }) {
  const router = useRouter();
  const [cost, setCost] = useState(String(ingredient.purchase_cost));
  const [qty, setQty] = useState(String(ingredient.base_qty));
  const [stock, setStock] = useState(
    ingredient.stock_qty != null ? String(ingredient.stock_qty) : ""
  );
  const [busy, setBusy] = useState(false);
  const dirty =
    cost !== String(ingredient.purchase_cost) ||
    qty !== String(ingredient.base_qty) ||
    stock !== (ingredient.stock_qty != null ? String(ingredient.stock_qty) : "");

  async function save() {
    setBusy(true);
    const supabase = createClient();
    const stockChanged =
      stock !== (ingredient.stock_qty != null ? String(ingredient.stock_qty) : "");
    await supabase
      .from("ingredients")
      .update({
        purchase_cost: parseFloat(cost) || 0,
        base_qty: parseFloat(qty) || 1,
        price_effective_date: new Date().toISOString().slice(0, 10),
        ...(stockChanged
          ? {
              stock_qty: stock === "" ? null : parseFloat(stock) || 0,
              stock_updated_at: stock === "" ? null : new Date().toISOString(),
            }
          : {}),
      })
      .eq("id", ingredient.id);
    setBusy(false);
    router.refresh();
  }

  const perBase =
    (parseFloat(cost) || 0) / (parseFloat(qty) || 1);
  const needsPrice = (parseFloat(cost) || 0) === 0;

  return (
    <tr className={`border-b border-amber-50 last:border-0 ${needsPrice ? "bg-orange-50/60" : ""}`}>
      <td className="px-4 py-2 font-medium">
        {ingredient.name}
        {needsPrice && (
          <span className="ml-1 rounded bg-orange-100 px-1 text-[10px] text-orange-700">
            needs price
          </span>
        )}
      </td>
      <td className="px-2 py-2 text-stone-500">
        1 {ingredient.purchase_unit} ={" "}
        <input
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          className="w-16 rounded border border-stone-200 px-1 py-0.5 text-right text-xs"
        />{" "}
        {ingredient.base_unit}
      </td>
      <td className="px-2 py-2">
        $
        <input
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          className="w-16 rounded border border-stone-200 px-1 py-0.5 text-right text-xs"
        />
      </td>
      <td className="px-2 py-2 text-xs tabular-nums text-stone-500">
        ${perBase.toFixed(4)}/{ingredient.base_unit}
      </td>
      <td className="px-2 py-2 text-xs">
        <input
          value={stock}
          onChange={(e) => setStock(e.target.value)}
          placeholder="—"
          title="Stock on hand (base units). Empty = untracked. Powers restock predictions."
          className="w-16 rounded border border-stone-200 px-1 py-0.5 text-right text-xs"
        />{" "}
        <span className="text-stone-400">{ingredient.base_unit}</span>
      </td>
      <td className="px-2 py-2">
        {dirty && (
          <button
            onClick={save}
            disabled={busy}
            className="rounded bg-amber-500 px-2 py-1 text-xs font-semibold text-white disabled:opacity-50"
          >
            Save
          </button>
        )}
      </td>
    </tr>
  );
}
