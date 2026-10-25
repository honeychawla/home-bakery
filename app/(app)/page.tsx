import Link from "next/link";
import PayBadge from "@/components/PayBadge";
import { getCatalog, getOrders, getWeekLabels } from "@/lib/data";
import { orderEconomics, unitCost } from "@/lib/costing";
import { money, pct } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;
  const weeks = await getWeekLabels();
  const activeWeek = week ?? weeks[0];
  const [orders, catalog] = await Promise.all([getOrders(activeWeek), getCatalog()]);

  const ingredientsById = new Map(catalog.ingredients.map((i) => [i.id, i]));
  const unitCostById = new Map(
    catalog.products.map((p) => [p.id, unitCost(p, catalog.recipeLines, ingredientsById).total])
  );

  const live = orders.filter((o) => o.status !== "cancelled");
  const paid = live.filter((o) => o.payment_status === "paid");
  const unpaid = live.filter((o) => o.payment_status !== "paid");
  const econ = paid.map((o) => orderEconomics(o, unitCostById));
  const revenue = econ.reduce((s, e) => s + e.revenue, 0);
  const received = econ.reduce((s, e) => s + e.received, 0);
  const cost = econ.reduce((s, e) => s + e.cost, 0);
  const profit = received - cost;
  const tarts = paid.reduce(
    (s, o) => s + (o.order_items ?? []).reduce((t, i) => t + i.qty, 0),
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">This week</h1>
        <div className="flex items-center gap-2">
          <WeekPicker weeks={weeks} active={activeWeek} />
          <Link
            href="/orders/new"
            className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-600"
          >
            + Add order
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Paid orders" value={`${paid.length}`} sub={`${tarts} tarts`} />
        <Stat label="Received" value={money(received)} sub={`${money(revenue)} before fees`} />
        <Stat label="Est. cost" value={money(cost)} sub="ingredients + packaging" />
        <Stat
          label="Est. profit"
          value={money(profit)}
          sub={received > 0 ? `${pct(profit / received)} margin` : "—"}
          highlight
        />
      </div>

      {unpaid.length > 0 && (
        <section className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
          <h2 className="text-sm font-bold text-orange-900">
            ⚠️ {unpaid.length} unpaid {unpaid.length === 1 ? "order" : "orders"} — not counted in
            the bake sheet
          </h2>
          <ul className="mt-2 space-y-1">
            {unpaid.map((o) => (
              <li key={o.id} className="text-sm">
                <Link href={`/orders/${o.id}`} className="underline decoration-orange-300">
                  {o.order_num}
                </Link>{" "}
                · {o.venmo_name ?? "unknown"} · {money(o.total)} · {o.pickup_day ?? "no pickup day"}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="grid gap-3 sm:grid-cols-3">
        <CardLink href="/bake" title="🥧 Bake sheet" desc="What to bake per pickup day, batches rounded up." />
        <CardLink href="/shopping" title="🛒 Shopping list" desc="Aggregated ingredients for the week, in store units." />
        <CardLink href="/schedule" title="📍 Pickup sheet" desc="Who's collecting what at each slot, check-off as you go." />
      </section>

      <section>
        <h2 className="mb-2 text-sm font-bold text-stone-600">Latest orders — {activeWeek}</h2>
        <div className="overflow-hidden rounded-2xl border border-amber-100 bg-white">
          {live.length === 0 && (
            <p className="p-4 text-sm text-stone-400">No orders yet this week.</p>
          )}
          {live.slice(0, 8).map((o) => (
            <Link
              key={o.id}
              href={`/orders/${o.id}`}
              className="flex items-center justify-between border-b border-amber-50 px-4 py-3 text-sm last:border-0 hover:bg-amber-50/50"
            >
              <span className="font-medium">{o.order_num}</span>
              <span className="text-stone-500">{o.venmo_name ?? "—"}</span>
              <span className="text-stone-500">{o.pickup_day ?? "—"}</span>
              <span>{money(o.total)}</span>
              <PayBadge status={o.payment_status} />
            </Link>
          ))}
        </div>
        <Link href="/orders" className="mt-2 inline-block text-sm text-amber-700 underline">
          All orders →
        </Link>
      </section>
    </div>
  );
}

function Stat({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${highlight ? "border-amber-300 bg-amber-100/70" : "border-amber-100 bg-white"}`}>
      <p className="text-xs text-stone-500">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
      {sub && <p className="text-[11px] text-stone-400">{sub}</p>}
    </div>
  );
}

function CardLink({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link href={href} className="rounded-2xl border border-amber-100 bg-white p-4 hover:border-amber-300">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-xs text-stone-500">{desc}</p>
    </Link>
  );
}

function WeekPicker({ weeks, active }: { weeks: string[]; active: string }) {
  return (
    <div className="flex gap-1 overflow-x-auto">
      {weeks.slice(0, 4).map((w) => (
        <Link
          key={w}
          href={`/?week=${encodeURIComponent(w)}`}
          className={`whitespace-nowrap rounded-full border px-3 py-1 text-xs ${
            w === active
              ? "border-amber-400 bg-amber-100 font-semibold text-amber-900"
              : "border-stone-200 bg-white text-stone-500"
          }`}
        >
          {w}
        </Link>
      ))}
    </div>
  );
}
