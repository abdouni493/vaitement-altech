-- ============================================================================
--  BOUTIQUE — SECURITY (3/4)
--  Row-level security · storage buckets · grants
-- ----------------------------------------------------------------------------
--  Three audiences share this database:
--
--   • anon      — a shopper on the storefront. Reads the published catalogue,
--                 live campaigns, contact details and the delivery grid; writes
--                 nothing directly, and places an order only through the
--                 `place_web_order()` function, which re-prices every line.
--   • staff     — a signed-in worker. Every table is gated by
--                 `has_permission(module, action)`, so the matrix the owner
--                 ticked in the permissions dialog is enforced here, not in the
--                 interface that drew it.
--   • owner     — `profiles.is_admin`. Passes every check.
-- ============================================================================

-- ============================================================================
--  1. ENABLE RLS EVERYWHERE
-- ============================================================================

do $$
declare tbl text;
begin
  foreach tbl in array array[
    'profiles','store_settings','contact_links','website_settings',
    'brands','categories','colors','materials','worker_roles','size_scales',
    'products','product_sizes','product_images','web_product_settings',
    'suppliers','clients',
    'purchases','purchase_lines','purchase_payments',
    'sales','sale_lines','sale_payments',
    'workers','worker_advances','worker_absences','worker_payments',
    'expenses','caisse_transactions',
    'special_offers','offer_lines',
    'wilayas','communes','delivery_companies','delivery_prices',
    'web_orders','web_order_lines','web_order_events'
  ] loop
    execute format('alter table public.%I enable row level security', tbl);
  end loop;
end $$;

-- Start from a clean slate so the file can be re-run.
do $$
declare r record;
begin
  for r in select schemaname, tablename, policyname from pg_policies where schemaname = 'public'
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- ============================================================================
--  2. PROFILES
-- ============================================================================

-- Everyone signed in may read their own row; the owner reads the whole staff.
create policy profiles_select_self on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- Only the owner may hand out or revoke permissions.
create policy profiles_admin_write on public.profiles
  for insert to authenticated
  with check (public.is_admin());

create policy profiles_admin_delete on public.profiles
  for delete to authenticated
  using (public.is_admin());

-- ============================================================================
--  3. HELPER MACROS  (expanded inline below — Postgres has no policy macros)
-- ============================================================================
--   read  : public.has_permission('<module>', 'view')
--   write : public.has_permission('<module>', 'create' | 'edit' | 'delete')

-- ============================================================================
--  4. STORE IDENTITY
-- ============================================================================

-- The shopper needs the store's name, logo and description to render the site.
create policy store_settings_public_read on public.store_settings
  for select to anon, authenticated using (true);

create policy store_settings_write on public.store_settings
  for all to authenticated
  using (public.has_permission('settings', 'edit'))
  with check (public.has_permission('settings', 'edit'));

create policy contact_links_public_read on public.contact_links
  for select to anon, authenticated using (true);

create policy contact_links_write on public.contact_links
  for all to authenticated
  using (public.has_permission('website', 'edit'))
  with check (public.has_permission('website', 'edit'));

create policy website_settings_public_read on public.website_settings
  for select to anon, authenticated using (true);

create policy website_settings_write on public.website_settings
  for all to authenticated
  using (public.has_permission('website', 'edit'))
  with check (public.has_permission('website', 'edit'));

-- ============================================================================
--  5. REFERENCE LISTS
-- ============================================================================

do $$
declare tbl text;
begin
  foreach tbl in array array['brands','categories','colors','materials','size_scales'] loop
    execute format($f$
      create policy %1$s_public_read on public.%1$s
        for select to anon, authenticated using (true);
      create policy %1$s_write on public.%1$s
        for all to authenticated
        using (public.has_permission('stock', 'create'))
        with check (public.has_permission('stock', 'create'));
    $f$, tbl);
  end loop;
end $$;

create policy worker_roles_read on public.worker_roles
  for select to authenticated using (public.has_permission('workers', 'view'));
create policy worker_roles_write on public.worker_roles
  for all to authenticated
  using (public.has_permission('workers', 'create'))
  with check (public.has_permission('workers', 'create'));

-- ============================================================================
--  6. CATALOGUE
-- ----------------------------------------------------------------------------
--  The public may read an article only while it is published; staff read the
--  whole catalogue subject to the `stock` module.
-- ============================================================================

