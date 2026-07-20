-- Shop-goods card checkout: a separate HKD retail price per product (distinct
-- from the CTP points price), plus a cart+shipping snapshot on the payment order.

alter table public.shop_products
  add column if not exists hkd_price_minor integer; -- HKD cents; null = not card-purchasable
comment on column public.shop_products.hkd_price_minor is
  'HKD retail price in minor units (cents) for card purchase; null = card checkout disabled for this product';

alter table public.orders
  add column if not exists metadata jsonb; -- shop_goods: { items:[...], shipping:{...} }
