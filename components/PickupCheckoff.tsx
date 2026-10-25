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
      className={`h-6 w-6 shrink-0 rounded-md border text-sm leading-none ${
        done
          ? "border-green-500 bg-green-500 text-white"
          : "border-stone-300 bg-white text-transparent hover:border-amber-400"
      } disabled:opacity-50`}
    >
      ✓
    </button>
  );
}
