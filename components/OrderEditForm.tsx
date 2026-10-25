"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Order } from "@/lib/types";

// Field-level edits of an existing order. Saves to the database, then mirrors
// the changed cells into the connected Google Sheet row (matched by Order #).
// Items are intentionally not editable here — they drive costing and the bake
// sheet, so changing them means cancel + re-add for now.
export default function OrderEditForm({ order }: { order: Order }) {
  const router = useRouter();
  const [form, setForm] = useState({
    venmo_name: order.venmo_name ?? "",
    pickup_day: order.pickup_day ?? "",
    pickup_time: order.pickup_time ?? "",
    pickup_place: order.pickup_place ?? "",
    total: String(order.total ?? ""),
    notes: order.notes ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty =
    form.venmo_name !== (order.venmo_name ?? "") ||
    form.pickup_day !== (order.pickup_day ?? "") ||
    form.pickup_time !== (order.pickup_time ?? "") ||
    form.pickup_place !== (order.pickup_place ?? "") ||
    form.total !== String(order.total ?? "") ||
    form.notes !== (order.notes ?? "");

  async function save() {
    setBusy(true);
    setError(null);
    const total = parseFloat(form.total);
    const supabase = createClient();
    const { error: dbError } = await supabase
      .from("orders")
      .update({
        venmo_name: form.venmo_name || null,
        pickup_day: form.pickup_day || null,
        pickup_time: form.pickup_time || null,
        pickup_place: form.pickup_place || null,
        total: isNaN(total) ? order.total : total,
        notes: form.notes || null,
      })
      .eq("id", order.id);
    setBusy(false);
    if (dbError) {
      setError(dbError.message);
      return;
    }

    // Mirror only the fields that changed into the sheet row (best-effort).
    const fields: Record<string, string | number> = {};
    if (form.venmo_name !== (order.venmo_name ?? "")) fields.venmoName = form.venmo_name;
    if (form.pickup_day !== (order.pickup_day ?? "")) fields.pickupDay = form.pickup_day;
    if (form.pickup_time !== (order.pickup_time ?? "")) fields.pickupTime = form.pickup_time;
    if (form.pickup_place !== (order.pickup_place ?? "")) fields.pickupPlace = form.pickup_place;
    if (form.total !== String(order.total ?? "") && !isNaN(total)) fields.total = total;
    if (Object.keys(fields).length > 0) {
      fetch("/api/sheet-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateOrder",
          orderNum: order.order_num,
          weekLabel: order.week_label,
          fields,
        }),
      }).catch(() => {});
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
    router.refresh();
  }

  return (
    <details className="rounded-2xl border border-amber-100 bg-white p-4">
      <summary className="cursor-pointer text-sm font-bold text-stone-600">
        ✏️ Edit order details
      </summary>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field label="Customer / Venmo name" value={form.venmo_name} onChange={(v) => setForm({ ...form, venmo_name: v })} />
        <Field label="Total ($)" value={form.total} onChange={(v) => setForm({ ...form, total: v })} />
        <Field label='Pickup day (e.g. "Fri 10/30")' value={form.pickup_day} onChange={(v) => setForm({ ...form, pickup_day: v })} />
        <Field label='Pickup time (e.g. "3:30–4:00 PM")' value={form.pickup_time} onChange={(v) => setForm({ ...form, pickup_time: v })} />
        <div className="sm:col-span-2">
          <Field label="Pickup place" value={form.pickup_place} onChange={(v) => setForm({ ...form, pickup_place: v })} />
        </div>
        <div className="sm:col-span-2">
          <Field label="Notes (app only — no sheet column)" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} />
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={save}
          disabled={busy || !dirty}
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
        >
          {saved ? "Saved ✓" : busy ? "Saving…" : "Save changes"}
        </button>
        <span className="text-[11px] text-stone-400">
          Changed fields also update the Google Sheet row. To change items, cancel this order
          and re-add it.
        </span>
      </div>
    </details>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="text-xs font-semibold text-stone-500">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
      />
    </label>
  );
}
