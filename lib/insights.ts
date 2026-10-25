// Pure helpers for the Insights page: flatten orders into a client-friendly
// shape and aggregate them by pickup week. No server imports, so the client
// component can use these too.

import { orderEconomics } from "./costing";
import type { Order, Product } from "./types";

// Weekend driving, from the Cost & Profit Tracker (~$7.35 per pickup weekend).
// Charged once for every week that has at least one paid order.
export const GAS_PER_WEEK = 7.35;

export type InsightItem = { name: string; qty: number; tarts: number; cost: number };

export type InsightOrder = {
  id: string;
  orderNum: string;
  weekLabel: string;
  pickupDate: string; // YYYY-MM-DD, for sorting
  pickupDay: string | null;
  pickupTime: string | null;
  place: string;
  items: InsightItem[];
  tarts: number;
  total: number;
  received: number;
  cost: number; // ingredients + packaging (excludes gas)
  paid: boolean;
};

// "Fri 10/23" + the year the order was placed -> "2026-10-23".
// A pickup month far before the placed month means the pickup is in the new year.
function pickupDateOf(pickupDay: string | null, placedAt: string): string {
  const placed = new Date(placedAt);
  const m = pickupDay?.match(/(\d{1,2})\/(\d{1,2})/);
  if (!m) return placed.toISOString().slice(0, 10);
  const month = Number(m[1]);
  let year = placed.getFullYear();
  if (month < placed.getMonth() + 1 - 6) year += 1;
  return `${year}-${String(month).padStart(2, "0")}-${String(Number(m[2])).padStart(2, "0")}`;
}

// "Halloween Box of 6" is one line item but six tarts.
function tartsPer(name: string): number {
  const m = name.match(/box of (\d+)/i);
  return m ? Number(m[1]) : 1;
}

// Today's date in the bakery's timezone (Seattle), as YYYY-MM-DD.
export function todayIso(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(new Date());
}

// Orders whose pickup date is still in the future are left out: those weeks
// haven't happened yet, so they would only show up as misleading partial bars.
export function toInsightOrders(
  orders: Order[],
  productsById: Map<string, Product>,
  unitCostById: Map<string, number>,
  today = todayIso()
): InsightOrder[] {
  const out: InsightOrder[] = [];
  for (const o of orders) {
    if (o.status === "cancelled" || !o.week_label) continue; // no week = can't place it on the chart
    if (pickupDateOf(o.pickup_day, o.placed_at) > today) continue;
    const eco = orderEconomics(o, unitCostById);
    const items = (o.order_items ?? []).map((i) => {
      const product = i.product_id ? productsById.get(i.product_id) : undefined;
      const name = product?.name_en ?? i.description;
      const unit = i.product_id ? unitCostById.get(i.product_id) ?? 0 : 0;
      return { name, qty: i.qty, tarts: i.qty * tartsPer(name), cost: unit * i.qty };
    });
    out.push({
      id: o.id,
      orderNum: o.order_num,
      weekLabel: o.week_label,
      pickupDate: pickupDateOf(o.pickup_day, o.placed_at),
      pickupDay: o.pickup_day,
      pickupTime: o.pickup_time,
      place: o.pickup_place ?? "—",
      items,
      tarts: items.reduce((s, i) => s + i.tarts, 0),
      total: eco.revenue,
      received: eco.received,
      cost: eco.cost,
      paid: o.payment_status === "paid",
    });
  }
  return out;
}

export type WeekStats = {
  label: string;
  start: string; // earliest pickup date in the week
  orders: InsightOrder[]; // paid
  unpaidOrders: InsightOrder[];
  sales: number;
  received: number;
  cost: number; // includes gas
  profit: number;
  margin: number; // percent of sales
  orderCount: number;
  tarts: number;
  unpaid: number; // $ outstanding
};

