import Link from "next/link";

export const metadata = {
  title: "Preheat — order management for home bakers",
};

export default function WelcomePage() {
  return (
    <div className="min-h-screen bg-white text-stone-900">
      <header className="border-b border-stone-100">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-lg font-extrabold tracking-tight">Preheat</span>
          <nav className="hidden gap-8 text-sm font-medium text-stone-500 sm:flex">
            <span>How it works</span>
            <span>Pricing</span>
            <span>FAQ</span>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-stone-500">
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-[#a3321f] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#8c2a19]"
            >
              Get started free
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid items-center gap-12 sm:grid-cols-2">
          <div>
            <span className="inline-block rounded-full bg-[#f6e4e0] px-3 py-1 text-xs font-bold text-[#a3321f]">
              For home bakers taking preorders
            </span>
            <h1 className="mt-5 text-6xl font-extrabold leading-[0.95] tracking-tight">
              Run your
              <br />
              bake business
              <br />
              like clockwork.
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-stone-500">
              Preheat turns scattered DMs, spreadsheets, and payment screenshots into one place:
              orders, bake totals, shopping lists, and pickup day — sorted before you ever turn on
              the oven.
            </p>
            <div className="mt-8 flex items-center gap-4">
              <Link
                href="/signup"
                className="rounded-full bg-[#a3321f] px-6 py-3 text-sm font-semibold text-white hover:bg-[#8c2a19]"
              >
                Get started free
              </Link>
              <span className="text-sm font-medium text-stone-500 underline">
                See how it works →
              </span>
            </div>
            <p className="mt-4 text-xs text-stone-400">
              No credit card needed · set up in 10 minutes
            </p>
          </div>

          <div className="flex justify-center">
            <svg width="340" height="320" viewBox="0 0 360 340" fill="none">
              <rect x="30" y="40" width="300" height="260" rx="28" fill="#fff" stroke="#241a16" strokeWidth="2" />
              <rect x="52" y="64" width="150" height="14" rx="7" fill="#241a16" />
              <rect x="52" y="90" width="100" height="10" rx="5" fill="#ece5de" />
              <rect x="52" y="118" width="256" height="54" rx="14" fill="#f6e4e0" />
              <circle cx="78" cy="145" r="16" fill="#e0c3ba" stroke="#241a16" strokeWidth="2" />
              <rect x="104" y="136" width="120" height="9" rx="4.5" fill="#241a16" />
              <rect x="104" y="150" width="80" height="7" rx="3.5" fill="#a8a29e" />
              <rect x="260" y="134" width="40" height="22" rx="11" fill="#a3321f" />
              <rect x="52" y="186" width="256" height="54" rx="14" fill="#e5efe6" />
              <circle cx="78" cy="213" r="16" fill="#bcd8c4" stroke="#241a16" strokeWidth="2" />
              <rect x="104" y="204" width="120" height="9" rx="4.5" fill="#241a16" />
              <rect x="104" y="218" width="80" height="7" rx="3.5" fill="#a8a29e" />
              <rect x="260" y="202" width="40" height="22" rx="11" fill="#4f7a5c" />
              <rect x="52" y="254" width="256" height="24" rx="12" fill="#241a16" />
            </svg>
          </div>
        </div>

        <div className="mt-24 rounded-[2.5rem] bg-[#241a16] px-10 py-16 text-center text-white">
          <h2 className="text-4xl font-extrabold tracking-tight">
            Stop juggling DMs and spreadsheets.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-stone-300">
            Preheat is free to start — built by a baker, for bakers.
          </p>
          <div className="mt-8">
            <Link
              href="/signup"
              className="inline-block rounded-full bg-white px-7 py-3 text-sm font-bold text-[#241a16]"
            >
              Get started free
            </Link>
          </div>
        </div>
      </main>

      <footer className="border-t border-stone-100 py-8 text-center text-xs text-stone-400">
        Preheat — order management for home bakers.
      </footer>
    </div>
  );
}
