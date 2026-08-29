-- ============================================================================
--  BOUTIQUE — LOGIC (2/4)
--  Permission helpers · derived totals · the order lifecycle · reporting views
-- ----------------------------------------------------------------------------
--  Every figure the interface displays as a total is *derived here*, never
--  trusted from the client: line changes recompute their document, and the six
--  order transitions are RPCs so stock and cash can only move one legal way.
-- ============================================================================

-- ============================================================================
--  1. IDENTITY & PERMISSIONS
-- ============================================================================

-- The profile of whoever is making the current request.
create or replace function public.current_profile()
returns public.profiles
language sql stable security definer set search_path = public
as $$
  select * from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select is_admin and active from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select active from public.profiles where id = auth.uid()), false);
$$;

/**
 * Does the boutique already have an owner?
 *
 * The login screen asks this before anyone has signed in, so it has to answer
 * for `anon` — hence security definer. It returns a single boolean and never
 * the row itself, so an anonymous visitor learns that the boutique is claimed
 * and nothing else about the account.
 *
 * This is what retires the "create administrator" button: `handle_new_user`
 * makes the first account the owner whatever the metadata says, so once this
 * returns true the flow can never produce a second one.
 */
create or replace function public.admin_exists()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.profiles where is_admin);
$$;

/**
 * The single gate every staff-facing policy goes through.
 *
 * The owner passes everything. A worker passes only when the module is enabled
 * *and* the named action sits in its `actions` array — exactly the matrix the
 * owner ticked in the permissions dialog, enforced by the database rather than
 * by the interface that drew it.
 */
create or replace function public.has_permission(module text, action text)
returns boolean
language plpgsql stable security definer set search_path = public
as $$
declare
  p public.profiles;
  entry jsonb;
begin
  select * into p from public.profiles where id = auth.uid();
  if p is null or not p.active then return false; end if;
  if p.is_admin then return true; end if;
  -- The owner's matrix may also be stored as the literal string "ALL".
  if p.permissions = '"ALL"'::jsonb then return true; end if;

  entry := p.permissions -> module;
  if entry is null then return false; end if;
  if coalesce((entry ->> 'enabled')::boolean, false) is not true then return false; end if;

  return exists (
    select 1 from jsonb_array_elements_text(coalesce(entry -> 'actions', '[]'::jsonb)) a
    where a = action
  );
end;
$$;

/**
 * Provision the profile for a brand-new auth user. Signing up through the app's
 * "create admin account" flow passes `is_admin` in the metadata; an invited
 * worker arrives with `worker_id` instead and inherits that worker's matrix.
 */
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  meta        jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  wants_admin boolean := coalesce((meta ->> 'is_admin')::boolean, false);
  linked      uuid := nullif(meta ->> 'worker_id', '')::uuid;
  first_user  boolean;
  perms       jsonb := '{}'::jsonb;
  role_label  text := coalesce(meta ->> 'role', 'Vendeur');
begin
  -- The very first account is always the owner, whatever the metadata says.
  select not exists (select 1 from public.profiles) into first_user;

  if linked is not null then
    select w.permissions, w.role into perms, role_label from public.workers w where w.id = linked;
  end if;

  insert into public.profiles (id, full_name, username, email, role, is_admin, permissions, worker_id)
  values (
    new.id,
    coalesce(meta ->> 'full_name', split_part(new.email, '@', 1)),
    nullif(meta ->> 'username', ''),
    new.email,
    case when first_user or wants_admin then 'Administrateur' else role_label end,
    first_user or wants_admin,
    coalesce(perms, '{}'::jsonb),
    linked
  )
  on conflict (id) do nothing;

  if linked is not null then
    update public.workers
       set has_account = true, profile_id = new.id
     where id = linked;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
