"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CHANNELS } from "@/lib/channels";
import type { Inquiry } from "@/lib/types";

type OrderLite = {
  id: string;
  orderNum: string;
  who: string | null;
  weekLabel: string | null;
  total: number;
  paid: boolean;
  channel: string | null;
  linked: boolean;
};

const daysAgo = (iso: string) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
const ago = (iso: string) => {
  const d = daysAgo(iso);
  return d === 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`;
};

export default function InquiryBoard({
  ready,
  inquiries,
  orders,
}: {
  ready: boolean;
  inquiries: Inquiry[];
  orders: OrderLite[];
}) {
  const router = useRouter();
  const [channel, setChannel] = useState<string>(CHANNELS[0]);
  const [contact, setContact] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const ordersById = new Map(orders.map((o) => [o.id, o]));
  const open = inquiries.filter((i) => i.status === "open");
  const unpaid = inquiries.filter((i) => i.status === "ordered" && i.order_id && !ordersById.get(i.order_id)?.paid);
  const closed = inquiries.length - open.length - unpaid.length;
  const linkable = orders.filter((o) => !o.linked).slice(0, 40);
  const untagged = orders.filter((o) => !o.channel && !o.linked).slice(0, 30);

  async function run(fn: () => PromiseLike<{ error: { message: string } | null }>) {
    setBusy(true);
    const { error } = await fn();
    setBusy(false);
    if (error) alert(error.message);
    else router.refresh();
    return !error;
  }

  async function logInquiry(e: React.FormEvent) {
    e.preventDefault();
    const ok = await run(() =>
      createClient().from("inquiries").insert({ channel, contact: contact.trim() || null, note: note.trim() || null })
    );
    if (ok) {
      setContact("");
      setNote("");
    }
  }

  async function link(inq: Inquiry, orderId: string) {
    if (!orderId) return;
    const supabase = createClient();
    const ok = await run(() => supabase.from("inquiries").update({ status: "ordered", order_id: orderId }).eq("id", inq.id));
    if (ok) await run(() => supabase.from("orders").update({ channel: inq.channel }).eq("id", orderId));
  }

  const markLost = (inq: Inquiry) => run(() => createClient().from("inquiries").update({ status: "lost" }).eq("id", inq.id));
  const tagOrder = (orderId: string, ch: string) =>
    ch ? run(() => createClient().from("orders").update({ channel: ch }).eq("id", orderId)) : Promise.resolve(false);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Inquiries</h1>
        <p className="text-xs text-stone-500">
          Log who messaged and where, link them to an order when they order, and see who still needs a nudge.
        </p>
      </div>

      {!ready && (
        <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900">
          Inquiry tracking isn&apos;t set up in this database yet. Run{" "}
          <code className="rounded bg-orange-100 px-1">supabase/migrations/20261025_inquiries.sql</code> in the Supabase
          SQL editor, then reload.
        </div>
      )}

      <form onSubmit={logInquiry} className="space-y-3 rounded-2xl border border-amber-100 bg-white p-4">
        <h2 className="text-sm font-bold text-stone-600">Log an inquiry</h2>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Channel">
          {CHANNELS.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={channel === c}
              onClick={() => setChannel(c)}
              className={`rounded-full border px-3 py-1 text-xs ${
                channel === c
                  ? "border-amber-500 bg-amber-100 font-semibold text-amber-900"
                  : "border-stone-200 bg-white text-stone-500 hover:border-amber-300"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
          <input
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="Name or handle (optional)"
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What did they ask about? (optional)"
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
          <button
            disabled={busy || !ready}
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
          >
            Log it
          </button>
        </div>
      </form>

      <Section title="Waiting on an order" count={open.length} empty="No open inquiries.">
        {open.map((i) => (
          <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
            <div>
              <span className="font-medium">{i.contact || "Someone"}</span>{" "}
              <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] text-stone-500">{i.channel}</span>
              <span className="ml-2 text-xs text-stone-400">{ago(i.created_at)}</span>
              {i.note && <p className="text-xs text-stone-500">{i.note}</p>}
            </div>
            <div className="flex items-center gap-2">
              <select
                aria-label="Link to order"
                defaultValue=""
                disabled={busy}
                onChange={(e) => link(i, e.target.value)}
                className="max-w-[210px] rounded-lg border border-stone-300 bg-white px-2 py-1 text-xs"
              >
                <option value="">Link to an order…</option>
                {linkable.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.orderNum} · {o.who ?? "—"} · ${o.total.toFixed(0)}
                  </option>
                ))}
              </select>
              <button disabled={busy} onClick={() => markLost(i)} className="text-xs text-stone-400 hover:text-stone-700">
                Didn&apos;t order
              </button>
            </div>
          </li>
        ))}
      </Section>

      <Section title="Ordered, not paid yet" count={unpaid.length} empty="Everyone who ordered has paid.">
        {unpaid.map((i) => {
          const o = ordersById.get(i.order_id!);
          return (
            <li key={i.id} className="flex items-center justify-between gap-2 px-4 py-3 text-sm">
              <div>
                <span className="font-medium">{i.contact || o?.who || "Someone"}</span>{" "}
                <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] text-stone-500">{i.channel}</span>
                <span className="ml-2 text-xs text-stone-400">inquired {ago(i.created_at)}</span>
              </div>
              {o && (
                <Link href={`/orders/${o.id}`} className="text-xs text-amber-700 underline">
                  {o.orderNum} · ${o.total.toFixed(0)} →
                </Link>
              )}
            </li>
          );
        })}
      </Section>

      <Section
        title="Orders with no channel yet"
        count={untagged.length}
        empty="Every recent order is tagged."
        hint="Pick where each one came from so it counts in Insights."
      >
        {untagged.map((o) => (
          <li key={o.id} className="flex items-center justify-between gap-2 px-4 py-3 text-sm">
            <Link href={`/orders/${o.id}`} className="underline decoration-amber-300">
              {o.orderNum} <span className="text-stone-400">· {o.who ?? "—"} · ${o.total.toFixed(0)}</span>
            </Link>
            <select
              aria-label="Channel"
              defaultValue=""
              disabled={busy || !ready}
              onChange={(e) => tagOrder(o.id, e.target.value)}
              className="rounded-lg border border-stone-300 bg-white px-2 py-1 text-xs"
            >
              <option value="">Where from?</option>
              {CHANNELS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </li>
        ))}
      </Section>

      {closed > 0 && <p className="text-xs text-stone-400">{closed} older inquiries are done (paid or didn&apos;t order).</p>}
    </div>
  );
}

function Section({
  title,
  count,
  empty,
  hint,
  children,
}: {
  title: string;
  count: number;
  empty: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-1 text-sm font-bold text-stone-600">
        {title} <span className="font-normal text-stone-400">({count})</span>
      </h2>
      {hint && <p className="mb-2 text-xs text-stone-400">{hint}</p>}
      {count === 0 ? (
        <p className="rounded-2xl border border-amber-100 bg-white p-4 text-sm text-stone-400">{empty}</p>
      ) : (
        <ul className="divide-y divide-amber-50 overflow-hidden rounded-2xl border border-amber-100 bg-white">{children}</ul>
      )}
    </section>
  );
}
