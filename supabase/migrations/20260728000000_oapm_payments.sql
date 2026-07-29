-- Card Train — OAPM (Alipay CN/HK, WeChat Pay) payment rail.
-- Extends the existing orders/payment_events tables (does not fork them) so one
-- order table serves both the CyberSource card rail and this OAPM wallet rail.
-- See docs/superpowers/specs/2026-07-28-cardtrain-oapm-design.md §6.

alter table public.orders
  add column if not exists gateway text not null default 'cybersource';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'orders_gateway_check'
  ) then
    alter table public.orders
      add constraint orders_gateway_check check (gateway in ('cybersource', 'oapm'));
  end if;
end $$;

-- Our stable merchant order number for the OAPM rail (unlike CyberSource's
-- reference_number, this does NOT change on retry — it is used to look the order
-- back up from Query/Refund calls, and to correlate an incoming notify).
alter table public.orders
  add column if not exists oapm_out_trade_no text;

-- EFT's trade id; set once, on first confirmed TRADE_SUCCESS from notify/query —
-- the idempotency guard, mirroring cybersource_request_id on the card rail.
alter table public.orders
  add column if not exists oapm_eft_trade_no text;

alter table public.orders
  add column if not exists oapm_wallet text; -- ALIPAYHK | ALIPAYCN | WECHATCN

alter table public.orders
  add column if not exists oapm_pay_scene text; -- WEB | WAP

-- One order -> at most one successful OAPM payment.
create unique index if not exists orders_oapm_eft_trade_no_key
  on public.orders (oapm_eft_trade_no)
  where oapm_eft_trade_no is not null;

-- notify/query correlate back to an order by the stable out_trade_no.
create unique index if not exists orders_oapm_out_trade_no_key
  on public.orders (oapm_out_trade_no)
  where oapm_out_trade_no is not null;
