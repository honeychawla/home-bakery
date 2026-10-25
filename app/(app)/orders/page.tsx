import Link from "next/link";
import PayBadge from "@/components/PayBadge";
import OrdersCalendar from "@/components/OrdersCalendar";
import { getOrders, getSettings, getWeekLabels } from "@/lib/data";
import { money } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; filter?: string; view?: string }>;
}) {
  const { week, filter, view } = await searchParams;
  const calendarView = view === "calendar";
  const sheetView = view === "sheet";
  const [weeks, settings] = await Promise.all([getWeekLabels(), getSettings()]);
  // Calendar spans weeks, so it always loads all orders.
  const activeWeek = calendarView || week === "all" ? undefined : week ?? weeks[0];
  let orders = sheetView ? [] : await getOrders(activeWeek);
  if (!calendarView && filter === "unpaid")
    orders = orders.filter((o) => o.payment_status !== "paid");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Orders</h1>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-stone-200 bg-white p-0.5 text-xs">
            <Link
              href="/orders"
              className={`rounded-md px-3 py-1 ${!calendarView ? "bg-amber-100 font-semibold text-amber-900" : "text-stone-500"}`}
            >
              List
            </Link>
            <Link
              href="/orders?view=calendar"
              className={`rounded-md px-3 py-1 ${calendarView ? "bg-amber-100 font-semibold text-amber-900" : "text-stone-500"}`}
            >
              Calendar
            </Link>
            {settings.sheet_embed_url && (
              <Link
                href="/orders?view=sheet"
                className={`rounded-md px-3 py-1 ${sheetView ? "bg-amber-100 font-semibold text-amber-900" : "text-stone-500"}`}
              >
                Sheet
              </Link>
            )}
          </div>
          <Link
            href="/orders/import"
            className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm hover:bg-stone-50"
          >
            ⬆ Import CSV
          </Link>
          <Link
            href="/orders/new"
            className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-600"
          >
            + Add order
          </Link>
        </div>
      </div>

      {sheetView && settings.sheet_embed_url && (
        <section className="overflow-hidden rounded-2xl border border-amber-100 bg-white">
          <div className="flex items-center justify-between border-b border-amber-50 px-4 py-2 text-xs text-stone-500">
            <span>Live view of your connected Google Sheet (read-only).</span>
            <a
              href={settings.sheet_embed_url.replace(/\/pubhtml.*$/, "/edit")}
              target="_blank"
              rel="noreferrer"
              className="text-amber-700 underline"
            >
              Open in Google Sheets ↗
            </a>
          </div>
          <iframe
            src={settings.sheet_embed_url}
            className="h-[70vh] w-full"
            title="Connected spreadsheet"
            sandbox="allow-scripts allow-same-origin"
          />
        </section>
      )}

      {calendarView && <OrdersCalendar orders={orders} />}

      {!calendarView && !sheetView && (
      <>
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
            <div className="grid grid-cols-[5rem_minmax(0,1fr)_4.5rem_4rem] items-center gap-3 text-sm sm:grid-cols-[5rem_minmax(0,1fr)_5.5rem_4.5rem_4rem]">
              <span className="font-semibold">{o.order_num}</span>
              <span className="truncate text-stone-500">{o.venmo_name ?? "—"}</span>
              <span className="hidden text-stone-400 sm:block">{o.pickup_day ?? "—"}</span>
              <span className="font-medium">{money(o.total)}</span>
              <span className="justify-self-end">
                <PayBadge status={o.payment_status} />
              </span>
            </div>
            <p className="mt-1 truncate text-xs text-stone-400">
              {(o.order_items ?? []).map((i) => `${i.qty}× ${i.description.replace(/^\d+x\s*/i, "").replace(/\s*\(\$[\d.]+\)$/, "")}`).join(", ")}
            </p>
          </Link>
        ))}
      </div>
      </>
      )}
    </div>
  );
}
