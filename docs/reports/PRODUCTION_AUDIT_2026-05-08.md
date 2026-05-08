# Production Audit - Casa do Sheik

Date: 2026-05-08

## Scope

- Compared `supabase/schema.sql` with the live Supabase project.
- Aligned live RLS policies, functions, and indexes with the schema source of truth.
- Reset operational data while preserving catalog/configuration data.
- Audited order, cash, sound, QR print, auth, and public API flows.

## Database Divergences Fixed

1. Live RLS policies were still using older `*_manage_admin` policies while `schema.sql` defines per-action authenticated policies.
2. `idx_mesa_contas_pedido_ids_gin` was missing from the live database.
3. `set_updated_at`, `fn_audit_log`, and `fn_cleanup_print_jobs` did not all match the `search_path = public, pg_temp` definition in `schema.sql`.

Applied migration:

- `supabase/migrations/014_align_schema_source_of_truth.sql`

## Operational Data Reset

The following tables were reset and confirmed with `count(*) = 0`:

- `pedidos`
- `pedido_itens`
- `print_jobs`
- `mesa_contas`
- `caixa_fechamentos`
- `caixa_movimentacoes`

The `pedidos.numero` identity was reset; the next real order starts at `#001`.

Preserved data:

- `restaurante_config`: 1 row
- `order_settings`: 1 row
- `categorias`: 15 rows
- `produtos`: 53 rows
- `mesas`: 20 active rows
- users/auth data and other cadastro/configuration records

## Code Issues Found And Fixed

1. `lib/data.legacy.ts:331`
   Public table orders accepted any non-empty `mesa` string if the API was called directly. Fixed by validating the table against active rows in `mesas` and always storing a normalized numeric `mesa` plus `mesa_numero`.

2. `lib/data.legacy.ts:1088`
   If order item insertion failed after the order row was created, an empty operational order could remain. Fixed by deleting the just-created order when item insertion fails.

3. `lib/data.legacy.ts:442`
   Cash/day calculations used the server day, which can drift from the Sao Paulo restaurant day on Vercel. Fixed reference-date and range generation to use the Sao Paulo business day.

4. `lib/data.legacy.ts:1120`
   Order status updates could be forced into invalid transitions by direct API calls. Fixed backend validation against configured workflow, blocked reopening cancelled orders, and blocked status changes after financial/table closure.

5. `features/orders/components/order-board.tsx:241`
   The UI still allowed cancel action for terminal/closed orders. Fixed by hiding cancel once an order is concluded, cancelled, financially closed, or table-closed.

6. `features/orders/components/admin-order-alerts.tsx:17` and `lib/audio/alert-audio.ts:144`
   Alert settings did not fully respect `alertFrequency`; "none" could still play and "once_per_order" could still repeat. Fixed alert enable/repeat behavior.

7. `features/tables/components/tables-qr-manager.tsx:22`
   QR print HTML injected title/subtitle directly into a print window. Fixed by escaping HTML before writing the print document.

## Validation

- `npm run typecheck`: passed
- `npm run lint`: passed
- `npm run build`: passed
- `npm audit --audit-level=moderate`: 0 vulnerabilities
- `/menu?mesa=1`: HTTP 200
- `/login`: HTTP 200
- `/api/admin/orders` without auth: HTTP 401
- Public invalid table order (`mesa=999`): HTTP 400
- Public valid table order (`mesa=1`): HTTP 200, created `numero=1`, `mesa=1`, `mesa_numero=1`, 1 item, correct server-side price
- Operational data was reset again after the test

## Remaining Non-Code Dashboard Item

Supabase still reports `auth_leaked_password_protection` disabled. This is an Auth Dashboard setting, not a repository/database migration. Enable it in Supabase Auth before final production launch.

## Production Readiness

No critical code, build, dependency, or operational database reset issues remain from this audit. The system is ready for production operation after enabling Supabase leaked-password protection in the dashboard.
