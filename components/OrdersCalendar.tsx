"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import PayBadge from "@/components/PayBadge";
import { parsePickupDate, toIsoDay } from "@/lib/dates";
import { money } from "@/lib/format";
import type { Order } from "@/lib/types";

// Month-grid calendar of orders by pickup date. Tap a day → that day's
// breakdown (orders + per-flavor tally).
export default function OrdersCalendar({ orders }: { orders: Order[] }) {
  const today = toIsoDay(new Date());
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [selected, setSelected] = useState<string>(today);

  const byDate = useMemo(() => {
    const map = new Map<string, Order[]>();
    for (const o of orders) {
      if (o.status === "cancelled") continue;
      const date = parsePickupDate(o.pickup_day, o.placed_at);
      if (!date) continue;
      if (!map.has(date)) map.set(date, []);
      map.get(date)!.push(o);
    }
    return map;
  }, [orders]);

  const undated = useMemo(
    () =>
      orders.filter(
        (o) => o.status !== "cancelled" && !parsePickupDate(o.pickup_day, o.placed_at)
      ),
    [orders]
  );

  // Build the month grid (weeks start Sunday).
  const first = new Date(cursor.year, cursor.month, 1);
  const cells: (string | null)[] = [];
  for (let i = 0; i < first.getDay(); i++) cells.push(null);
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++)
    cells.push(toIsoDay(new Date(cursor.year, cursor.month, d)));

  const monthName = first.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const selectedOrders = byDate.get(selected) ?? [];

  // Per-flavor tally for the selected day (paid only, matching the bake rule).
  const tally = new Map<string, number>();
  for (const o of selectedOrders) {
    if (o.payment_status !== "paid") continue;
    for (const i of o.order_items ?? []) {
      const name = i.description.replace(/^\d+x\s*/i, "").replace(/\s*\(\$[\d.]+\)$/, "");
      tally.set(name, (tally.get(name) ?? 0) + i.qty);
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-amber-100 bg-white p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCursor(({ year, month }) => (month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 }))}
            className="rounded-lg px-3 py-1 text-stone-500 hover:bg-amber-50"
            aria-label="Previous month"
          >
            ←
          </button>
          <h2 className="font-bold">{monthName}</h2>
          <button
            onClick={() => setCursor(({ year, month }) => (month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 }))}
            className="rounded-lg px-3 py-1 text-stone-500 hover:bg-amber-50"
            aria-label="Next month"
          >
            →
          </button>
        </div>
        <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] text-stone-400">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {cells.map((date, i) => {
            if (!date) return <div key={`pad-${i}`} />;
            const dayOrders = byDate.get(date) ?? [];
            const paidTarts = dayOrders
              .filter((o) => o.payment_status === "paid")
              .reduce((s, o) => s + (o.order_items ?? []).reduce((t, it) => t + it.qty, 0), 0);
            const hasUnpaid = dayOrders.some((o) => o.payment_status !== "paid");
            const isSelected = date === selected;
            const isToday = date === today;
            return (
              <button
                key={date}
                onClick={() => setSelected(date)}
                className={`flex min-h-14 flex-col items-center rounded-lg border p-1 text-xs ${
                  isSelected
                    ? "border-amber-500 bg-amber-100 font-bold"
                    : isToday
                    ? "border-amber-300 bg-amber-50"
                    : dayOrders.length > 0
                    ? "border-amber-100 bg-white hover:border-amber-300"
                    : "border-transparent text-stone-400 hover:bg-amber-50/50"
                }`}
              >
                <span>{parseInt(date.slice(8), 10)}</span>
                {dayOrders.length > 0 && (
                  <>
                    <span className="mt-0.5 rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white">
                      {dayOrders.length}
                    </span>
                    <span className="mt-0.5 text-[9px] text-stone-400">
                      {paidTarts > 0 && `${paidTarts} tarts`}
                      {hasUnpaid && <span className="text-orange-500"> !</span>}
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-amber-100 bg-white p-4">
        <h3 className="text-sm font-bold text-stone-600">
          {new Date(selected + "T12:00:00").toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </h3>
        {selectedOrders.length === 0 ? (
          <p className="mt-2 text-sm text-stone-400">No orders for this day.</p>
        ) : (
          <>
            {tally.size > 0 && (
              <div className="mt-2 rounded-xl bg-amber-50/70 p-3 text-xs">
                <p className="font-semibold text-stone-500">Bake tally (paid):</p>
                <p className="mt-1 text-stone-600">
                  {[...tally.entries()].sort((a, b) => b[1] - a[1]).map(([n, q]) => `${q}× ${n}`).join(" · ")}
                </p>
              </div>
            )}
            <ul className="mt-2 divide-y divide-amber-50">
              {selectedOrders.map((o) => (
                <li key={o.id} className="py-2.5">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <Link href={`/orders/${o.id}`} className="font-semibold underline decoration-amber-200">
                      {o.order_num}
                    </Link>
                    <span className="text-stone-500">{o.venmo_name ?? "—"}</span>
                    <span className="text-xs text-stone-400">{o.pickup_time ?? ""}</span>
                    <span>{money(o.total)}</span>
                    <PayBadge status={o.payment_status} />
                  </div>
                  <p className="mt-0.5 truncate text-xs text-stone-400">
                    {(o.order_items ?? [])
                      .map((i) => `${i.qty}× ${i.description.replace(/^\d+x\s*/i, "").replace(/\s*\(\$[\d.]+\)$/, "")}`)
                      .join(", ")}
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {undated.length > 0 && (
        <p className="text-xs text-stone-400">
          {undated.length} order(s) without a parsable pickup date —{" "}
          <Link href="/orders" className="underline">
            see the list view
          </Link>
          .
        </p>
      )}
    </div>
  );
}