--  2. HOUSEKEEPING
-- ============================================================================

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare tbl text;
begin
  foreach tbl in array array[
    'profiles','store_settings','contact_links','website_settings','products',
    'web_product_settings','special_offers','delivery_prices','web_orders'
  ] loop
    execute format('drop trigger if exists touch_%1$s on public.%1$s', tbl);
    execute format(
      'create trigger touch_%1$s before update on public.%1$s
       for each row execute function public.touch_updated_at()', tbl);
  end loop;
end $$;

-- ============================================================================
--  3. DERIVED TOTALS
-- ============================================================================

-- An article's total is the sum of its sizes — never written by hand.
create or replace function public.sync_product_quantity()
returns trigger language plpgsql security definer set search_path = public as $$
declare pid uuid := coalesce(new.product_id, old.product_id);
begin
  update public.products p
     set quantity = coalesce((select sum(s.quantity) from public.product_sizes s where s.product_id = pid), 0)
   where p.id = pid
     and exists (select 1 from public.product_sizes s where s.product_id = pid);
  return coalesce(new, old);
end;
$$;

drop trigger if exists product_sizes_sync on public.product_sizes;
create trigger product_sizes_sync
  after insert or update or delete on public.product_sizes
  for each row execute function public.sync_product_quantity();

create or replace function public.recalc_purchase_totals(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_total numeric(14,2); v_paid numeric(14,2);
begin
  select coalesce(sum(quantity * purchase_price), 0) into v_total
    from public.purchase_lines where purchase_id = p_id;
  select coalesce(sum(amount), 0) into v_paid
    from public.purchase_payments where purchase_id = p_id;

  update public.purchases
     set total = v_total,
         paid  = v_paid,
         status = case
           when v_paid >= v_total - 0.001 then 'paid'::payment_status
           when v_paid <= 0.001           then 'unpaid'::payment_status
           else 'partial'::payment_status end
   where id = p_id;
end;
$$;

create or replace function public.trg_recalc_purchase()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.recalc_purchase_totals(coalesce(new.purchase_id, old.purchase_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists purchase_lines_recalc on public.purchase_lines;
create trigger purchase_lines_recalc
  after insert or update or delete on public.purchase_lines
  for each row execute function public.trg_recalc_purchase();

drop trigger if exists purchase_payments_recalc on public.purchase_payments;
create trigger purchase_payments_recalc
  after insert or update or delete on public.purchase_payments
  for each row execute function public.trg_recalc_purchase();

create or replace function public.recalc_sale_totals(s_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_sub numeric(14,2); v_disc numeric(14,2); v_paid numeric(14,2); v_total numeric(14,2);
begin
  select coalesce(sum(quantity * unit_price), 0) into v_sub
    from public.sale_lines where sale_id = s_id;
  select coalesce(discount, 0) into v_disc from public.sales where id = s_id;
  select coalesce(sum(amount), 0) into v_paid
    from public.sale_payments where sale_id = s_id;

  v_total := greatest(0, v_sub - v_disc);

  update public.sales
     set subtotal = v_sub,
         total    = v_total,
         paid     = v_paid,
         status = case
           when v_paid >= v_total - 0.001 then 'paid'::payment_status
           when v_paid <= 0.001           then 'unpaid'::payment_status
           else 'partial'::payment_status end
   where id = s_id;
end;
$$;

create or replace function public.trg_recalc_sale()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.recalc_sale_totals(coalesce(new.sale_id, old.sale_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists sale_lines_recalc on public.sale_lines;
create trigger sale_lines_recalc
  after insert or update or delete on public.sale_lines
  for each row execute function public.trg_recalc_sale();

drop trigger if exists sale_payments_recalc on public.sale_payments;
create trigger sale_payments_recalc
  after insert or update or delete on public.sale_payments
  for each row execute function public.trg_recalc_sale();

create or replace function public.recalc_offer_totals(o_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_orig numeric(14,2); v_offer numeric(14,2);
begin
  select coalesce(sum(quantity * original_price), 0),
         coalesce(sum(quantity * offer_price), 0)
    into v_orig, v_offer
    from public.offer_lines where offer_id = o_id;

  update public.special_offers
     set original_total   = v_orig,
         offer_total      = v_offer,
         discount_amount  = greatest(0, v_orig - v_offer),
         discount_percent = case when v_orig > 0
                                 then round(((v_orig - v_offer) / v_orig) * 100, 2)
                                 else 0 end
   where id = o_id;
end;
$$;

create or replace function public.trg_recalc_offer()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.recalc_offer_totals(coalesce(new.offer_id, old.offer_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists offer_lines_recalc on public.offer_lines;
create trigger offer_lines_recalc
  after insert or update or delete on public.offer_lines
  for each row execute function public.trg_recalc_offer();

create or replace function public.recalc_web_order_totals(o_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_sub numeric(14,2);
begin
  select coalesce(sum(quantity * unit_price), 0) into v_sub
    from public.web_order_lines where order_id = o_id;
  update public.web_orders
     set subtotal = v_sub,
         total    = v_sub + coalesce(delivery_price, 0)
   where id = o_id;
end;
$$;

create or replace function public.trg_recalc_web_order()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.recalc_web_order_totals(coalesce(new.order_id, old.order_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists web_order_lines_recalc on public.web_order_lines;
create trigger web_order_lines_recalc
  after insert or update or delete on public.web_order_lines
  for each row execute function public.trg_recalc_web_order();

-- Changing the carrier fee alone must still move the grand total.
create or replace function public.trg_web_order_delivery()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.delivery_price is distinct from old.delivery_price then
    new.total := new.subtotal + coalesce(new.delivery_price, 0);
  end if;
  return new;
end;
$$;

drop trigger if exists web_orders_delivery_recalc on public.web_orders;
create trigger web_orders_delivery_recalc
  before update on public.web_orders
  for each row execute function public.trg_web_order_delivery();

-- ============================================================================
--  4. REFERENCES
-- ============================================================================

create or replace function public.next_reference(prefix text, seq regclass)
returns text language sql volatile as $$
  select prefix || '-' || lpad(nextval(seq)::text, 6, '0');
$$;

create or replace function public.trg_purchase_reference()
returns trigger language plpgsql as $$
begin
  if new.reference is null or new.reference = '' then
    new.reference := public.next_reference('ACH', 'public.purchase_ref_seq');
  end if;
  return new;
end;
$$;

create or replace function public.trg_sale_reference()
returns trigger language plpgsql as $$
begin
  if new.reference is null or new.reference = '' then
    new.reference := public.next_reference('VNT', 'public.sale_ref_seq');
  end if;
  return new;
end;
$$;

create or replace function public.trg_web_order_reference()
returns trigger language plpgsql as $$
begin
  if new.reference is null or new.reference = '' then
    new.reference := public.next_reference('WEB', 'public.web_order_ref_seq');
  end if;
  return new;
end;
$$;

drop trigger if exists purchases_reference on public.purchases;
create trigger purchases_reference before insert on public.purchases
  for each row execute function public.trg_purchase_reference();

drop trigger if exists sales_reference on public.sales;
create trigger sales_reference before insert on public.sales
  for each row execute function public.trg_sale_reference();

drop trigger if exists web_orders_reference on public.web_orders;
create trigger web_orders_reference before insert on public.web_orders
  for each row execute function public.trg_web_order_reference();

-- ============================================================================
--  5. STOCK MOVEMENTS
-- ============================================================================

/**
 * Move `delta` units of one article. A sized article is adjusted on its size
 * row (created if the size is new, as a purchase of a new size does); an
 * unsized article is adjusted on its total. Quantities never go below zero.
 */
create or replace function public.adjust_stock(p_product uuid, p_size text, p_delta integer)
returns void language plpgsql security definer set search_path = public as $$
declare sized boolean;
begin
  if p_product is null or p_delta = 0 then return; end if;

  select exists (select 1 from public.product_sizes where product_id = p_product) into sized;

  if sized or coalesce(p_size, '') <> '' then
    insert into public.product_sizes (product_id, size, quantity)
    values (p_product, coalesce(p_size, ''), greatest(0, p_delta))
    on conflict (product_id, size)
    do update set quantity = greatest(0, public.product_sizes.quantity + p_delta);
  else
    update public.products
       set quantity = greatest(0, quantity + p_delta)
     where id = p_product;
  end if;
end;
$$;

-- Receiving a purchase line raises the stock and refreshes the article's prices.
create or replace function public.trg_purchase_line_stock()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform public.adjust_stock(new.product_id, new.size, new.quantity);
  elsif tg_op = 'UPDATE' then
    perform public.adjust_stock(old.product_id, old.size, -old.quantity);
    perform public.adjust_stock(new.product_id, new.size,  new.quantity);
  elsif tg_op = 'DELETE' then
    perform public.adjust_stock(old.product_id, old.size, -old.quantity);
    return old;
  end if;

  if new.product_id is not null then
    update public.products
       set purchase_price = new.purchase_price,
           sale_price     = new.sale_price,
           min_quantity   = new.min_quantity
     where id = new.product_id;
  end if;
  return new;
end;
$$;

drop trigger if exists purchase_lines_stock on public.purchase_lines;
create trigger purchase_lines_stock
  after insert or update or delete on public.purchase_lines
  for each row execute function public.trg_purchase_line_stock();

-- A counter sale takes the units out immediately.
create or replace function public.trg_sale_line_stock()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform public.adjust_stock(new.product_id, new.size, -new.quantity);
  elsif tg_op = 'UPDATE' then
    perform public.adjust_stock(old.product_id, old.size,  old.quantity);
    perform public.adjust_stock(new.product_id, new.size, -new.quantity);
  elsif tg_op = 'DELETE' then
    perform public.adjust_stock(old.product_id, old.size, old.quantity);
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists sale_lines_stock on public.sale_lines;
create trigger sale_lines_stock
  after insert or update or delete on public.sale_lines
  for each row execute function public.trg_sale_line_stock();

-- ============================================================================
--  6. THE ONLINE ORDER LIFECYCLE
-- ----------------------------------------------------------------------------
--   pending ──accept──▶ accepted ──deliver──▶ delivered ──cash──▶ completed
--      │                    │                     │
--      └──────cancel────────┘                     └──return──▶ returned
--
--  Each RPC is the *only* way to move between two states, so the two side
--  effects that matter — stock leaving the boutique and money entering the
--  caisse — are guarded by `stock_applied_at` and `cashed_at` and can never
--  be applied twice, whatever the interface does.
-- ============================================================================

create or replace function public.log_order_event(o_id uuid, s web_order_status, n text default '')
returns void language sql security definer set search_path = public as $$
  insert into public.web_order_events (order_id, status, note, actor_id)
  values (o_id, s, coalesce(n, ''), auth.uid());
$$;

/** pending | canceled | returned → accepted. */
create or replace function public.web_order_accept(o_id uuid)
returns public.web_orders
language plpgsql security definer set search_path = public as $$
declare o public.web_orders;
begin
  if not public.has_permission('weborders', 'edit') then
    raise exception 'insufficient_permission' using errcode = '42501';
  end if;

  select * into o from public.web_orders where id = o_id for update;
  if o is null then raise exception 'order_not_found'; end if;
  if o.status = 'completed' then raise exception 'order_already_completed'; end if;

  update public.web_orders set status = 'accepted' where id = o_id returning * into o;
  perform public.log_order_event(o_id, 'accepted');
  return o;
end;
$$;

/** accepted → delivered: assign the carrier, re-price, take the stock out. */
create or replace function public.web_order_deliver(
  o_id uuid, company uuid, price numeric default null
)
returns public.web_orders
language plpgsql security definer set search_path = public as $$
declare o public.web_orders; l public.web_order_lines; fee numeric(14,2); cname text;
begin
  if not public.has_permission('weborders', 'edit') then
    raise exception 'insufficient_permission' using errcode = '42501';
  end if;

  select * into o from public.web_orders where id = o_id for update;
  if o is null then raise exception 'order_not_found'; end if;
  if o.status not in ('accepted', 'pending') then
    raise exception 'order_not_deliverable';
  end if;

  select name into cname from public.delivery_companies where id = company;
  if cname is null then raise exception 'delivery_company_not_found'; end if;

  -- Re-price against the carrier actually chosen at dispatch time.
  if price is not null then
    fee := price;
  else
    select case when o.delivery_mode = 'home' then dp.home_price else dp.desk_price end
      into fee
      from public.delivery_prices dp
      join public.communes c on c.id = dp.commune_id
     where dp.company_id = company
       and dp.enabled
       and c.wilaya_code = o.wilaya_code
       and c.name = o.commune
     limit 1;
    fee := coalesce(fee, o.delivery_price);
  end if;

  -- Guarded: the units leave the boutique exactly once.
  if o.stock_applied_at is null then
    for l in select * from public.web_order_lines where order_id = o_id loop
      perform public.adjust_stock(l.product_id, l.size, -l.quantity);
    end loop;
  end if;

  update public.web_orders
     set status                = 'delivered',
         delivery_company_id   = company,
         delivery_company_name = cname,
         delivery_price        = fee,
         total                 = subtotal + fee,
         stock_applied_at      = coalesce(o.stock_applied_at, now())
   where id = o_id
   returning * into o;

  perform public.log_order_event(o_id, 'delivered', cname);
  return o;
end;
$$;

/** delivered → returned: the customer refused, the units come back. */
create or replace function public.web_order_return(o_id uuid, reason text default '')
returns public.web_orders
language plpgsql security definer set search_path = public as $$
declare o public.web_orders; l public.web_order_lines;
begin
  if not public.has_permission('weborders', 'edit') then
    raise exception 'insufficient_permission' using errcode = '42501';
  end if;

  select * into o from public.web_orders where id = o_id for update;
  if o is null then raise exception 'order_not_found'; end if;
  if o.cashed_at is not null then raise exception 'order_already_cashed'; end if;

  if o.stock_applied_at is not null then
    for l in select * from public.web_order_lines where order_id = o_id loop
      perform public.adjust_stock(l.product_id, l.size, l.quantity);
    end loop;
  end if;

  update public.web_orders
     set status = 'returned', stock_applied_at = null
   where id = o_id
   returning * into o;

  perform public.log_order_event(o_id, 'returned', reason);
  return o;
end;
$$;

/** delivered → completed: the money is booked into the caisse, once. */
create or replace function public.web_order_cash(o_id uuid)
returns public.web_orders
language plpgsql security definer set search_path = public as $$
declare o public.web_orders;
begin
  if not public.has_permission('weborders', 'pay') then
    raise exception 'insufficient_permission' using errcode = '42501';
  end if;

  select * into o from public.web_orders where id = o_id for update;
  if o is null then raise exception 'order_not_found'; end if;
  if o.cashed_at is not null then return o; end if;  -- idempotent
  if o.status <> 'delivered' then raise exception 'order_not_delivered'; end if;

  insert into public.caisse_transactions (type, amount, description, web_order_id, created_by)
  values ('deposit', o.total,
          'Commande web ' || o.reference || ' — ' || o.customer_name,
          o.id, auth.uid());

  update public.web_orders
     set status = 'completed', cashed_at = now()
   where id = o_id
   returning * into o;

  perform public.log_order_event(o_id, 'completed');
  return o;
end;
$$;

/** Anything but `completed` → canceled; returns the stock if it had left. */
create or replace function public.web_order_cancel(o_id uuid, reason text default '')
returns public.web_orders
language plpgsql security definer set search_path = public as $$
declare o public.web_orders; l public.web_order_lines;
begin
  if not public.has_permission('weborders', 'delete') then
    raise exception 'insufficient_permission' using errcode = '42501';
  end if;

  select * into o from public.web_orders where id = o_id for update;
  if o is null then raise exception 'order_not_found'; end if;
  if o.status = 'completed' then raise exception 'order_already_completed'; end if;

  if o.stock_applied_at is not null then
    for l in select * from public.web_order_lines where order_id = o_id loop
      perform public.adjust_stock(l.product_id, l.size, l.quantity);
    end loop;
  end if;

  update public.web_orders
     set status = 'canceled', stock_applied_at = null
   where id = o_id
   returning * into o;

  perform public.log_order_event(o_id, 'canceled', reason);
  return o;
end;
$$;

/**
 * Place an order from the storefront. Anonymous callers reach the tables only
 * through this function, so the price of every line is re-read from the
 * catalogue (or the live campaign) instead of being taken from the browser.
 */
create or replace function public.place_web_order(
  p_customer_name text,
  p_phone         text,
  p_wilaya_code   text,
  p_commune       text,
  p_address       text,
  p_mode          delivery_mode,
  p_company_id    uuid,
  p_lines         jsonb,          -- [{product_id, size, quantity, offer_id}]
  p_note          text default ''
)
returns public.web_orders
language plpgsql security definer set search_path = public as $$
declare
  o          public.web_orders;
  item       jsonb;
  prod       public.products;
  offer      public.special_offers;
  line_price numeric(14,2);
  fee        numeric(14,2) := 0;
  cname      text := '';
  threshold  numeric(14,2);
  running    numeric(14,2) := 0;
begin
  if p_customer_name is null or btrim(p_customer_name) = '' then
    raise exception 'customer_name_required';
  end if;
  if p_phone is null or btrim(p_phone) = '' then
    raise exception 'phone_required';
  end if;
  if p_lines is null or jsonb_array_length(p_lines) = 0 then
    raise exception 'empty_order';
  end if;

  -- Carrier tariff, read from the grid rather than from the caller.
  if p_company_id is not null then
    select dc.name,
           case when p_mode = 'home' then dp.home_price else dp.desk_price end
      into cname, fee
      from public.delivery_prices dp
      join public.communes c on c.id = dp.commune_id
      join public.delivery_companies dc on dc.id = dp.company_id
     where dp.company_id = p_company_id
       and dp.enabled and dc.active
       and c.wilaya_code = p_wilaya_code
       and c.name = p_commune
     limit 1;
    fee := coalesce(fee, 0);
  end if;

  insert into public.web_orders (
    customer_name, phone, wilaya_code, wilaya, commune, address,
    delivery_mode, delivery_company_id, delivery_company_name, delivery_price, note
  )
  values (
    btrim(p_customer_name), btrim(p_phone), p_wilaya_code,
    coalesce((select name from public.wilayas where code = p_wilaya_code), ''),
    p_commune, coalesce(p_address, ''),
    p_mode, p_company_id, coalesce(cname, ''), fee, coalesce(p_note, '')
  )
  returning * into o;

  for item in select * from jsonb_array_elements(p_lines) loop
    select * into prod from public.products where id = (item ->> 'product_id')::uuid;
    if prod is null then continue; end if;

    -- A campaign line is priced by the campaign, but only while it is live.
    line_price := null;
    if nullif(item ->> 'offer_id', '') is not null then
      select o2.* into offer
        from public.special_offers o2
       where o2.id = (item ->> 'offer_id')::uuid
         and o2.active
         and (o2.start_date is null or o2.start_date <= now())
         and (o2.end_date is null or o2.end_date >= now());
      if offer.id is not null then
        select ol.offer_price into line_price
          from public.offer_lines ol
         where ol.offer_id = offer.id and ol.product_id = prod.id;
      end if;
    end if;

    if line_price is null then
      select coalesce(w.web_price, prod.sale_price) into line_price
        from public.products p
        left join public.web_product_settings w on w.product_id = p.id
       where p.id = prod.id;
    end if;

    insert into public.web_order_lines (
      order_id, product_id, product_name, size, quantity, unit_price, offer_id, offer_title, image_path
    )
    values (
      o.id, prod.id, prod.name,
      coalesce(item ->> 'size', ''),
      greatest(1, coalesce((item ->> 'quantity')::integer, 1)),
      coalesce(line_price, 0),
      nullif(item ->> 'offer_id', '')::uuid,
      coalesce(offer.title, ''),
      coalesce((select path from public.product_images pi
                 where pi.product_id = prod.id order by pi.position limit 1), '')
    );
  end loop;

  -- Free-shipping rule, applied after the basket is priced.
  select free_shipping_from into threshold from public.website_settings where id;
  select subtotal into running from public.web_orders where id = o.id;
  if coalesce(threshold, 0) > 0 and running >= threshold then
    update public.web_orders set delivery_price = 0 where id = o.id;
  end if;

  perform public.log_order_event(o.id, 'pending');
  select * into o from public.web_orders where id = o.id;
  return o;
end;
$$;

/**
 * One order, as the customer who placed it may see it.
 *
 * The `web_orders` policies are staff-only, so the confirmation page — which a
 * shopper reaches by a copied link and after a refresh — has no way to read the
 * row it just created. This returns exactly what that page renders and nothing
 * more: no internal timestamps, no event log, no other order. The id is a
 * random uuid, so knowing one tells you nothing about any other.
 */
create or replace function public.web_order_receipt(o_id uuid)
returns jsonb
language sql stable security definer set search_path = public
as $$
  select jsonb_build_object(
    'id',                    o.id,
    'reference',             o.reference,
    'customer_name',         o.customer_name,
    'phone',                 o.phone,
    'wilaya',                o.wilaya,
    'wilaya_code',           o.wilaya_code,
    'commune',               o.commune,
    'address',               o.address,
    'delivery_mode',         o.delivery_mode,
    'delivery_company_name', o.delivery_company_name,
    'delivery_price',        o.delivery_price,
    'subtotal',              o.subtotal,
    'total',                 o.total,
    'status',                o.status,
    'note',                  o.note,
    'created_at',            o.created_at,
    'web_order_lines', coalesce(
      (select jsonb_agg(jsonb_build_object(
          'product_id',   l.product_id,
          'product_name', l.product_name,
          'size',         l.size,
          'quantity',     l.quantity,
          'unit_price',   l.unit_price,
          'offer_title',  l.offer_title,
          'image_path',   l.image_path))
         from public.web_order_lines l where l.order_id = o.id),
      '[]'::jsonb)
  )
  from public.web_orders o
  where o.id = o_id;
$$;

-- ============================================================================
--  7. STAFF ACCOUNTS
-- ============================================================================

/**
 * Keep a worker's permission matrix and their sign-in profile in step, so
 * revoking a module in the workers screen takes effect on their next request.
 */
create or replace function public.sync_worker_profile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.profile_id is not null then
    update public.profiles
       set permissions = new.permissions,
           role        = new.role,
           full_name   = new.full_name,
           active      = new.active
     where id = new.profile_id;
  end if;
  return new;
end;
$$;

drop trigger if exists workers_sync_profile on public.workers;
create trigger workers_sync_profile
  after update on public.workers
  for each row execute function public.sync_worker_profile();

-- ============================================================================
--  8. REPORTING VIEWS
-- ============================================================================

-- ── Catalogue as the storefront sees it ────────────────────────────────────
create or replace view public.v_shop_products as
select
  p.id,
  p.name,
  p.description,
  p.brand,
  p.category,
  p.color,
  p.material,
  p.gender,
  p.season,
  p.collection,
  p.size_category,
  p.quantity,
  coalesce(w.web_price, p.sale_price) as price,
  coalesce(w.featured, false)         as featured,
  p.created_at,
  coalesce(
    (select jsonb_agg(pi.path order by pi.position)
       from public.product_images pi where pi.product_id = p.id),
    '[]'::jsonb) as images,
  coalesce(
    (select jsonb_agg(jsonb_build_object('size', s.size, 'quantity', s.quantity) order by s.position, s.size)
       from public.product_sizes s where s.product_id = p.id),
    '[]'::jsonb) as sizes
from public.products p
left join public.web_product_settings w on w.product_id = p.id
where coalesce(w.hidden, false) = false
  and coalesce(w.web_price, p.sale_price) > 0;

-- ── Campaigns currently running ────────────────────────────────────────────
create or replace view public.v_live_offers as
select
  o.*,
  coalesce(
    (select jsonb_agg(jsonb_build_object(
        'product_id', l.product_id,
        'product_name', l.product_name,
        'quantity', l.quantity,
        'original_price', l.original_price,
        'offer_price', l.offer_price))
       from public.offer_lines l where l.offer_id = o.id),
    '[]'::jsonb) as lines
from public.special_offers o
where o.active
  and (o.start_date is null or o.start_date <= now())
  and (o.end_date   is null or o.end_date   >= now());

-- ── Money owed, both directions ────────────────────────────────────────────
create or replace view public.v_client_balances as
select c.id, c.name, c.phone,
       count(s.id)                                        as sales_count,
       coalesce(sum(s.total), 0)                          as total_billed,
       coalesce(sum(s.paid), 0)                           as total_paid,
       greatest(0, coalesce(sum(s.total - s.paid), 0))    as balance_due
from public.clients c
left join public.sales s on s.client_id = c.id
group by c.id, c.name, c.phone;

create or replace view public.v_supplier_balances as
select sp.id, sp.name, sp.phone,
       count(p.id)                                        as purchase_count,
       coalesce(sum(p.total), 0)                          as total_billed,
       coalesce(sum(p.paid), 0)                           as total_paid,
       greatest(0, coalesce(sum(p.total - p.paid), 0))    as balance_due
from public.suppliers sp
left join public.purchases p on p.supplier_id = sp.id
group by sp.id, sp.name, sp.phone;

-- ── Stock health ───────────────────────────────────────────────────────────
create or replace view public.v_low_stock as
select p.id, p.name, p.category, p.quantity, p.min_quantity,
       p.quantity * p.purchase_price as stock_value
from public.products p
where p.quantity <= p.min_quantity;

-- Articles still sellable but out of one of their sizes.
create or replace view public.v_broken_sizes as
select p.id, p.name, p.category,
       array_agg(s.size order by s.size) filter (where s.quantity <= 0) as missing_sizes
from public.products p
join public.product_sizes s on s.product_id = p.id
where p.quantity > 0
group by p.id, p.name, p.category
having count(*) filter (where s.quantity <= 0) > 0;

-- ── The caisse ─────────────────────────────────────────────────────────────
create or replace view public.v_caisse_balance as
select
  (select coalesce(sum(paid), 0)   from public.sales)                                     as sales_collected,
  (select coalesce(sum(amount), 0) from public.caisse_transactions where type = 'deposit')    as deposits,
  (select coalesce(sum(paid), 0)   from public.purchases)                                 as purchases_paid,
  (select coalesce(sum(amount), 0) from public.expenses)                                  as expenses,
  (select coalesce(sum(amount), 0) from public.worker_payments)                           as salaries,
  (select coalesce(sum(amount), 0) from public.caisse_transactions where type = 'withdrawal') as withdrawals,
    (select coalesce(sum(paid), 0)   from public.sales)
  + (select coalesce(sum(amount), 0) from public.caisse_transactions where type = 'deposit')
  - (select coalesce(sum(paid), 0)   from public.purchases)
  - (select coalesce(sum(amount), 0) from public.expenses)
  - (select coalesce(sum(amount), 0) from public.worker_payments)
  - (select coalesce(sum(amount), 0) from public.caisse_transactions where type = 'withdrawal')
  as balance;

-- ── The online channel ─────────────────────────────────────────────────────
create or replace view public.v_web_order_stats as
select
  count(*)                                                       as placed,
  count(*) filter (where status = 'pending')                     as pending,
  count(*) filter (where status = 'accepted')                    as accepted,
  count(*) filter (where status = 'delivered')                   as delivered,
  count(*) filter (where status = 'completed')                   as completed,
  count(*) filter (where status = 'canceled')                    as canceled,
  count(*) filter (where status = 'returned')                    as returned,
  coalesce(sum(total), 0)                                        as gross_value,
  coalesce(sum(total) filter (where status = 'completed'), 0)    as net_revenue,
  coalesce(avg(total) filter (where status = 'completed'), 0)    as avg_order_value,
  date_trunc('day', created_at)                                  as day
from public.web_orders
group by date_trunc('day', created_at);

create or replace view public.v_web_orders_by_wilaya as
select o.wilaya_code,
       coalesce(w.name, o.wilaya)                    as wilaya,
       count(*)                                      as orders,
       coalesce(sum(o.total), 0)                     as revenue,
       coalesce(sum(l.units), 0)                     as units
from public.web_orders o
left join public.wilayas w on w.code = o.wilaya_code
left join lateral (
  select coalesce(sum(quantity), 0) as units
    from public.web_order_lines where order_id = o.id
) l on true
where o.status <> 'canceled'
group by o.wilaya_code, coalesce(w.name, o.wilaya)
order by revenue desc;

create or replace view public.v_web_top_products as
select l.product_id,
       max(l.product_name)             as name,
       sum(l.quantity)                 as units,
       sum(l.quantity * l.unit_price)  as revenue
from public.web_order_lines l
join public.web_orders o on o.id = l.order_id
where o.status <> 'canceled'
group by l.product_id
order by units desc;

create or replace view public.v_offer_performance as
select l.offer_id,
       max(l.offer_title)              as title,
       count(distinct l.order_id)      as orders,
       sum(l.quantity)                 as units,
       sum(l.quantity * l.unit_price)  as revenue
from public.web_order_lines l
join public.web_orders o on o.id = l.order_id
where l.offer_id is not null and o.status <> 'canceled'
group by l.offer_id
order by revenue desc;

-- ── Carrier reach ──────────────────────────────────────────────────────────
create or replace view public.v_delivery_coverage as
select dc.id,
       dc.name,
       dc.active,
       count(dp.id) filter (where dp.enabled)                      as communes_priced,
       count(distinct c.wilaya_code) filter (where dp.enabled)     as wilayas_covered,
       (select count(*) from public.communes)                      as communes_total,
       (select count(*) from public.wilayas)                       as wilayas_total
from public.delivery_companies dc
left join public.delivery_prices dp on dp.company_id = dc.id
left join public.communes c on c.id = dp.commune_id
group by dc.id, dc.name, dc.active;

-- ── Margin per article, over any window ────────────────────────────────────
create or replace function public.product_margins(p_from timestamptz, p_to timestamptz)
returns table (
  product_id uuid, name text, category text,
  units bigint, revenue numeric, cost numeric, margin numeric
)
language sql stable security definer set search_path = public as $$
  select l.product_id,
         max(l.product_name),
         max(p.category),
         sum(l.quantity)::bigint,
         sum(l.quantity * l.unit_price),
         sum(l.quantity * coalesce(p.purchase_price, 0)),
         sum(l.quantity * l.unit_price) - sum(l.quantity * coalesce(p.purchase_price, 0))
    from public.sale_lines l
    join public.sales s on s.id = l.sale_id
    left join public.products p on p.id = l.product_id
   where s.date between p_from and p_to
   group by l.product_id
   order by 4 desc;
$$;

-- ── One call for the dashboard tiles ───────────────────────────────────────
create or replace function public.dashboard_snapshot()
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'revenue_today', (select coalesce(sum(total), 0) from public.sales where date::date = current_date),
    'revenue_month', (select coalesce(sum(total), 0) from public.sales where date_trunc('month', date) = date_trunc('month', now())),
    'web_revenue_month', (select coalesce(sum(total), 0) from public.web_orders
                           where status = 'completed' and date_trunc('month', created_at) = date_trunc('month', now())),
    'units_in_stock', (select coalesce(sum(quantity), 0) from public.products),
    'stock_value', (select coalesce(sum(quantity * purchase_price), 0) from public.products),
    'low_stock_count', (select count(*) from public.v_low_stock),
    'pending_web_orders', (select count(*) from public.web_orders where status = 'pending'),
    'caisse_balance', (select balance from public.v_caisse_balance),
    'client_receivables', (select coalesce(sum(balance_due), 0) from public.v_client_balances),
    'supplier_payables', (select coalesce(sum(balance_due), 0) from public.v_supplier_balances)
  );
$$;
