import Link from "next/link";
import PrintButton from "@/components/PrintButton";
import { getCatalog, getOrders, getWeekLabels } from "@/lib/data";
import { bakeSheet } from "@/lib/costing";

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
  const sheet = bakeSheet(orders, productsById, catalog.groups);
  const days = [...sheet.keys()].sort();
  const unpaidCount = orders.filter(
    (o) => o.payment_status !== "paid" && o.status !== "cancelled"
  ).length;

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
        )}. Shared-base flavors are grouped and rounded up to whole batches.
      </p>

      {days.length === 0 && (
        <p className="rounded-2xl border border-amber-100 bg-white p-6 text-sm text-stone-400">
          Nothing to bake — no paid orders in this week.
        </p>
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
                      {g.group.name} — {g.totalUnits} tarts → {g.batches} batch
                      {g.batches === 1 ? "" : "es"} of {g.group.batch_size}
                      {g.leftover ? (
                        <span className="ml-1 font-normal normal-case text-stone-400">
                          ({g.leftover} extra to sell)
                        </span>
                      ) : null}
                    </p>
                  ) : (
                    <p className="text-xs font-bold uppercase tracking-wide text-stone-400">
                      Individual recipes
                    </p>
                  )}
                  <ul className="mt-1 divide-y divide-amber-50">
                    {g.lines.map((l) => (
                      <li key={l.product.id} className="flex justify-between py-1.5 text-sm">
                        <span>
                          {l.product.name_en}
                          {l.product.name_zh && (
                            <span className="ml-1 text-stone-400">{l.product.name_zh}</span>
                          )}
                        </span>
                        <span className="font-bold tabular-nums">{l.qty}</span>
                      </li>
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
