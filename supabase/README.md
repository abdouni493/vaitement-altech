# Supabase backend

Complete schema for the boutique: the back office, the storefront, the online
order lifecycle, staff permissions and the image buckets.

## Run order

Paste each file into the Supabase **SQL Editor** and run it, in this order:

| # | File | What it creates |
|---|------|-----------------|
| 1 | `01_schema.sql` | Extensions, enums, 36 tables, foreign keys, indexes, reference sequences |
| 2 | `02_logic.sql` | Permission helpers, derived totals, stock movements, the order lifecycle RPCs, reporting views |
| 3 | `03_security.sql` | Row-level security on every table, grants, the four storage buckets and their policies |
| 4 | `04_geography.sql` | The 58 wilayas and their 1 541 communes |

Every file is idempotent — re-running one is safe.

> **Already installed?** Re-run **`02_logic.sql`** and **`03_security.sql`**.
> They gained the two functions the app now calls (`admin_exists()` and
> `web_order_receipt()`), the starter reference lists, and — most importantly —
> the table `GRANT`s that were missing.
>
> Row-level security decides *which rows* a request may touch; it never grants
> the SQL privilege to touch the table at all. Both are required. Without the
> grants, every policy in `03_security.sql` was inert: the storefront could not
> read the catalogue and staff could not read their own boutique, both answering
> `permission denied for table …`.

## Accounts

Accounts live in `auth.users`; `public.profiles` carries the role and the
permission matrix.

**The owner.** Sign up through the app's *Create admin account* flow on the
login page — the button is shown only while `admin_exists()` answers `false`,
so it retires itself the moment the account is created. Or from the SQL editor:

```sql
-- Supabase Dashboard → Authentication → Users → Add user,
-- then set the metadata so the trigger provisions an administrator:
--   { "full_name": "…", "username": "…", "is_admin": true }
```

`handle_new_user()` fires on insert into `auth.users` and writes the matching
`profiles` row. The **very first account is always the owner**, whatever the
metadata says — which is why the app's create-admin button disappears the moment
one exists.

**Staff.** Tick *Compte* on the worker's form and give an e-mail and password:
the app signs them up on an isolated client, so the owner keeps their own
session while the trigger provisions the account. The equivalent by hand is to
create the worker first, then invite them with the worker row's id in the
metadata:

```sql
-- metadata: { "full_name": "…", "username": "…", "worker_id": "<workers.id>" }
```

The trigger copies that worker's permission matrix onto the profile and flips
`workers.has_account`. Afterwards, `sync_worker_profile()` keeps the two in step,
so revoking a module in the *Employés* screen takes effect on their next request.

## How permissions are enforced

`has_permission(module, action)` is the single gate. It reads the caller's
`profiles.permissions` — the same JSON the app's permissions dialog writes:

```json
{
  "stock":     { "enabled": true,  "actions": ["view", "create", "edit"] },
  "weborders": { "enabled": true,  "actions": ["view", "edit"] },
  "caisse":    { "enabled": false, "actions": [] }
}
```

Modules: `dashboard`, `stock`, `purchase`, `pos`, `sales`, `clients`,
`suppliers`, `workers`, `expenses`, `caisse`, `reports`, `settings`, `website`,
`weborders`.
Actions: `view`, `create`, `edit`, `delete`, `print`, `pay`.

The owner (`is_admin`) passes everything. Because the check lives in the RLS
policies rather than in the interface, a worker who is not granted *Caisse*
cannot read it even by calling the REST API directly.

## The online order lifecycle

```
pending ──accept──▶ accepted ──deliver──▶ delivered ──cash──▶ completed
   │                    │                     │
   └──────cancel────────┘                     └──return──▶ returned
```

Each arrow is one RPC, and they are the only way to move between two states:

| RPC | Effect |
|-----|--------|
| `place_web_order(...)` | Storefront entry point. Re-reads every price from the catalogue or the live campaign, resolves the carrier tariff from the grid, applies the free-shipping rule. Callable by `anon`. |
| `web_order_accept(id)` | `pending` / `canceled` / `returned` → `accepted`. |
| `web_order_deliver(id, company, price)` | → `delivered`. Assigns the carrier, re-prices the shipment, **takes the units out of stock**. |
| `web_order_return(id, reason)` | → `returned`. **Puts the units back.** |
| `web_order_cash(id)` | → `completed`. **Books the total into the caisse.** Idempotent. |
| `web_order_cancel(id, reason)` | → `canceled`. Returns the stock if it had already left. |

