import { notFound } from "next/navigation";
import Link from "next/link";
import PayBadge from "@/components/PayBadge";
import OrderActions from "@/components/OrderActions";
import OrderEditForm from "@/components/OrderEditForm";
import MessageComposer from "@/components/MessageComposer";
import { getCatalog, getOrder, getSettings, getTemplates } from "@/lib/data";
import { orderEconomics, unitCost } from "@/lib/costing";
import { money, pct } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [order, catalog, templates, settings] = await Promise.all([
    getOrder(id),
    getCatalog(),
    getTemplates(),
    getSettings(),
  ]);
  if (!order) notFound();

  const ingredientsById = new Map(catalog.ingredients.map((i) => [i.id, i]));
  const unitCostById = new Map(
    catalog.products.map((p) => [p.id, unitCost(p, catalog.recipeLines, ingredientsById).total])
  );
  const productsById = new Map(catalog.products.map((p) => [p.id, p]));
  const econ = orderEconomics(order, unitCostById);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/orders" className="text-xs text-stone-400 underline">
            ← Orders
          </Link>
          <h1 className="text-xl font-bold">
            {order.order_num}{" "}
            <span className="text-sm font-normal text-stone-400">via {order.source}</span>
          </h1>
        </div>
        <PayBadge status={order.payment_status} />
      </div>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-amber-100 bg-white p-4">
          <h2 className="text-sm font-bold text-stone-600">Items</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {(order.order_items ?? []).map((i) => (
              <li key={i.id} className="flex justify-between">
                <span>
                  {i.qty}× {i.product_id ? productsById.get(i.product_id)?.name_en : i.description}
                  {!i.product_id && (
                    <span className="ml-1 rounded bg-red-100 px-1 text-[10px] text-red-700">
                      unmatched
                    </span>
                  )}
                </span>
                <span className="text-stone-500">{money(i.qty * Number(i.unit_price))}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 border-t border-amber-50 pt-2 text-sm">
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>{money(order.total)}</span>
            </div>
            {order.amount_received != null && (
              <div className="flex justify-between text-stone-500">
                <span>Received (after fees)</span>
                <span>{money(order.amount_received)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl border border-amber-100 bg-white p-4 text-sm">
            <h2 className="text-sm font-bold text-stone-600">Pickup</h2>
            <p className="mt-1">
              {order.pickup_day ?? "—"} · {order.pickup_time ?? "—"}
            </p>
            <p className="text-stone-500">{order.pickup_place ?? "—"}</p>
            <p className="mt-2 text-xs text-stone-400">
              {order.venmo_name ? `Venmo: ${order.venmo_name}` : "No customer name yet"} · week{" "}
              {order.week_label ?? "—"} · lang {order.lang ?? "en"}
            </p>
            {order.notes && <p className="mt-2 rounded bg-amber-50 p-2 text-xs">{order.notes}</p>}
          </div>

          <div className="rounded-2xl border border-amber-100 bg-white p-4 text-sm">
            <h2 className="text-sm font-bold text-stone-600">Economics</h2>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
              <span className="text-stone-500">Received</span>
              <span className="text-right">{money(econ.received)}</span>
              <span className="text-stone-500">Est. cost</span>
              <span className="text-right">{money(econ.cost)}</span>
              <span className="font-semibold">Est. profit</span>
              <span className="text-right font-semibold">
                {money(econ.profit)} ({pct(econ.margin)})
              </span>
            </div>
            {econ.uncostedItems > 0 && (
              <p className="mt-2 text-[11px] text-orange-600">
                {econ.uncostedItems} item(s) not costed (unmatched or no recipe/estimate).
              </p>
            )}
          </div>
        </div>
      </section>

      <OrderActions order={order} />

      <OrderEditForm order={order} />

      <MessageComposer order={order} templates={templates} settings={settings} />

      {order.raw_items && (
        <details className="rounded-2xl border border-amber-100 bg-white p-4 text-xs text-stone-500">
          <summary className="cursor-pointer font-semibold">Original source text</summary>
          <pre className="mt-2 whitespace-pre-wrap">{order.raw_items}</pre>
        </details>
      )}
    </div>
  );
}