create policy products_public_read on public.products
  for select to anon
  using (
    not exists (
      select 1 from public.web_product_settings w
       where w.product_id = products.id and w.hidden
    )
  );

create policy products_staff_read on public.products
  for select to authenticated using (public.has_permission('stock', 'view'));

create policy products_insert on public.products
  for insert to authenticated with check (public.has_permission('stock', 'create'));
create policy products_update on public.products
  for update to authenticated
  using (public.has_permission('stock', 'edit'))
  with check (public.has_permission('stock', 'edit'));
create policy products_delete on public.products
  for delete to authenticated using (public.has_permission('stock', 'delete'));

-- Sizes and photos follow the visibility of the article that owns them.
create policy product_sizes_public_read on public.product_sizes
  for select to anon
  using (
    exists (
      select 1 from public.products p
       left join public.web_product_settings w on w.product_id = p.id
      where p.id = product_sizes.product_id and coalesce(w.hidden, false) = false
    )
  );

create policy product_sizes_staff_read on public.product_sizes
  for select to authenticated using (public.has_permission('stock', 'view'));
create policy product_sizes_write on public.product_sizes
  for all to authenticated
  using (public.has_permission('stock', 'edit'))
  with check (public.has_permission('stock', 'edit'));

create policy product_images_public_read on public.product_images
  for select to anon
  using (
    exists (
      select 1 from public.products p
       left join public.web_product_settings w on w.product_id = p.id
      where p.id = product_images.product_id and coalesce(w.hidden, false) = false
    )
  );

create policy product_images_staff_read on public.product_images
  for select to authenticated using (public.has_permission('stock', 'view'));
create policy product_images_write on public.product_images
  for all to authenticated
  using (public.has_permission('website', 'edit') or public.has_permission('stock', 'edit'))
  with check (public.has_permission('website', 'edit') or public.has_permission('stock', 'edit'));

create policy web_product_settings_public_read on public.web_product_settings
  for select to anon, authenticated using (true);
create policy web_product_settings_write on public.web_product_settings
  for all to authenticated
  using (public.has_permission('website', 'edit'))
  with check (public.has_permission('website', 'edit'));

-- ============================================================================
--  7. PARTIES
-- ============================================================================

create policy clients_read on public.clients
  for select to authenticated using (public.has_permission('clients', 'view'));
create policy clients_insert on public.clients
  for insert to authenticated with check (public.has_permission('clients', 'create'));
create policy clients_update on public.clients
  for update to authenticated
  using (public.has_permission('clients', 'edit'))
  with check (public.has_permission('clients', 'edit'));
create policy clients_delete on public.clients
  for delete to authenticated using (public.has_permission('clients', 'delete'));

create policy suppliers_read on public.suppliers
  for select to authenticated using (public.has_permission('suppliers', 'view'));
create policy suppliers_insert on public.suppliers
  for insert to authenticated with check (public.has_permission('suppliers', 'create'));
create policy suppliers_update on public.suppliers
  for update to authenticated
  using (public.has_permission('suppliers', 'edit'))
  with check (public.has_permission('suppliers', 'edit'));
create policy suppliers_delete on public.suppliers
  for delete to authenticated using (public.has_permission('suppliers', 'delete'));

-- ============================================================================
--  8. DOCUMENTS  (purchases · sales)
-- ============================================================================

do $$
declare
  spec text[][] := array[
    array['purchases',        'purchase'],
    array['purchase_lines',   'purchase'],
    array['sales',            'pos'],
    array['sale_lines',       'pos']
  ];
  row_ text[];
begin
  foreach row_ slice 1 in array spec loop
    execute format($f$
      create policy %1$s_read on public.%1$s
        for select to authenticated using (public.has_permission('%2$s', 'view'));
      create policy %1$s_insert on public.%1$s
        for insert to authenticated with check (public.has_permission('%2$s', 'create'));
      create policy %1$s_update on public.%1$s
        for update to authenticated
        using (public.has_permission('%2$s', 'edit'))
        with check (public.has_permission('%2$s', 'edit'));
      create policy %1$s_delete on public.%1$s
        for delete to authenticated using (public.has_permission('%2$s', 'delete'));
    $f$, row_[1], row_[2]);
  end loop;
