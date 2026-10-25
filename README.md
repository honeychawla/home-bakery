# Preheat

Order management for home bakers.

One place for home bakers to track orders, see real cost and profit, know exactly what to bake and buy, and keep customers in the loop — instead of juggling spreadsheets, notes apps, and DM threads.

Built for home bakers (cottage-food operators) and piloted with **Tart Theory**, a real Seattle egg-tart bakery taking weekly pre-orders with Friday/Saturday pickups.

## Features

- **Order tracking** — every order in one list, with payment status. Orders from your website land automatically through a webhook; DM/text orders are added in seconds (paste the message and Claude structures it).
- **Cost & profit per order** — a reusable ingredient + recipe library computes cost per item; the dashboard shows weekly revenue, Venmo fees, cost, and profit.
- **Bake sheet** — exactly how many of each flavor to bake per pickup day, counting **paid orders only**. Flavors that share a base recipe are grouped and rounded up to whole batches (extras shown so you can sell them).
- **Shopping list** — one aggregated list for the week in store units ("buy 2 × quart heavy cream"), with estimated cost.
- **Pickup sheet** — per pickup slot: who's collecting what, paid status, tap-to-check-off.
- **Customer messaging** — bilingual (EN/中文) templates and Claude-drafted messages you copy into WeChat/SMS. The app never sends on your behalf.

**AI features are optional.** Without an Anthropic API key everything works except the three Claude helpers (paste-an-order, message drafting, recipe import).

## Tech Stack

