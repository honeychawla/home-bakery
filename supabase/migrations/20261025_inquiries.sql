-- Inquiry & channel tracking.
-- Idempotent: safe to run more than once. Run in the Supabase SQL editor
-- AFTER schema.sql. Nothing here changes existing columns or data.

-- Where an order came from (Instagram, WeChat, ...). Null = not tagged yet.
alter table orders add column if not exists channel text;
create index if not exists orders_channel_idx on orders (channel);

-- Someone who messaged but hasn't (necessarily) ordered. The funnel is
--   inquiry -> order (order_id set) -> paid (orders.payment_status = 'paid')
create table if not exists inquiries (
  id uuid primary key default gen_random_uuid(),
  channel text not null,                 -- Instagram | WeChat | Xiaohongshu | ...
  contact text,                          -- name or handle, optional
  note text,                             -- what they asked about
  status text not null default 'open'
    check (status in ('open', 'ordered', 'lost')),
  order_id uuid references orders(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists inquiries_status_idx on inquiries (status, created_at desc);
create index if not exists inquiries_order_idx on inquiries (order_id);

-- Same single-tenant policy as every other table: any signed-in baker has full access.
alter table inquiries enable row level security;
drop policy if exists baker_all on inquiries;
create policy baker_all on inquiries for all to authenticated using (true) with check (true);