end $$;

-- Sales are also read by the sales register, which is its own module.
create policy sales_register_read on public.sales
  for select to authenticated using (public.has_permission('sales', 'view'));
create policy sale_lines_register_read on public.sale_lines
  for select to authenticated using (public.has_permission('sales', 'view'));

-- Settling an invoice is the `pay` action, not `edit`.
create policy purchase_payments_read on public.purchase_payments
  for select to authenticated using (public.has_permission('purchase', 'view'));
create policy purchase_payments_write on public.purchase_payments
  for all to authenticated
  using (public.has_permission('purchase', 'pay'))
  with check (public.has_permission('purchase', 'pay'));

create policy sale_payments_read on public.sale_payments
  for select to authenticated
  using (public.has_permission('sales', 'view') or public.has_permission('pos', 'view'));
create policy sale_payments_write on public.sale_payments
  for all to authenticated
  using (public.has_permission('sales', 'pay') or public.has_permission('pos', 'pay'))
  with check (public.has_permission('sales', 'pay') or public.has_permission('pos', 'pay'));

-- ============================================================================
--  9. STAFF RECORDS
-- ============================================================================

do $$
declare tbl text;
begin
  foreach tbl in array array['workers','worker_advances','worker_absences','worker_payments'] loop
    execute format($f$
      create policy %1$s_read on public.%1$s
        for select to authenticated using (public.has_permission('workers', 'view'));
      create policy %1$s_insert on public.%1$s
        for insert to authenticated with check (public.has_permission('workers', 'create'));
      create policy %1$s_update on public.%1$s
        for update to authenticated
        using (public.has_permission('workers', 'edit'))
        with check (public.has_permission('workers', 'edit'));
      create policy %1$s_delete on public.%1$s
        for delete to authenticated using (public.has_permission('workers', 'delete'));
    $f$, tbl);
  end loop;
end $$;

-- ============================================================================
--  10. EXPENSES & TREASURY
-- ============================================================================

create policy expenses_read on public.expenses
  for select to authenticated using (public.has_permission('expenses', 'view'));
create policy expenses_insert on public.expenses
  for insert to authenticated with check (public.has_permission('expenses', 'create'));
create policy expenses_update on public.expenses
  for update to authenticated
  using (public.has_permission('expenses', 'edit'))
  with check (public.has_permission('expenses', 'edit'));
create policy expenses_delete on public.expenses
  for delete to authenticated using (public.has_permission('expenses', 'delete'));

create policy caisse_read on public.caisse_transactions
  for select to authenticated using (public.has_permission('caisse', 'view'));
create policy caisse_insert on public.caisse_transactions
  for insert to authenticated with check (public.has_permission('caisse', 'create'));
create policy caisse_update on public.caisse_transactions
  for update to authenticated
  using (public.has_permission('caisse', 'edit'))
  with check (public.has_permission('caisse', 'edit'));
create policy caisse_delete on public.caisse_transactions
  for delete to authenticated using (public.has_permission('caisse', 'delete'));

-- ============================================================================
--  11. CAMPAIGNS
-- ============================================================================

-- The public sees a campaign only while it is switched on and inside its window.
create policy offers_public_read on public.special_offers
  for select to anon
  using (
    active
    and (start_date is null or start_date <= now())
    and (end_date   is null or end_date   >= now())
  );

create policy offers_staff_read on public.special_offers
  for select to authenticated using (public.has_permission('website', 'view'));
create policy offers_insert on public.special_offers
  for insert to authenticated with check (public.has_permission('website', 'create'));
create policy offers_update on public.special_offers
  for update to authenticated
  using (public.has_permission('website', 'edit'))
  with check (public.has_permission('website', 'edit'));
create policy offers_delete on public.special_offers
  for delete to authenticated using (public.has_permission('website', 'delete'));

create policy offer_lines_public_read on public.offer_lines
  for select to anon
  using (
    exists (
      select 1 from public.special_offers o
       where o.id = offer_lines.offer_id
         and o.active
         and (o.start_date is null or o.start_date <= now())
         and (o.end_date   is null or o.end_date   >= now())
    )
  );

create policy offer_lines_staff_read on public.offer_lines
  for select to authenticated using (public.has_permission('website', 'view'));
