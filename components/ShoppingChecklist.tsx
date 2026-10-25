"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { money } from "@/lib/format";

export type ChecklistLine = {
  ingredientId: string;
  name: string;
  purchaseUnit: string;
  purchases: number;
  totalBase: number;
  baseUnit: string;
  estCost: number;
  baseQtyPerPurchase: number; // for the stock bump on check-off
  tracked: boolean;           // stock_qty is set → bump on check-off
};

// Grocery-run checklist: big tap targets for in-store use on a phone.
// Checks persist per week in the database, so a list reviewed on desktop
// stays checked off from the phone (and survives a page reload in the store).
export default function ShoppingChecklist({
  weekLabel,
  lines,
  initialChecked,
}: {
  weekLabel: string;
  lines: ChecklistLine[];
  initialChecked: string[];
}) {
  const [checked, setChecked] = useState<Set<string>>(new Set(initialChecked));
  const bought = lines.filter((l) => checked.has(l.ingredientId));
  const remaining = lines.filter((l) => !checked.has(l.ingredientId));
  const remainingCost = remaining.reduce((s, l) => s + l.estCost, 0);
  const totalCost = lines.reduce((s, l) => s + l.estCost, 0);

  async function toggle(id: string) {
    const supabase = createClient();
    const next = new Set(checked);
    const unchecking = next.has(id);
    if (unchecking) next.delete(id);
    else next.add(id);
    setChecked(next); // optimistic

    if (unchecking) {
      await supabase
        .from("shopping_checks")
        .delete()
        .eq("week_label", weekLabel)
        .eq("ingredient_id", id);
    } else {
      await supabase
        .from("shopping_checks")
        .upsert({ week_label: weekLabel, ingredient_id: id }, { onConflict: "week_label,ingredient_id" });
    }

    // Buying tops up tracked stock; unchecking takes it back out.
    const line = lines.find((l) => l.ingredientId === id);
    if (line?.tracked) {
      const delta = line.purchases * line.baseQtyPerPurchase * (unchecking ? -1 : 1);
      const { data: ing } = await supabase
        .from("ingredients")
        .select("stock_qty")
        .eq("id", id)
        .single();
      if (ing?.stock_qty != null) {
        await supabase
          .from("ingredients")
          .update({ stock_qty: Math.max(0, Number(ing.stock_qty) + delta) })
          .eq("id", id);
      }
    }
  }

  if (lines.length === 0) {
    return (
      <p className="rounded-2xl border border-amber-100 bg-white p-6 text-sm text-stone-400">
        Nothing to buy — no paid orders with structured recipes this week.
      </p>
    );
  }

  const Row = ({ l }: { l: ChecklistLine }) => {
    const isChecked = checked.has(l.ingredientId);
    return (
      <button
        onClick={() => toggle(l.ingredientId)}
        className={`flex w-full items-center gap-3 border-b border-amber-50 px-3 py-3.5 text-left last:border-0 active:bg-amber-50 sm:py-2.5 ${
          isChecked ? "opacity-50" : ""
        }`}
      >
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-sm print:h-4 print:w-4 ${
            isChecked
              ? "border-green-500 bg-green-500 text-white"
              : "border-stone-300 bg-white text-transparent"
          }`}
        >
          ✓
        </span>
        <span className="min-w-0 flex-1">
          <span className={`block text-sm font-semibold ${isChecked ? "line-through" : ""}`}>
            {l.purchases} × {l.purchaseUnit} — {l.name}
          </span>
          <span className="block text-xs text-stone-400">
            need {Math.ceil(l.totalBase)} {l.baseUnit}
          </span>
        </span>
        <span className="text-sm tabular-nums text-stone-500">{money(l.estCost)}</span>
      </button>
    );
  };

  return (
    <div className="space-y-3">
      <div className="sticky top-14 z-10 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-100/90 px-4 py-2.5 text-sm backdrop-blur print:hidden">
        <span className="font-semibold">
          {bought.length}/{lines.length} bought
        </span>
        <span>
          {money(remainingCost)} left <span className="text-stone-500">of {money(totalCost)}</span>
        </span>
      </div>

      <section className="overflow-hidden rounded-2xl border border-amber-100 bg-white print:border-stone-300">
        {remaining.map((l) => (
          <Row key={l.ingredientId} l={l} />
        ))}
        {bought.length > 0 && (
          <>
            <p className="border-b border-amber-50 bg-stone-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-stone-400 print:hidden">
              In the cart
            </p>
            {bought.map((l) => (
              <Row key={l.ingredientId} l={l} />
            ))}
          </>
        )}
      </section>
    </div>
  );
}
