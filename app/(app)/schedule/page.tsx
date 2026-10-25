import Link from "next/link";
import PayBadge from "@/components/PayBadge";
import PrintButton from "@/components/PrintButton";
import PickupCheckoff from "@/components/PickupCheckoff";
import { getOrders, getPickupSlots, getWeekLabels } from "@/lib/data";
import { DAY_NAMES, money, timeRange } from "@/lib/format";
import { parsePickupDate, toIsoDay } from "@/lib/dates";

export const dynamic = "force-dynamic";

// Pickup sheet: for each pickup day/slot, who's collecting what, with
// check-off as orders go out the car window.
export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;
  const weeks = await getWeekLabels();
  const activeWeek = week ?? weeks[0];
  const [orders, slots] = await Promise.all([getOrders(activeWeek), getPickupSlots()]);

  const live = orders.filter((o) => o.status !== "cancelled");
  // Group orders by their pickup_day + pickup_place strings (as the website sent them).
  const byKey = new Map<string, typeof live>();
  for (const o of live) {
    const key = `${o.pickup_day ?? "Unscheduled"} · ${o.pickup_time ?? ""} · ${o.pickup_place ?? ""}`;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key)!.push(o);
  }
  // Today's runs first (this page is used on a phone mid-delivery), then by date.
  const today = toIsoDay(new Date());
  const dateOf = (key: string) => {
    const group = byKey.get(key)!;
    return parsePickupDate(group[0].pickup_day, group[0].placed_at) ?? "9999";
  };
  const keys = [...byKey.keys()].sort((a, b) => {
    const da = dateOf(a);
    const db = dateOf(b);
    if ((da === today) !== (db === today)) return da === today ? -1 : 1;
    return da === db ? a.localeCompare(b) : da.localeCompare(db);
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <h1 className="text-xl font-bold">Pickups — {activeWeek}</h1>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {weeks.slice(0, 4).map((w) => (
              <Link
                key={w}
                href={`/schedule?week=${encodeURIComponent(w)}`}
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

      <h1 className="hidden text-xl font-bold print:block">Pickup sheet — {activeWeek}</h1>

      <section className="rounded-2xl border border-amber-100 bg-white p-4 text-sm print:hidden">
        <h2 className="text-sm font-bold text-stone-600">Weekly slots</h2>
        <ul className="mt-2 space-y-1 text-stone-600">
          {slots.map((s) => (
            <li key={s.id}>
              <b>{DAY_NAMES[s.day_of_week]}</b> {timeRange(s.start_time, s.end_time)} ·{" "}
              {s.pickup_locations?.label_en}
              <span className="text-xs text-stone-400">
                {" "}
                (order by {s.cutoff_hour}:00 the day before)
              </span>
            </li>
          ))}
        </ul>
      </section>

      {keys.length === 0 && (
        <p className="rounded-2xl border border-amber-100 bg-white p-6 text-sm text-stone-400">
          No pickups this week.
        </p>
      )}

      {keys.map((key) => {
        const list = byKey.get(key)!;
        const isToday = dateOf(key) === today;
        const done = list.filter((o) => o.status === "completed").length;
        const tarts = list
          .filter((o) => o.payment_status === "paid")
          .reduce((s, o) => s + (o.order_items ?? []).reduce((t, i) => t + i.qty, 0), 0);
        return (
          <section
            key={key}
            className={`rounded-2xl border bg-white p-4 sm:p-5 print:break-inside-avoid print:border-stone-300 ${
              isToday ? "border-amber-400 ring-1 ring-amber-300" : "border-amber-100"
            }`}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-1">
              <h2 className="font-bold">
                {isToday && (
                  <span className="mr-2 rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-bold uppercase text-white">
                    Today
                  </span>
                )}
                {key}
              </h2>
              <span className="text-xs text-stone-500">
                {done}/{list.length} handed off · {tarts} paid tarts
              </span>
            </div>
            <ul className="mt-3 divide-y divide-amber-50">
              {list.map((o) => (
                <li key={o.id} className="flex items-center gap-3 py-2.5 text-sm">
                  <PickupCheckoff order={o} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Link href={`/orders/${o.id}`} className="font-semibold underline decoration-amber-200">
                        {o.venmo_name ?? o.order_num}
                      </Link>
                      <span className="text-xs text-stone-400">{o.order_num}</span>
                      <PayBadge status={o.payment_status} />
                    </div>
                    <p className="truncate text-xs text-stone-500">
                      {(o.order_items ?? [])
                        .map((i) => `${i.qty}× ${i.description.replace(/^\d+x\s*/i, "").replace(/\s*\(\$[\d.]+\)$/, "")}`)
                        .join(", ")}
                    </p>
                  </div>
                  <span className="text-sm font-medium">{money(o.total)}</span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