// Weeks with no orders at all are simply absent. Oldest first.
export function weekStats(all: InsightOrder[], gasPerWeek = GAS_PER_WEEK): WeekStats[] {
  const byWeek = new Map<string, InsightOrder[]>();
  for (const o of all) (byWeek.get(o.weekLabel) ?? byWeek.set(o.weekLabel, []).get(o.weekLabel)!).push(o);
  const sum = (xs: InsightOrder[], f: (o: InsightOrder) => number) => xs.reduce((s, o) => s + f(o), 0);
  return [...byWeek.entries()]
    .map(([label, list]) => {
      const orders = list.filter((o) => o.paid);
      const unpaidOrders = list.filter((o) => !o.paid);
      const sales = sum(orders, (o) => o.total);
      const received = sum(orders, (o) => o.received);
      const cost = sum(orders, (o) => o.cost) + (orders.length ? gasPerWeek : 0);
      return {
        label,
        start: list.map((o) => o.pickupDate).sort()[0],
        orders,
        unpaidOrders,
        sales,
        received,
        cost,
        profit: received - cost,
        margin: sales ? ((received - cost) / sales) * 100 : 0,
        orderCount: orders.length,
        tarts: sum(orders, (o) => o.tarts),
        unpaid: sum(unpaidOrders, (o) => o.total),
      };
    })
    .sort((a, b) => a.start.localeCompare(b.start));
}

export type Summary = {
  best: { name: string; tarts: number }[];
  place: { name: string; count: number; total: number; next?: { name: string; count: number } } | null;
  notes: { tone: "warn" | "good" | "neutral"; text: string }[];
};

const usd0 = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const usd2 = (n: number) => `$${n.toFixed(2)}`;

// What happened in `week`, compared with the week before it.
export function summarize(week: WeekStats, prev: WeekStats | null): Summary {
  const tally = (f: (o: InsightOrder) => [string, number][]) => {
    const m = new Map<string, number>();
    for (const o of week.orders) for (const [k, v] of f(o)) m.set(k, (m.get(k) ?? 0) + v);
    return [...m].sort((a, b) => b[1] - a[1]);
  };
  const best = tally((o) =>
    o.items.filter((i) => !/box of/i.test(i.name)).map((i) => [i.name, i.tarts] as [string, number])
  )
    .slice(0, 3)
    .map(([name, tarts]) => ({ name, tarts }));
  const places = tally((o) => [[o.place, 1]]);
  const place = places.length
    ? {
        name: places[0][0],
        count: places[0][1],
        total: week.orderCount,
        next: places[1] ? { name: places[1][0], count: places[1][1] } : undefined,
      }
    : null;

  const notes: Summary["notes"] = [];
  if (prev && prev.sales >= 100) {
    const change = ((week.sales - prev.sales) / prev.sales) * 100;
    if (change <= -20)
      notes.push({ tone: "warn", text: `Sales are down ${Math.abs(change).toFixed(0)}% vs ${prev.label} (${usd0(prev.sales)} → ${usd0(week.sales)}).` });
    else if (change >= 20)
      notes.push({ tone: "good", text: `Sales are up ${change.toFixed(0)}% vs ${prev.label} (${usd0(prev.sales)} → ${usd0(week.sales)}).` });
    if (week.sales >= 100) {
      const delta = week.margin - prev.margin;
      if (delta <= -3)
        notes.push({
          tone: "warn",
          text: `Profit margin fell from ${prev.margin.toFixed(0)}% to ${week.margin.toFixed(0)}% (cost was ${((week.cost / week.sales) * 100).toFixed(0)}% of sales, was ${((prev.cost / prev.sales) * 100).toFixed(0)}%).`,
        });
      else if (delta >= 3)
        notes.push({ tone: "good", text: `Profit margin rose from ${prev.margin.toFixed(0)}% to ${week.margin.toFixed(0)}%.` });
    }
  }
  if (week.unpaidOrders.length) {
    const n = week.unpaidOrders.length;
    notes.push({
      tone: "warn",
      text: `${n} unpaid order${n === 1 ? "" : "s"} (${usd2(week.unpaid)}) not counted in sales: ${week.unpaidOrders.map((o) => o.orderNum).join(", ")}.`,
    });
  }
  if (!notes.length) notes.push({ tone: "neutral", text: prev ? `Nothing unusual compared with ${prev.label}.` : "Nothing unusual." });
  return { best, place, notes };
}
