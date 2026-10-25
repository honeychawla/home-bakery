"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Ordered to match the baker's real week: shop → manage orders → bake → deliver.
const NAV = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Menu" },
  { href: "/insights", label: "Insights" },
  { href: "/plan", label: "Plan" },
  { href: "/shopping", label: "Shop" },
  { href: "/orders", label: "Orders" },
  { href: "/bake", label: "Bake" },
  { href: "/schedule", label: "Deliver" },
];

// Overview group stays flat; the real workflow is presented as 3 connected
// steps below, each a card — Prep bundles the pre-bake pages (orders intake,
// shopping list, timeline) since they all happen before the oven goes on.
const OVERVIEW = NAV.filter((n) => ["/", "/products", "/insights"].includes(n.href));

const STEPS = [
  {
    number: 1,
    label: "Prep",
    desc: "Orders, shopping, timeline",
    paths: ["/orders", "/shopping", "/plan"],
    subItems: [
      { href: "/orders", label: "Orders" },
      { href: "/shopping", label: "Shop" },
      { href: "/plan", label: "Plan" },
    ],
  },
  { number: 2, label: "Bake", desc: "Order breakdown", href: "/bake" },
  { number: 3, label: "Deliver", desc: "Pickup checklist", href: "/schedule" },
];

export default function AppShell({
  bakeryName,
  children,
}: {
  bakeryName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800 sm:flex">
      {/* Left sidebar (desktop) */}
      <aside className="hidden sm:flex sm:sticky sm:top-0 sm:h-screen sm:w-60 sm:shrink-0 sm:flex-col sm:border-r sm:border-stone-200 sm:bg-white print:hidden">
        <Link href="/welcome" className="px-5 pt-5 text-base font-bold tracking-tight">
          Preheat
        </Link>

        <div className="mx-4 mt-4 flex items-center gap-2 rounded-xl border border-stone-200 px-3 py-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-900 text-xs font-bold text-white">
            {bakeryName.slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{bakeryName}</p>
            <p className="text-[11px] text-stone-400">Bakery account</p>
          </div>
        </div>

        <nav className="mt-5 flex flex-1 flex-col gap-5 px-3">
          <div className="flex flex-col gap-0.5">
            {OVERVIEW.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={`rounded-lg px-3 py-2 text-sm ${
                  pathname === n.href
                    ? "bg-amber-50 font-semibold text-amber-900"
                    : "text-stone-600 hover:bg-stone-50"
                }`}
              >
                {n.label}
              </Link>
            ))}
          </div>

          <div>
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wide text-stone-400">
              Workflow
            </p>
            <div className="relative flex flex-col gap-2 pl-1">
              <div className="absolute left-[19px] top-6 bottom-6 w-[2px] bg-stone-200" />
              {STEPS.map((step) => {
                const isActive = step.href ? pathname === step.href : step.paths!.includes(pathname);
                return (
                  <div
                    key={step.number}
                    className={`relative z-10 rounded-2xl border p-2.5 ${
                      isActive ? "border-[#a3321f] bg-[#f6e4e0]" : "border-stone-200 bg-white"
                    }`}
                  >
                    <Link
                      href={step.href ?? step.subItems![0].href}
                      className="flex items-center gap-2.5"
                    >
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ring-4 ring-white ${
                          isActive ? "bg-[#a3321f] text-white" : "bg-stone-100 text-stone-400"
                        }`}
                      >
                        {step.number}
                      </span>
                      <div className="min-w-0">
                        <p className={`text-sm font-bold ${isActive ? "text-[#a3321f]" : "text-stone-800"}`}>
                          {step.label}
                        </p>
                        <p className="truncate text-[11px] text-stone-400">{step.desc}</p>
                      </div>
                    </Link>
                    {step.subItems && (
                      <div className="mt-2 flex flex-col gap-0.5 border-t border-stone-200/70 pt-2 pl-9">
                        {step.subItems.map((s) => (
                          <Link
                            key={s.href}
                            href={s.href}
                            className={`rounded-md px-2 py-1 text-xs ${
                              pathname === s.href
                                ? "font-semibold text-[#a3321f]"
                                : "text-stone-500 hover:text-stone-800"
                            }`}
                          >
                            {s.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </nav>

        <div className="space-y-0.5 border-t border-stone-200 px-3 py-3">
          <Link
            href="/settings"
            className="block rounded-lg px-3 py-2 text-sm text-stone-500 hover:bg-stone-50"
          >
            Settings
          </Link>
          <button
            onClick={signOut}
            className="block w-full rounded-lg px-3 py-2 text-left text-sm text-stone-400 hover:bg-stone-50 hover:text-stone-600"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-20 border-b border-stone-200 bg-white/90 backdrop-blur sm:hidden print:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/welcome" className="flex items-baseline gap-2">
            <span className="font-bold">Preheat</span>
            <span className="text-xs text-stone-400">· {bakeryName}</span>
          </Link>
          <Link
            href="/settings"
            className="rounded-lg px-2 py-1.5 text-sm text-stone-500 hover:bg-amber-50"
            title="Settings"
          >
            Settings
          </Link>
        </div>
      </header>

      <main className="min-w-0 flex-1 px-4 py-6 pb-24 sm:px-8 sm:py-8 sm:pb-8">
        <div className="mx-auto max-w-4xl">{children}</div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t border-stone-200 bg-white py-1.5 sm:hidden print:hidden">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={`flex flex-col items-center rounded-lg px-2 py-1.5 text-[11px] ${
              pathname === n.href ? "font-bold text-amber-700" : "text-stone-500"
            }`}
          >
            {n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
