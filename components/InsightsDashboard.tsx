"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { summarize, weekStats, type InsightOrder } from "@/lib/insights";
import { mockSourcesForWeek, PLATFORMS, type Platform } from "@/lib/mockSources";

type MetricId = "sales" | "cost" | "profit" | "orders" | "tarts" | "unpaid";

const usd0 = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const usd2 = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const compact = (n: number) =>
  Math.abs(n) >= 1000 ? `$${(n / 1000).toFixed(1).replace(/\.0$/, "")}k` : `$${Math.round(n)}`;

const ORDERS_PREVIEW = 3;

export default function InsightsDashboard({ orders }: { orders: InsightOrder[] }) {
  const weeks = useMemo(() => weekStats(orders), [orders]);
  const latest = weeks.at(-1)?.label ?? null;

  const [metric, setMetric] = useState<MetricId>("sales");
  const [selected, setSelected] = useState<string | null>(null); // null = all weeks
  const [ordersWeek, setOrdersWeek] = useState<string | null>(latest); // Orders list starts on the latest week
  const [ordersOpen, setOrdersOpen] = useState(false);

  if (weeks.length === 0) {
    return (
      <div className="rounded-2xl border border-amber-100 bg-white p-6 text-sm text-stone-500">
        No orders yet. Once orders come in, weekly insights show up here.
      </div>
    );
  }

  const pickWeek = (label: string | null) => {
    setSelected(label);
    setOrdersWeek(label ?? latest); // the Orders list follows the week filter
    setOrdersOpen(false);
  };

  const scope = selected ? weeks.filter((w) => w.label === selected) : weeks;
  const idx = selected ? weeks.findIndex((w) => w.label === selected) : weeks.length - 1;
  const target = weeks[idx];
  const prev = idx > 0 ? weeks[idx - 1] : null;
  const summary = summarize(target, prev);

  const sum = (f: (w: (typeof weeks)[number]) => number) => scope.reduce((s, w) => s + f(w), 0);
  const sales = sum((w) => w.sales);
  const received = sum((w) => w.received);
  const cost = sum((w) => w.cost);
  const profit = received - cost;
  const unpaidWeeks = scope.filter((w) => w.unpaidOrders.length);
  const unpaidCount = unpaidWeeks.reduce((s, w) => s + w.unpaidOrders.length, 0);
  const scopeLabel = selected ? "this week" : "all weeks";
  const vsPrev = (cur: number, p: number | undefined) => {
    if (!selected || p === undefined || p === 0) return scopeLabel;
    const pct = ((cur - p) / p) * 100;
    return `${pct >= 0 ? "▲" : "▼"} ${Math.abs(pct).toFixed(0)}% vs ${prev!.label}`;
  };

  const cards: { id: MetricId; label: string; value: string; sub: string }[] = [
    { id: "sales", label: "Sales", value: usd0(sales), sub: vsPrev(sales, prev?.sales) },
    { id: "cost", label: "Cost", value: usd2(cost), sub: "ingredients, boxes, gas" },
    {
      id: "profit",
      label: "Profit",
      value: usd2(profit),
      sub: `${sales ? Math.round((profit / sales) * 100) : 0}% margin`,
    },
    { id: "orders", label: "Orders", value: String(sum((w) => w.orderCount)), sub: vsPrev(sum((w) => w.orderCount), prev?.orderCount) },
    { id: "tarts", label: "Tarts", value: String(sum((w) => w.tarts)), sub: vsPrev(sum((w) => w.tarts), prev?.tarts) },
    {
      id: "unpaid",
      label: "Unpaid",
      value: usd2(sum((w) => w.unpaid)),
      sub: `${unpaidCount} order${unpaidCount === 1 ? "" : "s"} not counted`,
    },
  ];

  const series: Record<MetricId, { title: string; get: (w: (typeof weeks)[number]) => number; fmt: (n: number) => string; money: boolean }> = {
    sales: { title: "sales", get: (w) => w.sales, fmt: compact, money: true },
    cost: { title: "cost", get: (w) => w.cost, fmt: compact, money: true },
    profit: { title: "profit", get: (w) => w.profit, fmt: compact, money: true },
    orders: { title: "orders", get: (w) => w.orderCount, fmt: String, money: false },
    tarts: { title: "tarts", get: (w) => w.tarts, fmt: String, money: false },
    unpaid: { title: "unpaid", get: (w) => w.unpaid, fmt: (n) => `$${Math.round(n)}`, money: true },
  };
  const m = series[metric];

  // flavor + pickup place breakdown for the current scope
  const flavors = new Map<string, number>();
  const places = new Map<string, number>();
  for (const w of scope)
    for (const o of w.orders) {
      places.set(o.place, (places.get(o.place) ?? 0) + 1);
      for (const i of o.items) flavors.set(i.name, (flavors.get(i.name) ?? 0) + i.tarts);
    }
  const flavorRows = [...flavors].sort((a, b) => b[1] - a[1]);
  const placeRows = [...places].sort((a, b) => b[1] - a[1]);

  // orders list: own week filter, 3 rows until expanded
  const ordersList = (ordersWeek ? weeks.filter((w) => w.label === ordersWeek) : weeks)
    .flatMap((w) => w.orders)
    .sort(
      (a, b) =>
        b.pickupDate.localeCompare(a.pickupDate) ||
        (a.pickupTime ?? "").localeCompare(b.pickupTime ?? "")
    );
  const shownOrders = ordersOpen ? ordersList : ordersList.slice(0, ORDERS_PREVIEW);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Insights</h1>
          <p className="text-xs text-stone-500">
            {weeks[0].label} – {weeks.at(-1)!.label} · {weeks.length} weeks
          </p>
        </div>
        <WeekSelect
          label="Week"
          value={selected}
          weeks={weeks.map((w) => w.label)}
          onChange={pickWeek}
        />
      </div>

      {/* Summary */}
      <section className="space-y-2 rounded-2xl border border-amber-100 bg-white p-4 text-sm">
        <h2 className="font-bold">
          {selected ? "" : "Latest week · "}
          {target.label} summary
        </h2>
        <Row tag="Best sellers">
          {summary.best.length
            ? summary.best.map((b) => `${b.name} (${b.tarts})`).join(", ")
            : "no orders"}
        </Row>
        {summary.place && (
          <Row tag="Pickup">
            {summary.place.name} had the most orders: {summary.place.count} of {summary.place.total} (
            {Math.round((summary.place.count / summary.place.total) * 100)}%)
            {summary.place.next && `, then ${summary.place.next.name} (${summary.place.next.count})`}
          </Row>
        )}
        {summary.notes.map((n, i) => (
          <Row key={i} tag={i === 0 ? "Heads-up" : ""}>
            <span className={n.tone === "warn" ? "text-red-700" : n.tone === "good" ? "text-green-700" : ""}>
              {n.text}
            </span>
          </Row>
        ))}
      </section>

      {/* Metric cards double as the chart selector */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cards.map((c) => (
          <button
            key={c.id}
            onClick={() => setMetric(c.id)}
            aria-pressed={metric === c.id}
            className={`rounded-2xl border p-4 text-left transition ${
              metric === c.id
                ? "border-amber-500 bg-amber-100/70 ring-1 ring-amber-500"
                : "border-amber-100 bg-white hover:border-amber-300"
            }`}
          >
            <p className="text-xs text-stone-500">{c.label}</p>
            <p className="mt-1 text-xl font-bold tabular-nums">{c.value}</p>
            <p className="text-[11px] text-stone-400">{c.sub}</p>
          </button>
        ))}
      </div>

      <section className="rounded-2xl border border-amber-100 bg-white p-4">
        <h2 className="mb-2 text-sm font-bold text-stone-600">
          Weekly {m.title} <span className="font-normal text-stone-400">(pick a card above to change; click a bar to filter)</span>
        </h2>
        <WeekChart
          weeks={weeks}
          get={m.get}
          fmt={m.fmt}
          selected={selected}
          onPick={(label) => pickWeek(selected === label ? null : label)}
          tooltip={(w) =>
            `${w.label}\n${m.title[0].toUpperCase() + m.title.slice(1)}: ${m.money ? usd2(m.get(w)) : m.get(w)}\nSales ${usd2(w.sales)} · Orders ${w.orderCount} · Tarts ${w.tarts}\nCost ${usd2(w.cost)} · Profit ${usd2(w.profit)}`
          }
        />
      </section>

      <SourcesPanel weeks={weeks} selected={selected} onPickWeek={pickWeek} />

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-amber-100 bg-white p-4">
          <h2 className="mb-3 text-sm font-bold text-stone-600">Tarts sold by flavor</h2>
          <HBars rows={flavorRows} />
        </section>
        <section className="rounded-2xl border border-amber-100 bg-white p-4">
          <h2 className="mb-3 text-sm font-bold text-stone-600">Orders by pickup place</h2>
          <HBars rows={placeRows} />
        </section>
      </div>

      <section className="rounded-2xl border border-amber-100 bg-white p-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-stone-600">Orders</h2>
          <WeekSelect
            value={ordersWeek}
            weeks={weeks.map((w) => w.label)}
            onChange={(v) => {
              setOrdersWeek(v);
              setOrdersOpen(false);
            }}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-stone-500">
              <tr>
                <th className="py-2 pr-3 font-medium">Order</th>
                <th className="py-2 pr-3 font-medium">Pickup</th>
                <th className="py-2 pr-3 font-medium">Place</th>
                <th className="py-2 pr-3 font-medium">Items</th>
                <th className="py-2 pr-3 text-right font-medium">Tarts</th>
                <th className="py-2 pr-3 text-right font-medium">Total</th>
                <th className="py-2 text-right font-medium">Received</th>
              </tr>
            </thead>
            <tbody>
              {shownOrders.map((o) => (
                <tr key={o.id} className="border-t border-amber-50 align-top">
                  <td className="py-2 pr-3">
                    <Link href={`/orders/${o.id}`} className="underline decoration-amber-300">
                      {o.orderNum}
                    </Link>
                  </td>
                  <td className="py-2 pr-3 whitespace-nowrap">
                    {o.pickupDay ?? "—"}
                    <br />
                    <span className="text-xs text-stone-400">{o.pickupTime}</span>
                  </td>
                  <td className="py-2 pr-3">{o.place}</td>
                  <td className="py-2 pr-3">
                    {o.items.map((i, k) => (
                      <div key={k}>
                        {i.qty}× {i.name}
                      </div>
                    ))}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums">{o.tarts}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{usd0(o.total)}</td>
                  <td className="py-2 text-right tabular-nums">{usd2(o.received)}</td>
                </tr>
              ))}
              {shownOrders.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-4 text-center text-stone-400">
                    No paid orders.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {ordersList.length > ORDERS_PREVIEW && (
          <button
            onClick={() => setOrdersOpen(!ordersOpen)}
            aria-expanded={ordersOpen}
            className="mt-3 text-sm text-amber-700 hover:underline"
          >
            {ordersOpen ? "▴ Collapse" : `▾ Show all ${ordersList.length} orders`}
          </button>
        )}
      </section>

      <p className="text-xs text-stone-400">
        Sales = order total of paid orders; unpaid orders appear in the Unpaid card. Cost = ingredients + packaging from
        the recipe library, plus gas per active week. Profit = received (after fees) − cost. A &quot;Box of 6&quot; counts
        as 6 tarts.
      </p>
    </div>
  );
}