[Next.js](https://nextjs.org/) (App Router, TypeScript) · [Supabase](https://supabase.com/) (Postgres + auth) · [Anthropic Claude API](https://docs.anthropic.com/) · [Vercel](https://vercel.com/) · Tailwind CSS

## Who This Is For

Home bakers who want to stop losing money to untracked costs and stop losing orders to scrolled-away DMs. You don't need to be a developer: if you can follow steps and copy-paste values, you can deploy your own private copy in about 15 minutes.

---

## Option 1: Try the Demo

Ask us for the live demo link (deployed from this repo with Tart Theory's sample data). The demo resets periodically — don't enter real customer information.

## Option 2: Deploy Your Own Copy (Recommended)

Your own copy keeps your data private, and you control the costs.

You'll need free accounts on: [GitHub](https://github.com/) · [Vercel](https://vercel.com/signup) · [Supabase](https://supabase.com/dashboard) · [Anthropic Console](https://console.anthropic.com/) (only for the AI features)

### Step 1: Create your database

1. Log in to Supabase and click **New project**. Pick a name, set a database password, choose the region closest to you, and wait ~2 minutes for setup.
2. Open the **SQL Editor**, paste the contents of [`supabase/schema.sql`](./supabase/schema.sql), and click **Run**. This creates the tables.
3. *(Optional but recommended for a first look)* Run [`supabase/seed.sql`](./supabase/seed.sql) the same way — it loads a sample bakery (Tart Theory's menu and a week of test orders) so the app isn't empty. You can clear it later; to start blank instead, skip this step.
4. Go to **Project Settings → API** and copy three values for the environment table below: **Project URL**, **anon public key**, and **service_role key** (keep that one secret, like a password).

### Step 2: Get a Claude API key (optional)

Needed only for the AI features — everything else works without it.

1. In the [Anthropic Console](https://console.anthropic.com/), go to **API Keys** and create one.
2. **Set a monthly spending limit** under Billing so you're never surprised.

### Step 3: Deploy to Vercel

Click the button. It copies this project to your GitHub account and sets up hosting:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fhoneychawla%2Fhome-bakery&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY,SUPABASE_SERVICE_ROLE_KEY,ANTHROPIC_API_KEY&envDescription=See%20the%20README%20Environment%20Variables%20table&project-name=home-bakery)

When Vercel asks for environment variables, paste the values from this table:

### Environment Variables

| Variable | Where to find it | Required | Secret? |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL | Yes | No |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon public | Yes | No |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → service_role | Yes | **Yes** |
| `ANTHROPIC_API_KEY` | Anthropic Console → API Keys | AI features only | **Yes** |
| `INTAKE_TOKEN` | You invent it (any random string) | Optional | **Yes** |

> **Never share your secret keys** or commit them to GitHub. Anyone with the `service_role` or Anthropic key can access your data or run up charges.

### Step 4: Create your baker account

1. Open your new site, go to the login page, and click **"First time? Create the baker account"**.
2. Sign up with your email and password — that's your account.
3. Then, in Supabase → **Authentication → Sign In / Up**, turn **off** "Allow new users to sign up" so nobody else can register on your deployment.

### Step 5: Connect your website's order form (optional)

If your website already takes orders (e.g. a form that posts to a Google Apps Script/Sheet), point it at your app instead — the **Settings** page shows your intake URL:

```
POST https://<your-app>.vercel.app/api/intake
Content-Type: text/plain
{"orderNum":"TT-1234","items":"2x Corn Egg Tart ($6);\n1x Classic Portuguese Egg Tart ($4)",
 "total":"$16","pickupDay":"Fri 10/30","pickupTime":"3:30–4:00 PM",
 "pickupPlace":"U District","lang":"zh","weekLabel":"Oct 30-31"}
```

- Same-order retries are deduplicated by `orderNum`.
- Live capacity for a week: `GET /api/intake?action=remaining&week=Oct%2030-31` → `{"ok":true,"orderedQty":42}`.
- If you set `INTAKE_TOKEN`, append `?token=<your token>` to the URL.
- Item names are matched against your menu, including alternate spellings (add aliases in the database's `product_aliases` table).

### Step 6: Keep your Google Sheet in sync (optional)

If you still use a Google Sheet (or want it as a backup), the app can mirror its changes back into the sheet: new orders you add in the app are appended to the right weekly tab, and marking an order paid updates the Paid / Amount Received cells. Setup is five minutes:

1. Open your orders Google Sheet → **Extensions → Apps Script**.
2. Paste the contents of [`scripts/sheet-writeback.gs`](./scripts/sheet-writeback.gs), replacing any starter code.
3. Change the `SECRET` line to a random string you invent.
4. Click **Deploy → New deployment** → type **Web app** → *Execute as: Me* · *Who has access: Anyone* → **Deploy**, and approve the one-time authorization prompt.
5. Copy the web app URL (ends in `/exec`) and paste it plus your secret into the app's **Settings → Sheet write-back**.

Notes: the script runs with *your* Google permissions — the app never sees your Google account; it only calls the URL with the secret. Orders arriving via the webhook or CSV import are *not* mirrored back (they came from the sheet's side already — mirroring them would create duplicates). To see the sheet inside the app, also fill **Settings → Google Sheet embed URL** (File → Share → Publish to web → Embed).

Your bakery app is ready to use.

---

## Option 3: Run Locally (For Developers)

Requires [Node.js 20+](https://nodejs.org/).

```bash
git clone https://github.com/honeychawla/home-bakery.git
cd home-bakery
npm install
cp .env.example .env.local   # then fill in the values from the table above
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
├── app/
│   ├── (app)/            # Baker-facing pages (dashboard, orders, bake, shopping, …)
│   ├── api/intake/       # Order webhook (website → app)
│   ├── api/ai/           # Claude helpers: parse-order, draft-message, parse-recipe
│   └── login/
├── components/           # Client components (forms, check-offs, composer)
├── lib/                  # Domain logic: costing, bake sheet, shopping list, parsing
├── scripts/
│   └── sheet-writeback.gs # Apps Script: mirrors app changes into your Google Sheet
├── supabase/
│   ├── schema.sql        # Database schema — run once in the SQL Editor
│   └── seed.sql          # Sample bakery data (optional)
└── .env.example          # Environment variable template
```

## How the weekly flow works

1. Orders arrive from your website (webhook) or you add DM orders by hand/with Claude.
2. Customers pay you on Venmo; you tap **Mark paid** and enter the amount received (fees tracked automatically). **Only paid orders count** toward baking and shopping.
3. Before shopping day: open **Shop** for the aggregated grocery list, **Bake** for per-day batch counts.
4. On pickup day: open **Pickups**, check orders off as they're collected, copy reminder messages per customer.
5. The dashboard shows the week's revenue, fees, cost, and profit the whole time.

## Troubleshooting

**The site loads but shows no data.** Check `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel, then redeploy.

**AI buttons show "not configured".** Add `ANTHROPIC_API_KEY` and redeploy — the rest of the app works without it.

**My Supabase project is paused.** Free projects pause after inactivity. Open the Supabase dashboard and click **Restore**.

**Webhook orders aren't appearing.** Test it yourself: `curl -X POST <your-app>/api/intake -d '{"orderNum":"TEST-1","items":"1x <exact menu item name> ($6)"}'`. If `unmatchedItems` is non-zero, the item name doesn't match your menu — add an alias.

**Changes to environment variables don't take effect.** In Vercel, redeploy the latest deployment.

## Costs

- **Vercel & Supabase:** free tiers comfortably cover a small bakery.
- **Claude API:** pay-as-you-go; each AI action costs a fraction of a cent. Set a spending limit.

## Contributing

Contributions welcome — please [open an issue](https://github.com/honeychawla/home-bakery/issues) first.

## License

MIT

---

Built with Claude for a small-business hackathon, piloted with Tart Theory.
