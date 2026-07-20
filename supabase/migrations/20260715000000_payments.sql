-- Card Train — CyberSource payment tables.
-- The existing `points` ledger is unchanged; these add the order + audit trail the
-- card flows key off. All access is via service-role edge functions, so RLS is on
-- with no public policies (deny by default).

create table if not exists public.orders (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null,
  kind                  text not null check (kind in ('buy_points', 'shop_goods')),
  amount_minor          integer not null check (amount_minor >= 0), -- HKD cents
  currency              text not null default 'HKD',
  status                text not null default 'created'
                          check (status in (
                            'created', 'pending', 'paid', 'authorized',
                            'declined', 'error', 'captured', 'voided',
                            'reversed', 'refunded', 'partially_refunded'
                          )),
  mid                   text not null,               -- e.g. gphk088034609200 (cards)
  reference_number      text,                        -- latest attempt's unique ref
  cybersource_request_id text,                       -- set once, on first success
  ctp_amount            integer,                     -- points to credit (buy_points)
  refunded_minor        integer not null default 0,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- One order -> at most one successful authorisation. This is the double-charge
-- guard; it does NOT come from reusing reference_number (which is unique per
-- request, including retries, per GPAP).
create unique index if not exists orders_cybersource_request_id_key
  on public.orders (cybersource_request_id)
  where cybersource_request_id is not null;

create table if not exists public.payment_events (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders (id),
  type         text not null,     -- sign | sale | auth | capture | void | reversal | refund | decline | error
  amount_minor integer,
  reason_code  integer,
  actor        text,              -- 'system' or an admin user id
  detail       jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists payment_events_order_id_idx
  on public.payment_events (order_id);

alter table public.orders enable row level security;
alter table public.payment_events enable row level security;
