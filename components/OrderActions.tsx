"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Order } from "@/lib/types";

// Payment + status controls. Writes directly via the authenticated client (RLS).
export default function OrderActions({ order }: { order: Order }) {
  const router = useRouter();
  const [received, setReceived] = useState(
    order.amount_received != null ? String(order.amount_received) : String(order.total)
  );
  const [busy, setBusy] = useState(false);

  async function update(fields: Record<string, unknown>) {
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("orders").update(fields).eq("id", order.id);
    setBusy(false);
    if (error) {
      alert(error.message);
      return;
    }
    // Mirror payment changes to the connected Google Sheet (best-effort).
    if ("payment_status" in fields) {
      fetch("/api/sheet-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updatePayment",
          orderNum: order.order_num,
          paid: fields.payment_status === "paid",
          amountReceived:
            fields.payment_status === "paid" ? (fields.amount_received as number) : null,
          venmoName: order.venmo_name,
          weekLabel: order.week_label,
        }),
      }).catch(() => {});
    }
    router.refresh();
  }

  return (
    <section className="rounded-2xl border border-amber-100 bg-white p-4">
      <h2 className="text-sm font-bold text-stone-600">Actions</h2>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {order.payment_status !== "paid" ? (
          <>
            <input
              type="number"
              step="0.01"
              value={received}
              onChange={(e) => setReceived(e.target.value)}
              className="w-28 rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
              aria-label="Amount received"
            />
            <button
              disabled={busy}
              onClick={() =>
                update({ payment_status: "paid", amount_received: parseFloat(received) || order.total })
              }
              className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
            >
              ✓ Mark paid (received)
            </button>
          </>
        ) : (
          <button
            disabled={busy}
            onClick={() => update({ payment_status: "unpaid" })}
            className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-50 disabled:opacity-50"
          >
            Undo paid
          </button>
        )}

        {order.status !== "completed" && order.status !== "cancelled" && (
          <button
            disabled={busy}
            onClick={() => update({ status: "completed", picked_up_at: new Date().toISOString() })}
            className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
          >
            Picked up
          </button>
        )}
        {order.status === "confirmed" && (
          <button
            disabled={busy}
            onClick={() => {
              if (confirm("Cancel this order?")) update({ status: "cancelled" });
            }}
            className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            Cancel order
          </button>
        )}
        {(order.status === "completed" || order.status === "cancelled") && (
          <span className="text-xs text-stone-400">
            Status: <b>{order.status}</b>
            {order.picked_up_at && ` · ${new Date(order.picked_up_at).toLocaleString()}`}
          </span>
        )}
      </div>
      <p className="mt-2 text-[11px] text-stone-400">
        Only <b>paid</b> orders count toward the bake sheet and shopping list.
      </p>
    </section>
  );
}