function Row({ tag, children }: { tag: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="w-24 shrink-0 text-xs text-stone-500">{tag}</span>
      <span>{children}</span>
    </div>
  );
}

function WeekSelect({
  label,
  value,
  weeks,
  onChange,
}: {
  label?: string;
  value: string | null;
  weeks: string[];
  onChange: (v: string | null) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-stone-500">
      {label}
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className="rounded-lg border border-amber-200 bg-white py-1.5 pl-2.5 pr-2 text-sm text-stone-800"
      >
        <option value="">All weeks</option>
        {[...weeks].reverse().map((w) => (
          <option key={w} value={w}>
            {w}
          </option>
        ))}
      </select>
    </label>
  );
}

function HBars({ rows }: { rows: [string, number][] }) {
  const max = Math.max(1, ...rows.map((r) => r[1]));
  if (rows.length === 0) return <p className="text-sm text-stone-400">No data.</p>;
  return (
    <ul className="space-y-1.5">
      {rows.map(([name, v]) => (
        <li key={name} className="grid grid-cols-[minmax(0,40%)_1fr_auto] items-center gap-2 text-xs">
          <span className="truncate text-right text-stone-600" title={name}>
            {name}
          </span>
          <span className="h-3.5 rounded-sm bg-amber-100">
            <span className="block h-full rounded-sm bg-amber-500" style={{ width: `${(v / max) * 100}%` }} />
          </span>
          <span className="w-8 tabular-nums">{v}</span>
        </li>
      ))}
    </ul>
  );
}

