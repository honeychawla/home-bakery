-- Home Baker Order Hub — database schema
-- Run this once in the Supabase SQL Editor (or via psql) when setting up your own copy.
-- Single-tenant: one deployment = one bakery. All authenticated users are "the baker".

-- ============ Core reference tables ============

create table if not exists settings (
  id int primary key default 1 check (id = 1), -- single row
  bakery_name text not null default 'My Bakery',
  currency text not null default 'USD',
  venmo_handle text,
  wechat_id text,
  -- publish-to-web URL of your existing Google Sheet, for the in-app view
  sheet_embed_url text,
  -- Apps Script web app that writes app changes back into the sheet
  -- (see scripts/sheet-writeback.gs and the README)
  sheet_writeback_url text,
  sheet_writeback_secret text,
  -- Onboarding-connected sources: { [connectorId]: value, custom: [{label, value}] }
  sources jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists recipe_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  -- how many tarts/items one batch of the shared base recipe makes (for round-up)
  batch_size int not null default 8,
  created_at timestamptz not null default now()
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name_en text not null unique,
  name_zh text,
  price numeric(10,2) not null default 0,
  -- per-batch recipe yield (tarts per batch) when a structured recipe exists
  batch_yield int not null default 1,
  packaging_cost numeric(10,4) not null default 0,
  -- fallback cost when no structured recipe: estimated filling cost per unit
  est_filling_cost numeric(10,4),
  labor_minutes numeric(10,2),
  recipe_group_id uuid references recipe_groups(id) on delete set null,
  is_bundle boolean not null default false, -- e.g. "Halloween Box of 6"
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- alternate names seen in webhook/import item strings ("Black Sesame Mochi Tart"
-- vs "Black Sesame Mochi Egg Tart") so every order line maps to one product
create table if not exists product_aliases (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  alias text not null unique
);

create table if not exists ingredients (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  purchase_qty numeric(10,2) not null default 1,   -- e.g. 1.89 (L), 907 (g), 12 (count)
  purchase_unit text not null default 'unit',      -- e.g. "half-gallon", "bag", "dozen"
  purchase_cost numeric(10,2) not null default 0,  -- cost of one purchase
  base_unit text not null default 'g',             -- g | ml | unit
  base_qty numeric(12,2) not null default 1,       -- base units per purchase (e.g. 1890)
  price_effective_date date not null default current_date,
  -- restock prediction: stock on hand (base units; null = untracked) and, for
  -- non-recipe consumables like packaging, consumption per tart sold
  stock_qty numeric(12,2),
  stock_updated_at timestamptz,
  usage_per_tart numeric(10,4),
  created_at timestamptz not null default now()
);

-- per-BATCH ingredient quantities for a product's recipe
create table if not exists product_ingredients (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  ingredient_id uuid not null references ingredients(id) on delete cascade,
  qty_base numeric(12,2) not null, -- in the ingredient's base_unit, per batch
  note text,
  unique (product_id, ingredient_id)
);

-- ============ Fulfillment ============

create table if not exists pickup_locations (
  id uuid primary key default gen_random_uuid(),
  label_en text not null,
  label_zh text,
  address text,
  map_link text
);

create table if not exists pickup_slots (
  id uuid primary key default gen_random_uuid(),
  day_of_week int not null check (day_of_week between 0 and 6), -- 0=Sunday
  start_time time not null,
  end_time time not null,
  location_id uuid references pickup_locations(id) on delete set null,
  capacity int, -- max tarts (null = unlimited)
  -- order cutoff: hour of day (0-23) on the day before pickup
  cutoff_hour int not null default 21,
  active boolean not null default true
);

-- ============ Customers & orders ============

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  venmo_name text,
  phone text,
  email text,
  wechat text,
  notes text, -- allergies, preferences
  created_at timestamptz not null default now()
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  order_num text not null unique,         -- e.g. TT-5342; dedupe key for webhook
  source text not null default 'manual',  -- webhook | manual | import | ai_quick_add
  customer_id uuid references customers(id) on delete set null,
  status text not null default 'confirmed'
    check (status in ('confirmed','ready','completed','cancelled','no_show')),
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid','deposit','paid','refunded')),
  total numeric(10,2) not null default 0,
  amount_received numeric(10,2),          -- after Venmo/platform fees
  venmo_name text,
  lang text default 'en',
  week_label text,                        -- e.g. "Oct 23-24"; groups the bake week
  pickup_day text,                        -- e.g. "Fri 10/23" (as sent by the site)
  pickup_time text,                       -- e.g. "3:30–4:00 PM"
  pickup_place text,
  pickup_slot_id uuid references pickup_slots(id) on delete set null,
  picked_up_at timestamptz,
  raw_items text,                         -- original webhook items string, for audit
  notes text,
  placed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists orders_week_idx on orders (week_label);
create index if not exists orders_status_idx on orders (status, payment_status);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id) on delete set null, -- null = unmatched line
  description text not null, -- original line text ("1x Corn Egg Tart ($6)")
  qty int not null default 1,
  unit_price numeric(10,2) not null default 0
);
create index if not exists order_items_order_idx on order_items (order_id);

-- ============ Weeks & messaging ============

create table if not exists weeks (
  week_label text primary key,  -- "Oct 23-24"
  start_date date,
  status text not null default 'open' check (status in ('open','locked','closed'))
);

create table if not exists message_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  body_en text not null,
  body_zh text
);

create table if not exists message_log (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete set null,
  customer_id uuid references customers(id) on delete set null,
  channel text not null default 'wechat', -- wechat | sms | email | other
  body text not null,
  created_at timestamptz not null default now()
);

-- Weekly production plan: custom recurring steps (hard deadlines like order
-- cutoffs and bake-finish times are derived from pickup_slots at render time).
create table if not exists plan_steps (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  day_of_week int not null check (day_of_week between 0 and 6),
  at_time time,
  notes text,
  sort_order int not null default 0,
  active boolean not null default true
);

-- Per-week check-offs of plan steps (custom and auto, keyed by step_key).
create table if not exists plan_checks (
  week_label text not null,
  step_key text not null,
  checked_at timestamptz not null default now(),
  primary key (week_label, step_key)
);

-- Grocery-run check-offs: which shopping-list items are already bought,
-- per week. Persisted so a list planned on desktop checks off on the phone.
create table if not exists shopping_checks (
  week_label text not null,
  ingredient_id uuid not null references ingredients(id) on delete cascade,
  checked_at timestamptz not null default now(),
  primary key (week_label, ingredient_id)
);

-- Bake-day check-offs: which flavors are done baking, per pickup day.
create table if not exists bake_checks (
  week_label text not null,
  day text not null,
  product_id uuid not null references products(id) on delete cascade,
  checked_at timestamptz not null default now(),
  primary key (week_label, day, product_id)
);

-- ============ Row Level Security ============
-- Single-tenant: any authenticated user (the baker) has full access.
-- The anon key can read/write nothing; the webhook intake runs server-side
-- with the service role key.

do $$
declare t text;
begin
  foreach t in array array[
    'settings','recipe_groups','products','product_aliases','ingredients',
    'product_ingredients','pickup_locations','pickup_slots','customers',
    'orders','order_items','weeks','message_templates','message_log',
    'shopping_checks','plan_steps','plan_checks','bake_checks'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists baker_all on %I', t);
    execute format(
      'create policy baker_all on %I for all to authenticated using (true) with check (true)', t
    );
  end loop;
end $$;

insert into settings (id) values (1) on conflict (id) do nothing;
