"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Ordered to match the baker's real week: shop → manage orders → bake → deliver.
const NAV = [
  { href: "/", label: "Home", icon: "🏠" },
  { href: "/shopping", label: "Shop", icon: "🛒" },
  { href: "/orders", label: "Orders", icon: "🧾" },
  { href: "/bake", label: "Bake", icon: "🥧" },
  { href: "/schedule", label: "Deliver", icon: "📍" },
  { href: "/products", label: "Menu", icon: "📋" },
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
    <div className="min-h-screen bg-amber-50/60 text-stone-800">
      <header className="sticky top-0 z-20 border-b border-amber-100 bg-white/90 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/" className="font-bold">
            🥧 {bakeryName}
          </Link>
          <nav className="hidden gap-1 sm:flex">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={`rounded-lg px-3 py-1.5 text-sm ${
                  pathname === n.href
                    ? "bg-amber-100 font-semibold text-amber-900"
                    : "text-stone-600 hover:bg-amber-50"
                }`}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/settings"
              className="rounded-lg px-2 py-1.5 text-sm text-stone-500 hover:bg-amber-50"
              title="Settings"
            >
              ⚙️
            </Link>
            <button
              onClick={signOut}
              className="rounded-lg px-2 py-1.5 text-xs text-stone-400 hover:text-stone-600"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 pb-24 sm:pb-8">{children}</main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t border-amber-100 bg-white py-1.5 sm:hidden print:hidden">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={`flex flex-col items-center rounded-lg px-2 py-1 text-[10px] ${
              pathname === n.href ? "font-bold text-amber-700" : "text-stone-500"
            }`}
          >
            <span className="text-base leading-none">{n.icon}</span>
            {n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
