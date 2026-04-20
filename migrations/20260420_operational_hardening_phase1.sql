-- Phase 1 hardening (non-destructive where possible)
-- Apply in staging first, then production.

begin;

-- 1) Prevent two pending orders on the same table.
create unique index if not exists ux_orders_one_pending_per_table
  on public.orders (table_id)
  where status = 'pending' and table_id is not null;

-- 2) Numeric safety checks.
alter table if exists public.ingredients
  add constraint ingredients_stock_non_negative check (stock >= 0) not valid;
alter table if exists public.ingredients
  add constraint ingredients_avg_price_non_negative check (average_price >= 0) not valid;

alter table if exists public.purchases
  add constraint purchases_quantity_positive check (quantity > 0) not valid;
alter table if exists public.purchases
  add constraint purchases_price_non_negative check (price >= 0) not valid;

alter table if exists public.order_items
  add constraint order_items_quantity_positive check (quantity > 0) not valid;
alter table if exists public.order_items
  add constraint order_items_price_non_negative check (price >= 0) not valid;
alter table if exists public.order_items
  add constraint order_items_hpp_non_negative check (hpp >= 0) not valid;

-- 3) Basic audit actor columns (if not present yet).
alter table if exists public.orders
  add column if not exists paid_by uuid null references auth.users(id);
alter table if exists public.orders
  add column if not exists void_by uuid null references auth.users(id);

alter table if exists public.purchases
  add column if not exists created_by uuid null references auth.users(id);

-- 4) Idempotency request id (lightweight)
alter table if exists public.orders
  add column if not exists payment_request_id text null;
create unique index if not exists ux_orders_payment_request_id
  on public.orders(payment_request_id)
  where payment_request_id is not null;

-- 5) Validate constraints after adding as NOT VALID.
alter table if exists public.ingredients validate constraint ingredients_stock_non_negative;
alter table if exists public.ingredients validate constraint ingredients_avg_price_non_negative;
alter table if exists public.purchases validate constraint purchases_quantity_positive;
alter table if exists public.purchases validate constraint purchases_price_non_negative;
alter table if exists public.order_items validate constraint order_items_quantity_positive;
alter table if exists public.order_items validate constraint order_items_price_non_negative;
alter table if exists public.order_items validate constraint order_items_hpp_non_negative;

commit;

-- NOTE:
-- RLS tightening and transactional RPC rollout are intentionally split into a separate migration phase
-- to reduce blast radius during initial hardening.
