"use client";

import { useState } from "react";
import type { MessageTemplate, Order, Settings } from "@/lib/types";

// Message drafting: fill a template (instant, offline) or ask Claude for a
// custom draft. Output is copied to the clipboard — the baker pastes it into
// WeChat/SMS. We never send on their behalf.
export default function MessageComposer({
  order,
  templates,
  settings,
}: {
  order: Order;
  templates: MessageTemplate[];
  settings: Settings;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const lang = order.lang === "zh" ? "zh" : "en";
  const itemsSummary = (order.order_items ?? [])
    .map((i) => i.description.replace(/\s*\(\$[\d.]+\)$/, ""))
    .join(", ");

  function fillTemplate(t: MessageTemplate) {
    const body = (lang === "zh" && t.body_zh ? t.body_zh : t.body_en)
      .replaceAll("{name}", order.venmo_name ?? "")
      .replaceAll("{order_num}", order.order_num)
      .replaceAll("{items}", itemsSummary)
      .replaceAll("{total}", `$${Number(order.total).toFixed(2)}`)
      .replaceAll("{pickup_day}", order.pickup_day ?? "")
      .replaceAll("{pickup_time}", order.pickup_time ?? "")
      .replaceAll("{pickup_place}", order.pickup_place ?? "")
      .replaceAll("{venmo_handle}", settings.venmo_handle ?? "");
    setText(body.replace(/\s{2,}/g, " ").trim());
    setAiError(null);
  }

  async function aiDraft(intent: string) {
    setBusy(true);
    setAiError(null);
    const res = await fetch("/api/ai/draft-message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: order.id, intent }),
    });
    const data = await res.json();
    setBusy(false);
    if (!data.ok) {
      setAiError(data.error ?? "AI draft failed");
      return;
    }
    setText(data.draft);
  }

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <section className="rounded-2xl border border-amber-100 bg-white p-4">
      <h2 className="text-sm font-bold text-stone-600">
        Message customer{" "}
        <span className="font-normal text-stone-400">
          ({lang === "zh" ? "Chinese" : "English"} · copy → paste into WeChat/SMS)
        </span>
      </h2>

      <div className="mt-3 flex flex-wrap gap-2">
        {templates.map((t) => (
          <button
            key={t.id}
            onClick={() => fillTemplate(t)}
            className="rounded-full border border-stone-200 px-3 py-1 text-xs hover:border-amber-400 hover:bg-amber-50"
          >
            {t.name}
          </button>
        ))}
        <button
          onClick={() => aiDraft("a friendly custom message appropriate to this order's current state")}
          disabled={busy}
          className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs text-violet-800 hover:border-violet-400 disabled:opacity-50"
        >
          {busy ? "Drafting…" : "✨ AI draft"}
        </button>
      </div>
      {aiError && <p className="mt-2 text-xs text-orange-600">{aiError}</p>}

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        placeholder="Pick a template or let AI draft, then edit here…"
        className="mt-3 w-full rounded-lg border border-stone-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
      />
      <div className="mt-2 flex items-center gap-2">
        <button
          onClick={copy}
          disabled={!text}
          className="rounded-lg bg-stone-800 px-3 py-1.5 text-sm font-semibold text-white hover:bg-stone-900 disabled:opacity-40"
        >
          {copied ? "Copied ✓" : "Copy to clipboard"}
        </button>
        {settings.wechat_id && (
          <span className="text-xs text-stone-400">WeChat: {settings.wechat_id}</span>
        )}
      </div>
    </section>
  );
}
