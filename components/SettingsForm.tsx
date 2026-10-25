"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Settings } from "@/lib/types";

export default function SettingsForm({ settings }: { settings: Settings }) {
  const router = useRouter();
  const [form, setForm] = useState({
    bakery_name: settings.bakery_name,
    venmo_handle: settings.venmo_handle ?? "",
    wechat_id: settings.wechat_id ?? "",
    sheet_embed_url: settings.sheet_embed_url ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const intakeUrl =
    typeof window !== "undefined" ? `${window.location.origin}/api/intake` : "/api/intake";

  async function save() {
    setBusy(true);
    const supabase = createClient();
    await supabase
      .from("settings")
      .update({
        bakery_name: form.bakery_name,
        venmo_handle: form.venmo_handle || null,
        wechat_id: form.wechat_id || null,
        sheet_embed_url: form.sheet_embed_url || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);
    setBusy(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
    router.refresh();
  }

  return (
    <div className="max-w-xl space-y-5">
      <h1 className="text-xl font-bold">Settings</h1>

      <section className="space-y-3 rounded-2xl border border-amber-100 bg-white p-4">
        <label className="block text-sm">
          <span className="text-xs font-semibold text-stone-500">Bakery name</span>
          <input
            value={form.bakery_name}
            onChange={(e) => setForm({ ...form, bakery_name: e.target.value })}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="text-xs font-semibold text-stone-500">Venmo handle</span>
          <input
            value={form.venmo_handle}
            onChange={(e) => setForm({ ...form, venmo_handle: e.target.value })}
            placeholder="@your-bakery"
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="text-xs font-semibold text-stone-500">WeChat ID</span>
          <input
            value={form.wechat_id}
            onChange={(e) => setForm({ ...form, wechat_id: e.target.value })}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="text-xs font-semibold text-stone-500">
            Google Sheet embed URL (optional)
          </span>
          <input
            value={form.sheet_embed_url}
            onChange={(e) => setForm({ ...form, sheet_embed_url: e.target.value })}
            placeholder="https://docs.google.com/spreadsheets/d/…/pubhtml?widget=true"
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
          />
          <span className="mt-1 block text-[11px] leading-snug text-stone-400">
            In Google Sheets: File → Share → Publish to web → Embed, copy the URL from the
            iframe code. Adds a live &quot;Sheet&quot; view on the Orders page. Note: published
            sheets are viewable by anyone with the URL.
          </span>
        </label>
        <button
          onClick={save}
          disabled={busy}
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
        >
          {saved ? "Saved ✓" : busy ? "Saving…" : "Save"}
        </button>
      </section>

      <section className="rounded-2xl border border-amber-100 bg-white p-4 text-sm">
        <h2 className="font-bold text-stone-600">Connect your website</h2>
        <p className="mt-1 text-xs text-stone-500">
          Point your website&apos;s order form at this URL (POST, JSON) and new orders land
          here automatically. It accepts the same payload shape as a Google Apps Script
          web app:{" "}
          <code className="rounded bg-stone-100 px-1">
            {"{ orderNum, items, total, pickupDay, pickupTime, pickupPlace, lang, weekLabel }"}
          </code>
        </p>
        <code className="mt-2 block break-all rounded-lg bg-stone-800 p-3 text-xs text-amber-200">
          {intakeUrl}
        </code>
        <p className="mt-2 text-[11px] text-stone-400">
          Optional: set <code>INTAKE_TOKEN</code> in your environment and append{" "}
          <code>?token=…</code> to require a shared secret. Live capacity is served at{" "}
          <code>{intakeUrl}?action=remaining&week=…</code>
        </p>
      </section>
    </div>
  );
}
