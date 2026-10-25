"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { RecipeIngredientAmount } from "@/lib/costing";
import type { Order } from "@/lib/types";

type Line = {
  productId: string;
  nameEn: string;
  nameZh: string | null;
  qty: number;
  ingredients: RecipeIngredientAmount[];
};

type Group = {
  groupName: string | null;
  totalUnits: number;
  lines: Line[];
};

function formatAmount(amount: number, unit: string): string {
  const rounded = amount >= 10 ? Math.round(amount) : Math.round(amount * 10) / 10;
  return `${rounded.toLocaleString()} ${unit}`;
}

// Per-day bake sheet: check off flavors as they finish baking, expand any
// flavor to see its recipe scaled to today's quantity, and check off orders
// as they're assembled & packed. Both check-offs persist (bake_checks table
// for flavors; order.status for packing) so progress survives a reload.
export default function BakeDay({
  weekLabel,
  day,
  dayTotal,
  groups,
  orders,
  initialBakedProductIds,
}: {
  weekLabel: string;
  day: string;
  dayTotal: number;
  groups: Group[];
  orders: Order[];
  initialBakedProductIds: string[];
}) {
  const router = useRouter();
  const [baked, setBaked] = useState<Set<string>>(new Set(initialBakedProductIds));
  const [openRecipe, setOpenRecipe] = useState<Set<string>>(new Set());
  const [packedBusy, setPackedBusy] = useState<Set<string>>(new Set());

  const totalFlavors = groups.reduce((s, g) => s + g.lines.length, 0);

  async function toggleBaked(productId: string) {
    const supabase = createClient();
    const next = new Set(baked);
    const unchecking = next.has(productId);
    if (unchecking) next.delete(productId);
    else next.add(productId);
    setBaked(next); // optimistic

    if (unchecking) {
      await supabase
        .from("bake_checks")
        .delete()
        .eq("week_label", weekLabel)
        .eq("day", day)
        .eq("product_id", productId);
    } else {
      await supabase
        .from("bake_checks")
        .upsert(
          { week_label: weekLabel, day, product_id: productId },
          { onConflict: "week_label,day,product_id" }
        );
    }
  }

  function toggleRecipe(productId: string) {
    const next = new Set(openRecipe);
    if (next.has(productId)) next.delete(productId);
    else next.add(productId);
    setOpenRecipe(next);
  }

  async function togglePacked(order: Order) {
    const packed = order.status === "ready";
    setPackedBusy((s) => new Set(s).add(order.id));
    const supabase = createClient();
    await supabase
      .from("orders")
      .update({ status: packed ? "confirmed" : "ready" })
      .eq("id", order.id);
    router.refresh();
  }

  return (
    <section className="rounded-2xl border border-amber-100 bg-white p-5 print:break-inside-avoid print:border-stone-300">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-bold">{day}</h2>
        <span className="text-sm text-stone-500">
          {dayTotal} tarts
          {totalFlavors > 0 && (
            <span className="ml-1 text-stone-400 print:hidden">
              · {baked.size}/{totalFlavors} flavors baked
            </span>
          )}
        </span>
      </div>

      <div className="mt-3 space-y-4">
        {groups.map((g, idx) => (
          <div key={idx}>
            {g.groupName ? (
              <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
                {g.groupName} — {g.totalUnits} tarts
              </p>
            ) : (
              <p className="text-xs font-bold uppercase tracking-wide text-stone-400">
                Individual recipes
              </p>
            )}
            <ul className="mt-1 divide-y divide-amber-50">
              {g.lines.map((l) => {
                const isBaked = baked.has(l.productId);
                const isOpen = openRecipe.has(l.productId);
                const hasRecipe = l.ingredients.length > 0;
                return (
                  <li key={l.productId} className="py-1.5 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => toggleBaked(l.productId)}
                          aria-label={isBaked ? "Mark not baked" : "Mark baked"}
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs leading-none print:hidden ${
                            isBaked
                              ? "border-green-500 bg-green-500 text-white"
                              : "border-stone-300 bg-white text-transparent hover:border-amber-400"
                          }`}
                        >
                          ✓
                        </button>
                        <button
                          type="button"
                          onClick={() => hasRecipe && toggleRecipe(l.productId)}
                          disabled={!hasRecipe}
                          className="flex min-w-0 items-center gap-1.5 text-left"
                        >
                          {hasRecipe && (
                            <svg
                              viewBox="0 0 8 8"
                              className={`h-2.5 w-2.5 shrink-0 text-stone-400 transition-transform ${isOpen ? "rotate-90" : ""}`}
                              fill="none"
                            >
                              <path d="M2 1l4 3-4 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                          <span className={isBaked ? "text-stone-400 line-through" : ""}>
                            {l.nameEn}
                            {l.nameZh && <span className="ml-1 text-stone-400">{l.nameZh}</span>}
                          </span>
                        </button>
                      </span>
                      <span className="font-bold tabular-nums">{l.qty}</span>
                    </div>

                    {hasRecipe && isOpen && (
                      <div className="ml-[30px] mt-1.5 rounded-lg bg-amber-50/60 p-2.5 print:bg-transparent">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                          Recipe for {l.qty}
                        </p>
                        <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
                          {l.ingredients.map((ri) => (
                            <div key={ri.ingredient.id} className="flex items-baseline justify-between gap-2 text-xs">
                              <span className="truncate text-stone-600">
                                {ri.ingredient.name}
                                {ri.note && <span className="text-stone-400"> ({ri.note})</span>}
                              </span>
                              <span className="shrink-0 font-bold text-stone-800">
                                {formatAmount(ri.amount, ri.ingredient.base_unit)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* Per-order breakdown: the bake totals say how much to produce;
          this says how to assemble and package each customer's order. */}
      {orders.length > 0 && (
        <div className="mt-5 border-t border-amber-100 pt-4">
          <h3 className="text-xs font-bold uppercase tracking-wide text-stone-500">
            Assemble &amp; pack — {orders.filter((o) => o.status !== "ready").length} orders left
          </h3>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {orders.map((o) => {
              const packed = o.status === "ready";
              const busy = packedBusy.has(o.id);
              return (
                <li
                  key={o.id}
                  className={`flex items-start gap-2.5 rounded-xl border p-3 text-sm print:break-inside-avoid print:border-stone-300 ${
                    packed ? "border-green-200 bg-green-50/60" : "border-amber-100 bg-amber-50/40"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => togglePacked(o)}
                    disabled={busy}
                    aria-label={packed ? "Mark not packed" : "Mark packed"}
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs leading-none print:hidden ${
                      packed
                        ? "border-green-500 bg-green-500 text-white"
                        : "border-stone-300 bg-white text-transparent hover:border-amber-400"
                    } disabled:opacity-50`}
                  >
                    ✓
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between">
                      <span className={`font-semibold ${packed ? "text-green-800" : ""}`}>
                        {o.venmo_name ?? o.order_num}
                      </span>
                      <span className="text-xs text-stone-400">
                        {o.order_num} · {o.pickup_time ?? ""}
                      </span>
                    </div>
                    <ul className="mt-1 space-y-0.5 text-stone-700">
                      {(o.order_items ?? []).map((i) => (
                        <li key={i.id} className="flex justify-between">
                          <span>
                            {i.description
                              .replace(/^\d+x\s*/i, "")
                              .replace(/\s*\(\$[\d.]+\)$/, "")}
                          </span>
                          <span className="font-bold tabular-nums">×{i.qty}</span>
                        </li>
                      ))}
                    </ul>
                    {o.notes && (
                      <p className="mt-1.5 rounded bg-orange-100 px-2 py-1 text-xs font-medium text-orange-900">
                        {o.notes}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
