"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { weekLabelFor } from "@/lib/orders";
import { formatPickupDay, nextOccurrence } from "@/lib/dates";
import { DAY_NAMES, money, timeRange } from "@/lib/format";
import type { PickupSlot, Product } from "@/lib/types";

// Quick-add an order: paste a DM and let Claude structure it, or tap products.
export default function NewOrderForm({
  products,
  slots,
}: {
  products: Product[];
  slots: PickupSlot[];
}) {
  const router = useRouter();
  const [qty, setQty] = useState<Record<string, number>>({});
  const [customer, setCustomer] = useState("");
  const [slotId, setSlotId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [paste, setPaste] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = useMemo(
    () =>
      products.reduce((s, p) => s + (qty[p.id] ?? 0) * Number(p.price), 0),
    [qty, products]
  );

  function bump(id: string, delta: number) {
    setQty((q) => {
      const next = Math.max(0, (q[id] ?? 0) + delta);
      return { ...q, [id]: next };
    });
  }

  async function aiParse() {
    if (!paste.trim()) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/ai/parse-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: paste }),
    });
    const data = await res.json();
    setBusy(false);
    if (!data.ok) {
      setError(data.error ?? "Could not parse");
      return;
    }
    // Fill the form from the parse — baker reviews before saving.
    const next: Record<string, number> = {};
    for (const item of data.parsed.items) {
      if (item.productId) next[item.productId] = (next[item.productId] ?? 0) + item.qty;
    }
    setQty(next);
    if (data.parsed.customerName) setCustomer(data.parsed.customerName);
    const unmatched = data.parsed.items.filter((i: { productId: string | null }) => !i.productId);
    const noteBits = [data.parsed.notes, data.parsed.pickupDay && `pickup: ${data.parsed.pickupDay}`,
      unmatched.length > 0 && `UNMATCHED: ${unmatched.map((i: { qty: number; name: string }) => `${i.qty}x ${i.name}`).join(", ")}`]
      .filter(Boolean);
    if (noteBits.length) setNotes(noteBits.join(" · "));
  }

  async function save() {
    const items = products.filter((p) => (qty[p.id] ?? 0) > 0);
    if (items.length === 0) {
      setError("Add at least one item.");
      return;
    }
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const slot = slots.find((s) => s.id === slotId);
    const pickupDate = slot ? nextOccurrence(slot.day_of_week) : null;
    const orderNum = `M-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        order_num: orderNum,
        source: "manual",
        status: "confirmed",
        payment_status: "unpaid",
        total,
        venmo_name: customer || null,
        week_label: pickupDate ? weekLabelFor(pickupDate) : weekLabelFor(new Date()),
        pickup_day: pickupDate ? formatPickupDay(pickupDate) : null,
        pickup_time: slot ? timeRange(slot.start_time, slot.end_time) : null,
        pickup_place: slot?.pickup_locations?.label_en ?? null,
        pickup_slot_id: slotId || null,
        notes: notes || null,
      })
      .select("id")
      .single();
    if (orderError || !order) {
      setBusy(false);
      setError(orderError?.message ?? "Failed to save");
      return;
    }
    const { error: itemsError } = await supabase.from("order_items").insert(
      items.map((p) => ({
        order_id: order.id,
        product_id: p.id,
        description: `${qty[p.id]}x ${p.name_en} ($${p.price})`,
        qty: qty[p.id],
        unit_price: p.price,
      }))
    );
    setBusy(false);
    if (itemsError) {
      setError(itemsError.message);
      return;
    }
    // Mirror the new order into the connected Google Sheet (best-effort).
    fetch("/api/sheet-sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "appendOrder",
        orderNum,
        items: items.map((p) => `${qty[p.id]}x ${p.name_en} ($${p.price})`).join(";\n"),
        total,
        paid: false,
        venmoName: customer || null,
        pickupDay: pickupDate ? formatPickupDay(pickupDate) : null,
        pickupTime: slot ? timeRange(slot.start_time, slot.end_time) : null,
        pickupPlace: slot?.pickup_locations?.label_en ?? null,
        lang: "en",
        weekLabel: pickupDate ? weekLabelFor(pickupDate) : weekLabelFor(new Date()),
      }),
    }).catch(() => {});
    router.push(`/orders/${order.id}`);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div>
        <Link href="/orders" className="text-xs text-stone-400 underline">
          ← Orders
        </Link>
        <h1 className="text-xl font-bold">Add order</h1>
      </div>

      <section className="rounded-2xl border border-violet-200 bg-violet-50/50 p-4">
        <h2 className="text-sm font-bold text-violet-900">✨ Paste a DM or text</h2>
        <p className="mt-1 text-xs text-stone-500">
          Chinese or English — Claude fills the form below; you review before saving.
        </p>
        <textarea
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
          rows={3}
          placeholder={`e.g. "Hi! Can I get 2 taro and 1 durian tart for Saturday Bellevue pickup? — Wendy"`}
          className="mt-2 w-full rounded-lg border border-violet-200 bg-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
        />
        <button
          onClick={aiParse}
          disabled={busy || !paste.trim()}
          className="mt-2 rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
        >
          {busy ? "Parsing…" : "Parse with Claude"}
        </button>
      </section>

      <section className="rounded-2xl border border-amber-100 bg-white p-4">
        <h2 className="text-sm font-bold text-stone-600">Items</h2>
        <div className="mt-2 divide-y divide-amber-50">
          {products.map((p) => (
            <div key={p.id} className="flex items-center justify-between py-2 text-sm">
              <span>
                {p.name_en} <span className="text-xs text-stone-400">{money(Number(p.price))}</span>
              </span>
              <span className="flex items-center gap-2">
                <button
                  onClick={() => bump(p.id, -1)}
                  className="h-7 w-7 rounded-full border border-stone-300 text-stone-500 hover:bg-stone-50"
                >
                  −
                </button>
                <span className={`w-6 text-center ${qty[p.id] ? "font-bold" : "text-stone-300"}`}>
                  {qty[p.id] ?? 0}
                </span>
                <button
                  onClick={() => bump(p.id, 1)}
                  className="h-7 w-7 rounded-full border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
                >
                  +
                </button>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <input
          value={customer}
          onChange={(e) => setCustomer(e.target.value)}
          placeholder="Customer name (Venmo/WeChat)"
          className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
        />
        <select
          value={slotId}
          onChange={(e) => setSlotId(e.target.value)}
          className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">Pickup slot…</option>
          {slots.map((s) => (
            <option key={s.id} value={s.id}>
              {DAY_NAMES[s.day_of_week]} {timeRange(s.start_time, s.end_time)} ·{" "}
              {s.pickup_locations?.label_en}
            </option>
          ))}
        </select>
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes"
          className="rounded-lg border border-stone-300 px-3 py-2 text-sm sm:col-span-2"
        />
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-100/60 px-4 py-3">
        <span className="font-bold">{money(total)}</span>
        <button
          onClick={save}
          disabled={busy}
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save order"}
        </button>
      </div>
    </div>
  );
}
