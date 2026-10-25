import Link from "next/link";
import PrintButton from "@/components/PrintButton";
import BakeDay from "@/components/BakeDay";
import { createClient } from "@/lib/supabase/server";
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

  const supabase = await createClient();
  const { data: bakeChecks } = await supabase
    .from("bake_checks")
    .select("day, product_id")
    .eq("week_label", activeWeek);
  const bakedByDay = new Map<string, string[]>();
  for (const c of bakeChecks ?? []) {
    if (!bakedByDay.has(c.day)) bakedByDay.set(c.day, []);
    bakedByDay.get(c.day)!.push(c.product_id);
  }

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
          <BakeDay
            key={day}
            weekLabel={activeWeek}
            day={day}
            dayTotal={dayTotal}
            orders={dayOrders}
            initialBakedProductIds={bakedByDay.get(day) ?? []}
            groups={groups.map((g) => ({
              groupName: g.group?.name ?? null,
              totalUnits: g.totalUnits,
              lines: g.lines.map((l) => ({
                productId: l.product.id,
                nameEn: l.product.name_en,
                nameZh: l.product.name_zh,
                qty: l.qty,
                ingredients: recipeForQty(l.product, l.qty, catalog.recipeLines, ingredientsById),
              })),
            }))}
          />
        );
      })}
    </div>
  );
}
