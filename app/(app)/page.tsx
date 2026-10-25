import Link from "next/link";
import PayBadge from "@/components/PayBadge";
import { createClient } from "@/lib/supabase/server";
import { getCatalog, getOrders, getPickupSlots, getWeekLabels } from "@/lib/data";
import { bakeSheet, orderEconomics, shoppingList, unitCost } from "@/lib/costing";
import { assembleTimeline, nextItem, saturdayFor, type PlanStep } from "@/lib/plan";
import { money, pct } from "@/lib/format";

export const dynamic = "force-dynamic";

// Homepage = business dashboard: what's happening this week at a glance.
// The nav is the workflow (Shop → Orders → Bake → Deliver); each panel here
// deep-links into its step.
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
  const productsById = new Map(catalog.products.map((p) => [p.id, p]));
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
  const pickedUp = paid.filter((o) => o.status === "completed").length;

  // Bake at a glance: totals per pickup day (paid only)
  const sheet = bakeSheet(orders, productsById, catalog.groups);
  const bakeDays = [...sheet.entries()]
    .map(([day, groups]) => ({
      day,
      total: groups.reduce((s, g) => s + g.totalUnits, 0),
      top: groups
        .flatMap((g) => g.lines)
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 3),
    }))
    .sort((a, b) => a.day.localeCompare(b.day));

  // Shopping at a glance: biggest purchases
  const shop = shoppingList(orders, productsById, catalog.recipeLines, catalog.ingredients);
  const shopTotal = shop.lines.reduce((s, l) => s + l.estCost, 0);

  // Next production step (the plan's dashboard nudge)
  const supabase = await createClient();
  const [{ data: planSteps }, slots] = await Promise.all([
    supabase.from("plan_steps").select("*"),
    getPickupSlots(),
  ]);
  const timeline = assembleTimeline((planSteps ?? []) as PlanStep[], slots, saturdayFor(null));
  const upNext = nextItem(timeline, new Date());

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Dashboard</h1>
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

      {/* What's happening: the week in numbers */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="Paid orders"
          value={`${paid.length}`}
          sub={`${tarts} tarts · ${pickedUp} picked up${unpaid.length ? ` · ${unpaid.length} unpaid` : ""}`}
        />
        <Stat label="Received" value={money(received)} sub={`${money(revenue)} before fees`} />
        <Stat label="Est. cost" value={money(cost)} sub="ingredients + packaging" />
        <Stat
          label="Est. profit"
          value={money(profit)}
          sub={received > 0 ? `${pct(profit / received)} margin` : "—"}
          highlight
        />
      </div>

      {upNext && (
        <Link
          href="/plan"
          className="flex items-center justify-between rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm hover:border-amber-400"
        >
          <span>
            <span className="font-bold text-amber-700">Up next:</span> {upNext.title}
          </span>
          <span className="text-xs text-stone-400">
            {new Date(upNext.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short" })}
            {upNext.time &&
              ` · ${(() => {
                const [h, m] = upNext.time.split(":").map(Number);
                return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
              })()}`}{" "}
            → Plan
          </span>
        </Link>
      )}

      {unpaid.length > 0 && (
        <section className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
          <h2 className="text-sm font-bold text-orange-900">
            {unpaid.length} unpaid {unpaid.length === 1 ? "order" : "orders"} — excluded from
            bake &amp; shopping until marked paid
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

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Bake at a glance */}
        <section className="rounded-2xl border border-amber-100 bg-white p-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-bold text-stone-600">To bake</h2>
            <Link href="/bake" className="text-xs text-amber-700 underline">
              Full bake sheet →
            </Link>
          </div>
          {bakeDays.length === 0 ? (
            <p className="mt-3 text-sm text-stone-400">Nothing to bake yet.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {bakeDays.map((d) => (
                <div key={d.day} className="rounded-xl bg-amber-50/60 p-3">
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-semibold">{d.day}</span>
                    <span className="font-bold">{d.total} tarts</span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-stone-500">
                    {d.top.map((l) => `${l.qty}× ${l.product.name_en}`).join(" · ")}
                    {d.top.length < 3 ? "" : " · …"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Shopping at a glance */}
        <section className="rounded-2xl border border-amber-100 bg-white p-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-bold text-stone-600">To buy</h2>
            <Link href="/shopping" className="text-xs text-amber-700 underline">
              Full shopping list →
            </Link>
          </div>
          {shop.lines.length === 0 ? (
            <p className="mt-3 text-sm text-stone-400">Nothing to buy yet.</p>
          ) : (
            <>
              <ul className="mt-3 space-y-1.5 text-sm">
                {shop.lines.slice(0, 6).map((l) => (
                  <li key={l.ingredient.id} className="flex justify-between">
                    <span>
                      {l.purchases} × {l.ingredient.purchase_unit}{" "}
                      <span className="font-medium">{l.ingredient.name}</span>
                    </span>
                    <span className="text-stone-400">{money(l.estCost)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 border-t border-amber-50 pt-2 text-xs text-stone-500">
                {shop.lines.length > 6 && `+ ${shop.lines.length - 6} more items · `}
                est. total <b>{money(shopTotal)}</b>
              </p>
            </>
          )}
        </section>
      </div>

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
              className="grid grid-cols-[5rem_minmax(0,1fr)_5.5rem_4.5rem_4rem] items-center gap-3 border-b border-amber-50 px-4 py-3 text-sm last:border-0 hover:bg-amber-50/50"
            >
              <span className="font-medium">{o.order_num}</span>
              <span className="truncate text-stone-500">{o.venmo_name ?? "—"}</span>
              <span className="text-stone-500">{o.pickup_day ?? "—"}</span>
              <span>{money(o.total)}</span>
              <span className="justify-self-end">
                <PayBadge status={o.payment_status} />
              </span>
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
