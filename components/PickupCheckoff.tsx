"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Order } from "@/lib/types";

export default function PickupCheckoff({ order }: { order: Order }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const done = order.status === "completed";

  async function toggle() {
    setBusy(true);
    const supabase = createClient();
    await supabase
      .from("orders")
      .update(
        done
          ? { status: "confirmed", picked_up_at: null }
          : { status: "completed", picked_up_at: new Date().toISOString() }
      )
      .eq("id", order.id);
    setBusy(false);
    router.refresh();
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      aria-label={done ? "Mark not picked up" : "Mark picked up"}
      className={`h-10 w-10 shrink-0 rounded-xl border text-lg leading-none sm:h-7 sm:w-7 sm:rounded-md sm:text-sm ${
        done
          ? "border-green-500 bg-green-500 text-white"
          : "border-stone-300 bg-white text-transparent hover:border-amber-400"
      } disabled:opacity-50`}
    >
      ✓
    </button>
  );
}
