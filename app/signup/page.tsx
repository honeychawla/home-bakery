"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Step = "account" | "connectors" | "done";

type ConnectorDef = {
  id: string;
  label: string;
  description: string;
  placeholder: string;
  confirmLabel?: string;
};

const CONNECTORS: ConnectorDef[] = [
  {
    id: "squarespace",
    label: "Squarespace",
    description: "Pulls your menu, pricing, and incoming orders automatically.",
    placeholder: "yourbakery.squarespace.com",
    confirmLabel: "Connect & authorize",
  },
  {
    id: "square_online",
    label: "Square Online",
    description: "Same as above — menu and orders, synced in.",
    placeholder: "yourbakery.square.site",
    confirmLabel: "Connect & authorize",
  },
  {
    id: "google_sheet",
    label: "Google Sheet / CSV",
    description: "Already tracking orders in a sheet? Paste its link to view it inside Preheat, then import your orders as a CSV — nothing to retype.",
    placeholder: "Paste your Google Sheet link (shared: anyone with the link)",
    confirmLabel: "Import",
  },
  {
    id: "google_form",
    label: "Google Form",
    description: "Taking preorders by form? New responses become orders automatically.",
    placeholder: "Paste your Google Form link",
  },
  {
    id: "instagram",
    label: "Instagram",
    description: "Tracks orders from comments and DMs — the easiest ones to lose.",
    placeholder: "@yourbakery",
  },
  {
    id: "facebook",
    label: "Facebook / Marketplace",
    description: "Keeps listings and buyer messages alongside every other order.",
    placeholder: "facebook.com/yourbakery",
  },
  {
    id: "wechat",
    label: "WeChat / Xiaohongshu",
    description: "Orders from group chats get logged with who ordered what.",
    placeholder: "WeChat ID or 小红书 handle",
  },
];

type CustomSource = { id: string; label: string; value: string };

