"use client";

import { useState } from "react";
import type { RecipeIngredientAmount } from "@/lib/costing";

function formatAmount(amount: number, unit: string): string {
  const rounded = amount >= 10 ? Math.round(amount) : Math.round(amount * 10) / 10;
  return `${rounded.toLocaleString()} ${unit}`;
}

export default function RecipeRow({
  nameEn,
  nameZh,
  qty,
  ingredients,
}: {
  nameEn: string;
  nameZh: string | null;
  qty: number;
  ingredients: RecipeIngredientAmount[];
}) {
  const [open, setOpen] = useState(false);
  const hasRecipe = ingredients.length > 0;

  return (
    <li className="py-1.5 text-sm">
      <button
        type="button"
        onClick={() => hasRecipe && setOpen((o) => !o)}
        disabled={!hasRecipe}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="flex min-w-0 items-center gap-1.5">
          {hasRecipe && (
            <svg
              viewBox="0 0 8 8"
              className={`h-2.5 w-2.5 shrink-0 text-stone-400 transition-transform ${open ? "rotate-90" : ""}`}
              fill="none"
            >
              <path d="M2 1l4 3-4 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          <span>
            {nameEn}
            {nameZh && <span className="ml-1 text-stone-400">{nameZh}</span>}
          </span>
        </span>
        <span className="font-bold tabular-nums">{qty}</span>
      </button>

      {hasRecipe && open && (
        <div className="ml-4 mt-1.5 rounded-lg bg-amber-50/60 p-2.5 print:bg-transparent">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">
            Recipe for {qty}
          </p>
          <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
            {ingredients.map((ri) => (
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
}
