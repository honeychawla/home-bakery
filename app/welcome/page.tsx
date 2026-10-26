import Link from "next/link";

export const metadata = {
  title: "Preheat — order management for home bakers",
};

export default function WelcomePage() {
  return (
    <div className="min-h-screen bg-white text-stone-900 [color-scheme:light]">
      <header className="border-b border-stone-100">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-lg font-extrabold tracking-tight">Preheat</span>
          <div className="flex items-center gap-3">
            <Link href="/signup" className="text-sm font-medium text-stone-500">
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
              Spend your time
              <br />
              baking.
              <br />
              Not managing orders.
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-stone-500">
              Order management built for how home bakers actually work: preorders, group chats,
              and Saturday pickups.
            </p>
            <div className="mt-8 flex items-center gap-4">
              <Link
                href="/signup"
                className="rounded-full bg-[#a3321f] px-6 py-3 text-sm font-semibold text-white hover:bg-[#8c2a19]"
              >
                Get started free
              </Link>
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

        <section className="mt-28">
          <h2 className="text-center text-4xl font-extrabold tracking-tight">How it works</h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-stone-500">
            Two things happen, in this order.
          </p>

          {/* Step 1 */}
          <div className="mt-14 grid items-center gap-10 sm:grid-cols-2">
            <div>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#a3321f] text-sm font-bold text-white">
                1
              </span>
              <h3 className="mt-4 text-2xl font-extrabold">Pull all your orders into one place</h3>
              <p className="mt-3 leading-relaxed text-stone-500">
                You&apos;re probably already taking orders somewhere — Squarespace, Instagram,
                WeChat, a group chat, a Google Form. You don&apos;t switch any of that. Preheat
                connects to where you already sell and reads new orders in automatically, so
                nothing gets copied by hand and nothing falls through the cracks.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                <span className="rounded-full bg-[#f3ede8] px-3 py-1 text-stone-500">Squarespace</span>
                <span className="rounded-full bg-[#f3ede8] px-3 py-1 text-stone-500">Instagram / WeChat</span>
                <span className="rounded-full bg-[#f3ede8] px-3 py-1 text-stone-500">Google Sheet / CSV</span>
                <span className="rounded-full bg-[#f3ede8] px-3 py-1 text-stone-500">Square Online</span>
              </div>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-[#faf8f6] p-6">
              <div className="flex items-center justify-between rounded-xl bg-white p-3 text-sm shadow-sm">
                <span className="font-semibold">Squarespace</span>
                <span className="rounded-full bg-[#e5efe6] px-2 py-0.5 text-xs font-bold text-[#4f7a5c]">
                  Connected
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between rounded-xl bg-white p-3 text-sm shadow-sm">
                <span className="font-semibold">Instagram DMs</span>
                <span className="rounded-full bg-[#faefdd] px-2 py-0.5 text-xs font-bold text-[#c8872f]">
                  Manual entry
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between rounded-xl bg-white p-3 text-sm shadow-sm">
                <span className="font-semibold">WeChat group</span>
                <span className="rounded-full bg-[#faefdd] px-2 py-0.5 text-xs font-bold text-[#c8872f]">
                  Manual entry
                </span>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="mt-20 grid items-center gap-10 sm:grid-cols-2">
            <div className="order-2 rounded-2xl border border-stone-200 bg-[#faf8f6] p-6 sm:order-1">
              <div className="rounded-xl bg-white p-4 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-stone-500">This week</p>
                <p className="mt-1 text-2xl font-extrabold">38 tarts, 10 orders</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-[#f6e4e0] p-2 font-semibold text-[#a3321f]">22 to buy</div>
                  <div className="rounded-lg bg-[#e5efe6] p-2 font-semibold text-[#4f7a5c]">6 flavors to bake</div>
                </div>
              </div>
            </div>
            <div className="order-1 sm:order-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#a3321f] text-sm font-bold text-white">
                2
              </span>
              <h3 className="mt-4 text-2xl font-extrabold">Preheat takes care of everything else</h3>
              <p className="mt-3 leading-relaxed text-stone-500">
                You didn&apos;t start baking to manage spreadsheets. Once orders are in, Preheat
                turns them into the actual work of the week — so the only thing left for you to
                think about is the baking itself:
              </p>
              <ul className="mt-4 space-y-2.5 text-sm">
                <li className="flex gap-2">
                  <span className="font-bold text-[#a3321f]">·</span>
                  <span>
                    <b>What to bake</b> — totals by flavor, plus the recipe scaled to exact grams
                    for each one.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-[#a3321f]">·</span>
                  <span>
                    <b>What to buy</b> — a shopping list built from real demand, with restock
                    reminders before you run out.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-[#a3321f]">·</span>
                  <span>
                    <b>When it happens</b> — a production timeline from preorder close to pickup
                    day.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-[#a3321f]">·</span>
                  <span>
                    <b>What&apos;s ready to go</b> — a pickup checklist so nothing goes out the
                    door twice.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <div className="mt-24 rounded-[2.5rem] bg-[#241a16] px-10 py-16 text-center text-white">
          <h2 className="text-4xl font-extrabold tracking-tight">
            Do what you love. Preheat does the rest.
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