function ConnectorRow({
  def,
  connectedValue,
  onConfirm,
}: {
  def: ConnectorDef;
  connectedValue: string | null;
  onConfirm: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(connectedValue ?? "");
  const connected = connectedValue !== null;

  return (
    <div className={`rounded-2xl border p-4 ${connected ? "border-[#c7ddcc] bg-[#f3f9f4]" : "border-stone-200"}`}>
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f3ede8] text-sm font-bold text-stone-500">
          {def.label.slice(0, 1)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">{def.label}</p>
          <p className="text-xs text-stone-500">{def.description}</p>
        </div>
        {!open &&
          (connected ? (
            <span className="shrink-0 rounded-full bg-[#e5efe6] px-3 py-1 text-xs font-bold text-[#4f7a5c]">
              Connected
            </span>
          ) : (
            <button
              onClick={() => setOpen(true)}
              className="shrink-0 rounded-full border border-stone-200 px-3.5 py-1.5 text-xs font-semibold text-stone-700 hover:border-stone-300"
            >
              Connect
            </button>
          ))}
      </div>
      {open && (
        <div className="mt-3">
          <input
            type="text"
            autoFocus
            placeholder={def.placeholder}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#a3321f]/30"
          />
          <button
            onClick={() => {
              onConfirm(draft);
              setOpen(false);
            }}
            className="mt-2 rounded-full bg-[#a3321f] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#8c2a19]"
          >
            {def.confirmLabel ?? "Connect"}
          </button>
        </div>
      )}
    </div>
  );
}

// Turns a Google Sheets link into one that can be shown inside the app.
// "Publish to web" links (…/pubhtml) work as-is; a normal share link
// (…/spreadsheets/d/<id>/edit) becomes …/preview, which displays when the
// sheet is shared as "Anyone with the link can view".
function toSheetEmbedUrl(link: string): string | null {
  if (!link) return null;
  if (/docs\.google\.com\/spreadsheets\/.*\/pubhtml/.test(link)) return link;
  const m = link.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  return m ? `https://docs.google.com/spreadsheets/d/${m[1]}/preview` : null;
}

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("account");
  const [bakeryName, setBakeryName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  // Multi-select by design — a baker can (and usually does) connect several
  // sources at once, e.g. a website for orders plus Instagram for DMs.
  const [connected, setConnected] = useState<Record<string, string>>({});
  const [customSources, setCustomSources] = useState<CustomSource[]>([]);

  const stepNumber = { account: 1, connectors: 2, done: 3 }[step];

  async function submitAccount(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    // Demo mode: always proceed to the next step regardless of whether the
    // real signup/save succeeds — no validation blocks the walkthrough.
    const supabase = createClient();
    try {
      if (email && password) {
        await supabase.auth.signUp({ email, password });
      }
      await supabase.from("settings").update({ bakery_name: bakeryName || "My Bakery" }).eq("id", 1);
      // Optional link, saved separately so a missing website_url column
      // (migration not applied yet) never blocks the bakery name save.
      if (websiteUrl.trim()) {
        await supabase.from("settings").update({ website_url: websiteUrl.trim() }).eq("id", 1);
      }
    } catch {
      // ignored — this is a demo flow, not a gate
    }
    setBusy(false);
    setStep("connectors");
  }

  function addCustomSource() {
    setCustomSources((prev) => [...prev, { id: crypto.randomUUID(), label: "", value: "" }]);
  }

  function updateCustomSource(id: string, field: "label" | "value", val: string) {
    setCustomSources((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: val } : c)));
  }

  function removeCustomSource(id: string) {
    setCustomSources((prev) => prev.filter((c) => c.id !== id));
  }

  async function finishConnectors() {
    const sources = {
      ...connected,
      custom: customSources.filter((c) => c.label.trim() || c.value.trim()),
    };
    // Google Sheet / CSV uses the app's real features: the link becomes the
    // in-app sheet view (Orders), and the baker lands on the CSV importer.
    const sheetLink = connected["google_sheet"]?.trim() ?? "";
    const sheetEmbedUrl = toSheetEmbedUrl(sheetLink);
    try {
      const supabase = createClient();
      await supabase.from("settings").update({ sources }).eq("id", 1);
      if (sheetEmbedUrl) {
        await supabase.from("settings").update({ sheet_embed_url: sheetEmbedUrl }).eq("id", 1);
      }
    } catch {
      // ignored — demo flow, never blocks on a failed save
    }
    setStep("done");
    setTimeout(() => router.push(sheetLink ? "/orders/import" : "/"), 900);
  }

  return (
    <div className="min-h-screen bg-white text-stone-900 [color-scheme:light]">
    <div className="mx-auto flex min-h-screen max-w-xl flex-col px-6 py-10">
      <div className="flex items-center justify-between">
        <span className="text-base font-extrabold tracking-tight">Preheat</span>
        <div className="flex items-center gap-1.5">
          {[1, 2, 3].map((n) => (
            <span
              key={n}
              className="h-[7px] w-[7px] rounded-full"
              style={{
                background: n < stepNumber ? "#4f7a5c" : n === stepNumber ? "#a3321f" : "#ece5de",
              }}
            />
          ))}
        </div>
      </div>

      <div className="mt-10 flex-1">
        {step === "account" && (
          <>
            <h1 className="text-3xl font-extrabold tracking-tight">Let&apos;s get your bakery set up.</h1>
            <p className="mt-2 text-sm text-stone-500">Takes about 10 minutes. No credit card needed.</p>
            <form onSubmit={submitAccount} className="mt-8 space-y-4">
              <div>
                <label className="text-xs font-semibold text-stone-500">Bakery name</label>
                <input
                  type="text"
                  placeholder="e.g. Tart Theory"
                  value={bakeryName}
                  onChange={(e) => setBakeryName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-stone-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#a3321f]/30"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-500">
                  Website or social link <span className="font-normal text-stone-400">(optional)</span>
                </label>
                <input
                  type="text"
                  inputMode="url"
                  placeholder="e.g. tart-theory.com or instagram.com/yourbakery"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-stone-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#a3321f]/30"
                />
                <p className="mt-1 text-xs text-stone-400">Soon: we&apos;ll use it to pre-fill your menu.</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-500">Email</label>
                <input
                  type="text"
                  placeholder="you@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-stone-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#a3321f]/30"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-500">Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-stone-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#a3321f]/30"
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="mt-4 w-full rounded-full bg-[#a3321f] py-3 text-sm font-semibold text-white hover:bg-[#8c2a19] disabled:opacity-50"
              >
                {busy ? "…" : "Continue"}
              </button>
            </form>
          </>
        )}

        {step === "connectors" && (
          <>
            <h1 className="text-3xl font-extrabold tracking-tight">Where do people find and order from you?</h1>
            <p className="mt-2 text-sm text-stone-500">
              Connect anything you use — Preheat pulls in orders and menu details automatically,
              so you don&apos;t re-type anything. Connect as many or as few as you want.
            </p>

            <div className="mt-7 space-y-2.5">
              {CONNECTORS.map((def) => (
                <ConnectorRow
                  key={def.id}
                  def={def}
                  connectedValue={connected[def.id] ?? null}
                  onConfirm={(value) => setConnected((prev) => ({ ...prev, [def.id]: value }))}
                />
              ))}

              {customSources.map((c) => (
                <div key={c.id} className="rounded-2xl border border-stone-200 p-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Source name (e.g. Xiaohongshu shop)"
                      value={c.label}
                      onChange={(e) => updateCustomSource(c.id, "label", e.target.value)}
                      className="w-1/3 rounded-xl border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#a3321f]/30"
                    />
                    <input
                      type="text"
                      placeholder="Link or handle"
                      value={c.value}
                      onChange={(e) => updateCustomSource(c.id, "value", e.target.value)}
                      className="flex-1 rounded-xl border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#a3321f]/30"
                    />
                    <button
                      onClick={() => removeCustomSource(c.id)}
                      aria-label="Remove source"
                      className="shrink-0 rounded-full px-2 py-1 text-sm text-stone-400 hover:text-stone-600"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}

              <button
                onClick={addCustomSource}
                className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-stone-300 py-3 text-sm font-semibold text-stone-500 hover:border-stone-400 hover:text-stone-700"
              >
                + Add another source
              </button>
            </div>

            <div className="mt-8 flex items-center justify-between gap-3">
              <button onClick={finishConnectors} className="text-sm font-semibold text-stone-500 underline">
                Skip for now — I&apos;ll add this later
              </button>
              <button
                onClick={finishConnectors}
                className="rounded-full bg-[#a3321f] px-6 py-3 text-sm font-semibold text-white hover:bg-[#8c2a19]"
              >
                Continue
              </button>
            </div>
          </>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center py-16 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#e5efe6]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M5 12l5 5 9-10" stroke="#4f7a5c" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <h2 className="mt-5 text-xl font-bold">You&apos;re all set!</h2>
            <p className="mt-1 text-sm text-stone-500">Taking you to your dashboard…</p>
          </div>
        )}
      </div>
    </div>
    </div>
  );
}
