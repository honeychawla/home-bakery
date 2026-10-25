"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ShoppingCheckoff({
  weekLabel,
  ingredientId,
  bought,
}: {
  weekLabel: string;
  ingredientId: string;
  bought: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    const supabase = createClient();
    await supabase.from("shopping_checkoff").upsert({
      week_label: weekLabel,
      ingredient_id: ingredientId,
      bought: !bought,
      bought_at: !bought ? new Date().toISOString() : null,
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      aria-label={bought ? "Mark not bought" : "Mark bought"}
      className={`h-6 w-6 shrink-0 rounded-md border text-sm leading-none ${
        bought
          ? "border-green-500 bg-green-500 text-white"
          : "border-stone-300 bg-white text-transparent hover:border-amber-400"
      } disabled:opacity-50`}
    >
      ✓
    </button>
  );
}
