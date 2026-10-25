import Link from "next/link";
import PayBadge from "@/components/PayBadge";
import { getOrders, getWeekLabels } from "@/lib/data";
import { money } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; filter?: string }>;
}) {
  const { week, filter } = await searchParams;
  const weeks = await getWeekLabels();
  const activeWeek = week === "all" ? undefined : week ?? weeks[0];
  let orders = await getOrders(activeWeek);
  if (filter === "unpaid") orders = orders.filter((o) => o.payment_status !== "paid");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Orders</h1>
        <Link
          href="/orders/new"
          className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-600"
        >
          + Add order
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        {[...weeks.slice(0, 4), "all"].map((w) => (
          <Link
            key={w}
            href={`/orders?week=${encodeURIComponent(w)}${filter ? `&filter=${filter}` : ""}`}
            className={`rounded-full border px-3 py-1 ${
              (w === "all" && !activeWeek) || w === activeWeek
                ? "border-amber-400 bg-amber-100 font-semibold text-amber-900"
                : "border-stone-200 bg-white text-stone-500"
            }`}
          >
            {w === "all" ? "All weeks" : w}
          </Link>
        ))}
        <span className="mx-1 text-stone-300">|</span>
        <Link
          href={`/orders?${activeWeek ? `week=${encodeURIComponent(activeWeek)}&` : "week=all&"}${
            filter === "unpaid" ? "" : "filter=unpaid"
          }`}
          className={`rounded-full border px-3 py-1 ${
            filter === "unpaid"
              ? "border-orange-400 bg-orange-100 font-semibold text-orange-900"
              : "border-stone-200 bg-white text-stone-500"
          }`}
        >
          Unpaid only
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-amber-100 bg-white">
        {orders.length === 0 && <p className="p-4 text-sm text-stone-400">No orders.</p>}
        {orders.map((o) => (
          <Link
            key={o.id}
            href={`/orders/${o.id}`}
            className={`block border-b border-amber-50 px-4 py-3 last:border-0 hover:bg-amber-50/50 ${
              o.status === "cancelled" ? "opacity-40" : ""
            }`}
          >
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="font-semibold">{o.order_num}</span>
              <span className="text-stone-500">{o.venmo_name ?? "—"}</span>
              <span className="hidden text-stone-400 sm:inline">{o.pickup_day ?? "—"}</span>
              <span className="font-medium">{money(o.total)}</span>
              <PayBadge status={o.payment_status} />
            </div>
            <p className="mt-1 truncate text-xs text-stone-400">
              {(o.order_items ?? []).map((i) => `${i.qty}× ${i.description.replace(/^\d+x\s*/i, "").replace(/\s*\(\$[\d.]+\)$/, "")}`).join(", ")}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
