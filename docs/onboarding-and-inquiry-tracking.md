# Onboarding & inquiry tracking — design notes (draft)

Status: draft for discussion. Nothing here has been applied to any database.

## The assumption we're designing for

A new baker has **no spreadsheet and no order webhook**. They may have a Wix or
Squarespace site, but orders arrive by **DM / message / social apps**, and pickup is in
person. Each baker gets their **own install** (one deployment = one bakery, as today).

So the app can't wait for orders to arrive from a website. The baker types them in, and
the fastest way is the existing "paste a message → Claude structures the order" flow.

## What this branch adds (pre-work)

| Piece | Where |
|---|---|
| `orders.channel` + `inquiries` table (migration, not yet applied) | `supabase/migrations/20261025_inquiries.sql` |
| **Inquiries** page: log who messaged and where, link them to an order, nudge list, tag untagged orders | `app/(app)/inquiries`, `components/InquiryBoard.tsx` |
| Funnel (inquiry → order → paid) per channel and week | `lib/funnel.ts` |
| Insights' *Conversion & sources* panel uses the real funnel once there's data; sample data before that | `components/InsightsDashboard.tsx` |

Funnel rules are documented at the top of `lib/funnel.ts`. In short: paid = paid orders
by channel; inquiries = logged inquiries + orders nobody linked an inquiry to, so
conversion can't exceed 100%.

Known gaps: open inquiries only show up in weeks that already have orders; the channel
list is a constant (`lib/channels.ts`); channel isn't yet a field on the New Order form or
the paste-a-message flow (the Inquiries page tags orders after the fact to avoid touching
those files).

## Onboarding wizard (proposed)

1. Shop basics — name, currency, payment handle (Venmo / Zelle)
2. Channels — which apps do customers use? (becomes the channel list)
3. Menu — **import from the baker's website URL** (below) or type it in
4. Recipes & ingredient prices — needed for cost/profit; Claude import from notes or photos
5. Pickup places and times
6. First order — paste a message, see it on the dashboard

## Importing from the baker's website

What a site can give us: **menu, prices (including bundles like "4 for $20"), descriptions,
pickup places/times, payment handles, contact links.**
What it can't: recipes and ingredient costs, past orders, which channels customers use.

Sketch: baker pastes a URL → server fetches the page(s) → Claude extracts structured
products / pickup info → baker reviews and edits → save. Notes:

- Squarespace is mostly server-rendered; Wix is heavy on client-side JS, so a plain fetch
  may come back empty. Fallbacks: paste the page text, or upload a screenshot (vision).
- Always show an editable review screen; extraction will be wrong sometimes.
- Fetch server-side with a timeout and size cap; only fetch URLs the baker typed.

## Open questions for the engineer

- Multi-bakery later? Today's schema is single-tenant; per-install deploys avoid that for now.
- One-click install: Vercel deploy button + Supabase integration + a first-login setup wizard.
- Inquiry model: separate `inquiries` table (this branch) vs. an `inquiry` order status.
- Should channel become a required field on every new order?
