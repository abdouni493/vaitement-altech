-- ============================================================================
--  BOUTIQUE — SCHEMA (1/4)
--  Extensions · enumerated types · tables · relations · indexes
-- ----------------------------------------------------------------------------
--  Run order:  01_schema.sql → 02_logic.sql → 03_security.sql → 04_geography.sql
--
--  Naming: snake_case tables in the plural, `id` uuid primary keys, `created_at`
--  on everything, and `on delete cascade` on every child row so deleting a
--  parent document never leaves orphans behind.
--
--  Money is `numeric(14,2)` throughout — never float — so totals recomputed in
--  SQL always agree with the totals shown in the interface.
-- ============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "unaccent";

-- ============================================================================
--  1. ENUMERATED TYPES
-- ============================================================================

do $$ begin
  create type payment_status as enum ('paid', 'partial', 'unpaid');
exception when duplicate_object then null; end $$;

do $$ begin
  create type size_category as enum ('alpha', 'numeric', 'shoes', 'kids', 'oneSize', 'custom');
exception when duplicate_object then null; end $$;

do $$ begin
  create type gender_kind as enum ('women', 'men', 'kids', 'unisex');
exception when duplicate_object then null; end $$;

do $$ begin
  create type season_kind as enum ('springSummer', 'fallWinter', 'allSeason');
exception when duplicate_object then null; end $$;

do $$ begin
  create type salary_kind as enum ('monthly', 'daily');
exception when duplicate_object then null; end $$;

do $$ begin
  create type caisse_kind as enum ('deposit', 'withdrawal');
exception when duplicate_object then null; end $$;

do $$ begin
  create type delivery_mode as enum ('home', 'desk');
exception when duplicate_object then null; end $$;

-- The online order lifecycle. Stock leaves on `delivered` and returns on
-- `returned`; the money reaches the caisse on `completed`.
do $$ begin
  create type web_order_status as enum (
    'pending', 'accepted', 'delivered', 'completed', 'canceled', 'returned'
  );
exception when duplicate_object then null; end $$;

-- ============================================================================
--  2. ACCOUNTS & PERMISSIONS
-- ============================================================================

-- One row per `auth.users` account. The owner carries `is_admin = true`, which
-- short-circuits every permission check; staff carry an explicit matrix.
--
-- `permissions` shape (mirrors src/types/index.ts):
--   { "stock":  { "enabled": true, "actions": ["view","create","edit"] },
--     "caisse": { "enabled": false, "actions": [] }, ... }
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text        not null default '',
  username    text        unique,
  email       text        not null,
  role        text        not null default 'Vendeur',
  is_admin    boolean     not null default false,
  permissions jsonb       not null default '{}'::jsonb,
  active      boolean     not null default true,
  /** Set when the account belongs to a worker record. */
  worker_id   uuid,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists profiles_email_idx    on public.profiles (lower(email));
create index if not exists profiles_username_idx on public.profiles (lower(username));
create index if not exists profiles_active_idx   on public.profiles (active) where active;

-- ============================================================================
--  3. STORE IDENTITY  (single-row tables)
-- ============================================================================

-- `id` is a boolean pinned to true, so the table can only ever hold one row.
create table if not exists public.store_settings (
  id          boolean primary key default true check (id),
  name        text    not null default 'Ma Boutique',
  description text    not null default '',
  logo_url    text    not null default '',
  email       text    not null default '',
  phone       text    not null default '',
  address     text    not null default '',
  nif         text    not null default '',
  nis         text    not null default '',
  article     text    not null default '',
  rc          text    not null default '',
  currency    text    not null default 'DA',
  updated_at  timestamptz not null default now()
);

-- Social and direct channels shown on the storefront's contact page.
create table if not exists public.contact_links (
  id         boolean primary key default true check (id),
  facebook   text not null default '',
  instagram  text not null default '',
  tiktok     text not null default '',
  snapchat   text not null default '',
  whatsapp   text not null default '',
  phone      text not null default '',
  phone2     text not null default '',
  email      text not null default '',
  maps_url   text not null default '',
  updated_at timestamptz not null default now()
);