create policy offer_lines_write on public.offer_lines
  for all to authenticated
  using (public.has_permission('website', 'edit'))
  with check (public.has_permission('website', 'edit'));

-- ============================================================================
--  12. GEOGRAPHY & DELIVERY
-- ============================================================================

-- The order form needs the whole country and the live tariffs.
create policy wilayas_public_read on public.wilayas
  for select to anon, authenticated using (true);
create policy communes_public_read on public.communes
  for select to anon, authenticated using (true);

create policy wilayas_write on public.wilayas
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy communes_write on public.communes
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy delivery_companies_public_read on public.delivery_companies
  for select to anon using (active);
create policy delivery_companies_staff_read on public.delivery_companies
  for select to authenticated using (public.has_permission('website', 'view'));
create policy delivery_companies_write on public.delivery_companies
  for all to authenticated
  using (public.has_permission('website', 'edit'))
  with check (public.has_permission('website', 'edit'));

create policy delivery_prices_public_read on public.delivery_prices
  for select to anon
  using (
    enabled
    and exists (select 1 from public.delivery_companies c
                 where c.id = delivery_prices.company_id and c.active)
  );
create policy delivery_prices_staff_read on public.delivery_prices
  for select to authenticated using (public.has_permission('website', 'view'));
create policy delivery_prices_write on public.delivery_prices
  for all to authenticated
  using (public.has_permission('website', 'edit'))
  with check (public.has_permission('website', 'edit'));

-- ============================================================================
--  13. WEBSITE ORDERS
-- ----------------------------------------------------------------------------
--  A shopper never touches these tables directly: `place_web_order()` runs as
--  security definer and is the only door in. Reading someone else's order is
--  likewise impossible — the storefront's thank-you page is rendered from the
--  row the function just returned.
-- ============================================================================

create policy web_orders_read on public.web_orders
  for select to authenticated using (public.has_permission('weborders', 'view'));
create policy web_orders_insert on public.web_orders
  for insert to authenticated with check (public.has_permission('weborders', 'create'));
create policy web_orders_update on public.web_orders
  for update to authenticated
  using (public.has_permission('weborders', 'edit'))
  with check (public.has_permission('weborders', 'edit'));
create policy web_orders_delete on public.web_orders
  for delete to authenticated using (public.has_permission('weborders', 'delete'));

create policy web_order_lines_read on public.web_order_lines
  for select to authenticated using (public.has_permission('weborders', 'view'));
create policy web_order_lines_write on public.web_order_lines
  for all to authenticated
  using (public.has_permission('weborders', 'edit'))
  with check (public.has_permission('weborders', 'edit'));

create policy web_order_events_read on public.web_order_events
  for select to authenticated using (public.has_permission('weborders', 'view'));
create policy web_order_events_insert on public.web_order_events
  for insert to authenticated with check (public.has_permission('weborders', 'edit'));

-- ============================================================================
--  14. GRANTS
-- ============================================================================

grant usage on schema public to anon, authenticated;

-- Nobody reaches a raw table as `anon`: the policies above are the API, and the
-- two public views below are the only wide doors. Revoking first, then granting,
-- so the grants that follow are the final word.
revoke all on all tables in schema public from anon;

-- The staff-facing views must respect the caller's row-level policies rather
-- than run with the owner's rights, or a worker without the `clients` module
-- could read balances through the view.
alter view public.v_client_balances      set (security_invoker = true);
alter view public.v_supplier_balances    set (security_invoker = true);
alter view public.v_low_stock            set (security_invoker = true);
alter view public.v_broken_sizes         set (security_invoker = true);
alter view public.v_caisse_balance       set (security_invoker = true);
alter view public.v_web_order_stats      set (security_invoker = true);
alter view public.v_web_orders_by_wilaya set (security_invoker = true);
alter view public.v_web_top_products     set (security_invoker = true);
alter view public.v_offer_performance    set (security_invoker = true);
alter view public.v_delivery_coverage    set (security_invoker = true);

-- The storefront's two views deliberately keep the owner's rights: they carry
-- their own "published / live" filter in the WHERE clause, which is exactly the
-- rule the public should see.
grant select on
  public.v_shop_products,
  public.v_live_offers
to anon, authenticated;