`stock_applied_at` and `cashed_at` are the guards: stock can never be
decremented twice, and revenue can never be booked twice, whatever the interface
does.

## Storage buckets

Four public-read buckets. *Public* means the images render in an `<img>` without
a signed URL — writing still needs the matching permission.

| Bucket | Path convention | Write permission |
|--------|-----------------|------------------|
| `product-images` | `<product_id>/<random>.webp` | `stock:edit` or `website:edit` |
| `offer-images` | `<offer_id>/<random>.webp` | `website:edit` |
| `delivery-logos` | `<company_id>/<random>.webp` | `website:edit` |
| `store-assets` | `logo/<random>.webp`, `favicon/<random>.webp`, `hero/<random>.webp` | `settings:edit` or `website:edit` |

**Objects are never overwritten.** Every upload gets a random name, including
the store assets. That is not only about stale caches: most of these inputs edit
a draft the user can still abandon — the favicon and hero sit behind a *Reset*
button, a product behind *Cancel*. Writing to a fixed path at pick time would
destroy the live image before the user ever committed to replacing it, and
*Reset* would then restore a URL pointing at the new bytes.

Because nothing is overwritten, the object is immutable and served with
`cache-control: 31536000` — no cache-busting query string is needed.

A record created before it is saved has no id yet, so its first uploads land in
a `nouveau/` folder inside the bucket.

### Reclaiming orphans

The flip side of never overwriting is that replaced photos and abandoned drafts
linger. `pruneOrphanImages()` (`src/lib/storageCleanup.ts`) lists what each
bucket holds, subtracts everything the boutique still references, and deletes
the rest. The owner runs it from **Paramètres → Nettoyer les images**.

Two guards keep it from eating a live image: an object younger than **24 h** is
never touched (a form may be open with photos not yet saved to any record), and
the sweep refuses to run when nothing at all appears referenced — which is what
an unhydrated IndexedDB would look like.

### Uploading from the app

Never call `storage.upload` directly — go through `uploadImage`, which
compresses the file to its preset's target weight first (see the *Images*
section of the root README) and falls back to a local data URL when the project
is unreachable:

```ts
import { uploadImage } from '@/lib/imageUpload'

const { src, remote, originalSize, size } = await uploadImage(file, {
  bucket: 'product-images',
  folder: productId,
  preset: 'product',
})
// src → https://<ref>.supabase.co/storage/v1/object/public/product-images/…
//       or a compressed data URL when offline (remote === false)
```

To read an object whose path you already hold:

```ts
import { publicAssetUrl } from '@/lib/supabase'

const src = publicAssetUrl('product-images', `${productId}/abc123.webp`)
```

The buckets accept `image/webp`, so the compressor's preferred output needs no
schema change. Their `file_size_limit` (5 MB for photos) is a backstop only —
the client aims an order of magnitude below it.

## Reporting

Views ready to select from: `v_shop_products`, `v_live_offers`,
`v_client_balances`, `v_supplier_balances`, `v_low_stock`, `v_broken_sizes`,
`v_caisse_balance`, `v_web_order_stats`, `v_web_orders_by_wilaya`,
`v_web_top_products`, `v_offer_performance`, `v_delivery_coverage`.

Two functions: `dashboard_snapshot()` returns every dashboard tile in one call,
and `product_margins(from, to)` returns per-article margin over a window.

The staff-facing views run with `security_invoker = true`, so they respect the
caller's permissions. `v_shop_products` and `v_live_offers` deliberately keep the
owner's rights — their `WHERE` clause *is* the public visibility rule.

## Connecting the app

`.env` at the repo root:

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-public-key>
```

The anon key is designed to ship in the browser bundle; row-level security, not
secrecy, is what protects the data. Never put the **service role** key here.

The app is local-first: every screen reads and writes an on-device IndexedDB
database, so the boutique keeps working with no network. Supabase is wired for
authentication today — sign-in tries Supabase first and falls back to the local
accounts when the project is unreachable — and this schema is the target for the
data layer.
