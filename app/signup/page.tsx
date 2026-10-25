"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Step = "account" | "platform" | "connect" | "connecting" | "connected" | "manual" | "done";

const PLATFORMS = ["Squarespace", "Square Online", "Shopify", "Google Sheet / CSV", "Other / not sure"];

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("account");
  const [bakeryName, setBakeryName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [platform, setPlatform] = useState<string | null>(null);
  const [storeUrl, setStoreUrl] = useState("");
  const [busy, setBusy] = useState(false);

  const stepNumber = { account: 1, platform: 2, connect: 3, connecting: 3, connected: 3, manual: 3, done: 4 }[step];

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
    setStep("platform");
  }

  function choosePlatform() {
    if (!platform) return;
    if (platform === "Other / not sure") {
      setStep("manual");
      return;
    }
    setStep("connect");
  }

  function startConnecting() {
    setStep("connecting");
    setTimeout(() => {
      setStep("connected");
      setTimeout(() => router.push("/"), 1100);
    }, 1600);
  }

  function finishManual() {
    router.push("/");
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col px-6 py-10">
      <div className="flex items-center justify-between">
        <span className="text-base font-extrabold tracking-tight">Preheat</span>
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4].map((n) => (
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

        {step === "platform" && (
          <>
            <h1 className="text-3xl font-extrabold tracking-tight">Where do you take orders today?</h1>
            <p className="mt-2 text-sm text-stone-500">
              Connect it so Preheat can pull in your orders automatically. You can always change
              this later.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-3">
              {PLATFORMS.map((p) => (
                <button
                  key={p}
                  onClick={() => setPlatform(p)}
                  className={`rounded-2xl border p-5 text-center text-sm font-semibold transition ${
                    p === "Other / not sure" ? "col-span-2" : ""
                  } ${
                    platform === p
                      ? "border-[#a3321f] bg-[#f6e4e0] text-[#a3321f]"
                      : "border-stone-200 text-stone-700 hover:border-stone-300"
                  }`}
                >
                  {p === "Other / not sure" ? "I don't have one yet — I'll add orders manually" : p}
                </button>
              ))}
            </div>
            <div className="mt-8 flex gap-3">
              <button onClick={() => setStep("account")} className="rounded-full px-5 py-3 text-sm font-semibold text-stone-500">
                Back
              </button>
              <button
                onClick={choosePlatform}
                disabled={!platform}
                className="flex-1 rounded-full bg-[#a3321f] py-3 text-sm font-semibold text-white hover:bg-[#8c2a19] disabled:opacity-40"
              >
                Continue
              </button>
            </div>
          </>
        )}

        {step === "connect" && (
          <>
            <h1 className="text-3xl font-extrabold tracking-tight">Connect {platform}</h1>
            <p className="mt-2 text-sm text-stone-500">
              Preheat reads new orders as they come in — nothing changes on your storefront.
            </p>
            <div className="mt-8 rounded-2xl border border-stone-200 p-6">
              <label className="text-xs font-semibold text-stone-500">Your store URL</label>
              <input
                type="text"
                placeholder="yourbakery.squarespace.com"
                value={storeUrl}
                onChange={(e) => setStoreUrl(e.target.value)}
                className="mt-1 w-full rounded-xl border border-stone-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#a3321f]/30"
              />
              <p className="mt-3 text-xs text-stone-500">
                You&apos;ll be asked to approve access on {platform}&apos;s site — Preheat never
                sees your password.
              </p>
            </div>
            <div className="mt-8 flex gap-3">
              <button onClick={() => setStep("platform")} className="rounded-full px-5 py-3 text-sm font-semibold text-stone-500">
                Back
              </button>
              <button
                onClick={startConnecting}
                className="flex-1 rounded-full bg-[#a3321f] py-3 text-sm font-semibold text-white hover:bg-[#8c2a19]"
              >
                Connect &amp; authorize
              </button>
            </div>
          </>
        )}

        {step === "connecting" && (
          <div className="flex flex-col items-center py-16 text-center">
            <svg className="animate-spin" width="40" height="40" viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="16" stroke="#ece5de" strokeWidth="4" />
              <path d="M20 4a16 16 0 0116 16" stroke="#a3321f" strokeWidth="4" strokeLinecap="round" />
            </svg>
            <h2 className="mt-6 text-xl font-bold">Connecting to {platform}…</h2>
            <p className="mt-1 text-sm text-stone-500">Pulling in your recent orders</p>
          </div>
        )}

        {step === "connected" && (
          <div className="flex flex-col items-center py-16 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#e5efe6]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M5 12l5 5 9-10" stroke="#4f7a5c" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <h2 className="mt-5 text-xl font-bold">Connected!</h2>
            <p className="mt-1 text-sm text-stone-500">Taking you to your dashboard…</p>
          </div>
        )}

        {step === "manual" && (
          <>
            <h1 className="text-3xl font-extrabold tracking-tight">No problem — add orders yourself.</h1>
            <p className="mt-2 text-sm text-stone-500">
              You can always connect a store later from Settings. For now, you&apos;ll add each
              order manually, or import a CSV whenever you&apos;re ready.
            </p>
            <div className="mt-8 flex items-center justify-center rounded-2xl border border-stone-200 p-10">
              <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
                <rect x="10" y="10" width="36" height="36" rx="8" fill="#f6e4e0" />
                <path d="M28 20v16M20 28h16" stroke="#a3321f" strokeWidth="2.4" strokeLinecap="round" />
              </svg>
            </div>
            <button
              onClick={finishManual}
              className="mt-8 w-full rounded-full bg-[#a3321f] py-3 text-sm font-semibold text-white hover:bg-[#8c2a19]"
            >
              Continue
            </button>
          </>
        )}
      </div>
    </div>
  );
}