grant select on
  public.v_client_balances,
  public.v_supplier_balances,
  public.v_low_stock,
  public.v_broken_sizes,
  public.v_caisse_balance,
  public.v_web_order_stats,
  public.v_web_orders_by_wilaya,
  public.v_web_top_products,
  public.v_offer_performance,
  public.v_delivery_coverage
to authenticated;

-- Placing an order is the storefront's one write.
grant execute on function public.place_web_order(
  text, text, text, text, text, delivery_mode, uuid, jsonb, text
) to anon, authenticated;

grant execute on function
  public.web_order_accept(uuid),
  public.web_order_deliver(uuid, uuid, numeric),
  public.web_order_return(uuid, text),
  public.web_order_cash(uuid),
  public.web_order_cancel(uuid, text),
  public.dashboard_snapshot(),
  public.product_margins(timestamptz, timestamptz),
  public.has_permission(text, text),
  public.is_admin(),
  public.is_staff()
to authenticated;

-- The order form needs the country list even before anything is published.
grant select on public.wilayas, public.communes to anon;

-- ============================================================================
--  15. STORAGE BUCKETS
-- ----------------------------------------------------------------------------
--  Four public-read buckets. "Public" here means the images render in an
--  <img> tag without a signed URL — writing to them still requires the matching
--  permission, enforced by the policies on `storage.objects`.
--
--  Path conventions:
--    product-images/<product_id>/<random>.webp
--    offer-images/<offer_id>/<random>.webp
--    delivery-logos/<company_id>/<random>.webp
--    store-assets/<logo|favicon|hero>/<random>.webp
--
--  The app uploads through `uploadImage` (src/lib/imageUpload.ts), which
--  recompresses every picked file to a few hundred kilobytes of WebP first.
--  The size limits below are a backstop, not the target.
--
--  An object is never overwritten: every upload gets a random name, so a draft
--  the user later cancels cannot destroy the image it was going to replace.
--  Orphans are swept up by `pruneOrphanImages` from the Parametres screen.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-images', 'product-images', true, 5242880,
   array['image/jpeg','image/png','image/webp','image/avif']),
  ('offer-images', 'offer-images', true, 5242880,
   array['image/jpeg','image/png','image/webp','image/avif']),
  ('delivery-logos', 'delivery-logos', true, 2097152,
   array['image/jpeg','image/png','image/webp','image/svg+xml']),
  ('store-assets', 'store-assets', true, 8388608,
   array['image/jpeg','image/png','image/webp','image/svg+xml','image/x-icon','image/vnd.microsoft.icon'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "buckets public read"       on storage.objects;
drop policy if exists "product images write"      on storage.objects;
drop policy if exists "offer images write"        on storage.objects;
drop policy if exists "delivery logos write"      on storage.objects;
drop policy if exists "store assets write"        on storage.objects;

-- Anyone may fetch an image from the four storefront buckets.
create policy "buckets public read" on storage.objects
  for select to anon, authenticated
  using (bucket_id in ('product-images', 'offer-images', 'delivery-logos', 'store-assets'));

create policy "product images write" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'product-images'
    and (public.has_permission('stock', 'edit') or public.has_permission('website', 'edit'))
  )
  with check (
    bucket_id = 'product-images'
    and (public.has_permission('stock', 'edit') or public.has_permission('website', 'edit'))
  );

create policy "offer images write" on storage.objects
  for all to authenticated
  using (bucket_id = 'offer-images' and public.has_permission('website', 'edit'))
  with check (bucket_id = 'offer-images' and public.has_permission('website', 'edit'));

create policy "delivery logos write" on storage.objects
  for all to authenticated
  using (bucket_id = 'delivery-logos' and public.has_permission('website', 'edit'))
  with check (bucket_id = 'delivery-logos' and public.has_permission('website', 'edit'));

create policy "store assets write" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'store-assets'
    and (public.has_permission('settings', 'edit') or public.has_permission('website', 'edit'))
  )
  with check (
    bucket_id = 'store-assets'
    and (public.has_permission('settings', 'edit') or public.has_permission('website', 'edit'))
  );

-- ============================================================================
--  16. SINGLETON ROWS
-- ============================================================================

insert into public.store_settings (id)   values (true) on conflict (id) do nothing;
insert into public.contact_links (id)    values (true) on conflict (id) do nothing;
insert into public.website_settings (id) values (true) on conflict (id) do nothing;
