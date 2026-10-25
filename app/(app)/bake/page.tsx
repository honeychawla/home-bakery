import Link from "next/link";
import PrintButton from "@/components/PrintButton";
import RecipeRow from "@/components/RecipeRow";
import { getCatalog, getOrders, getWeekLabels } from "@/lib/data";
import { bakeSheet, recipeForQty } from "@/lib/costing";

export const dynamic = "force-dynamic";

export default async function BakePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;
  const weeks = await getWeekLabels();
  const activeWeek = week ?? weeks[0];
  const [orders, catalog] = await Promise.all([getOrders(activeWeek), getCatalog()]);

  const productsById = new Map(catalog.products.map((p) => [p.id, p]));
  const ingredientsById = new Map(catalog.ingredients.map((i) => [i.id, i]));
  const sheet = bakeSheet(orders, productsById, catalog.groups);
  const days = [...sheet.keys()].sort();
  const unpaidCount = orders.filter(
    (o) => o.payment_status !== "paid" && o.status !== "cancelled"
  ).length;

  // This-week summary: totals across every day in the current range, so the
  // baker sees the whole week before scrolling into day-by-day detail.
  const weekTotalTarts = days.reduce(
    (sum, day) => sum + sheet.get(day)!.reduce((s, g) => s + g.totalUnits, 0),
    0
  );
  const weekPaidOrders = orders.filter(
    (o) => o.payment_status === "paid" && o.status !== "cancelled"
  );
  const dayStats = days.map((day) => ({
    day,
    total: sheet.get(day)!.reduce((s, g) => s + g.totalUnits, 0),
    orderCount: weekPaidOrders.filter((o) => (o.pickup_day ?? "Unscheduled") === day).length,
  }));
  const flavorTotals = new Map<string, number>();
  for (const day of days) {
    for (const group of sheet.get(day)!) {
      for (const line of group.lines) {
        const name = line.product.name_en;
        flavorTotals.set(name, (flavorTotals.get(name) ?? 0) + line.qty);
      }
    }
  }
  const topFlavors = [...flavorTotals.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <h1 className="text-xl font-bold">Bake sheet — {activeWeek}</h1>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {weeks.slice(0, 4).map((w) => (
              <Link
                key={w}
                href={`/bake?week=${encodeURIComponent(w)}`}
                className={`rounded-full border px-3 py-1 text-xs ${
                  w === activeWeek
                    ? "border-amber-400 bg-amber-100 font-semibold text-amber-900"
                    : "border-stone-200 bg-white text-stone-500"
                }`}
              >
                {w}
              </Link>
            ))}
          </div>
          <PrintButton />
        </div>
      </div>

      <h1 className="hidden text-xl font-bold print:block">Bake sheet — {activeWeek}</h1>

      <p className="text-xs text-stone-500">
        Paid orders only{unpaidCount > 0 && (
          <span className="text-orange-600"> — {unpaidCount} unpaid order(s) excluded</span>
        )}. Shared-base flavors are grouped; totals are exact, not rounded to batches.
      </p>

      {days.length === 0 && (
        <p className="rounded-2xl border border-amber-100 bg-white p-6 text-sm text-stone-400">
          Nothing to bake — no paid orders in this week.
        </p>
      )}

      {days.length > 0 && (
        <section className="rounded-2xl border-2 border-amber-200 bg-white p-6 print:hidden">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-extrabold">
              This week — {weekTotalTarts} tarts, {weekPaidOrders.length} orders
            </h2>
            <span className="text-xs text-stone-400">{activeWeek}</span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {dayStats.map((d) => (
              <div key={d.day} className="rounded-xl bg-amber-50/60 p-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-bold">{d.day}</span>
                  <span className="text-sm font-bold text-amber-700">{d.total} tarts</span>
                </div>
                <p className="mt-0.5 text-xs text-stone-400">
                  {d.orderCount} order{d.orderCount === 1 ? "" : "s"} to assemble &amp; pack
                </p>
              </div>
            ))}
          </div>

          {topFlavors.length > 0 && (
            <div className="mt-4 border-t border-amber-100 pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">
                Top flavors this week
              </p>
              <div className="mt-2 flex flex-wrap gap-2 text-sm">
                {topFlavors.slice(0, 3).map(([name, qty]) => (
                  <span
                    key={name}
                    className="rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-900"
                  >
                    {name} · {qty}
                  </span>
                ))}
                {topFlavors.length > 3 && (
                  <span className="rounded-full bg-stone-100 px-3 py-1 font-semibold text-stone-500">
                    + {topFlavors.length - 3} more flavor{topFlavors.length - 3 === 1 ? "" : "s"}
                  </span>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {days.map((day) => {
        const groups = sheet.get(day)!;
        const dayTotal = groups.reduce((s, g) => s + g.totalUnits, 0);
        const dayOrders = orders.filter(
          (o) =>
            (o.pickup_day ?? "Unscheduled") === day &&
            o.payment_status === "paid" &&
            o.status !== "cancelled"
        );
        return (
          <section key={day} className="rounded-2xl border border-amber-100 bg-white p-5 print:break-inside-avoid print:border-stone-300">
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-bold">{day}</h2>
              <span className="text-sm text-stone-500">{dayTotal} tarts</span>
            </div>
            <div className="mt-3 space-y-4">
              {groups.map((g, idx) => (
                <div key={idx}>
                  {g.group ? (
                    <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
                      {g.group.name} — {g.totalUnits} tarts
                    </p>
                  ) : (
                    <p className="text-xs font-bold uppercase tracking-wide text-stone-400">
                      Individual recipes
                    </p>
                  )}
                  <ul className="mt-1 divide-y divide-amber-50">
                    {g.lines.map((l) => (
                      <RecipeRow
                        key={l.product.id}
                        nameEn={l.product.name_en}
                        nameZh={l.product.name_zh}
                        qty={l.qty}
                        ingredients={recipeForQty(l.product, l.qty, catalog.recipeLines, ingredientsById)}
                      />
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Per-order breakdown: the bake totals say how much to produce;
                this says how to assemble and package each customer's order. */}
            {dayOrders.length > 0 && (
              <div className="mt-5 border-t border-amber-100 pt-4">
                <h3 className="text-xs font-bold uppercase tracking-wide text-stone-500">
                  Assemble & pack — {dayOrders.length} orders
                </h3>
                <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                  {dayOrders.map((o) => (
                    <li
                      key={o.id}
                      className="rounded-xl border border-amber-100 bg-amber-50/40 p-3 text-sm print:break-inside-avoid print:border-stone-300"
                    >
                      <div className="flex items-baseline justify-between">
                        <span className="font-semibold">{o.venmo_name ?? o.order_num}</span>
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
                          📦 {o.notes}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
