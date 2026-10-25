"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Product } from "@/lib/types";

type Line = { ingredient: string; qty: number; baseUnit: string; note: string | null };

// Paste free-text ingredients (e.g. a cost-sheet cell) → Claude structures them
// → preview → apply to the ingredient library + this product's recipe.
export default function RecipeImporter({ product }: { product: Product }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [lines, setLines] = useState<Line[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(apply: boolean) {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/ai/parse-recipe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: product.id, text, apply }),
    });
    const data = await res.json();
    setBusy(false);
    if (!data.ok) {
      setError(data.error ?? "Failed");
      return;
    }
    setLines(data.lines);
    if (apply) {
      setOpen(false);
      setText("");
      setLines(null);
      router.refresh();
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-3 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-800 hover:border-violet-400"
      >
        ✨ Paste recipe → structure with Claude
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-violet-200 bg-violet-50/50 p-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        placeholder={"One batch, free text — e.g.\nWhole milk 80g\nHeavy cream 160g\nEgg yolk x1\nWhole egg x1\nSugar 40g"}
        className="w-full rounded-lg border border-violet-200 bg-white p-2 text-sm"
      />
      {error && <p className="mt-1 text-xs text-orange-600">{error}</p>}
      {lines && (
        <div className="mt-2 rounded-lg bg-white p-2 text-xs">
          <p className="font-semibold text-stone-500">Preview:</p>
          <ul className="mt-1 space-y-0.5">
            {lines.map((l, i) => (
              <li key={i}>
                {l.ingredient} — {l.qty} {l.baseUnit}
                {l.note && <span className="text-stone-400"> ({l.note})</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-2 flex gap-2">
        <button
          onClick={() => run(false)}
          disabled={busy || !text.trim()}
          className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          {busy ? "…" : "Preview"}
        </button>
        {lines && (
          <button
            onClick={() => run(true)}
            disabled={busy}
            className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            Apply to recipe
          </button>
        )}
        <button
          onClick={() => {
            setOpen(false);
            setLines(null);
            setError(null);
          }}
          className="rounded-lg px-3 py-1.5 text-xs text-stone-500"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