-- How the storefront itself is dressed.
create table if not exists public.website_settings (
  id                 boolean primary key default true check (id),
  favicon_url        text    not null default '',
  hero_image_url     text    not null default '',
  description        text    not null default '',
  tagline            text    not null default '',
  /** Carrier fee waived above this order total; 0 disables the rule. */
  free_shipping_from numeric(14,2) not null default 0 check (free_shipping_from >= 0),
  updated_at         timestamptz not null default now()
);

-- ============================================================================
--  4. REFERENCE LISTS  (extensible from inside the app)
-- ============================================================================

create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.colors (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  /** Optional swatch, for the storefront's colour filter. */
  hex  text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.worker_roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

-- The boutique's size scales. `position` keeps XS→XXL in garment order rather
-- than alphabetical order.
create table if not exists public.size_scales (
  id       uuid primary key default gen_random_uuid(),
  category size_category not null,
  label    text not null,
  position integer not null default 0,
  unique (category, label)
);

-- ============================================================================
--  5. CATALOGUE
-- ============================================================================

create table if not exists public.products (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  description    text not null default '',
  barcode        text unique,
  brand          text not null default '',
  category       text not null default '',
  purchase_price numeric(14,2) not null default 0 check (purchase_price >= 0),
  sale_price     numeric(14,2) not null default 0 check (sale_price >= 0),
  /**
   * Total units. Maintained by `sync_product_quantity()` as the sum of
   * `product_sizes` whenever the article has a size scale; written directly
   * only for unsized articles.
   */
  quantity       integer not null default 0,
  min_quantity   integer not null default 0 check (min_quantity >= 0),

  size_category  size_category not null default 'alpha',
  color          text not null default '',
  material       text not null default '',
  gender         gender_kind not null default 'unisex',
  season         season_kind not null default 'allSeason',
  collection     text not null default '',

  created_by     uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists products_category_idx on public.products (category);
create index if not exists products_brand_idx    on public.products (brand);
create index if not exists products_barcode_idx  on public.products (barcode);
create index if not exists products_search_idx
  on public.products using gin (to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(brand,'') || ' ' || coalesce(category,'')));

-- Stock held per size. The unique key is what makes an upsert on
-- (product, size) safe from two tills at once.
create table if not exists public.product_sizes (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  size       text not null,
  quantity   integer not null default 0 check (quantity >= 0),
  position   integer not null default 0,
  unique (product_id, size)
);

create index if not exists product_sizes_product_idx on public.product_sizes (product_id);

-- Storefront photography. `position = 0` is the cover.
create table if not exists public.product_images (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  /** Path inside the `product-images` bucket, e.g. "<product_id>/01.jpg". */
  path       text not null,
  position   integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists product_images_product_idx on public.product_images (product_id, position);

-- What the storefront adds on top of a catalogue article. A missing row means
-- "never touched", which the public views read as published.
create table if not exists public.web_product_settings (
  product_id uuid primary key references public.products(id) on delete cascade,
  hidden     boolean not null default false,
  /** Online-only price; null falls back to `products.sale_price`. */
  web_price  numeric(14,2) check (web_price is null or web_price >= 0),
  featured   boolean not null default false,
  updated_at timestamptz not null default now()
);

-- ============================================================================
--  6. PARTIES
-- ============================================================================

create table if not exists public.suppliers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  phone      text not null default '',
  address    text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.clients (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  phone      text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists clients_phone_idx on public.clients (phone);

-- ============================================================================
--  7. PURCHASES  (stock coming in)
-- ============================================================================

create table if not exists public.purchases (
  id            uuid primary key default gen_random_uuid(),
  reference     text not null unique,
  supplier_id   uuid references public.suppliers(id) on delete set null,
  supplier_name text not null default '',
  /** Maintained by `recalc_purchase_totals()` from the lines. */
  total         numeric(14,2) not null default 0,
  /** Maintained by `recalc_purchase_totals()` from the payments. */
  paid          numeric(14,2) not null default 0,
  status        payment_status not null default 'unpaid',
  date          timestamptz not null default now(),
  created_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now()
);

create index if not exists purchases_supplier_idx on public.purchases (supplier_id);
create index if not exists purchases_date_idx     on public.purchases (date desc);

create table if not exists public.purchase_lines (
  id             uuid primary key default gen_random_uuid(),
  purchase_id    uuid not null references public.purchases(id) on delete cascade,
  product_id     uuid references public.products(id) on delete set null,
  product_name   text not null,
  barcode        text not null default '',
  /** Empty for articles without a size scale. */
  size           text not null default '',
  quantity       integer not null check (quantity > 0),
  purchase_price numeric(14,2) not null default 0 check (purchase_price >= 0),
  sale_price     numeric(14,2) not null default 0 check (sale_price >= 0),
  min_quantity   integer not null default 0
);

create index if not exists purchase_lines_purchase_idx on public.purchase_lines (purchase_id);
create index if not exists purchase_lines_product_idx  on public.purchase_lines (product_id);

create table if not exists public.purchase_payments (
  id          uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases(id) on delete cascade,
  amount      numeric(14,2) not null check (amount > 0),
  note        text not null default '',
  date        timestamptz not null default now(),
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists purchase_payments_purchase_idx on public.purchase_payments (purchase_id);

-- ============================================================================
--  8. SALES  (counter sales — the POS)
-- ============================================================================

create table if not exists public.sales (
  id          uuid primary key default gen_random_uuid(),
  reference   text not null unique,
  client_id   uuid references public.clients(id) on delete set null,
  client_name text not null default '',
  subtotal    numeric(14,2) not null default 0,
  discount    numeric(14,2) not null default 0 check (discount >= 0),
  total       numeric(14,2) not null default 0,
  paid        numeric(14,2) not null default 0,
  status      payment_status not null default 'unpaid',
  date        timestamptz not null default now(),
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists sales_client_idx on public.sales (client_id);
create index if not exists sales_date_idx   on public.sales (date desc);

create table if not exists public.sale_lines (
  id           uuid primary key default gen_random_uuid(),
  sale_id      uuid not null references public.sales(id) on delete cascade,
  product_id   uuid references public.products(id) on delete set null,
  product_name text not null,
  barcode      text not null default '',
  size         text not null default '',
  quantity     integer not null check (quantity > 0),
  unit_price   numeric(14,2) not null default 0 check (unit_price >= 0)
);

create index if not exists sale_lines_sale_idx    on public.sale_lines (sale_id);
create index if not exists sale_lines_product_idx on public.sale_lines (product_id);

create table if not exists public.sale_payments (
  id         uuid primary key default gen_random_uuid(),
  sale_id    uuid not null references public.sales(id) on delete cascade,
  amount     numeric(14,2) not null check (amount > 0),
  note       text not null default '',
  date       timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists sale_payments_sale_idx on public.sale_payments (sale_id);

-- ============================================================================
--  9. STAFF
-- ============================================================================

create table if not exists public.workers (
  id            uuid primary key default gen_random_uuid(),
  full_name     text not null,
  birth_date    date,
  id_card       text not null default '',
  phone         text not null default '',
  role          text not null default 'Vendeur',
  has_salary    boolean not null default true,
  salary_type   salary_kind not null default 'monthly',
  salary_amount numeric(14,2) not null default 0 check (salary_amount >= 0),
  /** True once an auth account has been provisioned for this worker. */
  has_account   boolean not null default false,
  email         text not null default '',
  username      text not null default '',
  /** Set by `link_worker_account()`; credentials live in auth.users. */
  profile_id    uuid references public.profiles(id) on delete set null,
  permissions   jsonb not null default '{}'::jsonb,
  start_date    date not null default current_date,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

create index if not exists workers_active_idx on public.workers (active) where active;

create table if not exists public.worker_advances (
  id          uuid primary key default gen_random_uuid(),
  worker_id   uuid not null references public.workers(id) on delete cascade,
  description text not null default '',
  amount      numeric(14,2) not null check (amount > 0),
  /** Cleared once the advance has been netted off a salary payment. */
  deducted    boolean not null default false,
  date        timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

create table if not exists public.worker_absences (
  id          uuid primary key default gen_random_uuid(),
  worker_id   uuid not null references public.workers(id) on delete cascade,
  description text not null default '',
  cost        numeric(14,2) not null default 0 check (cost >= 0),
  date        timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

create table if not exists public.worker_payments (
  id                 uuid primary key default gen_random_uuid(),
  worker_id          uuid not null references public.workers(id) on delete cascade,
  /** Month settled, as 'YYYY-MM'. */
  period             text not null,
  base_salary        numeric(14,2) not null default 0,
  absences_deducted  numeric(14,2) not null default 0,
  advances_deducted  numeric(14,2) not null default 0,
  amount             numeric(14,2) not null default 0,
  note               text not null default '',
  date               timestamptz not null default now(),
  created_by         uuid references public.profiles(id) on delete set null,
  created_at         timestamptz not null default now()
);

create index if not exists worker_advances_worker_idx on public.worker_advances (worker_id);
create index if not exists worker_absences_worker_idx on public.worker_absences (worker_id);
create index if not exists worker_payments_worker_idx on public.worker_payments (worker_id, period);

-- ============================================================================
--  10. EXPENSES & TREASURY
-- ============================================================================

create table if not exists public.expenses (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text not null default '',
  amount      numeric(14,2) not null check (amount > 0),
  date        timestamptz not null default now(),
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists expenses_date_idx on public.expenses (date desc);

create table if not exists public.caisse_transactions (
  id          uuid primary key default gen_random_uuid(),
  type        caisse_kind not null,
  amount      numeric(14,2) not null check (amount > 0),
  description text not null default '',
  /** Set when the movement was booked automatically by an online order. */
  web_order_id uuid,
  date        timestamptz not null default now(),
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists caisse_date_idx  on public.caisse_transactions (date desc);
create index if not exists caisse_order_idx on public.caisse_transactions (web_order_id);

-- ============================================================================
--  11. SPECIAL OFFERS
-- ============================================================================

create table if not exists public.special_offers (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  description      text not null default '',
  /** Path inside the `offer-images` bucket. */
  image_path       text not null default '',
  /** All four figures are maintained by `recalc_offer_totals()`. */
  original_total   numeric(14,2) not null default 0,
  offer_total      numeric(14,2) not null default 0,
  discount_amount  numeric(14,2) not null default 0,
  discount_percent numeric(6,2)  not null default 0,
  active           boolean not null default true,
  start_date       timestamptz,
  end_date         timestamptz,
  created_by       uuid references public.profiles(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint offer_window check (start_date is null or end_date is null or end_date > start_date)
);

create index if not exists offers_active_idx on public.special_offers (active, start_date, end_date);

create table if not exists public.offer_lines (
  id             uuid primary key default gen_random_uuid(),
  offer_id       uuid not null references public.special_offers(id) on delete cascade,
  product_id     uuid not null references public.products(id) on delete cascade,
  product_name   text not null,
  quantity       integer not null default 1 check (quantity > 0),
  /** The catalogue price captured when the line was added. */
  original_price numeric(14,2) not null default 0 check (original_price >= 0),
  /** What the customer pays instead. */
  offer_price    numeric(14,2) not null default 0 check (offer_price >= 0),
  unique (offer_id, product_id)
);

create index if not exists offer_lines_offer_idx on public.offer_lines (offer_id);

-- ============================================================================
--  12. DELIVERY  (geography + carriers + tariffs)
-- ============================================================================

create table if not exists public.wilayas (
  code    text primary key,          -- '01' … '58'
  name    text not null,
  name_ar text not null default ''
);

create table if not exists public.communes (
  id          uuid primary key default gen_random_uuid(),
  wilaya_code text not null references public.wilayas(code) on delete cascade,
  name        text not null,
  name_ar     text not null default '',
  daira       text not null default '',
  unique (wilaya_code, name)
);

create index if not exists communes_wilaya_idx on public.communes (wilaya_code);

create table if not exists public.delivery_companies (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  phone      text not null default '',
  /** Path inside the `delivery-logos` bucket. */
  logo_path  text not null default '',
  notes      text not null default '',
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- One tariff per carrier per commune, priced both ways. Only `enabled` rows
-- are offered at checkout, which is what makes "not served" expressible.
create table if not exists public.delivery_prices (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.delivery_companies(id) on delete cascade,
  commune_id  uuid not null references public.communes(id) on delete cascade,
  home_price  numeric(14,2) not null default 0 check (home_price >= 0),
  desk_price  numeric(14,2) not null default 0 check (desk_price >= 0),
  enabled     boolean not null default true,
  updated_at  timestamptz not null default now(),
  unique (company_id, commune_id)
);

create index if not exists delivery_prices_company_idx on public.delivery_prices (company_id);
create index if not exists delivery_prices_commune_idx on public.delivery_prices (commune_id);

-- ============================================================================
--  13. WEBSITE ORDERS
-- ============================================================================

create table if not exists public.web_orders (
  id                    uuid primary key default gen_random_uuid(),
  reference             text not null unique,

  customer_name         text not null,
  phone                 text not null,
  wilaya_code           text references public.wilayas(code) on delete set null,
  wilaya                text not null default '',
  commune               text not null default '',
  address               text not null default '',

  delivery_mode         delivery_mode not null default 'home',
  delivery_company_id   uuid references public.delivery_companies(id) on delete set null,
  delivery_company_name text not null default '',
  delivery_price        numeric(14,2) not null default 0 check (delivery_price >= 0),

  /** Both maintained by `recalc_web_order_totals()`. */
  subtotal              numeric(14,2) not null default 0,
  total                 numeric(14,2) not null default 0,

  status                web_order_status not null default 'pending',
  note                  text not null default '',

  /** Set while the stock is out of the boutique — guards double decrements. */
  stock_applied_at      timestamptz,
  /** Set once booked into the caisse — guards double revenue. */
  cashed_at             timestamptz,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists web_orders_status_idx  on public.web_orders (status);
create index if not exists web_orders_created_idx on public.web_orders (created_at desc);
create index if not exists web_orders_phone_idx   on public.web_orders (phone);
create index if not exists web_orders_search_idx
  on public.web_orders using gin (to_tsvector('simple', coalesce(customer_name,'') || ' ' || coalesce(phone,'')));

create table if not exists public.web_order_lines (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.web_orders(id) on delete cascade,
  product_id   uuid references public.products(id) on delete set null,
  product_name text not null,
  size         text not null default '',
  quantity     integer not null check (quantity > 0),
  unit_price   numeric(14,2) not null default 0 check (unit_price >= 0),
  /** Kept for traceability when the line came from a campaign. */
  offer_id     uuid references public.special_offers(id) on delete set null,
  offer_title  text not null default '',
  image_path   text not null default ''
);

create index if not exists web_order_lines_order_idx   on public.web_order_lines (order_id);
create index if not exists web_order_lines_product_idx on public.web_order_lines (product_id);
create index if not exists web_order_lines_offer_idx   on public.web_order_lines (offer_id);

-- Append-only audit of every status change, newest last.
create table if not exists public.web_order_events (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.web_orders(id) on delete cascade,
  status     web_order_status not null,
  note       text not null default '',
  actor_id   uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists web_order_events_order_idx on public.web_order_events (order_id, created_at);

-- The caisse movement points back at the order that produced it.
alter table public.caisse_transactions
  drop constraint if exists caisse_transactions_web_order_id_fkey;
alter table public.caisse_transactions
  add constraint caisse_transactions_web_order_id_fkey
  foreign key (web_order_id) references public.web_orders(id) on delete set null;

-- The worker's account points back at its profile, and vice versa.
alter table public.profiles
  drop constraint if exists profiles_worker_id_fkey;
alter table public.profiles
  add constraint profiles_worker_id_fkey
  foreign key (worker_id) references public.workers(id) on delete set null;

-- ============================================================================
--  14. HUMAN-READABLE REFERENCES
-- ============================================================================

create sequence if not exists public.purchase_ref_seq  start 1;
create sequence if not exists public.sale_ref_seq      start 1;
create sequence if not exists public.web_order_ref_seq start 1;