function niceStep(raw: number) {
  const p = 10 ** Math.floor(Math.log10(raw || 1));
  const n = raw / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

function WeekChart<W extends { label: string }>({
  weeks,
  get,
  fmt,
  selected,
  onPick,
  tooltip,
}: {
  weeks: W[];
  get: (w: W) => number;
  fmt: (n: number) => string;
  selected: string | null;
  onPick: (label: string) => void;
  tooltip: (w: W) => string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const H = 240, top = 16, bottom = 28, left = 44, right = 8;
  const plotH = H - top - bottom;
  const slot = (width - left - right) / weeks.length;
  const bw = Math.min(56, slot * 0.6);
  const values = weeks.map(get);
  const step = niceStep(Math.max(1, ...values) / 4);
  const topVal = step * 4;
  const short = weeks.length > 8 && width < 700; // keep labels from colliding on narrow screens

  return (
    <div ref={ref} className="relative">
      <svg width={width} height={H} role="img" aria-label="Weekly chart">
        {[0, 1, 2, 3, 4].map((t) => {
          const y = top + plotH - (plotH * t * step) / topVal;
          return (
            <g key={t}>
              <line x1={left} x2={width - right} y1={y} y2={y} stroke="#f3ead8" />
              <text x={left - 6} y={y + 4} textAnchor="end" className="fill-stone-500 text-[11px]">
                {fmt(t * step)}
              </text>
            </g>
          );
        })}
        {weeks.map((w, i) => {
          const v = values[i];
          const bh = Math.max(0, (plotH * v) / topVal);
          const x = left + slot * i + (slot - bw) / 2;
          const y = top + plotH - bh;
          const dim = selected && selected !== w.label;
          return (
            <g key={w.label}>
              <rect
                x={x}
                y={y}
                width={bw}
                height={bh}
                rx={4}
                className={dim ? "fill-amber-200" : "fill-amber-500"}
              />
              {slot > 34 && (
                <text x={x + bw / 2} y={y - 5} textAnchor="middle" className="fill-stone-800 text-[11px]">
                  {fmt(v)}
                </text>
              )}
              <text
                x={left + slot * i + slot / 2}
                y={H - 8}
                textAnchor="middle"
                className="fill-stone-500 text-[11px]"
              >
                {short ? w.label.replace(/-\d+$/, "") : w.label}
              </text>
              <rect
                x={left + slot * i}
                y={top}
                width={slot}
                height={plotH + bottom}
                fill="transparent"
                className="cursor-pointer"
                onClick={() => onPick(w.label)}
                onMouseMove={(e) => {
                  const r = ref.current!.getBoundingClientRect();
                  setTip({ x: e.clientX - r.left, y: e.clientY - r.top, text: tooltip(w) });
                }}
                onMouseLeave={() => setTip(null)}
              />
            </g>
          );
        })}
      </svg>
      {tip && (
        <div
          className="pointer-events-none absolute z-10 whitespace-pre rounded-lg border border-amber-100 bg-white px-2.5 py-2 text-xs shadow-lg"
          style={{ left: Math.min(tip.x + 12, width - 190), top: tip.y + 12 }}
        >
          {tip.text}
        </div>
      )}
    </div>
  );
}

// Where orders come from and where people drop off before paying.
// Pick a channel, then a card, to see that number week by week.
// Currently driven by MOCK data (lib/mockSources.ts).
type SourceMetric = "inquiries" | "paid" | "conversion";

function SourcesPanel({
  weeks,
  selected,
  onPickWeek,
}: {
  weeks: ReturnType<typeof weekStats>;
  selected: string | null;
  onPickWeek: (label: string | null) => void;
}) {
  const [channel, setChannel] = useState<Platform | null>(null);
  const [metric, setMetric] = useState<SourceMetric>("conversion");

  // inquiries / paid per week for the chosen channel (all channels when none is chosen)
  const perWeek = weeks.map((w) => {
    const rows = mockSourcesForWeek(w).filter((r) => !channel || r.platform === channel);
    const inquiries = rows.reduce((s, r) => s + r.inquiries, 0);
    const paid = rows.reduce((s, r) => s + r.paid, 0);
    return { label: w.label, inquiries, paid, conversion: inquiries ? (paid / inquiries) * 100 : 0 };
  });
  const scope = selected ? perWeek.filter((w) => w.label === selected) : perWeek;
  const inquiries = scope.reduce((s, w) => s + w.inquiries, 0);
  const paid = scope.reduce((s, w) => s + w.paid, 0);
  const conversion = inquiries ? (paid / inquiries) * 100 : 0;

  const cards: { id: SourceMetric; label: string; value: string; sub: string }[] = [
    { id: "inquiries", label: "Inquiries", value: String(inquiries), sub: "people who messaged" },
    { id: "paid", label: "Paid orders", value: String(paid), sub: "placed and paid" },
    { id: "conversion", label: "Conversion", value: `${conversion.toFixed(0)}%`, sub: "inquiry → paid" },
  ];
  const chart = {
    inquiries: { title: "inquiries", get: (w: (typeof perWeek)[number]) => w.inquiries, fmt: String },
    paid: { title: "paid orders", get: (w: (typeof perWeek)[number]) => w.paid, fmt: String },
    conversion: { title: "conversion", get: (w: (typeof perWeek)[number]) => w.conversion, fmt: (n: number) => `${Math.round(n)}%` },
  }[metric];

  return (
    <section className="rounded-2xl border border-amber-100 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-stone-600">
          Conversion &amp; sources <span className="font-normal text-stone-400">· {selected ?? "all weeks"}</span>
        </h2>
        <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-medium text-stone-500">
          Sample data — real tracking not connected yet
        </span>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5" role="tablist" aria-label="Channel">
        {[null, ...PLATFORMS].map((p) => (
          <button
            key={p ?? "all"}
            role="tab"
            aria-selected={channel === p}
            onClick={() => setChannel(p)}
            className={`rounded-full border px-3 py-1 text-xs ${
              channel === p
                ? "border-amber-500 bg-amber-100 font-semibold text-amber-900"
                : "border-stone-200 bg-white text-stone-500 hover:border-amber-300"
            }`}
          >
            {p ?? "All channels"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {cards.map((c) => (
          <button
            key={c.id}
            onClick={() => setMetric(c.id)}
            aria-pressed={metric === c.id}
            className={`rounded-xl border p-3 text-left transition ${
              metric === c.id
                ? "border-amber-500 bg-amber-100/70 ring-1 ring-amber-500"
                : "border-amber-100 bg-white hover:border-amber-300"
            }`}
          >
            <p className="text-xs text-stone-500">{c.label}</p>
            <p className="mt-0.5 text-lg font-bold tabular-nums">{c.value}</p>
            <p className="text-[11px] text-stone-400">{c.sub}</p>
          </button>
        ))}
      </div>

      <h3 className="mb-1 mt-4 text-xs font-bold text-stone-500">
        Weekly {chart.title}
        <span className="font-normal text-stone-400"> · {channel ?? "all channels"} (click a bar to filter)</span>
      </h3>
      <WeekChart
        weeks={perWeek}
        get={chart.get}
        fmt={chart.fmt}
        selected={selected}
        onPick={(l) => onPickWeek(selected === l ? null : l)}
        tooltip={(w) =>
          `${w.label}\nInquiries ${w.inquiries}\nPaid orders ${w.paid}\nConversion ${Math.round(w.conversion)}%`
        }
      />
    </section>
  );
}
